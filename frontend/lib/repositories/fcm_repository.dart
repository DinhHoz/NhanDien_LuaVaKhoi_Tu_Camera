import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:cloud_firestore/cloud_firestore.dart';

class FcmRepository {
  // Hàm trợ giúp để cập nhật token trong Firestore
  static Future<void> _updateFcmToken(String userId, String? token) async {
    if (token != null) {
      try {
        await FirebaseFirestore.instance.collection("users").doc(userId).set({
          "fcmToken": token,
          "updatedAt": DateTime.now(),
        }, SetOptions(merge: true));
        print("FCM Token saved successfully for user: $userId");
      } catch (e) {
        print("Error saving FCM token: $e");
      }
    }
  }

  // Hàm chính để lưu token và lắng nghe cập nhật
  static Future<void> saveFcmToken(String userId) async {
    final fcm = FirebaseMessaging.instance;

    // Lấy token ban đầu và lưu
    String? token = await fcm.getToken();
    await _updateFcmToken(userId, token);

    // Lắng nghe token mới nếu có thay đổi và lưu lại
    fcm.onTokenRefresh.listen((newToken) {
      _updateFcmToken(userId, newToken);
    });
  }
}
