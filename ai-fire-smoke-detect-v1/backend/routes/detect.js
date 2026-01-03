import express from "express";
import path from "path";
import fs from "fs";
import axios from "axios";
import FormData from "form-data";
import { fileURLToPath } from "url";

import { uploadImageToCloudinary } from "../utils/uploadImage.js";
import { uploadVideo } from "../utils/uploadVideo.js";
import { cutLastSeconds } from "../services/videoClipper.js";
import {
  startRecorderForCamera,
  getLatestSegment,
} from "../services/videoRecorder.js";

import { verifyToken } from "../middlewares/auth.js";
import admin from "../firebase/admin.js";
import { broadcastAlertToCameraUsers } from "../utils/alertsSocket.js";

const router = express.Router();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const DETECTOR_URL = process.env.DETECTOR_URL || "http://localhost:8000/detect";
const ALERT_API = process.env.ALERT_API || "http://localhost:3000/api/alerts";

// Tạo thư mục lưu ảnh tạm (nếu chưa có)
const UPLOAD_DIR = path.join(__dirname, "../uploads");
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR);

// ===================== BIẾN CACHE / CONFIG =====================
// Lưu clip video theo từng camera trong 30 phút
const VIDEO_CACHE = {}; // VIDEO_CACHE[cameraId] = { url, timestamp }

// Cache thông tin camera (streamUrl) trong 5 phút
const CAMERA_INFO_CACHE = {}; // CAMERA_INFO_CACHE[cameraId] = { streamUrl, cachedAt }

// Thời gian reuse clip: default 30 phút
const REUSE_MS = 30 * 60 * 1000;

// ⚡ FIX: Tăng TTL cache lên 5 phút (Thay vì 0 như cũ gây đọc liên tục)
const CAMERA_INFO_TTL = 5 * 60 * 1000;

// Cắt clip dài 30 giây
const CLIP_SEC = 30;

// Poll segment nhiều lần cho chắc
const SEGMENT_POLL_ATTEMPTS = 6;
const SEGMENT_POLL_INTERVAL_MS = 500;

// === CƠ CHẾ GIỚI HẠN ALERT (COOLDOWN) - ĐÃ TẮT ===
// const COOLDOWN_MINUTES = Number(process.env.ALERT_COOLDOWN_MINUTES || 8); 
// const COOLDOWN_MS = COOLDOWN_MINUTES * 60 * 1000;
// const ALERT_COOLDOWN = {}; 

// ==================================================================
// HÀM LẤY THÔNG TIN CAMERA (có cache 5 phút để giảm Firestore)
// ==================================================================
async function readCameraInfo(cameraId, ownerId) {
  const cached = CAMERA_INFO_CACHE[cameraId];
  const now = Date.now();

  // Nếu cache còn hạn → dùng cache
  if (cached && now - cached.cachedAt < CAMERA_INFO_TTL) {
    return cached;
  }

  try {
    const uid = ownerId || process.env.ADMIN_UID;
    if (!uid) {
        console.error("❌ Missing User UID for camera info fetch");
        return null;
    }

    const camSnap = await admin.firestore
      .collection("users")
      .doc(uid)
      .collection("cameras")
      .doc(cameraId)
      .get();

    if (!camSnap.exists) return null;

    const data = camSnap.data();

    CAMERA_INFO_CACHE[cameraId] = {
      streamUrl: data.streamUrl,
      cachedAt: now,
    };

    return CAMERA_INFO_CACHE[cameraId];
  } catch (err) {
    console.error("[readCameraInfo] Lỗi Firestore:", err.message);
    return null;
  }
}

// ==================================================================
// Poll đợi lấy segment mới nhất từ recorder
// ==================================================================
async function waitForLatestSegment(cameraId) {
  for (let i = 0; i < SEGMENT_POLL_ATTEMPTS; i++) {
    try {
      const seg = getLatestSegment(cameraId);
      if (seg) return seg;
    } catch (_) {}

    await new Promise((r) => setTimeout(r, SEGMENT_POLL_INTERVAL_MS));
  }
  return null;
}

