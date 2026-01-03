import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import '../services/auth_service.dart';
import '../models/camera.dart'; // 👈 import model Camera
import '../screens/CameraStreamScreen.dart';
import 'UI_device.dart'; // 👈 import màn hình stream

class AddCameraScreen extends StatefulWidget {
  const AddCameraScreen({Key? key}) : super(key: key);

  @override
  State<AddCameraScreen> createState() => _AddCameraScreenState();
}

class _AddCameraScreenState extends State<AddCameraScreen>
    with SingleTickerProviderStateMixin {
  final _cameraNameController = TextEditingController();
  final _streamUrlController = TextEditingController();
  final _locationController = TextEditingController();

  bool _isLoading = false;
  bool _isVisible = false; // Để animation fade-in
  late AnimationController _controller;
  late Animation<Offset> _slideAnimation;
  late Animation<double> _fadeAnimation;

  // Màu chủ đạo (primary) và gradient cho năm 2025 style
  final primaryColor = Colors.lightBlue.shade700;
  final gradient = LinearGradient(
    colors: [Colors.lightBlue.shade50, Colors.white],
    begin: Alignment.topCenter,
    end: Alignment.bottomCenter,
  );

  @override
  void initState() {
    super.initState();
    // Khởi tạo AnimationController
    _controller = AnimationController(
      duration: const Duration(milliseconds: 1000),
      vsync: this,
    );

    // Slide animation cho các field và nút
    _slideAnimation = Tween<Offset>(
      begin: const Offset(0, 0.3), // Trượt lên từ dưới
      end: Offset.zero,
    ).animate(CurvedAnimation(parent: _controller, curve: Curves.easeOutCubic));

    // Fade animation
    _fadeAnimation = Tween<double>(
      begin: 0.0,
      end: 1.0,
    ).animate(CurvedAnimation(parent: _controller, curve: Curves.easeIn));

    // Trigger animation sau khi build
    Future.delayed(const Duration(milliseconds: 100), () {
      setState(() {
        _isVisible = true;
        _controller.forward();
      });
    });
  }

  /// 👉 Lưu camera vào SharedPreferences (cache offline)
  Future<void> _saveCamera(Map<String, dynamic> camera) async {
    final prefs = await SharedPreferences.getInstance();
    List<String> cameras = prefs.getStringList('cameras') ?? [];
    cameras.add(jsonEncode(camera));
    await prefs.setStringList('cameras', cameras);
  }

  /// 👉 Gửi request thêm camera
  Future<void> _addNewCamera() async {
    final cameraName = _cameraNameController.text.trim();
    final streamUrl = _streamUrlController.text.trim();
    final location = _locationController.text.trim();

    if (cameraName.isEmpty || streamUrl.isEmpty || location.isEmpty) {
      _showSnackBar('⚠️ Vui lòng điền đầy đủ thông tin.', Colors.red);
      return;
    }

    setState(() => _isLoading = true);

    try {
      const String apiUrl = 'http://172.20.10.2:3000/api/cameras';
      final authHeader = await AuthService.getAuthHeader();

      if (authHeader == null) {
        _showSnackBar('❌ Không thể lấy token xác thực.', Colors.red);
        setState(() => _isLoading = false);
        return;
      }

      final response = await http.post(
        Uri.parse(apiUrl),
        headers: {
          'Content-Type': 'application/json; charset=UTF-8',
          'Authorization': authHeader,
        },
        body: jsonEncode({
          'cameraName': cameraName,
          'streamUrl': streamUrl,
          'location': location,
          'status': 'active',
        }),
      );

      if (response.statusCode == 201 || response.statusCode == 200) {
        _showSnackBar('Thêm camera thành công!', Colors.green);

        // 👉 Tạo object Camera từ dữ liệu nhập
        final newCamera = Camera(
          id: DateTime.now().millisecondsSinceEpoch.toString(),
          cameraName: cameraName,
          location: location,
          streamUrl: streamUrl,
        );

        // 👉 Lưu vào local
        await _saveCamera({
          'id': newCamera.id,
          'cameraName': newCamera.cameraName,
          'streamUrl': newCamera.streamUrl,
          'location': newCamera.location,
        });

        if (mounted) {
          // 👉 Chuyển sang CameraStreamScreen hiển thị live stream
          Navigator.pushReplacement(
            context,
            MaterialPageRoute(builder: (_) => DeviceScreen()),
          );
        }
      } else {
        _showSnackBar(
          '❌ Lỗi khi thêm camera: ${response.statusCode}',
          Colors.red,
        );
      }
    } catch (e) {
      _showSnackBar('⚠️ Có lỗi xảy ra: $e', Colors.red);
      print('Lỗi kết nối: $e');
    } finally {
      setState(() => _isLoading = false);
    }
  }

  /// 👉 Hiển thị SnackBar
  void _showSnackBar(String message, Color color) {
    ScaffoldMessenger.of(
      context,
    ).showSnackBar(SnackBar(content: Text(message), backgroundColor: color));
  }

  @override
  void dispose() {
    _cameraNameController.dispose();
    _streamUrlController.dispose();
    _locationController.dispose();
    _controller.dispose();
    super.dispose();
  }

  // --------------------------------------------------
  // UI HELPER: TextField với neumorphic style
  // --------------------------------------------------
  Widget _buildTextField({
    required TextEditingController controller,
    required String label,
    required IconData icon,
    TextInputType keyboardType = TextInputType.text,
    bool obscureText = false,
  }) {
    return Container(
      decoration: BoxDecoration(
        color:
            Theme.of(context).brightness == Brightness.dark
                ? Colors.grey.shade800
                : Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.05),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: TextField(
        controller: controller,
        keyboardType: keyboardType,
        obscureText: obscureText,
        style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w400),
        decoration: InputDecoration(
          labelText: label,
          labelStyle: TextStyle(
            color: primaryColor.withOpacity(0.8),
            fontWeight: FontWeight.w500,
          ),
          prefixIcon: Icon(icon, color: primaryColor),
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(16),
            borderSide: BorderSide.none,
          ),
          contentPadding: const EdgeInsets.symmetric(
            vertical: 18,
            horizontal: 20,
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      extendBodyBehindAppBar: true, // Để gradient phủ đầy
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        title: const Text(
          'Thêm Camera Mới',
          style: TextStyle(
            fontSize: 24,
            fontWeight: FontWeight.bold,
            color: Colors.black87,
          ),
        ),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: Colors.black87),
          onPressed: () => Navigator.pop(context),
        ),
      ),
      body: Container(
        decoration: BoxDecoration(gradient: gradient), // Gradient background
        child: SafeArea(
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(
              horizontal: 28.0,
              vertical: 20.0,
            ),
            child: AnimatedOpacity(
              opacity: _isVisible ? 1.0 : 0.0,
              duration: const Duration(milliseconds: 800),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // 1. Icon / Logo với animation scale
                  AnimatedScale(
                    scale: _isVisible ? 1.0 : 0.8,
                    duration: const Duration(milliseconds: 600),
                    child: Icon(
                      Icons.add_a_photo,
                      size: 90,
                      color: primaryColor,
                    ),
                  ),
                  const SizedBox(height: 32),

                  // 2. Tiêu đề phụ
                  Text(
                    'Vui lòng nhập thông tin camera mới.',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontSize: 16,
                      color: Colors.grey.shade600,
                      fontWeight: FontWeight.w400,
                    ),
                  ),
                  const SizedBox(height: 48),

                  // 3. Trường nhập Tên Camera với slide animation
                  SlideTransition(
                    position: _slideAnimation,
                    child: FadeTransition(
                      opacity: _fadeAnimation,
                      child: _buildTextField(
                        controller: _cameraNameController,
                        label: 'Tên Camera',
                        icon: Icons.label,
                      ),
                    ),
                  ),
                  const SizedBox(height: 24),

                  // 4. Trường nhập RTSP / Stream URL với slide animation
                  SlideTransition(
                    position: _slideAnimation,
                    child: FadeTransition(
                      opacity: _fadeAnimation,
                      child: _buildTextField(
                        controller: _streamUrlController,
                        label: 'RTSP / Stream URL',
                        icon: Icons.link,
                        keyboardType: TextInputType.url,
                      ),
                    ),
                  ),
                  const SizedBox(height: 24),

                  // 5. Trường nhập Vị trí với slide animation
                  SlideTransition(
                    position: _slideAnimation,
                    child: FadeTransition(
                      opacity: _fadeAnimation,
                      child: _buildTextField(
                        controller: _locationController,
                        label: 'Vị trí',
                        icon: Icons.location_on,
                      ),
                    ),
                  ),
                  const SizedBox(height: 32),

                  // 6. Nút Thêm Camera với elevation và scale animation khi nhấn
                  _isLoading
                      ? Center(
                        child: CircularProgressIndicator(color: primaryColor),
                      )
                      : SlideTransition(
                        position: _slideAnimation,
                        child: FadeTransition(
                          opacity: _fadeAnimation,
                          child: ElevatedButton(
                            onPressed: _addNewCamera,
                            style: ElevatedButton.styleFrom(
                              backgroundColor: primaryColor,
                              foregroundColor: Colors.white,
                              padding: const EdgeInsets.symmetric(vertical: 18),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(16),
                              ),
                              elevation: 6,
                              shadowColor: primaryColor.withOpacity(0.4),
                            ),
                            child: const Text(
                              'Thêm Camera',
                              style: TextStyle(
                                fontSize: 18,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ),
                        ),
                      ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
