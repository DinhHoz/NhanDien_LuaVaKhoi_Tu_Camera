import 'package:flutter/material.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:frontend/services/notification_service.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'screens/login_screen.dart';
import 'screens/UI_device.dart';
import 'services/fcm_alert_handler.dart'; // class xử lý FCM
import 'repositories/fcm_repository.dart'; // lưu token Firestore
import 'package:flutter_dotenv/flutter_dotenv.dart';

final notificationService = NotificationService();

// Hàm xử lý FCM nền (background/terminated)
@pragma('vm:entry-point')
Future<void> _firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  await Firebase.initializeApp();
  print("🔥 Nhận alert nền từ FCM: ${message.messageId}");
  await FcmAlertHandler.backgroundHandler(message);
}

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Firebase.initializeApp();
  await dotenv.load(fileName: ".env");

  // Khởi tạo local notification service
  await notificationService.initialize();

  // Thiết lập background handler
  FirebaseMessaging.onBackgroundMessage(_firebaseMessagingBackgroundHandler);

  // Lắng nghe FCM khi app foreground
  FirebaseMessaging.onMessage.listen((RemoteMessage message) {
    print("📩 Foreground nhận FCM: ${message.notification?.title}");

    final notification = message.notification;
    final data = message.data;

    if (notification != null) {
      notificationService.showNotification(
        id: DateTime.now().millisecondsSinceEpoch ~/ 1000,
        title: notification.title ?? "Thông báo",
        body: notification.body ?? "",
        payload: data['alertId'] ?? "", // dùng để điều hướng
      );
    }
  });

  // Khởi tạo xử lý FCM foreground (nếu có logic riêng trong handler)
  final fcmHandler = FcmAlertHandler();
  await fcmHandler.initialize();

  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      title: 'Firebase Auth + FCM Demo',
      theme: ThemeData(primarySwatch: Colors.blue, useMaterial3: true),
      navigatorKey: FcmAlertHandler.navigatorKey, // key điều hướng
      home: const AuthWrapper(),
    );
  }
}

class AuthWrapper extends StatelessWidget {
  const AuthWrapper({super.key});

  @override
  Widget build(BuildContext context) {
    return StreamBuilder<User?>(
      stream: FirebaseAuth.instance.authStateChanges(),
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const Scaffold(
            body: Center(child: CircularProgressIndicator()),
          );
        }
        if (snapshot.hasData) {
          // Lưu token FCM theo userId
          FcmRepository.saveFcmToken(snapshot.data!.uid);
          return const DeviceScreen();
        }
        return const LoginScreen();
      },
    );
  }
}

Future<void> _clearInvalidToken() async {
  try {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('id_token');
  } catch (e) {
    print('Lỗi khi xóa token: $e');
  }
}

