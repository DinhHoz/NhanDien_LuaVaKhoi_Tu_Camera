import 'package:flutter/material.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:frontend/screens/UI_alert_detail.dart';
import 'package:frontend/services/fcm_alert_handler.dart';

class NotificationService {
  static final _notifications = FlutterLocalNotificationsPlugin();

  Future<void> initialize() async {
    const androidInit = AndroidInitializationSettings('@mipmap/ic_launcher');
    const settings = InitializationSettings(android: androidInit);

    await _notifications.initialize(
      settings,
      onDidReceiveNotificationResponse: (response) {
        final payload = response.payload;
        print("👉 Notification payload: $payload");
        if (payload != null &&
            payload.isNotEmpty &&
            FcmAlertHandler.navigatorKey.currentContext != null) {
          Navigator.of(FcmAlertHandler.navigatorKey.currentContext!).push(
            MaterialPageRoute(
              builder: (_) => AlertDetailScreen(alertId: payload),
            ),
          );
        } else {
          print(
            "⚠️ Không thể điều hướng: payload null hoặc context không tồn tại",
          );
        }
      },
    );
  }

  /// Yêu cầu quyền thông báo (Android 13+ và iOS)
  Future<bool> requestPermission() async {
    final messaging = FirebaseMessaging.instance;
    final settings = await messaging.requestPermission(
      alert: true,
      badge: true,
      sound: true,
    );

    print("🔔 Notification permission: ${settings.authorizationStatus}");
    return settings.authorizationStatus == AuthorizationStatus.authorized;
  }

  Future<void> showNotification({
    required int id,
    required String title,
    required String body,
    String? payload,
  }) async {
    const androidDetails = AndroidNotificationDetails(
      'default_channel',
      'Thông báo',
      channelDescription: 'Kênh mặc định cho thông báo',
      importance: Importance.max,
      priority: Priority.high,
      showWhen: true,
    );

    const notificationDetails = NotificationDetails(android: androidDetails);

    await _notifications.show(
      id,
      title,
      body,
      notificationDetails,
      payload: payload,
    );
  }
}
