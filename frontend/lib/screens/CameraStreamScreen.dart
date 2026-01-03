import 'dart:async';
import 'dart:typed_data';
import 'dart:ui'; // Dùng cho hiệu ứng Blur

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:http/http.dart' as http;

// 📦 Thư viện UI
import 'package:google_fonts/google_fonts.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:intl/intl.dart'; // Để format ngày tháng

import '../models/camera.dart';

class CameraStreamFrameScreen extends StatefulWidget {
  final Camera camera;
  const CameraStreamFrameScreen({super.key, required this.camera});

  @override
  State<CameraStreamFrameScreen> createState() =>
      _CameraStreamFrameScreenState();
}

class _CameraStreamFrameScreenState extends State<CameraStreamFrameScreen> {
  Uint8List? _currentFrame;
  bool _isPlaying = true;
  bool _showOverlay = true; // Biến để ẩn/hiện thông tin khi chạm màn hình

  //  IP Backend (Giữ nguyên cấu hình của bạn)
  final String _backendBaseUrl = "http://192.168.1.214:3000/api/stream-frame";

  @override
  void initState() {
    super.initState();
    // Ẩn thanh trạng thái hệ thống để Full màn hình
    SystemChrome.setEnabledSystemUIMode(SystemUiMode.immersiveSticky);
    _loopFetchFrame();
  }

  // --- LOGIC XỬ LÝ (GIỮ NGUYÊN) ---
  void _loopFetchFrame() async {
    if (!mounted || !_isPlaying) return;
    await _fetchFrame();
    if (mounted && _isPlaying) {
      _loopFetchFrame();
    }
  }

  Future<void> _fetchFrame() async {
    try {
      final user = FirebaseAuth.instance.currentUser;
      // final token = await user?.getIdToken();

      final timestamp = DateTime.now().millisecondsSinceEpoch;
      final url = "$_backendBaseUrl/${widget.camera.id}?t=$timestamp";

      final response = await http
          .get(Uri.parse(url))
          .timeout(const Duration(seconds: 3));

      if (response.statusCode == 200) {
        final bytes = response.bodyBytes;
        if (bytes.length > 100 && mounted) {
          PaintingBinding.instance.imageCache.clear();
          PaintingBinding.instance.imageCache.clearLiveImages();

          setState(() {
            _currentFrame = bytes;
          });
        }
      }
    } catch (e) {
      await Future.delayed(const Duration(milliseconds: 500));
    }
  }

  @override
  void dispose() {
    _isPlaying = false;
    // Hiện lại thanh trạng thái khi thoát
    SystemChrome.setEnabledSystemUIMode(SystemUiMode.edgeToEdge);
    super.dispose();
  }

