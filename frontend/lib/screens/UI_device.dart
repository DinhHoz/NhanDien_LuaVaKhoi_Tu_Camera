import 'dart:async';
import 'dart:convert';
import 'dart:typed_data';
import 'dart:ui'; // Dùng cho hiệu ứng Blur

import 'package:flutter/material.dart';
import 'package:frontend/screens/CameraStreamScreen.dart';
import 'package:http/http.dart' as http;
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';

// 📦 UI & Animation Libraries
import 'package:google_fonts/google_fonts.dart';
import 'package:flutter_animate/flutter_animate.dart';

// Import các màn hình UI khác
import 'UI_notification.dart';
import 'UI_profile.dart';
import 'UI_Add_Camera.dart';
import '../widgets/bottom_nav_bar.dart';

// Import model
import '../models/camera.dart';
import '../models/alert.dart';

class DeviceScreen extends StatefulWidget {
  const DeviceScreen({super.key});

  @override
  _DeviceScreenState createState() => _DeviceScreenState();
}

class _DeviceScreenState extends State<DeviceScreen> {
  List<Camera> _cameras = [];
  List<Alert> _alerts = [];
  bool _isLoading = true;

  //  CẤU HÌNH IP SERVER
  final String _camerasApiUrl = "http://172.20.10.2:3000/api/cameras";
  final String _streamFrameBaseUrl = "http://172.20.10.2:3000/api/stream-frame";

  @override
  void initState() {
    super.initState();
    _loadCamerasFromBackend();
    _loadAlerts();
  }

