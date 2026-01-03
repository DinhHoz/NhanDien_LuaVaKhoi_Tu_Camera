
---

# 📱 RabbitFire Mobile App - AI Fire & Smoke Detection System

Ứng dụng di động **RabbitFire** được phát triển bằng framework **Flutter**, cung cấp giao diện giám sát an ninh hiện đại, mượt mà và trực quan. Ứng dụng cho phép người dùng nhận cảnh báo tức thời và xem luồng trực tiếp từ các camera AI để phản ứng nhanh với các sự cố hỏa hoạn.

## ✨ Tính năng chính

* **🔐 Xác thực & Bảo mật:**
* Đăng ký và đăng nhập thông qua **Firebase Authentication**.
* Cơ chế đổi mật khẩu an toàn và đăng xuất bảo mật.


* **📺 Giám sát Camera trực tiếp:**
* Xem luồng video (Frame-by-frame polling) thời gian thực với độ trễ thấp.
* Giao diện xem camera chuẩn điện ảnh (Cinematic) với tỷ lệ 16:9.
* Hiệu ứng kính mờ (Glassmorphism) và chế độ xem toàn màn hình.


* **🔔 Hệ thống thông báo thông minh:**
* Nhận thông báo đẩy (Push Notifications) qua **Firebase Cloud Messaging (FCM)**.
* Quản lý danh sách thông báo với bộ lọc nâng cao theo trạng thái (đã đọc/chưa đọc), theo camera và theo thời gian.


* **📊 Chi tiết cảnh báo:**
* Xem hình ảnh bằng chứng, loại sự cố (Lửa/Khói), thời gian và vị trí chính xác của sự kiện.
* Tự động cập nhật trạng thái "Đã đọc" khi xem chi tiết.


* **🛠 Quản lý thiết bị:** Thêm camera mới dễ dàng bằng cách nhập tên, vị trí và luồng RTSP/Stream URL.

## 🛠 Công nghệ sử dụng

* **Framework:** Flutter (Dart).
* **Backend Integration:** Firebase (Auth, Firestore, Messaging).
* **UI/UX:**
* `Google Fonts (Poppins, Lato, Oxanium)` cho kiểu chữ hiện đại.
* `Flutter Animate` cho các hiệu ứng chuyển động mượt mà.
* `Flutter Staggered Grid View` cho bố cục lưới linh hoạt.


* **Local Storage:** `Shared Preferences` để lưu trữ cài đặt và cache token.

## 📂 Cấu trúc thư mục UI chính

| File | Chức năng |
| --- | --- |
| `login_screen.dart` | Giao diện đăng nhập, xử lý xác thực và cập nhật FCM token lên Server. |
| `UI_register.dart` | Giao diện đăng ký người dùng mới và khởi tạo profile trên Firestore. |
| `UI_device.dart` | Màn hình chính hiển thị danh sách các thiết bị camera với bản xem trước (Live Preview). |
| `CameraStreamScreen.dart` | Chế độ xem luồng trực tiếp toàn màn hình với Badge "LIVE" nhấp nháy. |
| `UI_notification.dart` | Trung tâm thông báo tích hợp bộ lọc đa năng (Filter). |
| `UI_alert_detail.dart` | Hiển thị thông tin chi tiết về một sự cố cảnh báo cụ thể. |
| `UI_profile.dart` | Quản lý thông tin cá nhân, cài đặt bảo mật và đăng xuất. |
| `UI_Add_Camera.dart` | Form nhập liệu để cấu hình thêm camera mới vào hệ thống. |

---

## 🚀 Hướng dẫn cài đặt & Khởi chạy

### 1. Yêu cầu hệ thống

* Flutter SDK (phiên bản mới nhất).
* Android Studio / Xcode (để chạy giả lập).
* Tài khoản Firebase đã cấu hình ứng dụng Android/iOS.

### 2. Cấu hình Firebase

1. Tải tệp `google-services.json` (Android) hoặc `GoogleService-Info.plist` (iOS) từ Firebase Console.
2. Đặt tệp vào thư mục tương ứng trong dự án Flutter.
3. Đảm bảo **Firestore** và **Authentication** đã được kích hoạt.

### 3. Cấu hình Backend

Thay đổi địa chỉ IP Backend trong các tệp sau để khớp với Server của bạn:

* `UI_device.dart`: Biến `_camerasApiUrl` và `_streamFrameBaseUrl`.
* `CameraStreamScreen.dart`: Biến `_backendBaseUrl`.
* `UI_Add_Camera.dart`: Biến `apiUrl` trong hàm `_addNewCamera`.

### 4. Chạy ứng dụng

```bash
# Lấy các packages cần thiết
flutter pub get

# Chạy ứng dụng
flutter run

```

---

## 🎨 Giao diện & Trải nghiệm (UI/UX)

Ứng dụng được thiết kế theo phong cách **Modern Clean**:

* **Màu sắc:** Sử dụng tông màu Blue Modern (chủ đạo) kết hợp nền xám nhạt (Surface Color) để tạo cảm giác chuyên nghiệp.
* **Hiệu ứng:** Sử dụng `BackdropFilter` để tạo các lớp kính mờ (Blur) hiện đại trên các nút điều khiển và Header.
* **Tương tác:** Chạm vào màn hình stream để ẩn/hiện các thông tin lớp phủ (Overlay).

---

*Đây là một phần của hệ thống RabbitFire, đảm bảo Backend và AI Detector cũng được khởi chạy để trải nghiệm đầy đủ tính năng.*