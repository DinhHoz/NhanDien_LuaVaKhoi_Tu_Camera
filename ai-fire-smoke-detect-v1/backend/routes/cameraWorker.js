import express from "express";
import admin from "../firebase/admin.js";

const router = express.Router();

router.get("/list", async (req, res) => {
  const secret = req.headers["x-worker-secret"];
  if (secret !== process.env.WORKER_SECRET) {
    return res.status(401).json({ error: "Invalid worker secret" });
  }

  try {
    const ADMIN_UID = process.env.ADMIN_UID;

    if (!ADMIN_UID)
      return res.status(500).json({ error: "ADMIN_UID missing in env" });

    // Lấy camera của admin duy nhất
    const snap = await admin.firestore
      .collection("users")
      .doc(ADMIN_UID)
      .collection("cameras")
      .where("status", "==", "active")
      .get();

    const cameras = snap.docs.map((doc) => ({
      userId: ADMIN_UID,
      cameraId: doc.id,
      ...doc.data(),
    }));

    res.json(cameras);
  } catch (err) {
    console.error("Worker camera fetch error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
