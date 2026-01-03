import 'package:firebase_auth/firebase_auth.dart';
import 'package:shared_preferences/shared_preferences.dart'; // Để lưu token nếu cần

class AuthService {
  static final FirebaseAuth _auth = FirebaseAuth.instance;
  static String? _token;

  // Đăng nhập với email/password
  static Future<String?> signInWithEmailAndPassword(
    String email,
    String password,
  ) async {
    try {
      final userCredential = await _auth.signInWithEmailAndPassword(
        email: email,
        password: password,
      );
      final idToken = await userCredential.user?.getIdToken();
      _token = idToken;
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(
        'id_token',
        _token!,
      ); // ✅ Đã sửa key thành 'id_token'
      return _token;
    } catch (e) {
      print('Sign-in error: $e');
      return null;
    }
  }

  // Lấy ID token hiện tại (gọi sau khi đăng nhập)
  static Future<String?> getToken() async {
    final user = _auth.currentUser;
    if (user != null) {
      _token = await user.getIdToken(true); // Tự động làm mới token nếu cần
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('id_token', _token!); // ✅ Lưu token mới
      return _token;
    }
    final prefs = await SharedPreferences.getInstance();
    _token = prefs.getString('id_token'); // ✅ Lấy từ key 'id_token'
    return _token;
  }

  // Phương thức mới để lấy Authorization Header
  static Future<String?> getAuthHeader() async {
    final token = await getToken();
    if (token != null && token.isNotEmpty) {
      return 'Bearer $token';
    }
    return null;
  }

  // Đăng xuất
  static Future<void> signOut() async {
    await _auth.signOut();
    _token = null;
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('id_token');
    await prefs.remove('password');
  }

  // Listener cho thay đổi token (tự động cập nhật)
  static Stream<User?> get authStateChanges => _auth.authStateChanges();
}
