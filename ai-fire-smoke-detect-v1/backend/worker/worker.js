import axios from "axios";
import FormData from "form-data";
import dotenv from "dotenv";
import path from "path";

// Load ENV
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

// ================= ENV =================
const BACKEND = process.env.BACKEND_URL || "http://localhost:3000";
const ADMIN_UID = process.env.ADMIN_UID||"Xs06tWhNvTYnKbKzoY3W1zdaB2F2";
const WORKER_SECRET = process.env.WORKER_SECRET||"123456";
const FRAME_INTERVAL = Number(process.env.FRAME_INTERVAL || 1000);

if (!WORKER_SECRET) {
  console.error("❌ WORKER_SECRET missing");
  process.exit(1);
}

if (!ADMIN_UID) {
  console.error("❌ ADMIN_UID missing");
  process.exit(1);
}

console.log("Worker ENV:", {
  BACKEND,
  ADMIN_UID,
  FRAME_INTERVAL,
  WORKER_SECRET: WORKER_SECRET ? "OK" : "MISSING",
});

// ================= CAPTURE FRAME FROM BACKEND =================
// Lấy frame từ backend, không đọc RTSP trực tiếp nữa
async function captureFrame(cameraId) {
  const url = `${BACKEND}/api/stream-frame/${cameraId}`;

  try {
    const res = await axios.get(url, {
      responseType: "arraybuffer",
      headers: { "x-worker-secret": WORKER_SECRET },
      timeout: 15000,
    });

    return Buffer.from(res.data);
  } catch (err) {
    throw new Error("Frame fetch failed: " + err.message);
  }
}

// ================= SEND TO DETECTOR =================
async function sendToDetector(buffer, camera) {
  const form = new FormData();

  form.append("image", buffer, {
    filename: `${camera.cameraId}.jpg`,
    contentType: "image/jpeg",
  });

  form.append("cameraId", camera.cameraId);
  form.append("cameraName", camera.cameraName);
  form.append("location", camera.location);
  form.append("userId", camera.userId); // Gửi thêm userId sở hữu camera

  try {
    await axios.post(`${BACKEND}/api/detect`, form, {
      headers: {
        ...form.getHeaders(),
        "x-worker-secret": WORKER_SECRET,
      },
      timeout: 15000,
    });
  } catch (err) {
    console.error(`Detect failed [${camera.cameraId}]:`, err.message);
  }
}

// ================= PROCESS CAMERA LOOP =================
async function processCamera(camera) {
  console.log(`▶ Worker started for camera ${camera.cameraId}`);

  while (true) {
    try {
      const frameBuffer = await captureFrame(camera.cameraId);
      await sendToDetector(frameBuffer, camera);
    } catch (err) {
      console.error(`Camera ${camera.cameraId} error:`, err.message);
      await new Promise((r) => setTimeout(r, 5000));
    }

    await new Promise((r) => setTimeout(r, FRAME_INTERVAL));
  }
}

// ================= LOAD CAMERAS =================
async function loadCameras() {
  try {
    const res = await axios.get(`${BACKEND}/api/cameras/worker/list`, {
      headers: { "x-worker-secret": WORKER_SECRET },
    });

    return res.data;
  } catch (err) {
    console.error("Failed to load cameras:", err.message);
    return null;
  }
}

// ================= BOOT =================
async function start() {
  console.log("🔥 Worker booting…");

  const cameras = await loadCameras();
  console.log("📷 Loaded cameras:", cameras);

  if (!cameras || cameras.length === 0) {
    console.log("⚠ No cameras → retry in 10s");
    return setTimeout(start, 10000);
  }

  cameras.forEach((cam) => processCamera(cam));
}

start();