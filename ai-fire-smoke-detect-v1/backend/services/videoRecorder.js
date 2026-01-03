import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import os from "os";

const TMP_DIR = os.tmpdir();
const SEGMENT_TIME = Number(process.env.VIDEO_SEGMENT_TIME || 60); // seconds
const MAX_SEGMENTS = Number(process.env.VIDEO_MAX_SEGMENTS || 3); // keep last N segments

// state
const recorders = new Map(); // cameraId -> { proc, dir, pattern }

function cameraTmpPrefix(cameraId) {
  // folder per camera to avoid collisions
  const dir = path.join(TMP_DIR, `rec_${cameraId}`);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export function startRecorderForCamera(cameraId, streamUrl) {
  if (recorders.has(cameraId)) {
    const st = recorders.get(cameraId);
    if (st && st.proc && !st.proc.killed) {
      return; // already running
    }
  }

  const dir = cameraTmpPrefix(cameraId);
  // pattern: camid_%03d.mp4
  const pattern = path.join(dir, `${cameraId}_%03d.mp4`);

  // Build ffmpeg args:
  // -i <streamUrl> -c copy -f segment -segment_time <SEGMENT_TIME> -reset_timestamps 1 <pattern>
  const args = [
    "-nostdin",
    "-hide_banner",
    "-loglevel",
    "warning",
    "-i",
    streamUrl,
    "-c",
    "copy",
    "-f",
    "segment",
    "-segment_time",
    String(SEGMENT_TIME),
    "-reset_timestamps",
    "1",
    "-map",
    "0", // map all streams
    pattern,
  ];

  const ff = spawn("ffmpeg", args, {
    windowsHide: true,
    detached: false,
    stdio: ["ignore", "pipe", "pipe"],
  });

  ff.stderr.on("data", (d) => {
    // keep small logs for debugging
    const s = d.toString();
    if (!s.toLowerCase().includes("frame=")) {
      console.debug(`[recorder ${cameraId}] ffmpeg:`, s.trim());
    }
  });

  ff.on("exit", (code, signal) => {
    console.warn(`[recorder ${cameraId}] exited code=${code} signal=${signal}`);
    // try restart after a bit
    setTimeout(() => startRecorderForCamera(cameraId, streamUrl), 2000);
  });

  recorders.set(cameraId, { proc: ff, dir, pattern });

  // Periodic cleanup to keep only last MAX_SEGMENTS files
  setTimeout(() => cleanupSegments(cameraId), 5000);
}

function cleanupSegments(cameraId) {
  const st = recorders.get(cameraId);
  if (!st) return;
  const files = fs
    .readdirSync(st.dir)
    .filter((f) => f.endsWith(".mp4"))
    .map((f) => ({ f, t: fs.statSync(path.join(st.dir, f)).mtimeMs }))
    .sort((a, b) => b.t - a.t);

  const toKeep = files.slice(0, MAX_SEGMENTS);
  const toDelete = files.slice(MAX_SEGMENTS);
  toDelete.forEach((x) => {
    try {
      fs.unlinkSync(path.join(st.dir, x.f));
    } catch (e) {}
  });
}

// Return the path to the latest segment file, or null
export function getLatestSegment(cameraId) {
  const st = recorders.get(cameraId);
  if (!st) return null;
  try {
    const files = fs
      .readdirSync(st.dir)
      .filter((f) => f.endsWith(".mp4"))
      .map((f) => ({
        path: path.join(st.dir, f),
        mtime: fs.statSync(path.join(st.dir, f)).mtimeMs,
      }))
      .sort((a, b) => b.mtime - a.mtime);

    if (files.length === 0) return null;
    return files[0].path;
  } catch (err) {
    console.error("[videoRecorder] getLatestSegment error:", err.message);
    return null;
  }
}

// Optional: stop recorder
export function stopRecorder(cameraId) {
  const st = recorders.get(cameraId);
  if (!st) return;
  try {
    st.proc.kill("SIGTERM");
  } catch (e) {}
  recorders.delete(cameraId);
}

export default {
  startRecorderForCamera,
  getLatestSegment,
  stopRecorder,
};
