import { spawn } from "child_process";
import path from "path";
import fs from "fs";
import os from "os";

const TMP_DIR = os.tmpdir();

// cut last `seconds` from input file (use ffmpeg -sseof)
// returns outputPath
export function cutLastSeconds(inputPath, seconds = 30) {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(inputPath)) {
      return reject(new Error("Input segment not found"));
    }

    const timestamp = Date.now();
    const outPath = path.join(
      TMP_DIR,
      `clip_${path.basename(inputPath, ".mp4")}_${timestamp}.mp4`
    );

    // -sseof -<seconds> -i input -c copy -y output
    const args = [
      "-nostdin",
      "-hide_banner",
      "-loglevel",
      "warning",
      "-sseof",
      `-${seconds}`,
      "-i",
      inputPath,
      "-c",
      "copy",
      "-y",
      outPath,
    ];

    const ff = spawn("ffmpeg", args, {
      windowsHide: true,
      detached: false,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stderr = "";
    ff.stderr.on("data", (d) => {
      stderr += d.toString();
    });

    ff.on("exit", (code) => {
      if (code === 0 && fs.existsSync(outPath)) {
        resolve(outPath);
      } else {
        reject(new Error("ffmpeg cut failed: " + stderr));
      }
    });
  });
}

export default { cutLastSeconds };
