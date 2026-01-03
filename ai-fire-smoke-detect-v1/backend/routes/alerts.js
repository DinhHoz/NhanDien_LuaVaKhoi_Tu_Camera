import express from "express";
import { verifyToken } from "../middlewares/auth.js";
import admin from "../firebase/admin.js";
import { FieldPath } from "firebase-admin/firestore";
import { broadcastAlertToCameraUsers } from "../utils/alertsSocket.js";

const router = express.Router();

/* =====================================================
   MIDDLEWARE: Cho phép worker gọi bằng x-worker-secret
===================================================== */
router.use((req, res, next) => {
  const workerSecret = req.headers["x-worker-secret"];

  if (workerSecret && workerSecret === process.env.WORKER_SECRET) {
    req.isWorker = true;
    return next();
  }

  verifyToken(req, res, next);
});

/* =====================================================
   1) LẤY ALERTS CỦA USER
===================================================== */
router.get("/", async (req, res) => {
  try {
    const snapshot = await admin.firestore
      .collection("users")
      .doc(req.uid)
      .collection("alerts")
      .orderBy("timestamp", "desc")
      .get();

    const alerts = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

    res.json(alerts);
  } catch (err) {
    console.error(err);
    res.status(500).send("Error fetching alerts");
  }
});

/* =====================================================
   2) TẠO ALERT + GỬI FCM + BROADCAST WS
===================================================== */
router.post("/", async (req, res) => {
  const { cameraId, cameraName, type, location, imageUrl, userId } = req.body;

  if (!cameraId || !type) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    const db = admin.firestore;

    console.log("📌 Nhận alert từ camera:", cameraId);

    // Tìm TẤT CẢ user sở hữu camera này
    const usersSnap = await db.collection("users").get();
    const matchedUsers = [];

    for (const userDoc of usersSnap.docs) {
      const camDoc = await userDoc.ref.collection("cameras").doc(cameraId).get();
      if (camDoc.exists) {
        matchedUsers.push({
          uid: userDoc.id,
          fcmToken: userDoc.data().fcmToken || null,
        });
      }
    }

    if (matchedUsers.length === 0) {
      console.log("⚠️ Không có user nào sở hữu camera này.");
      return res.status(200).json({ message: "Không có user nào có camera này." });
    }

    console.log(`📣 Gửi FCM thông báo cho ${matchedUsers.length} người dùng.`);

    // Tạo alert + gửi FCM + gửi WS cho TỪNG user
    const alertPromises = matchedUsers.map(async (user) => {
      const alertRef = await db
        .collection("users")
        .doc(user.uid)
        .collection("alerts")
        .add({
          cameraId,
          cameraName,
          location,
          type,
          imageUrl,
          status: "visible",
          isRead: false,
          timestamp: new Date(),
        });

      // ============================
      //   GỬI REAL-TIME WEBSOCKET
      // ============================
      broadcastAlertToCameraUsers(cameraId, {
        type,
        cameraId,
        cameraName,
        location,
        imageUrl,
        videoUrl: null,
        timestamp: Date.now(),
        isEarly: false,
      }, user.uid); // Thay vì broadcast cho tất cả, chỉ broadcast cho user này

      // Nếu user không có FCM token thì bỏ qua FCM
      if (!user.fcmToken || user.fcmToken.length < 10) {
        console.log(`⚠️ Token rỗng hoặc sai → skip user ${user.uid}`);
        return alertRef.id;
      }

      const message = {
        notification: {
          title: ` Cảnh báo ${type === "fire" ? "cháy" : "khói"}`,
          body: `Camera ${cameraName} tại ${location} phát hiện ${type}`,
        },
        data: {
          alertId: alertRef.id,
          cameraId,
          cameraName,
          type,
          location,
          imageUrl,
        },
        token: user.fcmToken,
      };

      try {
        await admin.messaging.send(message);
      } catch (err) {
        console.error("❌ Lỗi FCM:", err.message);

        if (err.code === "messaging/registration-token-not-registered") {
          await db.collection("users").doc(user.uid).update({ fcmToken: null });
          console.log("🔥 Token chết → xoá:", user.uid);
        }
      }

      return alertRef.id;
    });

    await Promise.allSettled(alertPromises);

    return res.status(200).json({
      message: "Gửi cảnh báo thành công",
    });
  } catch (err) {
    console.error("❌ Lỗi xử lý alert:", err);
    res.status(500).json({ error: "Lỗi xử lý alert" });
  }
});

/* =====================================================
   3) XOÁ MỀM NHIỀU ALERT (status = disabled)
===================================================== */
router.patch("/", async (req, res) => {
  const { alertIds } = req.body;

  if (!Array.isArray(alertIds) || alertIds.length === 0) {
    return res
      .status(400)
      .json({ error: "alertIds must be a non-empty array" });
  }

  try {
    const batch = admin.firestore.batch();
    const alertsRef = admin.firestore
      .collection("users")
      .doc(req.uid)
      .collection("alerts");

    alertIds.forEach((id) => {
      batch.update(alertsRef.doc(id), { status: "disabled" });
    });

    await batch.commit();

    res.json({ message: `Disabled ${alertIds.length} alerts successfully` });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error disabling alerts");
  }
});

export default router;