// ==================================================================
// ========================= ROUTE DETECT ============================
// ==================================================================
router.post("/", verifyToken, async (req, res) => {
  try {
    if (!req.files || !req.files.image) {
      return res.status(400).json({ error: "Thiếu ảnh từ worker" });
    }

    const { cameraId, cameraName, location, userId } = req.body || {};
    if (!cameraId) return res.status(400).json({ error: "Thiếu cameraId" });

    // Lưu frame tạm dưới dạng file
    const buffer = req.files.image.data;
    const fileName = `${Date.now()}.jpg`;
    const filePath = path.join(UPLOAD_DIR, fileName);
    await fs.promises.writeFile(filePath, buffer);

    // Gửi sang Python detector
    const form = new FormData();
    form.append("image", fs.createReadStream(filePath));

    let detectRes;
    try {
      detectRes = await axios.post(DETECTOR_URL, form, {
        headers: form.getHeaders(),
        timeout: 10000,
      });
    } catch (err) {
      fs.promises.unlink(filePath).catch(() => {});
      return res.status(500).json({ error: "Detector không phản hồi" });
    }

    const result = detectRes.data;
    console.log(`[detect] Python Result for ${cameraId}:`, result);

    // TRẢ KẾT QUẢ CHO WORKER NGAY LẬP TỨC
    res.json(result);

    // Xác định có cảnh báo hay không
    const isAlert = result?.fire_detected && ["fire", "smoke"].includes(result.class);

    // ==============================================================
    // 🔴 ĐÃ TẮT: BLOCK CHECK COOLDOWN
    // ==============================================================
    /*
    const now = Date.now();
    const lastAlertAt = ALERT_COOLDOWN[cameraId] || 0;
    const withinCooldown = now - lastAlertAt < COOLDOWN_MS;

    if (isAlert && withinCooldown) {
      console.log(`[detect] Cooldown: Skip alert camera ${cameraId}`);
      fs.promises.unlink(filePath).catch(() => {});
      return;
    }
    */

    // ===================== PHASE 1: EARLY ALERT ======================
    if (isAlert) {
      console.log(`🚨 ALERT DETECTED! Camera: ${cameraName}, Class: ${result.class}, Conf: ${result.confidence}`);
      broadcastAlertToCameraUsers(cameraId, {
        type: result.class,
        cameraId,
        cameraName,
        location,
        confidence: result.confidence,
        timestamp: Date.now(),
        imageUrl: null,
        videoUrl: null,
        isEarly: true,
      }, userId); // Pass userId for direct broadcast
    }

    // ===================== PHASE 2: FULL ALERT ======================
    if (isAlert) {
      (async () => {
        try {
          const type = result.class;

          // -------- Upload ảnh --------
          let imageUrl = null;
          try {
            imageUrl = await uploadImageToCloudinary(filePath, "alerts");
          } catch (err) {
            console.error("[uploadImage] Lỗi:", err.message);
          }

          // -------- Tạo alert trong DB --------
          let alertId = null;
          try {
            const alertRes = await axios.post(
              ALERT_API,
              { cameraId, cameraName, location, type, imageUrl, userId }, 
              { headers: { "x-worker-secret": process.env.WORKER_SECRET } }
            );
            alertId = alertRes.data?.alertId;
          } catch (err) {
            console.error("[ALERT_API create] lỗi:", err.message);
          }

          // ===================== VIDEO LOGIC ==========================
          let finalVideoUrl = null;

          const camInfo = await readCameraInfo(cameraId, userId);

          if (camInfo?.streamUrl) {
            try {
              startRecorderForCamera(cameraId, camInfo.streamUrl);
            } catch (_) {}

            const cached = VIDEO_CACHE[cameraId];

            if (cached && Date.now() - cached.timestamp < REUSE_MS) {
              finalVideoUrl = cached.url;

              broadcastAlertToCameraUsers(cameraId, {
                type,
                cameraId,
                cameraName,
                location,
                confidence: result.confidence,
                timestamp: Date.now(),
                imageUrl,
                videoUrl: finalVideoUrl,
                isEarly: false,
              }, userId);

              if (alertId) {
                axios.patch(`${ALERT_API}/${alertId}`, { videoUrl: finalVideoUrl },
                    { headers: { "x-worker-secret": process.env.WORKER_SECRET } }
                ).catch(() => {});
              }
            } else {
              const segmentPath = await waitForLatestSegment(cameraId);

              if (segmentPath) {
                try {
                  const clipPath = await cutLastSeconds(segmentPath, CLIP_SEC);

                  if (clipPath && fs.existsSync(clipPath)) {
                    const up = await uploadVideo(clipPath, `fire_alerts/${cameraId}`);

                    finalVideoUrl = up?.secure_url;
                    VIDEO_CACHE[cameraId] = {
                      url: finalVideoUrl,
                      timestamp: Date.now(),
                    };

                    if (alertId && finalVideoUrl) {
                      axios.patch(`${ALERT_API}/${alertId}`, { videoUrl: finalVideoUrl },
                        { headers: { "x-worker-secret": process.env.WORKER_SECRET } }
                      ).catch(() => {});
                    }

                    broadcastAlertToCameraUsers(cameraId, {
                      type,
                      cameraId,
                      cameraName,
                      location,
                      confidence: result.confidence,
                      timestamp: Date.now(),
                      imageUrl,
                      videoUrl: finalVideoUrl,
                      isEarly: false,
                    }, userId);

                    fs.promises.unlink(clipPath).catch(() => {});
                  }
                } catch (err) {
                  console.log("[video clip error]", err.message);
                }
              }
            }
          }

          if (!finalVideoUrl) {
            broadcastAlertToCameraUsers(cameraId, {
              type,
              cameraId,
              cameraName,
              location,
              confidence: result.confidence,
              timestamp: Date.now(),
              imageUrl,
              videoUrl: null,
              isEarly: false,
            });
          }

          // 🔴 ĐÃ TẮT: Cập nhật timestamp cooldown
          // ALERT_COOLDOWN[cameraId] = Date.now();

        } catch (err) {
          console.error("[detect background] lỗi:", err.message);
        } finally {
          fs.promises.unlink(filePath).catch(() => {});
        }
      })();
    } else {
      fs.promises.unlink(filePath).catch(() => {});
    }
  } catch (err) {
    console.error("Detector error:", err);
    res.status(500).json({ error: "Detector error" });
  }
});

export default router;