  // --- UI HIỆN ĐẠI ---
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black, // Nền đen chuẩn Cinematic
      body: GestureDetector(
        onTap: () {
          setState(() {
            _showOverlay = !_showOverlay; // Chạm để ẩn/hiện thông tin
          });
        },
        child: Stack(
          fit: StackFit.expand,
          children: [
            // 1. LỚP VIDEO (NỀN)
            Center(
              child:
                  _currentFrame == null
                      ? Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          const SizedBox(
                            width: 40,
                            height: 40,
                            child: CircularProgressIndicator(
                              color: Colors.white,
                              strokeWidth: 2,
                            ),
                          ),
                          const SizedBox(height: 20),
                          Text(
                                "Đang kết nối tín hiệu...",
                                style: GoogleFonts.oxanium(
                                  color: Colors.white54,
                                  fontSize: 12,
                                ),
                              )
                              .animate(onPlay: (c) => c.repeat())
                              .shimmer(duration: 1500.ms),
                        ],
                      )
                      : Image.memory(
                        _currentFrame!,
                        gaplessPlayback: true,
                        fit: BoxFit.contain, // Hiển thị trọn vẹn khung hình
                        width: double.infinity,
                      ),
            ),

            // 2. LỚP PHỦ MỜ (GRADIENT) - Chỉ hiện khi _showOverlay = true
            if (_showOverlay)
              Positioned.fill(
                child: Column(
                  children: [
                    // Gradient đen ở trên để nổi bật chữ Header
                    Container(
                      height: 100,
                      decoration: BoxDecoration(
                        gradient: LinearGradient(
                          begin: Alignment.topCenter,
                          end: Alignment.bottomCenter,
                          colors: [
                            Colors.black.withOpacity(0.7),
                            Colors.transparent,
                          ],
                        ),
                      ),
                    ),
                    const Spacer(),
                    // Gradient đen ở dưới để nổi bật ngày tháng
                    Container(
                      height: 80,
                      decoration: BoxDecoration(
                        gradient: LinearGradient(
                          begin: Alignment.bottomCenter,
                          end: Alignment.topCenter,
                          colors: [
                            Colors.black.withOpacity(0.7),
                            Colors.transparent,
                          ],
                        ),
                      ),
                    ),
                  ],
                ).animate().fade(duration: 300.ms),
              ),

            // 3. HEADER (Nút Back, Tên Camera, Trạng thái Live)
            if (_showOverlay)
              Positioned(
                top: 20,
                left: 20,
                right: 20,
                child: SafeArea(
                  child: Row(
                    children: [
                      // Nút Back kính mờ
                      _buildGlassIconButton(
                        icon: Icons.arrow_back_ios_new_rounded,
                        onTap: () => Navigator.pop(context),
                      ),
                      const SizedBox(width: 16),

                      // Thông tin Camera
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              widget.camera.cameraName,
                              style: GoogleFonts.poppins(
                                color: Colors.white,
                                fontWeight: FontWeight.w600,
                                fontSize: 18,
                                shadows: [
                                  const Shadow(
                                    color: Colors.black,
                                    blurRadius: 4,
                                  ),
                                ],
                              ),
                            ),
                            Row(
                              children: [
                                const Icon(
                                  Icons.location_on,
                                  color: Colors.white70,
                                  size: 12,
                                ),
                                const SizedBox(width: 4),
                                Text(
                                  widget.camera.location,
                                  style: GoogleFonts.lato(
                                    color: Colors.white70,
                                    fontSize: 12,
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),

                      // Badge LIVE nhấp nháy
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 10,
                          vertical: 5,
                        ),
                        decoration: BoxDecoration(
                          color: const Color(
                            0xFFFF3B30,
                          ).withOpacity(0.8), // Đỏ chuẩn iOS
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: Row(
                          children: [
                            const Icon(
                                  Icons.circle,
                                  size: 8,
                                  color: Colors.white,
                                )
                                .animate(onPlay: (c) => c.repeat(reverse: true))
                                .fade(duration: 600.ms),
                            const SizedBox(width: 6),
                            Text(
                              "LIVE",
                              style: GoogleFonts.poppins(
                                color: Colors.white,
                                fontSize: 10,
                                fontWeight: FontWeight.bold,
                                letterSpacing: 1,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ).animate().slideY(begin: -1, end: 0, duration: 400.ms),
                ),
              ),

            // 4. NGÀY THÁNG (Góc dưới phải - Đã bỏ giờ và SD Card)
            if (_showOverlay)
              Positioned(
                bottom: 30,
                right: 30,
                child: StreamBuilder(
                  stream: Stream.periodic(
                    const Duration(minutes: 1),
                  ), // Cập nhật mỗi phút là đủ
                  builder: (context, snapshot) {
                    final now = DateTime.now();
                    return Text(
                      DateFormat(
                        'EEEE, dd MMM yyyy',
                      ).format(now), // Chỉ hiện Thứ, Ngày Tháng Năm
                      style: GoogleFonts.oxanium(
                        // Dùng font số hiện đại
                        color: Colors.white.withOpacity(0.9),
                        fontSize: 16,
                        fontWeight: FontWeight.w600,
                        shadows: [
                          const Shadow(blurRadius: 4, color: Colors.black),
                        ],
                      ),
                    );
                  },
                ).animate().slideY(begin: 1, end: 0, duration: 400.ms),
              ),
          ],
        ),
      ),
    );
  }

  // Widget nút bấm kính mờ
  Widget _buildGlassIconButton({
    required IconData icon,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(50),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(50),
        child: BackdropFilter(
          filter: ImageFilter.blur(sigmaX: 10, sigmaY: 10),
          child: Container(
            height: 45,
            width: 45,
            decoration: BoxDecoration(
              color: Colors.white.withOpacity(0.2), // Màu trắng mờ
              shape: BoxShape.circle,
              border: Border.all(
                color: Colors.white.withOpacity(0.3),
                width: 1,
              ),
            ),
            child: Icon(icon, color: Colors.white, size: 22),
          ),
        ),
      ),
    );
  }
}
