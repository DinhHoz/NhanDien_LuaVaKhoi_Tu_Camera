import { spawn } from "child_process";

// Quản lý các FFmpeg processes và broadcast đến nhiều clients
class StreamManager {
  constructor() {
    // Map lưu: cameraId -> { ffmpeg, clients: Set<res>, buffer }
    this.streams = new Map();
  }

  /**
   * Đăng ký client vào stream của camera
   * @param {string} cameraId - ID của camera
   * @param {string} streamUrl - RTSP URL của camera
   * @param {Response} res - Response object của Express
   */
  addClient(cameraId, streamUrl, res) {
    let stream = this.streams.get(cameraId);

    // Nếu stream chưa tồn tại, tạo FFmpeg process mới
    if (!stream) {
      console.log(`🎬 Khởi tạo stream mới cho camera: ${cameraId}`);
      stream = this.createStream(cameraId, streamUrl);
      this.streams.set(cameraId, stream);
    } else {
      console.log(`📡 Thêm client vào stream đang chạy: ${cameraId} (${stream.clients.size} clients)`);
    }

    // Thêm client vào danh sách
    stream.clients.add(res);

    // Gửi MJPEG headers
    res.writeHead(200, {
      "Content-Type": "multipart/x-mixed-replace; boundary=frame",
      "Cache-Control": "no-cache",
      Connection: "close",
      Pragma: "no-cache",
    });

    // Khi client ngắt kết nối, xóa khỏi danh sách
    res.on("close", () => {
      this.removeClient(cameraId, res);
    });

    return stream;
  }

  /**
   * Tạo FFmpeg process cho camera
   */
  createStream(cameraId, streamUrl) {
    const args = [
      "-nostdin",
      "-hide_banner",
      "-loglevel",
      "error",
      "-rtsp_transport",
      "udp",
      "-probesize",
      "5000000",
      "-analyzeduration",
      "5000000",
      "-max_delay",
      "1000000",
      "-reorder_queue_size",
      "1000",
      "-i",
      streamUrl,
      "-vf",
      "fps=7,scale=640:360:force_original_aspect_ratio=decrease,pad=640:360:(ow-iw)/2:(oh-ih)/2",
      "-q:v",
      "4",
      "-f",
      "image2pipe",
      "-vcodec",
      "mjpeg",
      "-",
    ];

    const ffmpeg = spawn("ffmpeg", args, {
      windowsHide: true,
      stdio: ["ignore", "pipe", "ignore"],
    });

    const stream = {
      ffmpeg,
      clients: new Set(),
      buffer: Buffer.alloc(0),
    };

    // Xử lý data từ FFmpeg và broadcast đến tất cả clients
    ffmpeg.stdout.on("data", (chunk) => {
      stream.buffer = Buffer.concat([stream.buffer, chunk]);

      let start, end;
      while ((start = stream.buffer.indexOf(Buffer.from([0xff, 0xd8]))) !== -1) {
        end = stream.buffer.indexOf(Buffer.from([0xff, 0xd9]), start + 2);

        if (end !== -1) {
          const jpeg = stream.buffer.subarray(start, end + 2);
          stream.buffer = stream.buffer.subarray(end + 2);

          // Broadcast frame đến TẤT CẢ clients
          this.broadcastFrame(cameraId, jpeg);
        } else {
          break;
        }
      }
    });

    ffmpeg.on("error", (err) => {
      console.error(`❌ FFmpeg error cho camera ${cameraId}:`, err);
      this.cleanup(cameraId);
    });

    ffmpeg.on("exit", (code) => {
      console.log(`🔚 FFmpeg process exited cho camera ${cameraId}, code: ${code}`);
      this.cleanup(cameraId);
    });

    return stream;
  }

  /**
   * Broadcast JPEG frame đến tất cả clients của camera
   */
  broadcastFrame(cameraId, jpeg) {
    const stream = this.streams.get(cameraId);
    if (!stream) return;

    const deadClients = [];

    stream.clients.forEach((res) => {
      try {
        res.write("--frame\r\n");
        res.write("Content-Type: image/jpeg\r\n");
        res.write(`Content-Length: ${jpeg.length}\r\n`);
        res.write("\r\n");
        res.write(jpeg);
        res.write("\r\n");
      } catch (e) {
        // Client đã ngắt kết nối
        deadClients.push(res);
      }
    });

    // Cleanup dead clients
    deadClients.forEach((res) => {
      stream.clients.delete(res);
      if (!res.writableEnded) {
        try {
          res.end();
        } catch (e) {
          // Ignore
        }
      }
    });

    // Nếu không còn client nào, dừng stream
    if (stream.clients.size === 0) {
      console.log(`🛑 Không còn client nào, dừng stream: ${cameraId}`);
      this.cleanup(cameraId);
    }
  }

  /**
   * Xóa client khỏi stream
   */
  removeClient(cameraId, res) {
    const stream = this.streams.get(cameraId);
    if (!stream) return;

    stream.clients.delete(res);
    console.log(`👋 Client ngắt kết nối khỏi camera ${cameraId} (còn ${stream.clients.size} clients)`);

    // Nếu không còn client nào, dừng FFmpeg
    if (stream.clients.size === 0) {
      console.log(`🛑 Không còn client nào, dừng stream: ${cameraId}`);
      this.cleanup(cameraId);
    }
  }

  /**
   * Dọn dẹp stream và kill FFmpeg process
   */
  cleanup(cameraId) {
    const stream = this.streams.get(cameraId);
    if (!stream) return;

    // Kill FFmpeg process
    try {
      stream.ffmpeg.kill("SIGKILL");
    } catch (e) {
      // Process đã chết rồi
    }

    // Đóng tất cả client connections
    stream.clients.forEach((res) => {
      if (!res.writableEnded) {
        try {
          res.end();
        } catch (e) {
          // Ignore
        }
      }
    });

    // Xóa khỏi map
    this.streams.delete(cameraId);
    console.log(`🧹 Đã cleanup stream: ${cameraId}`);
  }
}

// Singleton instance
export const streamManager = new StreamManager();
