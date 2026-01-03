Đây là nội dung file `README.md` được thiết kế chuyên nghiệp và chi tiết dựa trên mã nguồn Backend bạn đã cung cấp. Tài liệu này bao gồm kiến trúc hệ thống, hướng dẫn cài đặt và mô tả các API chính.

---

# 🚀 AI Fire & Smoke Detection System - Backend

Hệ thống Backend được xây dựng trên nền tảng **Node.js** và **Express**, tích hợp trí tuệ nhân tạo để nhận diện hỏa hoạn và khói từ luồng Camera RTSP theo thời gian thực. Hệ thống sử dụng **Firebase** để quản lý dữ liệu/xác thực, **FFmpeg** để xử lý stream và **Socket.io** để thông báo khẩn cấp.

## 🛠 Công nghệ sử dụng

* **Runtime:** Node.js (Express.js)
* **Database & Auth:** Firebase Firestore, Firebase Admin SDK.
* **Media Processing:** FFmpeg (để trích xuất frame và cắt clip video).
* **Real-time:** WebSockets (ws) để đẩy thông báo ngay lập tức.
* **Cloud Storage:** Cloudinary (Lưu trữ ảnh và video clip bằng chứng).
* **AI Integration:** Axios để giao tiếp với Python AI Detector (YOLO).

---

## 📂 Cấu trúc mã nguồn chính

| File/Folder | Chức năng |
| --- | --- |
| `auth.js` | Quản lý Đăng ký/Đăng nhập người dùng qua Firebase Auth. |
| `adminRoutes.js` | Các API đặc quyền dành cho Admin: Quản lý nhân viên, reset mật khẩu. |
| `cameras.js` | Quản lý danh sách Camera (CRUD) và lấy URL RTSP. |
| `detect.js` | **Trái tim hệ thống:** Nhận ảnh từ worker, gửi đến AI, xử lý logic tạo cảnh báo và cắt clip video. |
| `alerts.js` | Quản lý lịch sử cảnh báo, gửi thông báo đẩy (FCM) và ghi vào Firestore. |
| `streamFrame.js` | Sử dụng FFmpeg để trích xuất ảnh từ luồng RTSP phục vụ việc xem live FPS thấp. |
| `alertsWs.js` | Thiết lập kết nối WebSocket để đẩy cảnh báo thời gian thực lên Mobile/Web. |
| `cameraWorker.js` | API dành riêng cho các máy trạm (Worker) để lấy danh sách camera cần quét. |

---

## 💡 Các luồng xử lý quan trọng

### 1. Luồng Nhận diện & Cảnh báo (Detection Flow)

1. **Worker** gửi một frame ảnh kèm `cameraId` tới `/api/detect`.
2. Backend gửi ảnh sang **Python Detector**.
3. Nếu phát hiện Cháy/Khói:
* **Phase 1 (Early Alert):** Gửi ngay tín hiệu qua WebSocket để Client rung chuông báo động.
* **Phase 2 (Full Alert):** Upload ảnh lên Cloud, tạo bản ghi Alert trong Firestore, gửi thông báo đẩy **FCM**.
* **Video Logic:** Sử dụng `videoRecorder` để cắt một đoạn clip 30 giây làm bằng chứng và gửi URL cho người dùng.



### 2. Luồng Stream Camera (FFmpeg Worker)

* Hệ thống khởi tạo một tiến trình FFmpeg chạy ngầm khi có yêu cầu stream.
* Sử dụng cơ chế **Cache RAM** (`streamUrlCache`) để tránh truy vấn Firestore liên tục, giúp giảm độ trễ tối đa.
* Tự động reset buffer nếu tràn RAM để đảm bảo hệ thống chạy 24/7 ổn định.

---

## 🛠 Cài đặt & Triển khai

### 1. Yêu cầu hệ thống

* Node.js v16+
* **FFmpeg** đã được cài đặt trong biến môi trường (Environment Variables).
* Tài khoản Firebase (lấy file `serviceAccountKey.json`).
* Tài khoản Cloudinary (để lưu trữ media).

### 2. Cấu hình môi trường (`.env`)

Tạo file `.env` tại thư mục gốc:

```env
PORT=3000
FIREBASE_API_KEY=your_api_key
WORKER_SECRET=your_secret_string
ADMIN_UID=uid_của_admin_hệ_thống
DETECTOR_URL=http://localhost:8000/detect
CLOUDINARY_URL=your_cloudinary_link

```

### 3. Khởi chạy

```bash
npm install
npm start

```

---

## 📡 Danh sách API tiêu biểu

### Hệ thống Cảnh báo

* `GET /api/alerts`: Lấy danh sách cảnh báo của người dùng hiện tại.
* `POST /api/alerts`: Tạo cảnh báo mới (Dành cho Worker/Internal).
* `PATCH /api/alerts`: Đánh dấu đã đọc hoặc ẩn cảnh báo.

### Quản lý Camera

* `GET /api/cameras`: Lấy danh sách camera đã thêm.
* `POST /api/cameras`: Thêm camera mới (RTSP URL, vị trí...).
* `GET /api/cameras/:id/rtsp`: Lấy link gốc để xem qua phần mềm như VLC.

### Live Stream (Frame-based)

* `GET /api/stream-frame/:cameraId`: Lấy ảnh mới nhất từ luồng camera (dùng cho giao diện xem nhiều camera cùng lúc).

---

## 🔒 Bảo mật

* **JWT Verify:** Mọi API của người dùng đều yêu cầu Firebase Token.
* **Worker Secret:** Các API nhạy cảm (như tạo cảnh báo, lấy danh sách camera hệ thống) yêu cầu header `x-worker-secret`.
* **Admin Role:** Chỉ tài khoản có `role: "admin"` trong Firestore mới truy cập được các route quản lý nhân sự.

---

*Phát triển bởi [Tên của bạn/Team]* *Hệ thống được tối ưu để hoạt động ổn định trên các thiết bị Edge Computing.*

---

**Bạn có muốn tôi viết thêm hướng dẫn chi tiết về cách cấu hình Firebase hoặc hướng dẫn tích hợp với Python Detector không?**