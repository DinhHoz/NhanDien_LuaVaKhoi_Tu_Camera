import { spawn } from "child_process";

export function createMjpegStream(streamUrl, res) {
  // Header chuẩn
  res.writeHead(200, {
    "Content-Type": "multipart/x-mixed-replace; boundary=frame",
    "Cache-Control": "no-cache",
    Connection: "close",
    Pragma: "no-cache",
  });

  const args = [
    "-nostdin",
    "-hide_banner",
    "-loglevel",
    "error",

    // 🔥 CẤU HÌNH CHO UDP (QUAN TRỌNG)
    "-rtsp_transport",
    "udp", // Vẫn dùng UDP như bạn cần

    // Tăng bộ đệm đầu vào cực đại để hứng gói tin UDP bị chậm
    "-probesize",
    "5000000", // 5MB
    "-analyzeduration",
    "5000000", // 5MB

    // Xử lý jitter (rung/lắc mạng) của UDP
    "-max_delay",
    "1000000", // Cho phép trễ tới 1 giây để sắp xếp lại gói tin
    "-reorder_queue_size",
    "1000", // Bộ đệm sắp xếp lại gói tin UDP bị lộn xộn

    "-i",
    streamUrl,

    // 🔥 CẤU HÌNH ĐẦU RA CHO WEB & MOBILE
    "-vf",
    "fps=7,scale=640:360:force_original_aspect_ratio=decrease,pad=640:360:(ow-iw)/2:(oh-ih)/2", // Giữ nguyên tỷ lệ 16:9, 7fps cân bằng
    "-q:v",
    "4", // Quality vừa phải cho cả web và mobile (1-31, càng thấp càng net)
    "-f",
    "image2pipe", // Xuất ra đường ống
    "-vcodec",
    "mjpeg", // Mã hóa thành ảnh JPEG
    "-",
  ];

  const ff = spawn("ffmpeg", args, {
    windowsHide: true,
    stdio: ["ignore", "pipe", "ignore"],
  });

  // --- XỬ LÝ BUFFER AN TOÀN ---
  let buffer = Buffer.alloc(0);

  ff.stdout.on("data", (chunk) => {
    buffer = Buffer.concat([buffer, chunk]);

    let start, end;
    // Tìm điểm bắt đầu của ảnh JPEG (0xFF 0xD8)
    while ((start = buffer.indexOf(Buffer.from([0xff, 0xd8]))) !== -1) {
      // Tìm điểm kết thúc của ảnh JPEG (0xFF 0xD9)
      end = buffer.indexOf(Buffer.from([0xff, 0xd9]), start + 2);

      if (end !== -1) {
        // Cắt lấy đúng 1 tấm ảnh hoàn chỉnh
        const jpeg = buffer.subarray(start, end + 2);
        buffer = buffer.subarray(end + 2); // Xóa phần đã lấy khỏi buffer

        // Gửi header boundary cho từng frame (Flutter rất cần cái này)
        try {
          res.write("--frame\r\n");
          res.write("Content-Type: image/jpeg\r\n");
          res.write(`Content-Length: ${jpeg.length}\r\n`);
          res.write("\r\n");
          res.write(jpeg);
          res.write("\r\n");
        } catch (e) {
          // Nếu client ngắt kết nối thì dừng ghi
          ff.kill();
          return;
        }
      } else {
        // Nếu chưa đủ dữ liệu cho 1 ảnh, thoát vòng lặp đợi chunk tiếp theo
        break;
      }
    }
  });

  ff.on("error", (err) => {
    console.error("FFmpeg error:", err);
    if (!res.writableEnded) res.end();
  });

  // Khi Client (Flutter) ngắt kết nối (thoát màn hình) -> Kill FFmpeg ngay lập tức
  res.on("close", () => {
    console.log("Client disconnected, killing FFmpeg process...");
    ff.kill("SIGKILL");
  });
}