  // --- LOGIC GIỮ NGUYÊN (KHÔNG THAY ĐỔI) ---
  Future<void> _loadCamerasFromBackend() async {
    try {
      final user = FirebaseAuth.instance.currentUser;
      if (user == null) {
        if (mounted) setState(() => _isLoading = false);
        return;
      }
      String? token = await user.getIdToken();
      final response = await http
          .get(
            Uri.parse(_camerasApiUrl),
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer $token',
            },
          )
          .timeout(const Duration(seconds: 10));

      if (response.statusCode == 200) {
        final List<dynamic> data = jsonDecode(response.body);
        if (mounted) {
          setState(() {
            _cameras =
                data.map((json) {
                  return Camera(
                    id: json['id'] ?? '',
                    cameraName: json['cameraName'] ?? 'Camera',
                    location: json['location'] ?? 'Unknown',
                    streamUrl: json['streamUrl'] ?? '',
                  );
                }).toList();
            _isLoading = false;
          });
        }
      } else {
        if (mounted) setState(() => _isLoading = false);
      }
    } catch (e) {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _loadAlerts() async {
    final user = FirebaseAuth.instance.currentUser;
    if (user == null) return;
    try {
      final snapshot =
          await FirebaseFirestore.instance
              .collection("users")
              .doc(user.uid)
              .collection("alerts")
              .where('isRead', isEqualTo: false)
              .get();
      if (mounted) {
        setState(() {
          _alerts =
              snapshot.docs.map((doc) => Alert.fromJson(doc.data())).toList();
        });
      }
    } catch (e) {
      print("Lỗi lấy thông báo: $e");
    }
  }

  void _navigateToAddCameraScreen() async {
    final result = await Navigator.push(
      context,
      MaterialPageRoute(builder: (context) => const AddCameraScreen()),
    );
    if (result == true) {
      setState(() => _isLoading = true);
      _loadCamerasFromBackend();
    }
  }

  // --- UI CHÍNH ---
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF5F7FA), // Màu nền sáng nhẹ hiện đại
      body: SafeArea(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // 1. HEADER
            _buildHeader(),

            const SizedBox(height: 10),

            // 2. DANH SÁCH CAMERA (List View dọc)
            Expanded(
              child:
                  _isLoading
                      ? const Center(child: CircularProgressIndicator())
                      : _cameras.isEmpty
                      ? _buildEmptyState()
                      : ListView.separated(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 20,
                          vertical: 10,
                        ),
                        itemCount: _cameras.length,
                        // Khoảng cách giữa các camera
                        separatorBuilder:
                            (ctx, index) => const SizedBox(height: 24),
                        itemBuilder: (context, index) {
                          final cam = _cameras[index];
                          return _buildCinematicCameraCard(cam, index)
                              .animate()
                              .fade(duration: 600.ms, delay: (100 * index).ms)
                              .slideY(
                                begin: 0.1,
                                end: 0,
                                curve: Curves.easeOutCubic,
                              );
                        },
                      ),
            ),
          ],
        ),
      ),

      // Bottom Nav Bar giữ nguyên
      bottomNavigationBar: BottomNavBar(
        initialIndex: 0,
        onTabChanged: (index) {
          if (index == 1) {
            Navigator.pushReplacement(
              context,
              MaterialPageRoute(builder: (_) => const NotificationScreen()),
            );
          } else if (index == 2) {
            Navigator.pushReplacement(
              context,
              MaterialPageRoute(builder: (_) => const ProfileScreen()),
            );
          }
        },
      ),
    );
  }

  // --- WIDGET HEADER ---
  Widget _buildHeader() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 20.0, vertical: 10.0),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            "Thiết bị",
            style: GoogleFonts.poppins(
              fontSize: 28,
              fontWeight: FontWeight.bold,
              color: const Color(0xFF1A1D1E),
            ),
          ),
          Row(
            children: [
              _buildCircleButton(
                icon: Icons.add_rounded,
                color: Colors.blueAccent,
                onTap: _navigateToAddCameraScreen,
              ),
              const SizedBox(width: 12),
              Stack(
                children: [
                  _buildCircleButton(
                    icon: Icons.notifications_none_rounded,
                    color: const Color(0xFF1A1D1E),
                    onTap: () {
                      Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (_) => const NotificationScreen(),
                        ),
                      );
                    },
                  ),
                  if (_alerts.isNotEmpty)
                    Positioned(
                      right: 0,
                      top: 0,
                      child: Container(
                        padding: const EdgeInsets.all(5),
                        decoration: BoxDecoration(
                          color: Colors.redAccent,
                          shape: BoxShape.circle,
                          border: Border.all(color: Colors.white, width: 2),
                        ),
                        child: Text(
                          '${_alerts.length}',
                          style: GoogleFonts.lato(
                            color: Colors.white,
                            fontSize: 10,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                    ),
                ],
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildCircleButton({
    required IconData icon,
    required Color color,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(50),
      child: Container(
        padding: const EdgeInsets.all(10),
        decoration: BoxDecoration(
          color: Colors.white,
          shape: BoxShape.circle,
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.05),
              blurRadius: 10,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: Icon(icon, color: color, size: 26),
      ),
    );
  }

  // 🔥 CARD CAMERA HIỆN ĐẠI (Tỷ lệ 16:9 ĐỀU NHAU)
  Widget _buildCinematicCameraCard(Camera cam, int index) {
    return GestureDetector(
      onTap: () {
        Navigator.push(
          context,
          MaterialPageRoute(
            builder: (_) => CameraStreamFrameScreen(camera: cam),
          ),
        );
      },
      child: Container(
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(24),
          color: Colors.white, // Màu nền fallback
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.1), // Bóng đổ mềm
              blurRadius: 20,
              offset: const Offset(0, 10),
              spreadRadius: -5,
            ),
          ],
        ),
        // ClipRRect để bo tròn nội dung bên trong
        child: ClipRRect(
          borderRadius: BorderRadius.circular(24),
          child: AspectRatio(
            aspectRatio:
                16 / 9, // 🔥 QUAN TRỌNG: Tỷ lệ chuẩn điện ảnh (Đều nhau)
            child: Stack(
              fit: StackFit.expand,
              children: [
                // 1. STREAM PREVIEW (NỀN)
                CameraPreviewWidget(
                  camera: cam,
                  backendBaseUrl: _streamFrameBaseUrl,
                ),

                // 2. GRADIENT ĐEN (Làm nổi chữ)
                Container(
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      begin: Alignment.topCenter,
                      end: Alignment.bottomCenter,
                      colors: [
                        Colors.transparent,
                        Colors.black.withOpacity(0.2),
                        Colors.black.withOpacity(0.8),
                      ],
                      stops: const [0.5, 0.75, 1.0],
                    ),
                  ),
                ),

                // 3. ICON PLAY (Hiệu ứng kính mờ ở giữa)
                Center(
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(50),
                    child: BackdropFilter(
                      filter: ImageFilter.blur(sigmaX: 5, sigmaY: 5),
                      child: Container(
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: Colors.white.withOpacity(0.2),
                          shape: BoxShape.circle,
                          border: Border.all(
                            color: Colors.white.withOpacity(0.3),
                          ),
                        ),
                        child: Icon(
                          Icons.play_arrow_rounded,
                          color: Colors.white.withOpacity(0.9),
                          size: 32,
                        ),
                      ),
                    ),
                  ),
                ),

                // 4. THÔNG TIN (Góc dưới trái)
                Positioned(
                  bottom: 20,
                  left: 20,
                  right: 20,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Row(
                        children: [
                          // Chấm xanh Live
                          Container(
                                width: 8,
                                height: 8,
                                decoration: BoxDecoration(
                                  color: const Color(
                                    0xFF00FF94,
                                  ), // Xanh neon hiện đại
                                  shape: BoxShape.circle,
                                  boxShadow: [
                                    BoxShadow(
                                      color: const Color(
                                        0xFF00FF94,
                                      ).withOpacity(0.6),
                                      blurRadius: 10,
                                      spreadRadius: 2,
                                    ),
                                  ],
                                ),
                              )
                              .animate(onPlay: (c) => c.repeat(reverse: true))
                              .fade(duration: 1000.ms),
                          const SizedBox(width: 8),

                          // Tên Camera
                          Expanded(
                            child: Text(
                              cam.cameraName,
                              style: GoogleFonts.poppins(
                                color: Colors.white,
                                fontSize: 18,
                                fontWeight: FontWeight.w600,
                                letterSpacing: 0.5,
                              ),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 6),
                      // Địa điểm
                      Row(
                        children: [
                          const Icon(
                            Icons.location_on_outlined,
                            color: Colors.white70,
                            size: 14,
                          ),
                          const SizedBox(width: 4),
                          Text(
                            cam.location,
                            style: GoogleFonts.lato(
                              color: Colors.white70,
                              fontSize: 14,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            padding: const EdgeInsets.all(30),
            decoration: BoxDecoration(
              color: Colors.blueAccent.withOpacity(0.1),
              shape: BoxShape.circle,
            ),
            child: const Icon(
              Icons.videocam_off_outlined,
              size: 60,
              color: Colors.blueAccent,
            ),
          ),
          const SizedBox(height: 20),
          Text(
            "Chưa có thiết bị nào",
            style: GoogleFonts.poppins(
              fontSize: 18,
              fontWeight: FontWeight.w500,
              color: Colors.grey[800],
            ),
          ),
          const SizedBox(height: 8),
          Text(
            "Thêm camera mới để bắt đầu giám sát",
            style: GoogleFonts.lato(fontSize: 14, color: Colors.grey[500]),
          ),
          const SizedBox(height: 30),
          ElevatedButton.icon(
            onPressed: () {
              setState(() => _isLoading = true);
              _loadCamerasFromBackend();
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.black87,
              foregroundColor: Colors.white,
              elevation: 0,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
              ),
              padding: const EdgeInsets.symmetric(horizontal: 30, vertical: 15),
            ),
            icon: const Icon(Icons.refresh),
            label: const Text("Tải lại"),
          ),
        ],
      ),
    );
  }
}

// ==========================================================
// LOGIC PREVIEW CAMERA (Giữ nguyên logic Polling 1s)
// ==========================================================
class CameraPreviewWidget extends StatefulWidget {
  final Camera camera;
  final String backendBaseUrl;

  const CameraPreviewWidget({
    super.key,
    required this.camera,
    required this.backendBaseUrl,
  });

  @override
  State<CameraPreviewWidget> createState() => _CameraPreviewWidgetState();
}

class _CameraPreviewWidgetState extends State<CameraPreviewWidget> {
  Uint8List? _currentFrame;
  bool _isPlaying = true;

  @override
  void initState() {
    super.initState();
    _loopFetchFrame();
  }

  void _loopFetchFrame() async {
    if (!mounted || !_isPlaying) return;
    await _fetchFrame();
    if (mounted && _isPlaying) {
      await Future.delayed(const Duration(seconds: 1)); // 1 FPS cho danh sách
      _loopFetchFrame();
    }
  }

  Future<void> _fetchFrame() async {
    try {
      final timestamp = DateTime.now().millisecondsSinceEpoch;
      final url = "${widget.backendBaseUrl}/${widget.camera.id}?t=$timestamp";
      final response = await http
          .get(Uri.parse(url))
          .timeout(const Duration(seconds: 2));

      if (response.statusCode == 200) {
        final bytes = response.bodyBytes;
        if (bytes.length > 100 && mounted) {
          PaintingBinding.instance.imageCache.clearLiveImages();
          setState(() => _currentFrame = bytes);
        }
      }
    } catch (e) {}
  }

  @override
  void dispose() {
    _isPlaying = false;
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (_currentFrame == null) {
      // Placeholder loading xám
      return Container(
        color: const Color(0xFFEEEEEE),
        child: Center(
          child: CircularProgressIndicator(
            strokeWidth: 2,
            color: Colors.grey[400],
          ),
        ),
      );
    }
    return Image.memory(
      _currentFrame!,
      gaplessPlayback: true,
      fit: BoxFit.cover, // Cover để luôn full khung 16:9
      width: double.infinity,
      height: double.infinity,
    );
  }
}
