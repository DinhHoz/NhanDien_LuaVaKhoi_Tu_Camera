import express from "express";
import firebaseAdmin from "../firebase/admin.js";
import { getAuth } from "firebase-admin/auth";

const router = express.Router();

// 🔹 bóc tách auth và firestore từ export mặc định của firebaseAdmin
const { auth: adminAuth, firestore: adminDb } = firebaseAdmin;

// 🔒 Middleware kiểm tra token và quyền admin
router.use(async (req, res, next) => {
  const token = req.headers.authorization?.split("Bearer ")[1];
  if (!token) return res.status(401).json({ error: "Thiếu token đăng nhập." });

  try {
    // Xác thực token
    const decoded = await getAuth().verifyIdToken(token);
    const uid = decoded.uid;

    // 🔍 Lấy user info từ Firestore
    const userDoc = await firebaseAdmin.firestore
      .collection("users")
      .doc(uid)
      .get();

    if (!userDoc.exists) {
      return res
        .status(404)
        .json({ error: "Không tìm thấy người dùng trong Firestore." });
    }

    const userData = userDoc.data();

    // 🔒 Kiểm tra quyền admin
    if (userData.role !== "admin") {
      return res.status(403).json({ error: "Bạn không có quyền admin." });
    }

    req.user = { uid, ...userData };
    next();
  } catch (err) {
    console.error("❌ Lỗi xác thực token:", err);
    return res.status(401).json({ error: "Token không hợp lệ." });
  }
});

// ✅ 1️⃣ API: Tạo tài khoản nhân viên (check trùng email)
router.post("/create-user", async (req, res) => {
  try {
    const { email, password, name, role = "user" } = req.body;

    // 🔍 Kiểm tra email trùng trước
    try {
      const existingUser = await adminAuth.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({
          success: false,
          error: "Email này đã tồn tại trong hệ thống.",
        });
      }
    } catch (e) {
      // Nếu getUserByEmail ném lỗi "auth/user-not-found" thì OK, tiếp tục
      if (e.code !== "auth/user-not-found") throw e;
    }

    // ✅ Tạo user mới
    const userRecord = await adminAuth.createUser({
      email,
      password,
      displayName: name,
    });

    await adminDb.collection("users").doc(userRecord.uid).set({
      email,
      name,
      role,
      createdAt: new Date().toISOString(),
    });

    res.json({
      success: true,
      message: "Tạo tài khoản thành công!",
      uid: userRecord.uid,
    });
  } catch (err) {
    console.error("❌ Lỗi tạo user:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ✅ 2️⃣ API: Cập nhật thông tin nhân viên (check trùng email với user khác)
router.put("/update-user/:uid", async (req, res) => {
  try {
    const { uid } = req.params;
    const { email, name, role } = req.body;

    // 🔍 Kiểm tra nếu email đang cập nhật đã thuộc về user khác
    try {
      const existingUser = await adminAuth.getUserByEmail(email);
      if (existingUser && existingUser.uid !== uid) {
        return res.status(400).json({
          success: false,
          error: "Email này đã được sử dụng bởi người dùng khác.",
        });
      }
    } catch (e) {
      if (e.code !== "auth/user-not-found") throw e;
    }

    // ✅ Cập nhật thông tin trong Firebase Auth
    await adminAuth.updateUser(uid, {
      email,
      displayName: name,
    });

    // ✅ Cập nhật thông tin trong Firestore
    await adminDb.collection("users").doc(uid).update({
      email,
      name,
      role,
      updatedAt: new Date().toISOString(),
    });

    res.json({
      success: true,
      message: "Cập nhật thông tin nhân viên thành công!",
    });
  } catch (err) {
    console.error("❌ Lỗi cập nhật user:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ✅ 3️⃣ API: Reset mật khẩu nhân viên
router.post("/reset-password", async (req, res) => {
  try {
    const { uid, newPassword } = req.body;

    await adminAuth.updateUser(uid, { password: newPassword });

    res.json({
      success: true,
      message: "Đặt lại mật khẩu thành công!",
    });
  } catch (err) {
    console.error("❌ Lỗi đặt lại mật khẩu:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});
// ✅ 4️⃣ API: Xóa nhân viên
router.delete("/delete-user/:uid", async (req, res) => {
  try {
    const { uid } = req.params;

    // Xóa user trong Firebase Auth
    await firebaseAdmin.auth.deleteUser(uid);

    // Xóa document trong Firestore
    await firebaseAdmin.firestore.collection("users").doc(uid).delete();

    res.json({
      success: true,
      message: "Xóa nhân viên thành công!",
    });
  } catch (err) {
    console.error("❌ Lỗi khi xóa nhân viên:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
