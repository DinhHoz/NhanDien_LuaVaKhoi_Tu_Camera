import express from "express";
import admin from "../firebase/admin.js";
import { spawn } from "child_process";

const router = express.Router();

// 🔹 CACHE: Lưu URL camera vào RAM để tránh gọi Firestore liên tục
// Cấu trúc: { "cameraId": "rtsp://..." }
const streamUrlCache = {};

// Quản lý các tiến trình FFmpeg
const workerStreams = {};

// FFmpeg worker chạy FPS thấp để giảm tải CPU
const WORKER_FPS = 2;

// JPEG rỗng fallback (tránh crash khi chưa có frame)
const EMPTY_JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xd9]);

function startWorkerFFmpeg(cameraId, streamUrl) {
  console.log(`▶ Worker FFmpeg START for ${cameraId}`);

  const args = [
    // 1. Tối ưu input
    "-rtsp_transport",
    "udp", //
    "-analyzeduration",
    "5000000", // ⚡ Phân tích luồng nhanh (giảm độ trễ khởi động)
    "-probesize",
    "5000000",

    "-timeout",
    "10000000", // Timeout socket

    "-i",
    streamUrl,

    // 2. Tối ưu output (MJPEG stream)
    "-vf",
    `fps=${WORKER_FPS}`, // Chỉ lấy 2 khung hình/giây
    "-f",
    "image2pipe",
    "-vcodec",
    "mjpeg",
    "-q:v",
    "5", // Chất lượng ảnh vừa phải để giảm tải
    "-",
  ];

  console.log(`🔧 FFmpeg command: ffmpeg ${args.join(" ")}`);

  const ff = spawn("ffmpeg", args);

  workerStreams[cameraId] = {
    ffmpeg: ff,
    buffer: Buffer.alloc(0),
    lastFrame: null,
    createdAt: Date.now(),
  };

  const state = workerStreams[cameraId];

  // 🟥 LOG lỗi FFmpeg
  ff.stderr.on("data", (d) => {
    const msg = d.toString();
    // Chỉ log các lỗi thực sự nghiêm trọng để tránh spam console
    if (
      msg.includes("Error") ||
      msg.includes("Failed") ||
      msg.includes("panic")
    ) {
      console.error(`[worker-ffmpeg ${cameraId} ERR]`, msg);
    }
  });

  // 🟩 Xử lý dữ liệu ảnh đầu ra
  ff.stdout.on("data", (chunk) => {
    // Không log "Received bytes" mỗi lần để đỡ lag console
    state.buffer = Buffer.concat([state.buffer, chunk]);

    // Tìm điểm bắt đầu (SOI) và kết thúc (EOI) của ảnh JPEG
    const SOI = state.buffer.indexOf(Buffer.from([0xff, 0xd8]));
    const EOI = state.buffer.indexOf(Buffer.from([0xff, 0xd9]), SOI + 2);

    if (SOI !== -1 && EOI !== -1) {
      // Cắt frame hoàn chỉnh
      state.lastFrame = state.buffer.slice(SOI, EOI + 2);

      // Bỏ phần dữ liệu đã xử lý
      state.buffer = state.buffer.slice(EOI + 2);

      // console.log(`🖼️ [${cameraId}] Frame updated`); // Bật nếu cần debug
    }

    // Cơ chế an toàn: Xóa buffer nếu quá đầy (tránh tràn RAM)
    if (state.buffer.length > 5 * 1024 * 1024) {
      console.warn(`[worker-ffmpeg ${cameraId}] ⚠️ Buffer overflow reset`);
      state.buffer = Buffer.alloc(0);
    }
  });

  ff.on("exit", (code, signal) => {
    console.log(`🔄 Worker FFmpeg EXIT ${cameraId} (code: ${code})`);
    delete workerStreams[cameraId];
    // Xóa cache URL khi process chết để lần sau lấy lại từ DB (đề phòng URL đổi)
    delete streamUrlCache[cameraId];
  });

  ff.on("error", (err) => {
    console.error(`❌ [worker-ffmpeg ${cameraId}] Spawn error:`, err);
  });
}

router.get("/:cameraId", async (req, res) => {
  try {
    const camId = req.params.cameraId;

    // =========================================================
    // 🔹 FIX QUAN TRỌNG: Kiểm tra Cache trước khi gọi Firestore
    // =========================================================
    let streamUrl = streamUrlCache[camId];

    if (!streamUrl) {
      // Chỉ gọi Firestore khi chưa có URL trong RAM
      // console.log(`🔍 Fetching Firestore for ${camId}...`);
      const snap = await admin.firestore
        .collection("users")
        .doc(process.env.ADMIN_UID)
        .collection("cameras")
        .doc(camId)
        .get();

      if (!snap.exists) return res.status(404).send("Camera not found");

      streamUrl = snap.data().streamUrl;

      // Lưu vào Cache
      streamUrlCache[camId] = streamUrl;
    }

    // =========================================================

    // Nếu chưa có FFmpeg worker thì tạo mới
    if (!workerStreams[camId]) {
      console.log(`⚙️ Creating FFmpeg worker for ${camId}`);
      startWorkerFFmpeg(camId, streamUrl);

      res.set("Content-Type", "image/jpeg");
      return res.send(EMPTY_JPEG);
    }

    const state = workerStreams[camId];

    // Nếu chưa có frame nào (FFmpeg đang khởi động)
    if (!state.lastFrame) {
      // console.log(`⏳ Worker waiting first frame: ${camId}`);
      res.set("Content-Type", "image/jpeg");
      return res.send(EMPTY_JPEG);
    }

    // Trả frame mới nhất cho worker
    res.set("Content-Type", "image/jpeg");
    res.send(state.lastFrame);
  } catch (err) {
    console.error("❌ Worker Stream error:", err);
    res.set("Content-Type", "image/jpeg");
    res.send(EMPTY_JPEG);
  }
});

export default router;
