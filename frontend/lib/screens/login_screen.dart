import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import 'package:google_fonts/google_fonts.dart'; // 👉 Font đẹp
import 'package:flutter_animate/flutter_animate.dart'; // 👉 Animation xịn

import 'package:frontend/config/api_config.dart';
import 'package:frontend/repositories/fcm_repository.dart';
import 'package:frontend/services/notification_service.dart';
import '../services/auth_service.dart';

import 'UI_device.dart';
import 'UI_register.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  // --- STATE & CONTROLLERS ---
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  String _errorMessage = '';
  bool _isLoading = false;
  bool _isPasswordVisible = false;

  // Màu sắc chủ đạo (Modern Blue)
  final primaryColor = const Color(0xFF0288D1);
  final backgroundColor = const Color(0xFFF5F7FA);

  // --- LOGIC XỬ LÝ (GIỮ NGUYÊN 100%) ---
  Future<void> _login() async {
    FocusScope.of(context).unfocus(); // Ẩn bàn phím

    setState(() {
      _isLoading = true;
      _errorMessage = '';
    });

    try {
      final userCredential = await FirebaseAuth.instance.signInWithEmailAndPassword(
        email: _emailController.text.trim(),
        password: _passwordController.text.trim(),
      );

      final user = userCredential.user;
      if (user == null) {
        setState(() => _errorMessage = "Không thể lấy thông tin người dùng.");
        return;
      }

      // Lấy token FCM & ID Token
      final fcmToken = await FirebaseMessaging.instance.getToken();
      final idToken = await user.getIdToken();

      // Gọi API cập nhật token
      final url = ApiConfig.path("/users/update-token");

      await http.post(
        Uri.parse(url),
        headers: {
          "Authorization": "Bearer $idToken",
          "Content-Type": "application/json",
        },
        body: jsonEncode({"fcmToken": fcmToken}),
      );

      // Lưu token local
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString("id_token", idToken ?? "");

      if (mounted) {
        Navigator.pushReplacement(
          context,
          MaterialPageRoute(builder: (_) => const DeviceScreen()),
        );
      }
    } on FirebaseAuthException catch (e) {
      setState(() {
        if (e.code == 'user-not-found') {
          _errorMessage = 'Tài khoản không tồn tại.';
        } else if (e.code == 'wrong-password') {
          _errorMessage = 'Mật khẩu không chính xác.';
        } else if (e.code == 'invalid-email') {
          _errorMessage = 'Email không hợp lệ.';
        } else {
          _errorMessage = e.message ?? "Đăng nhập thất bại.";
        }
      });
    } catch (e) {
      setState(() => _errorMessage = "Lỗi kết nối: $e");
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  // --- GIAO DIỆN (UI) ---
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: backgroundColor,
      // Stack để tạo các hình nền trang trí phía sau
      body: Stack(
        children: [
          // 1. Hình nền trang trí (Blobs)
          Positioned(
            top: -80,
            right: -60,
            child: Container(
              width: 300,
              height: 300,
              decoration: BoxDecoration(
                color: primaryColor.withOpacity(0.1),
                shape: BoxShape.circle,
              ),
            ),
          ).animate().fadeIn(duration: 800.ms),
          
          Positioned(
            bottom: -60,
            left: -60,
            child: Container(
              width: 250,
              height: 250,
              decoration: BoxDecoration(
                color: Colors.blueAccent.withOpacity(0.08),
                shape: BoxShape.circle,
              ),
            ),
          ).animate().fadeIn(duration: 1200.ms),

          // 2. Nội dung chính
          Center(
            child: SingleChildScrollView(
              padding: const EdgeInsets.symmetric(horizontal: 24),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // --- LOGO NHÓM (Đã chỉnh sửa chuẩn) ---
                  Center(
                    child: Container(
                      width: 120, 
                      height: 120,
                      decoration: BoxDecoration(
                        color: Colors.white,
                        shape: BoxShape.circle,
                        boxShadow: [
                          BoxShadow(
                            color: primaryColor.withOpacity(0.2),
                            blurRadius: 25,
                            offset: const Offset(0, 10),
                          ),
                        ],
                      ),
                      // ClipOval + BoxFit.cover để ảnh tròn đầy khung
                      child: ClipOval(
                        child: Image.asset(
                          'assets/logo_nhom.jpg', 
                          fit: BoxFit.cover, 
                          width: 120,
                          height: 120,
                          errorBuilder: (context, error, stackTrace) {
                            return Icon(Icons.security, size: 60, color: primaryColor);
                          },
                        ),
                      ),
                    ),
                  ).animate().scale(duration: 600.ms, curve: Curves.elasticOut),

                  const SizedBox(height: 40),

                  // --- TEXT CHÀO MỪNG ---
                  Text(
                    "Xin Chào!",
                    textAlign: TextAlign.center,
                    style: GoogleFonts.poppins(
                      fontSize: 30,
                      fontWeight: FontWeight.bold,
                      color: const Color(0xFF1A1A1A),
                    ),
                  ).animate().fadeIn(delay: 200.ms).slideY(begin: 0.3, end: 0),

                  const SizedBox(height: 8),

                  Text(
                    "Đăng nhập để xem hệ thống giám sát",
                    textAlign: TextAlign.center,
                    style: GoogleFonts.poppins(
                      fontSize: 14,
                      color: Colors.grey.shade500,
                    ),
                  ).animate().fadeIn(delay: 300.ms).slideY(begin: 0.3, end: 0),

                  const SizedBox(height: 40),

                  // --- FORM NHẬP LIỆU ---
                  _buildModernTextField(
                    controller: _emailController,
                    hintText: "Email",
                    icon: Icons.alternate_email_rounded,
                    keyboardType: TextInputType.emailAddress,
                  ).animate().fadeIn(delay: 400.ms).slideX(begin: -0.1, end: 0),

                  const SizedBox(height: 16),

                  _buildModernTextField(
                    controller: _passwordController,
                    hintText: "Mật khẩu",
                    icon: Icons.lock_outline_rounded,
                    isPassword: true,
                  ).animate().fadeIn(delay: 500.ms).slideX(begin: -0.1, end: 0),

                  // --- HIỂN THỊ LỖI ---
                  AnimatedContainer(
                    duration: const Duration(milliseconds: 300),
                    height: _errorMessage.isNotEmpty ? null : 0,
                    margin: _errorMessage.isNotEmpty ? const EdgeInsets.only(top: 16) : EdgeInsets.zero,
                    padding: _errorMessage.isNotEmpty ? const EdgeInsets.all(12) : EdgeInsets.zero,
                    decoration: BoxDecoration(
                      color: Colors.red.shade50,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: Colors.red.shade200),
                    ),
                    child: _errorMessage.isNotEmpty
                        ? Row(
                            children: [
                              Icon(Icons.error_outline, color: Colors.red.shade700, size: 20),
                              const SizedBox(width: 10),
                              Expanded(
                                child: Text(
                                  _errorMessage,
                                  style: GoogleFonts.poppins(
                                    color: Colors.red.shade700,
                                    fontSize: 13,
                                  ),
                                ),
                              ),
                            ],
                          )
                        : const SizedBox.shrink(),
                  ),

                  const SizedBox(height: 30),

                  // --- NÚT ĐĂNG NHẬP ---
                  SizedBox(
                    height: 58,
                    child: ElevatedButton(
                      onPressed: _isLoading ? null : _login,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: primaryColor,
                        foregroundColor: Colors.white,
                        elevation: 8,
                        shadowColor: primaryColor.withOpacity(0.4),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(16),
                        ),
                      ),
                      child: _isLoading
                          ? const SizedBox(
                              width: 24,
                              height: 24,
                              child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                            )
                          : Text(
                              "Đăng Nhập",
                              style: GoogleFonts.poppins(
                                fontSize: 16,
                                fontWeight: FontWeight.w600,
                                letterSpacing: 1,
                              ),
                            ),
                    ),
                  ).animate().fadeIn(delay: 600.ms).slideY(begin: 0.2, end: 0),

                  const SizedBox(height: 24),

                  // --- LINK ĐĂNG KÝ ---
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Text(
                        "Chưa có tài khoản? ",
                        style: GoogleFonts.poppins(color: Colors.grey.shade600),
                      ),
                      GestureDetector(
                        onTap: () {
                          Navigator.push(
                            context,
                            MaterialPageRoute(builder: (_) => const RegisterScreen()),
                          );
                        },
                        child: Text(
                          "Đăng ký ngay",
                          style: GoogleFonts.poppins(
                            color: primaryColor,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                    ],
                  ).animate().fadeIn(delay: 700.ms),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  // Widget con: Ô nhập liệu hiện đại
  Widget _buildModernTextField({
    required TextEditingController controller,
    required String hintText,
    required IconData icon,
    bool isPassword = false,
    TextInputType keyboardType = TextInputType.text,
  }) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.04), // Shadow nhẹ hơn cho tinh tế
            blurRadius: 15,
            offset: const Offset(0, 5),
          ),
        ],
      ),
      child: TextField(
        controller: controller,
        obscureText: isPassword && !_isPasswordVisible,
        keyboardType: keyboardType,
        style: GoogleFonts.poppins(fontSize: 15),
        decoration: InputDecoration(
          hintText: hintText,
          hintStyle: GoogleFonts.poppins(color: Colors.grey.shade400),
          prefixIcon: Icon(icon, color: Colors.grey.shade400), // Icon màu nhạt
          suffixIcon: isPassword
              ? IconButton(
                  icon: Icon(
                    _isPasswordVisible ? Icons.visibility_rounded : Icons.visibility_off_rounded,
                    color: Colors.grey.shade400,
                  ),
                  onPressed: () => setState(() => _isPasswordVisible = !_isPasswordVisible),
                )
              : null,
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(16),
            borderSide: BorderSide.none, // Không viền
          ),
          filled: true,
          fillColor: Colors.white,
          contentPadding: const EdgeInsets.symmetric(vertical: 20, horizontal: 20),
        ),
      ),
    );
  }
}