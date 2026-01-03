import 'package:flutter/material.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_staggered_grid_view/flutter_staggered_grid_view.dart';
import 'package:cached_network_image/cached_network_image.dart';

import 'package:frontend/screens/UI_device.dart';
import 'package:frontend/screens/login_screen.dart';
import 'package:frontend/widgets/bottom_nav_bar.dart';

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  final User? currentUser = FirebaseAuth.instance.currentUser;
  final primaryColor = Colors.lightBlue;

  // --- LOGIC XỬ LÝ ---
  String _getDisplayName() {
    if (currentUser == null) return 'Khách';
    final name = currentUser?.displayName;
    if (name != null && name.isNotEmpty) return name;
    
    final email = currentUser?.email;
    if (email != null) return email.split('@')[0];
    
    return 'Người dùng';
  }

  void _logout() async {
    await FirebaseAuth.instance.signOut();
    if (mounted) {
      Navigator.pushAndRemoveUntil(
        context,
        MaterialPageRoute(builder: (_) => const LoginScreen()),
        (route) => false,
      );
    }
  }

  void _handleTabChange(int index) {
    if (index == 0) {
       Navigator.pushReplacement(context, MaterialPageRoute(builder: (_) => const DeviceScreen()));
    } else if (index == 1) {
       // Navigator.pushReplacement(context, MaterialPageRoute(builder: (_) => const NotificationScreen()));
    }
  }

  // --- HÀM HIỂN THỊ DIALOG ĐỔI MẬT KHẨU ---
  void _showChangePasswordDialog() {
    final oldPassController = TextEditingController();
    final newPassController = TextEditingController();
    final confirmPassController = TextEditingController();
    
    String errorMessage = '';
    bool isLoading = false;
    
    // Biến trạng thái hiển thị mật khẩu
    bool obscureOld = true;
    bool obscureNew = true;
    bool obscureConfirm = true;

    showDialog(
      context: context,
      barrierDismissible: false, // Bắt buộc user bấm Hủy hoặc Cập nhật
      builder: (context) {
        // Dùng StatefulBuilder để update UI bên trong Dialog
        return StatefulBuilder(
          builder: (context, setStateDialog) {
            
            // Logic xử lý đổi mật khẩu nằm gọn trong này
            Future<void> handleChangePassword() async {
              // 1. Validate
              if (newPassController.text != confirmPassController.text) {
                setStateDialog(() => errorMessage = "Mật khẩu mới không khớp.");
                return;
              }
              if (newPassController.text.length < 6) {
                setStateDialog(() => errorMessage = "Mật khẩu mới phải có ít nhất 6 ký tự.");
                return;
              }

              setStateDialog(() {
                isLoading = true;
                errorMessage = "";
              });

              try {
                final user = FirebaseAuth.instance.currentUser;
                if (user != null && user.email != null) {
                  // 2. Re-authenticate
                  final credential = EmailAuthProvider.credential(
                    email: user.email!,
                    password: oldPassController.text.trim(),
                  );
                  await user.reauthenticateWithCredential(credential);

                  // 3. Update Password
                  await user.updatePassword(newPassController.text.trim());

                  if (mounted) {
                    Navigator.pop(context); // Đóng Dialog
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(
                        content: Text("Đổi mật khẩu thành công!", style: GoogleFonts.poppins()),
                        backgroundColor: Colors.green,
                        behavior: SnackBarBehavior.floating,
                      ),
                    );
                  }
                }
              } on FirebaseAuthException catch (e) {
                setStateDialog(() {
                  if (e.code == 'wrong-password') {
                    errorMessage = "Mật khẩu cũ không chính xác.";
                  } else if (e.code == 'weak-password') {
                    errorMessage = "Mật khẩu mới quá yếu.";
                  } else {
                    errorMessage = "Lỗi: ${e.message}";
                  }
                  isLoading = false;
                });
              } catch (e) {
                setStateDialog(() {
                  errorMessage = "Lỗi không xác định.";
                  isLoading = false;
                });
              }
            }

            return Dialog(
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
              backgroundColor: Colors.white,
              surfaceTintColor: Colors.white,
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(24),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    // Header
                    Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.all(10),
                          decoration: BoxDecoration(
                            color: Colors.blue.withOpacity(0.1),
                            shape: BoxShape.circle,
                          ),
                          child: const Icon(Icons.lock_reset_rounded, color: Colors.blue, size: 28),
                        ),
                        const SizedBox(width: 16),
                        Text(
                          "Đổi Mật Khẩu",
                          style: GoogleFonts.poppins(fontSize: 20, fontWeight: FontWeight.bold, color: Colors.black87),
                        ),
                      ],
                    ),
                    const SizedBox(height: 24),

                    // Input Fields
                    _buildDialogInput(
                      controller: oldPassController, 
                      label: "Mật khẩu cũ", 
                      obscure: obscureOld,
                      onToggle: () => setStateDialog(() => obscureOld = !obscureOld),
                    ),
                    const SizedBox(height: 16),
                    _buildDialogInput(
                      controller: newPassController, 
                      label: "Mật khẩu mới", 
                      obscure: obscureNew,
                      onToggle: () => setStateDialog(() => obscureNew = !obscureNew),
                    ),
                    const SizedBox(height: 16),
                    _buildDialogInput(
                      controller: confirmPassController, 
                      label: "Xác nhận mật khẩu", 
                      obscure: obscureConfirm,
                      onToggle: () => setStateDialog(() => obscureConfirm = !obscureConfirm),
                    ),

                    // Error Message
                    if (errorMessage.isNotEmpty)
                      Padding(
                        padding: const EdgeInsets.only(top: 16),
                        child: Text(
                          errorMessage,
                          style: GoogleFonts.poppins(fontSize: 13, color: Colors.red),
                          textAlign: TextAlign.center,
                        ),
                      ).animate().fadeIn(),

                    const SizedBox(height: 24),

                    // Actions
                    Row(
                      mainAxisAlignment: MainAxisAlignment.end,
                      children: [
                        TextButton(
                          onPressed: () => Navigator.pop(context),
                          child: Text("Hủy", style: GoogleFonts.poppins(color: Colors.grey)),
                        ),
                        const SizedBox(width: 8),
                        ElevatedButton(
                          onPressed: isLoading ? null : handleChangePassword,
                          style: ElevatedButton.styleFrom(
                            backgroundColor: Colors.blue,
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                          ),
                          child: isLoading 
                              ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                              : Text("Cập nhật", style: GoogleFonts.poppins(color: Colors.white, fontWeight: FontWeight.w600)),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ).animate().scale(duration: 300.ms, curve: Curves.easeOutBack);
          },
        );
      },
    );
  }

  // Helper Widget cho Input trong Dialog
  Widget _buildDialogInput({
    required TextEditingController controller,
    required String label,
    required bool obscure,
    required VoidCallback onToggle,
  }) {
    return TextField(
      controller: controller,
      obscureText: obscure,
      style: GoogleFonts.poppins(fontSize: 14),
      decoration: InputDecoration(
        labelText: label,
        labelStyle: GoogleFonts.poppins(color: Colors.grey, fontSize: 13),
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide(color: Colors.grey.shade300)),
        enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide(color: Colors.grey.shade300)),
        focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Colors.blue)),
        suffixIcon: IconButton(
          icon: Icon(obscure ? Icons.visibility_off : Icons.visibility, color: Colors.grey),
          onPressed: onToggle,
        ),
      ),
    );
  }

  // --- UI CHÍNH ---
  @override
  Widget build(BuildContext context) {
    final displayName = _getDisplayName();
    final email = currentUser?.email ?? 'Chưa cập nhật email';
    final avatarUrl = currentUser?.photoURL ?? "https://ui-avatars.com/api/?name=${displayName.replaceAll(' ', '+')}&background=random";

    return Scaffold(
      backgroundColor: const Color(0xFFF5F7FA),
      body: CustomScrollView(
        physics: const BouncingScrollPhysics(),
        slivers: [
          // 1. HEADER
          SliverAppBar(
            expandedHeight: 240,
            pinned: true,
            backgroundColor: primaryColor,
            elevation: 0,
            leading: IconButton(
              icon: const Icon(Icons.arrow_back_ios_new, color: Colors.white),
              onPressed: () => Navigator.pushReplacement(context, MaterialPageRoute(builder: (_) => const DeviceScreen())),
            ),
            flexibleSpace: FlexibleSpaceBar(
              background: Container(
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topCenter,
                    end: Alignment.bottomCenter,
                    colors: [Colors.blue.shade700, Colors.lightBlue.shade300],
                  ),
                ),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const SizedBox(height: 40),
                    Container(
                      padding: const EdgeInsets.all(4),
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        border: Border.all(color: Colors.white.withOpacity(0.5), width: 3),
                        boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.2), blurRadius: 15, offset: const Offset(0, 8))],
                      ),
                      child: CircleAvatar(
                        radius: 50,
                        backgroundColor: Colors.white,
                        backgroundImage: NetworkImage(avatarUrl), // Có thể thay bằng CachedNetworkImage nếu muốn
                        onBackgroundImageError: (_, __) {},
                      ),
                    ).animate().scale(duration: 500.ms, curve: Curves.elasticOut),
                    const SizedBox(height: 12),
                    Text(
                      displayName,
                      style: GoogleFonts.poppins(fontSize: 24, fontWeight: FontWeight.bold, color: Colors.white),
                    ).animate().fadeIn().slideY(begin: 0.3, end: 0),
                    Text(
                      email,
                      style: GoogleFonts.poppins(fontSize: 14, color: Colors.white.withOpacity(0.9)),
                    ).animate().fadeIn().slideY(begin: 0.3, end: 0),
                  ],
                ),
              ),
            ),
          ),

          // 2. MENU GRID
          SliverPadding(
            padding: const EdgeInsets.all(16),
            sliver: SliverToBoxAdapter(
              child: StaggeredGrid.count(
                crossAxisCount: 2,
                mainAxisSpacing: 16,
                crossAxisSpacing: 16,
                children: [
                  _buildMenuCard(icon: Icons.notifications_active_outlined, title: 'Thông báo', subtitle: 'Cài đặt nhận tin', color: Colors.orange, onTap: () {}),
                  _buildMenuCard(
                    icon: Icons.lock_outline_rounded, 
                    title: 'Bảo mật', 
                    subtitle: 'Đổi mật khẩu', 
                    color: Colors.green, 
                    onTap: () => _showChangePasswordDialog(), // GỌI DIALOG TẠI ĐÂY
                  ),
                  _buildMenuCard(icon: Icons.support_agent_rounded, title: 'Hỗ trợ', subtitle: 'CSKH 24/7', color: Colors.purpleAccent, onTap: () {}, isLong: true),
                  _buildMenuCard(icon: Icons.info_outline_rounded, title: 'Về ứng dụng', subtitle: 'Ver 1.0.0', color: Colors.blueAccent, onTap: () {}),
                  _buildMenuCard(icon: Icons.logout_rounded, title: 'Đăng xuất', subtitle: 'Thoát tài khoản', color: Colors.redAccent, onTap: () => _showLogoutDialog(), isDanger: true),
                ].animate(interval: 50.ms).fadeIn().slideX(begin: 0.1, end: 0, curve: Curves.easeOut),
              ),
            ),
          ),
          const SliverToBoxAdapter(child: SizedBox(height: 100)),
        ],
      ),
      bottomNavigationBar: BottomNavBar(
        initialIndex: 2,
        onTabChanged: (index) => _handleTabChange(index),
      ),
    );
  }

  void _showLogoutDialog() {
    showDialog(
      context: context,
      builder: (_) => AlertDialog(
        backgroundColor: Colors.white,
        surfaceTintColor: Colors.white,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
        title: Row(
          children: [
            const Icon(Icons.logout, color: Colors.red),
            const SizedBox(width: 12),
            Text("Đăng xuất", style: GoogleFonts.poppins(fontWeight: FontWeight.bold, fontSize: 18)),
          ],
        ),
        content: Text("Bạn có chắc chắn muốn đăng xuất?", style: GoogleFonts.poppins(color: Colors.grey.shade700)),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: Text("Hủy", style: GoogleFonts.poppins(color: Colors.grey))),
          ElevatedButton(
            onPressed: () { Navigator.pop(context); _logout(); },
            style: ElevatedButton.styleFrom(backgroundColor: Colors.redAccent, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12))),
            child: Text("Đăng xuất", style: GoogleFonts.poppins(color: Colors.white)),
          ),
        ],
      ),
    );
  }

  Widget _buildMenuCard({
    required IconData icon,
    required String title,
    required String subtitle,
    required Color color,
    required VoidCallback onTap,
    bool isLong = false,
    bool isDanger = false,
  }) {
    return StaggeredGridTile.count(
      crossAxisCellCount: isLong ? 2 : 1,
      mainAxisCellCount: 1,
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(24),
          child: Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: isDanger ? const Color(0xFFFFF0F0) : Colors.white,
              borderRadius: BorderRadius.circular(24),
              boxShadow: [BoxShadow(color: Colors.grey.withOpacity(0.08), blurRadius: 15, offset: const Offset(0, 8))],
              border: isDanger ? Border.all(color: Colors.red.withOpacity(0.1)) : Border.all(color: Colors.white),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Container(
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(color: color.withOpacity(0.1), shape: BoxShape.circle),
                      child: Icon(icon, color: color, size: 24),
                    ),
                    if (isLong) Icon(Icons.arrow_forward_ios_rounded, size: 16, color: Colors.grey.shade300),
                  ],
                ),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(title, style: GoogleFonts.poppins(fontSize: 16, fontWeight: FontWeight.bold, color: isDanger ? Colors.red : Colors.black87)),
                    const SizedBox(height: 4),
                    Text(subtitle, style: GoogleFonts.poppins(fontSize: 12, color: isDanger ? Colors.red.withOpacity(0.6) : Colors.grey.shade500, fontWeight: FontWeight.w500), maxLines: 1, overflow: TextOverflow.ellipsis),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}