
# 🐰 RabbitFire Frontend - AI Fire & Smoke Detection System

Phần giao diện người dùng của hệ thống **RabbitFire** được xây dựng bằng **React**, **Tailwind CSS** và **Firebase**. Hệ thống cung cấp trải nghiệm giám sát trực quan, hiện đại với hiệu ứng Glassmorphism, cho phép theo dõi camera thời gian thực và quản lý các cảnh báo cháy/khói một cách thông minh.

## ✨ Tính năng nổi bật
* **📺 Giám sát đa luồng (Multi-Camera View):** Hỗ trợ bố cục linh hoạt (1x1, 2x2, 3x3) để xem đồng thời nhiều luồng stream MJPEG.
* **🔔 Thông báo thời gian thực:** Tích hợp Firebase Cloud Messaging và Firestore `onSnapshot` để cập nhật cảnh báo ngay lập tức mà không cần tải lại trang.
* **📊 Nhật ký cảnh báo chi tiết:** Trang lịch sử (`/alert`) với bộ lọc tìm kiếm theo thời gian, vị trí và loại đối tượng (lửa/khói).
* **🔐 Phân quyền người dùng:** Hệ thống xác thực Firebase phân cấp giữa `admin` (quản lý nhân sự, camera) và `user` (giám sát).
* **🎨 Giao diện Glassmorphism:** Thiết kế hiện đại, mượt mà với Tailwind CSS, tối ưu hóa cho trải nghiệm người dùng chuyên nghiệp.

## 🛠 Công nghệ sử dụng

* **Framework:** React (Vite).
* **Styling:** Tailwind CSS, React Icons.
* **Backend as a Service:** Firebase (Authentication, Firestore).
* **State Management:** React Context API (Auth, Notifications).
* **Routing:** React Router DOM.

## 📂 Cấu trúc mã nguồn chính

| File | Chức năng |
| --- | --- |
| `Login.jsx` | Trang đăng nhập với hiệu ứng hạt trôi nổi và xác thực Firebase. |
| `Dashboard.jsx` | Trung tâm điều hướng, hiển thị thống kê nhanh và các tính năng dựa trên vai trò. |
| `Cameras.jsx` | Giao diện xem camera trực tiếp, quản lý layout và nạp luồng MJPEG từ API. |
| `AlertsPage.jsx` | Tra cứu lịch sử cảnh báo với bộ lọc nâng cao và xem chi tiết hình ảnh bằng chứng. |
| `NotificationsPage.jsx` | Quản lý các thông báo mới nhất trong ngày, đánh dấu đã đọc và xóa thông báo. |
| `AuthContext.jsx` | Quản lý trạng thái đăng nhập và nạp quyền (role) từ Firestore. |

---

## 🚀 Hướng dẫn cài đặt

### 1. Yêu cầu hệ thống

* Node.js v18.x trở lên.
* Một Project Firebase đã cấu hình Firestore và Authentication.

### 2. Cấu hình biến môi trường

Tạo file `.env` tại thư mục gốc của frontend:

```env
VITE_API_URL=http://localhost:3000
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id

```

### 3. Khởi chạy

```bash
# Cài đặt thư viện
npm install

# Chạy ở môi trường development
npm run dev

```

---

## 📺 Chức năng giám sát Camera

Trong trang **Cameras**, hệ thống sử dụng cơ chế nạp luồng ảnh `<img>` liên tục (MJPEG) từ Backend:

* **URL Stream:** `${API_URL}/api/stream/${camId}?token=${token}&position=${index}`.
* Mỗi Camera View được gán một `position` để Backend định danh và quản lý các luồng FFmpeg riêng biệt.

## 🛡️ Bảo mật

* **Protected Routes:** Sử dụng `ProtectedRoute.jsx` để ngăn chặn truy cập trái phép vào Dashboard khi chưa đăng nhập.
* **Admin Guard:** Các tính năng nhạy cảm như "Quản lý Users" và "Quản lý Cameras" chỉ hiển thị và cho phép truy cập nếu `role === 'admin'`.
* **Token Authentication:** Mọi yêu cầu lấy luồng stream hoặc danh sách cảnh báo đều đính kèm Firebase ID Token trong Header.

---
*Dự án được phát triển nhằm mục đích nâng cao an toàn phòng cháy chữa cháy dựa trên công nghệ AI.*