import express from "express";
import admin from "../firebase/admin.js";
import { streamManager } from "../utils/streamManager.js";

const router = express.Router();

router.get("/:cameraId", async (req, res) => {
  // Lấy token Firebase từ query string
  console.log("👉 Có yêu cầu kết nối stream từ Client!");
  console.log("ID Camera:", req.params.cameraId);
  console.log("Position:", req.query?.position || "N/A");
  
  const token = req.query?.token;
  if (!token) return res.status(403).send("Missing token");

  // Xác thực token, lấy UID của người dùng
  let uid;
  try {
    const decoded = await admin.auth.verifyIdToken(token);
    uid = decoded.uid;
  } catch {
    return res.status(403).send("Invalid token");
  }

  // Lấy thông tin camera từ Firestore của người dùng
  const camDoc = await admin.firestore
    .collection("users")
    .doc(uid)
    .collection("cameras")
    .doc(req.params.cameraId)
    .get();

  if (!camDoc.exists) return res.status(404).send("Camera not found");

  // URL RTSP/HLS của camera
  const { streamUrl } = camDoc.data();

  // Sử dụng StreamManager để broadcast stream đến nhiều clients
  streamManager.addClient(req.params.cameraId, streamUrl, res);
});

export default router;
