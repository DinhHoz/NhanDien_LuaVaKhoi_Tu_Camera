import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/material.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:firebase_core/firebase_core.dart';
import '../services/notification_service.dart';
import '../models/alert.dart';
import '../screens/UI_alert_detail.dart';

class FcmAlertHandler {
  static final FcmAlertHandler _instance = FcmAlertHandler._internal();
  factory FcmAlertHandler() => _instance;
  FcmAlertHandler._internal();

  final FirebaseMessaging _messaging = FirebaseMessaging.instance;
  final NotificationService _notificationService = NotificationService();

  // Khai báo NavigatorKey để sử dụng trong toàn ứng dụng
  static final GlobalKey<NavigatorState> navigatorKey =
      GlobalKey<NavigatorState>();

  // Hàm xử lý thông báo nền (background)
  static Future<void> backgroundHandler(RemoteMessage message) async {
    try {
      await Firebase.initializeApp();
      print("🔥 Nhận alert nền từ FCM: ${message.messageId}");

      await _saveAlertFromFcm(message);
      _showLocalNotification(message);
    } catch (e) {
      print("❌ Lỗi trong background handler: $e");
    }
  }

  // Hàm xử lý thông báo khi ứng dụng đang chạy (foreground)
  Future<void> handleForegroundMessage(RemoteMessage message) async {
    print("🔥 Nhận alert foreground từ FCM: ${message.messageId}");

    try {
      await _saveAlertFromFcm(message);
      _showLocalNotification(message);
      _updateUiIfNeeded(message);
    } catch (e) {
      print("❌ Lỗi trong foreground handler: $e");
    }
  }

  // Lưu alert từ FCM vào Firestore sử dụng model Alert
  static Future<void> _saveAlertFromFcm(RemoteMessage message) async {
    try {
      final user = FirebaseAuth.instance.currentUser;
      if (user == null) {
        print("⚠️ Không có user đăng nhập, bỏ qua lưu alert");
        return;
      }

      final alertId = message.data['alertId'];
      if (alertId == null) {
        print("⚠️ Không tìm thấy alertId trong dữ liệu FCM");
        return;
      }

      final alertDoc =
          await FirebaseFirestore.instance
              .collection("users")
              .doc(user.uid)
              .collection("alerts")
              .doc(alertId)
              .get();

      if (alertDoc.exists) {
        print("✅ Alert đã tồn tại trong Firestore: $alertId");
        return;
      }

      final alert = Alert(
        alertId: alertId,
        cameraId: message.data['cameraId'] ?? 'unknown',
        cameraName: message.data['cameraName'] ?? 'Unknown Camera',
        location: message.data['location'] ?? 'Unknown Location',
        type: message.data['type'] ?? 'unknown',
        imageUrl: message.data['imageUrl'] ?? '',
        status: 'visible',
        timestamp: DateTime.now(),
        confidence:
            message.data['confidence'] != null
                ? double.tryParse(message.data['confidence']?.toString() ?? '')
                : null,
        fcmMessageId: message.messageId,
        isRead: false,
      );

      await FirebaseFirestore.instance
          .collection("users")
          .doc(user.uid)
          .collection("alerts")
          .doc(alertId)
          .set(alert.toJson());

      print("✅ Alert lưu vào Firestore thành công");
    } catch (e) {
      print("❌ Lỗi lưu alert: $e");
    }
  }

  // Hiển thị thông báo cục bộ
  static void _showLocalNotification(RemoteMessage message) {
    try {
      final title = message.notification?.title ?? 'Cảnh báo từ Camera';
      final body = message.notification?.body ?? 'Phát hiện sự cố!';
      final alertId = message.data['alertId'] ?? '';

      NotificationService().showNotification(
        id: DateTime.now().millisecondsSinceEpoch,
        title: title,
        body: body,
        payload: alertId, // Truyền alertId qua payload để điều hướng
      );
    } catch (e) {
      print("❌ Lỗi hiển thị thông báo cục bộ: $e");
    }
  }

  // Cập nhật UI nếu cần
  void _updateUiIfNeeded(RemoteMessage message) {
    print("📱 UI cần cập nhật cho alert: ${message.messageId}");
    // Có thể sử dụng StreamController hoặc Provider để thông báo UI cập nhật
  }

  // Khởi tạo handler và lắng nghe thông báo
  Future<void> initialize() async {
    NotificationSettings settings = await _messaging.requestPermission(
      alert: true,
      badge: true,
      sound: true,
    );

    if (settings.authorizationStatus == AuthorizationStatus.authorized) {
      print("✅ Quyền thông báo được cấp");
    } else {
      print("⚠️ Quyền thông báo bị từ chối");
    }

    FirebaseMessaging.onMessage.listen((RemoteMessage message) {
      handleForegroundMessage(message);
    });

    FirebaseMessaging.onMessageOpenedApp.listen((RemoteMessage message) {
      print("📱 Click vào thông báo: ${message.messageId}");
      _navigateToNotificationScreen(message);
    });

    String? token = await _messaging.getToken();
    print("FCM Token: $token");
  }

  // Điều hướng đến màn hình thông báo khi click vào FCM
  void _navigateToNotificationScreen(RemoteMessage message) {
    final alertId = message.data['alertId'];
    if (alertId != null && navigatorKey.currentContext != null) {
      Navigator.of(navigatorKey.currentContext!).push(
        MaterialPageRoute(builder: (_) => AlertDetailScreen(alertId: alertId)),
      );
    } else {
      print("⚠️ Không thể điều hướng: context null hoặc alertId không tồn tại");
    }
  }
}
