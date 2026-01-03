import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:http/http.dart' as http;
import 'package:google_fonts/google_fonts.dart'; // 👉 Import Font
import 'package:flutter_animate/flutter_animate.dart'; // 👉 Import Animation

import 'login_screen.dart';

class RegisterScreen extends StatefulWidget {
  const RegisterScreen({super.key});

  @override
  State<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends State<RegisterScreen> {
  // --- STATE & CONTROLLERS ---
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _confirmPasswordController = TextEditingController();
  final _nameController = TextEditingController();

  String _errorMessage = '';
  bool _isLoading = false;
  
  // Trạng thái ẩn/hiện mật khẩu riêng biệt cho 2 ô nhập
  bool _isPasswordVisible = false;
  bool _isConfirmPasswordVisible = false;

  // Màu sắc chủ đạo (Đồng bộ với LoginScreen)
  final primaryColor = const Color(0xFF0288D1);
  final backgroundColor = const Color(0xFFF5F7FA);

  // --- LOGIC GIỮ NGUYÊN (Bắt đầu) ---
  Future<void> _register() async {
    // Ẩn bàn phím
    FocusScope.of(context).unfocus();

    if (_passwordController.text.trim() != _confirmPasswordController.text.trim()) {
      setState(() {
        _errorMessage = 'Mật khẩu và Xác nhận mật khẩu không khớp.';
      });
      return;
    }

    setState(() {
      _isLoading = true;
      _errorMessage = "";
    });

    try {
      final credential = await FirebaseAuth.instance.createUserWithEmailAndPassword(
        email: _emailController.text.trim(),
        password: _passwordController.text.trim(),
      );

      final user = credential.user;
      if (user == null) {
        setState(() => _errorMessage = "Không thể tạo user!");
        return;
      }

      // Lấy FCM token
      final fcmToken = await FirebaseMessaging.instance.getToken();

      // Tự đặt tên nếu user không nhập
      final name = _nameController.text.trim().isEmpty
          ? _emailController.text.trim().split("@").first
          : _nameController.text.trim();

      // Cập nhật Profile Firebase (Optional - tốt cho hiển thị)
      await user.updateDisplayName(name);

      // Lưu Firestore
      await FirebaseFirestore.instance.collection("users").doc(user.uid).set({
        "email": _emailController.text.trim(),
        "name": name,
        "role": "user",
        "fcmToken": fcmToken,
        "updatedAt": DateTime.now(),
      });

      // Gọi API Backend (nếu có cấu hình)
      final apiBase = dotenv.env["API_BACKEND_URL"];
      if (apiBase != null && apiBase.isNotEmpty) {
        final idToken = await user.getIdToken();
        try {
          await http.post(
            Uri.parse("$apiBase/users/update-token"),
            headers: {
              "Authorization": "Bearer $idToken",
              "Content-Type": "application/json",
            },
            body: jsonEncode({"fcmToken": fcmToken}),
          );
        } catch (e) {
          print("Lỗi gọi API Backend: $e");
          // Không return lỗi ở đây để vẫn cho user đăng ký thành công
        }
      }

      // Chuyển về login
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              "Đăng ký thành công! Hãy đăng nhập.",
              style: GoogleFonts.poppins(),
            ),
            backgroundColor: Colors.green,
            behavior: SnackBarBehavior.floating,
          ),
        );

