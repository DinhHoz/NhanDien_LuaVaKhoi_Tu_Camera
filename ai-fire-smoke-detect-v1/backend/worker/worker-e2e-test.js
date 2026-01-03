import axios from "axios";
import FormData from "form-data";
import dotenv from "dotenv";
import path from "path";

// Load ENV
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

// ================= ENV =================
const BACKEND = process.env.BACKEND_URL || "http://localhost:3000";
const ADMIN_UID = process.env.ADMIN_UID || "Xs06tWhNvTYnKbKzoY3W1zdaB2F2";
const WORKER_SECRET = process.env.WORKER_SECRET || "123456";
const FRAME_INTERVAL = Number(process.env.FRAME_INTERVAL || 1000);

console.log("Worker E2E Test ENV:", {
  BACKEND,
  ADMIN_UID,
  FRAME_INTERVAL,
  WORKER_SECRET: WORKER_SECRET ? "OK" : "MISSING",
});

// ================= FPS COUNTER =================
let frameCount = 0;
let fpsStart = Date.now();

setInterval(() => {
  const now = Date.now();
  const elapsed = (now - fpsStart) / 1000;
  const fps = frameCount / elapsed;
  console.log(`📊 [E2E] Worker FPS: ${fps.toFixed(2)} (frames=${frameCount})`);
}, 2000);

// ================= CAPTURE FRAME =================
async function captureFrame(cameraId) {
  const url = `${BACKEND}/api/stream-frame/${cameraId}`;
  const sentAt = Date.now();

  try {
    const res = await axios.get(url, {
      responseType: "arraybuffer",
      headers: { "x-worker-secret": WORKER_SECRET, "x-sent-at": sentAt },
      timeout: 15000,
    });

    // Log latency của bước "lấy frame"
    const receivedAt = Date.now();
    console.log(
      `⏱️ [Latency] Fetch Frame: ${receivedAt - sentAt} ms (cam=${cameraId})`
    );

    return Buffer.from(res.data);
  } catch (err) {
    throw new Error("Frame fetch failed: " + err.message);
  }
}

// ================= SEND TO DETECTOR =================
async function sendToDetector(buffer, camera) {
  const sentAt = Date.now();

  const form = new FormData();
  form.append("image", buffer, {
    filename: `${camera.cameraId}.jpg`,
    contentType: "image/jpeg",
  });

  form.append("cameraId", camera.cameraId);
  form.append("cameraName", camera.cameraName);
  form.append("location", camera.location);

  try {
    await axios.post(`${BACKEND}/api/detect`, form, {
      headers: {
        ...form.getHeaders(),
        "x-worker-secret": WORKER_SECRET,
        "x-sent-at": sentAt,
      },
      timeout: 15000,
    });

    const doneAt = Date.now();
    console.log(
      `⚡ [Model Latency] Worker→AI→Worker: ${doneAt - sentAt} ms (cam=${
        camera.cameraId
      })`
    );
  } catch (err) {
    console.error(`Detect failed [${camera.cameraId}]:`, err.message);
  }
}

// ================= PROCESS CAMERA LOOP =================
async function processCamera(camera) {
  console.log(`▶ E2E Worker started for camera ${camera.cameraId}`);

  while (true) {
    try {
      const frameBuffer = await captureFrame(camera.cameraId);

      frameCount++; // tăng FPS count

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
  console.log("🔥 Worker E2E Testing booting…");

  const cameras = await loadCameras();
  console.log("📷 Loaded cameras:", cameras);

  if (!cameras || cameras.length === 0) {
    console.log("⚠ No cameras → retry in 10s");
    return setTimeout(start, 10000);
  }

  cameras.forEach((cam) => processCamera(cam));
}

start();
