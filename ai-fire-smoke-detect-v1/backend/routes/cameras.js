import express from "express";
import { verifyToken } from "../middlewares/auth.js";
import admin from "../firebase/admin.js";
const router = express.Router();

router.get("/", verifyToken, async (req, res) => {
  try {
    const snapshot = await admin.firestore
      .collection("users")
      .doc(req.uid)
      .collection("cameras")
      .get();
    const cameras = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    res.json(cameras);
  } catch (err) {
    console.error("Error fetching cameras:", err);
    res.status(500).send("Error fetching cameras");
  }
});

router.post("/", verifyToken, async (req, res) => {
  const { cameraName, status, streamUrl, location } = req.body;
  try {
    const cameraRef = await admin.firestore
      .collection("users")
      .doc(req.uid)
      .collection("cameras")
      .add({
        cameraName,
        streamUrl,
        location,
        status,
        createdAt: new Date(),
      });
    res.json({ id: cameraRef.id });
  } catch (err) {
    console.error("Error saving camera:", err);
    res.status(500).send("Error saving camera");
  }
});
// 🔹 PUT cập nhật camera theo ID
router.put("/:cameraId", verifyToken, async (req, res) => {
  const { cameraId } = req.params;
  const { cameraName, status, streamUrl, location } = req.body;

  try {
    const cameraRef = admin.firestore
      .collection("users")
      .doc(req.uid)
      .collection("cameras")
      .doc(cameraId);

    await cameraRef.update({
      cameraName,
      streamUrl,
      location,
      status,
      updatedAt: new Date(),
    });

    res.json({ id: cameraId, message: "Camera updated successfully" });
  } catch (err) {
    console.error("Error updating camera:", err);
    res.status(500).send("Error updating camera");
  }
});
// 🔹 DELETE xoá camera theo ID
router.delete("/:cameraId", verifyToken, async (req, res) => {
  const { cameraId } = req.params;
  console.log(cameraId);
  try {
    const cameraRef = admin.firestore
      .collection("users")
      .doc(req.uid)
      .collection("cameras")
      .doc(cameraId);

    await cameraRef.delete();
    res.json({ id: cameraId, message: "Camera deleted successfully" });
  } catch (err) {
    console.error("Error deleting camera:", err);
    res.status(500).send("Error deleting camera");
  }
});

// 🔹 GET lấy RTSP URL của một camera theo ID (cho VLC)
router.get("/:cameraId/rtsp", verifyToken, async (req, res) => {
  const { cameraId } = req.params;
  
  try {
    const cameraDoc = await admin.firestore
      .collection("users")
      .doc(req.uid)
      .collection("cameras")
      .doc(cameraId)
      .get();
    
    if (!cameraDoc.exists) {
      return res.status(404).json({ error: "Camera not found" });
    }
    
    const { streamUrl, cameraName, location } = cameraDoc.data();
    
    res.json({
      id: cameraId,
      cameraName,
      location,
      rtspUrl: streamUrl, // RTSP URL để VLC stream
    });
  } catch (err) {
    console.error("Error fetching camera RTSP:", err);
    res.status(500).send("Error fetching camera RTSP");
  }
});

export default router;
