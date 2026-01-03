// utils/streamFlutter.js  ← BẢN HOÀN HẢO – CHẠY NGON LẮNG
import ffmpeg from "fluent-ffmpeg";

/**
 * Tạo MJPEG stream cho Flutter (có CORS headers, tự dọn dẹp khi client rời).
 * @param {string} rtspUrl  URL RTSP của camera
 * @param {object} req      Express request (để lắng nghe sự kiện close)
 * @param {object} res      Express response
 */
export function createMjpegStreamFlutter(rtspUrl, req, res) {
  // Header MJPEG chuẩn + CORS
  res.writeHead(200, {
    "Content-Type": "multipart/x-mixed-replace; boundary=frame",
    "Cache-Control": "no-cache, no-store, must-revalidate",
    "Pragma": "no-cache",
    "Expires": "0",
    "Connection": "keep-alive",
    "Access-Control-Allow-Origin": "*",
  });

  // Khi client đóng kết nối → dọn dẹp
  let isDestroyed = false;
  req.on("close", () => {
    isDestroyed = true;
    if (command) command.kill("SIGKILL");
  });

  let command = null;

  const startStream = () => {
    if (isDestroyed || res.writableEnded) return;

    command = ffmpeg(rtspUrl)
      .inputOptions([
        "-rtsp_transport",
        "udp",
        "-buffer_size",
        "2048000",
        "-fflags",
        "nobuffer",
        "-flags",
        "low_delay",
        "-strict",
        "experimental",
        "-re",
      ])
      .outputOptions([
        "-f",
        "mjpeg",
        "-q:v",
        "5",
        "-r",
        "20",
        "-vf",
        "scale=trunc(iw/2)*2:trunc(ih/2)*2",
      ])
      .format("mjpeg")
      .on("start", () => {
        console.log(`FFmpeg started: ${rtspUrl.split("@")[1] || rtspUrl}`);
      })
      .on("error", (err) => {
        console.error("FFmpeg error:", err.message);
        if (!isDestroyed && !res.writableEnded) {
          try {
            res.end();
          } catch {}
        }
      });

    const stream = command.pipe();

    // Gửi từng khung JPEG tới client
    stream.on("data", (chunk) => {
      if (isDestroyed || res.writableEnded) return;
      try {
        res.write("--frame\r\n");
        res.write("Content-Type: image/jpeg\r\n");
        res.write(`Content-Length: ${chunk.length}\r\n\r\n`);
        res.write(chunk);
        res.write("\r\n");
      } catch (e) {
        isDestroyed = true;
      }
    });

    // Nếu không nhận được khung trong 15s → restart
    setTimeout(() => {
      if (!isDestroyed && command && !res.writableEnded) {
        console.log(`Restart FFmpeg (no frame >15s): ${rtspUrl}`);
        command.kill("SIGKILL");
        startStream();
      }
    }, 15000);
  };

  startStream();
}