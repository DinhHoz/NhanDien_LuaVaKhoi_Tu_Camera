import dotenv from "dotenv";
import express from "express";
import expressWs from "express-ws";
import cors from "cors";

import detectRouter from "./routes/detect.js";
import cameraRouter from "./routes/cameras.js";
import alertRouter from "./routes/alerts.js";
import authRouter from "./routes/auth.js";
import adminRouter from "./routes/adminRoutes.js";
import cameraWorkerRouter from "./routes/cameraWorker.js";

import { setupAlertsWs } from "./utils/alertsSocket.js";

import streamRoute from "./routes/stream.js"; // MJPEG stream (HTTP)
import streamFrameRoute from "./routes/streamFrame.js"; // Frame cho worker
import fileUpload from "express-fileupload";


dotenv.config();

// Init
const app = express();
expressWs(app); // vẫn cần cho alerts WS

// Middlewares
app.use(
  cors({
    origin: "*",
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(fileUpload());

// WebSocket Alerts (vẫn giữ nguyên)
setupAlertsWs(app);

// Health check
app.get("/", (req, res) => {
  res.send("Fire Detection API is running!");
});

// REST routes
app.use("/api/cameras/worker", cameraWorkerRouter);
app.use("/api/detect", detectRouter);
app.use("/api/cameras", cameraRouter);
app.use("/api/alerts", alertRouter);
app.use("/api/auth", authRouter);
app.use("/api/admin", adminRouter);

// STREAM ROUTES (luồng mới)
app.use("/api/stream", streamRoute); // MJPEG → Frontend xem live
app.use("/api/stream-frame", streamFrameRoute); // Worker lấy frame từ backend


// Không dùng WS stream nữa → xóa setupStreamRoute

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});