        Navigator.pushAndRemoveUntil(
          context,
          MaterialPageRoute(builder: (_) => const LoginScreen()),
          (route) => false,
        );
      }
    } on FirebaseAuthException catch (e) {
      setState(() => _errorMessage = _friendlyError(e.code));
    } catch (e) {
      setState(() => _errorMessage = "Lỗi không xác định: $e");
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  String _friendlyError(String code) {
    switch (code) {
      case "weak-password":
        return "Mật khẩu quá yếu (cần ít nhất 6 ký tự).";
      case "email-already-in-use":
        return "Email này đã được đăng ký.";
      case "invalid-email":
        return "Email không đúng định dạng.";
      default:
        return "Đăng ký thất bại. Vui lòng thử lại.";
    }
  }
  // --- LOGIC GIỮ NGUYÊN (Kết thúc) ---

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: backgroundColor,
      extendBodyBehindAppBar: true,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded, color: Colors.black87),
          onPressed: () => Navigator.pop(context),
        ),
      ),
      body: Stack(
        children: [
          // 1. Background Decoration (Trang trí nền)
          Positioned(
            top: -50,
            left: -50,
            child: Container(
              width: 200,
              height: 200,
              decoration: BoxDecoration(
                color: Colors.blueAccent.withOpacity(0.05),
                shape: BoxShape.circle,
              ),
            ),
          ).animate().fadeIn(duration: 1000.ms),
          
          Positioned(
            top: 100,
            right: -80,
            child: Container(
              width: 300,
              height: 300,
              decoration: BoxDecoration(
                color: primaryColor.withOpacity(0.08),
                shape: BoxShape.circle,
              ),
            ),
          ).animate().fadeIn(duration: 1200.ms),

          // 2. Main Content
          SafeArea(
            child: Center(
              child: SingleChildScrollView(
                padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 20),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    // --- ICON HEADER ---
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

                    const SizedBox(height: 30),

                    // --- TIÊU ĐỀ ---
                    Text(
                      "Tạo Tài Khoản",
                      textAlign: TextAlign.center,
                      style: GoogleFonts.poppins(
                        fontSize: 28,
                        fontWeight: FontWeight.bold,
                        color: Colors.black87,
                      ),
                    ).animate().fadeIn(delay: 200.ms).slideY(begin: 0.3, end: 0),

                    const SizedBox(height: 8),

                    Text(
                      "Điền thông tin để bắt đầu giám sát",
                      textAlign: TextAlign.center,
                      style: GoogleFonts.poppins(
                        fontSize: 14,
                        color: Colors.grey.shade600,
                      ),
                    ).animate().fadeIn(delay: 300.ms).slideY(begin: 0.3, end: 0),

                    const SizedBox(height: 40),

                    // --- FORM NHẬP LIỆU (Xuất hiện lần lượt) ---
                    
                    // 1. Tên người dùng
                    _buildModernTextField(
                      controller: _nameController,
                      label: "Tên hiển thị",
                      icon: Icons.badge_outlined,
                    ).animate().fadeIn(delay: 400.ms).slideX(begin: -0.1, end: 0),
                    
                    const SizedBox(height: 16),

                    // 2. Email
                    _buildModernTextField(
                      controller: _emailController,
                      label: "Email",
                      icon: Icons.email_outlined,
                      keyboardType: TextInputType.emailAddress,
                    ).animate().fadeIn(delay: 500.ms).slideX(begin: -0.1, end: 0),

                    const SizedBox(height: 16),

                    // 3. Mật khẩu
                    _buildModernTextField(
                      controller: _passwordController,
                      label: "Mật khẩu",
                      icon: Icons.lock_outline_rounded,
                      isPassword: true,
                      isVisible: _isPasswordVisible,
                      onVisibilityToggle: () {
                        setState(() => _isPasswordVisible = !_isPasswordVisible);
                      },
                    ).animate().fadeIn(delay: 600.ms).slideX(begin: -0.1, end: 0),

                    const SizedBox(height: 16),

                    // 4. Xác nhận mật khẩu
                    _buildModernTextField(
                      controller: _confirmPasswordController,
                      label: "Xác nhận mật khẩu",
                      icon: Icons.lock_reset_rounded,
                      isPassword: true,
                      isVisible: _isConfirmPasswordVisible,
                      onVisibilityToggle: () {
                        setState(() => _isConfirmPasswordVisible = !_isConfirmPasswordVisible);
                      },
                    ).animate().fadeIn(delay: 700.ms).slideX(begin: -0.1, end: 0),

                    // --- THÔNG BÁO LỖI ---
                    AnimatedContainer(
                      duration: const Duration(milliseconds: 300),
                      height: _errorMessage.isNotEmpty ? null : 0,
                      margin: _errorMessage.isNotEmpty ? const EdgeInsets.only(top: 20) : EdgeInsets.zero,
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

                    // --- NÚT ĐĂNG KÝ ---
                    SizedBox(
                      height: 56,
                      child: ElevatedButton(
                        onPressed: _isLoading ? null : _register,
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
                                "Đăng Ký",
                                style: GoogleFonts.poppins(
                                  fontSize: 16,
                                  fontWeight: FontWeight.w600,
                                  letterSpacing: 1,
                                ),
                              ),
                      ),
                    ).animate().fadeIn(delay: 800.ms).slideY(begin: 0.2, end: 0),

                    const SizedBox(height: 20),

                    // --- LINK ĐĂNG NHẬP ---
                    Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Text(
                          "Đã có tài khoản? ",
                          style: GoogleFonts.poppins(color: Colors.grey.shade600),
                        ),
                        GestureDetector(
                          onTap: () => Navigator.pop(context),
                          child: Text(
                            "Đăng nhập ngay",
                            style: GoogleFonts.poppins(
                              color: primaryColor,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ),
                      ],
                    ).animate().fadeIn(delay: 900.ms),
                    
                    const SizedBox(height: 20),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  // --- WIDGET CON: TEXT FIELD HIỆN ĐẠI ---
  Widget _buildModernTextField({
    required TextEditingController controller,
    required String label,
    required IconData icon,
    bool isPassword = false,
    bool isVisible = false,
    VoidCallback? onVisibilityToggle,
    TextInputType keyboardType = TextInputType.text,
  }) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.04),
            blurRadius: 15,
            offset: const Offset(0, 5),
          ),
        ],
      ),
      child: TextField(
        controller: controller,
        obscureText: isPassword && !isVisible,
        keyboardType: keyboardType,
        style: GoogleFonts.poppins(fontSize: 15),
        decoration: InputDecoration(
          labelText: label,
          labelStyle: GoogleFonts.poppins(color: Colors.grey.shade500),
          prefixIcon: Icon(icon, color: Colors.grey.shade400),
          suffixIcon: isPassword
              ? IconButton(
                  icon: Icon(
                    isVisible ? Icons.visibility_rounded : Icons.visibility_off_rounded,
                    color: Colors.grey.shade400,
                  ),
                  onPressed: onVisibilityToggle,
                )
              : null,
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(16),
            borderSide: BorderSide.none,
          ),
          filled: true,
          fillColor: Colors.white,
          contentPadding: const EdgeInsets.symmetric(vertical: 15, horizontal: 15),
          floatingLabelStyle: TextStyle(color: primaryColor), // Màu label khi focus
        ),
      ),
    );
  }
}