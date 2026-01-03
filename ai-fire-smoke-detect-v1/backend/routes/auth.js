import express from "express";
import admin from "../firebase/admin.js"; // { auth, firestore }
import axios from "axios";

const router = express.Router();

// Đăng ký
router.post("/register", async (req, res) => {
  console.log("BODY RECEIVED /register:", req.body);
  const { email, password, name } = req.body;

  if (!email || !password || !name) {
    return res.status(400).json({ error: "Missing email, password or name" });
  }

  try {
    // ✅ Tạo user trong Firebase Auth
    const userRecord = await admin.auth.createUser({
      email,
      password,
      displayName: name,
    });

    // ✅ Lưu user vào Firestore
    await admin.firestore.collection("users").doc(userRecord.uid).set({
      email,
      name,
      role: "user",
    });

    res.json({ uid: userRecord.uid, email, name });
  } catch (err) {
    console.error("[REGISTER ERROR]", err);
    res.status(500).json({ error: err.message || "Internal Server Error" });
  }
});

// Đăng nhập
router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Missing email or password" });
  }

  try {
    const apiKey = process.env.FIREBASE_API_KEY;
    const resp = await axios.post(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`,
      { email, password, returnSecureToken: true }
    );
    res.json({ token: resp.data.idToken, uid: resp.data.localId });
  } catch (err) {
    console.error("[LOGIN ERROR]", err?.response?.data || err);
    if (err?.response?.data?.error?.message) {
      res.status(400).json({ error: err.response.data.error.message });
    } else {
      res.status(500).json({ error: err.message || "Internal Server Error" });
    }
  }
});

export default router;
