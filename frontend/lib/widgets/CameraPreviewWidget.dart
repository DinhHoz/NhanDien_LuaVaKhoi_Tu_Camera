import 'dart:async';
import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:firebase_auth/firebase_auth.dart';
import '../models/camera.dart';

class CameraPreviewWidget extends StatefulWidget {
  final Camera camera;
  final String backendBaseUrl;

  const CameraPreviewWidget({
    super.key,
    required this.camera,
    required this.backendBaseUrl, // Truyền URL từ ngoài vào
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

    // 🔥 TỐI ƯU CHO DANH SÁCH:
    // Chỉ cập nhật 1 giây 1 lần (1 FPS) hoặc 500ms 1 lần.
    // Đừng để 0ms như màn hình chi tiết, sẽ rất lag nếu list dài.
    if (mounted && _isPlaying) {
      await Future.delayed(const Duration(seconds: 1));
      _loopFetchFrame();
    }
  }

  Future<void> _fetchFrame() async {
    try {
      // ⚠️ Lưu ý: Nếu backend stream-frame chạy khác port với backend cameras,
      // bạn phải xử lý chuỗi URL cho đúng.
      // Ở đây giả định backendBaseUrl là "http://IP:PORT/api/stream-frame"

      final timestamp = DateTime.now().millisecondsSinceEpoch;
      final url = "${widget.backendBaseUrl}/${widget.camera.id}?t=$timestamp";

      final response = await http
          .get(Uri.parse(url))
          .timeout(const Duration(seconds: 2)); // Timeout ngắn hơn cho preview

      if (response.statusCode == 200) {
        final bytes = response.bodyBytes;
        if (bytes.length > 100 && mounted) {
          // Xóa cache nhẹ để tránh đầy RAM khi lướt danh sách dài
          PaintingBinding.instance.imageCache.clearLiveImages();

          setState(() {
            _currentFrame = bytes;
          });
        }
      }
    } catch (e) {
      // Lỗi thì bỏ qua, đợi lần loop sau
    }
  }

  @override
  void dispose() {
    _isPlaying = false;
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (_currentFrame == null) {
      // Trong lúc chờ frame đầu tiên, hiện ảnh placeholder hoặc loading
      return Container(
        color: Colors.grey[900],
        child: const Center(
          child: Icon(Icons.videocam, color: Colors.white24, size: 40),
        ),
      );
    }

    return Image.memory(
      _currentFrame!,
      gaplessPlayback: true,
      fit: BoxFit.cover, // Full khung hình thẻ
      width: double.infinity,
      height: double.infinity,
    );
  }
}
