import 'package:flutter/material.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_staggered_grid_view/flutter_staggered_grid_view.dart';

class AlertDetailScreen extends StatelessWidget {
  final String alertId;

  const AlertDetailScreen({super.key, required this.alertId});

  static const Color primaryColor = Colors.lightBlue;
  static const Color surfaceColor = Color(0xFFF5F7FA);

  @override
  Widget build(BuildContext context) {
    final currentUser = FirebaseAuth.instance.currentUser;

    if (currentUser == null) {
      return const Scaffold(body: Center(child: Text("Chưa đăng nhập")));
    }

    final uid = currentUser.uid;
    final alertRef = FirebaseFirestore.instance
        .collection("users")
        .doc(uid)
        .collection("alerts")
        .doc(alertId);

    return Scaffold(
      backgroundColor: surfaceColor,
      body: FutureBuilder<DocumentSnapshot>(
        future: alertRef.get(),
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(
              child: CircularProgressIndicator(color: primaryColor),
            );
          }

          if (!snapshot.hasData || !snapshot.data!.exists) {
            return const Center(child: Text("Alert không tồn tại"));
          }

          final data = snapshot.data!.data() as Map<String, dynamic>? ?? {};
          final timestamp = data['timestamp'];
          final timeString =
              timestamp is Timestamp
                  ? _formatTimestamp(timestamp)
                  : timestamp is String
                  ? _formatTimestamp(
                    Timestamp.fromDate(DateTime.parse(timestamp)),
                  )
                  : 'Unknown Time';

          WidgetsBinding.instance.addPostFrameCallback((_) {
            _updateReadStatus(alertRef);
          });

          return _buildDetailedUI(context, data, timeString);
        },
      ),
    );
  }

  Widget _buildDetailedUI(
    BuildContext context,
    Map<String, dynamic> data,
    String timeString,
  ) {
    final title = data['cameraName'] ?? 'Chi tiết Cảnh báo';
    final imageUrl = data['imageUrl'];
    final alertType = data['type'] ?? 'Không xác định';
    final location = data['location'] ?? 'N/A';
    final cameraId = data['cameraId'] ?? 'N/A';

    return CustomScrollView(
      physics: const BouncingScrollPhysics(),
      slivers: <Widget>[
        // 1. Header ảnh lớn co giãn (Parallax Effect)
        SliverAppBar(
          expandedHeight: 300.0, // Giảm nhẹ chiều cao để cân đối hơn
          floating: false,
          pinned: true,
          backgroundColor: primaryColor,
          iconTheme: const IconThemeData(
            color: Color.fromARGB(255, 69, 69, 69),
          ),
          flexibleSpace: FlexibleSpaceBar(
            titlePadding: const EdgeInsets.only(left: 16, bottom: 16),
            title: Text(
              title,
              style: GoogleFonts.poppins(
                color: Colors.white,
                fontWeight: FontWeight.w600,
                fontSize: 18, // Tăng font size tiêu đề
                shadows: [const Shadow(blurRadius: 10, color: Colors.black54)],
              ),
            ),
            background: Stack(
              fit: StackFit.expand,
              children: [
                if (imageUrl != null)
                  Hero(
                    tag: 'alert_image_$alertId',
                    child: FadeInImage.assetNetwork(
                      placeholder: 'assets/placeholder.png',
                      image: imageUrl,
                      fit: BoxFit.cover,
                      imageErrorBuilder:
                          (_, __, ___) => Container(
                            color: Colors.grey.shade300,
                            child: const Icon(
                              Icons.broken_image,
                              size: 50,
                              color: Colors.grey,
                            ),
                          ),
                    ),
                  )
                else
                  Container(
                    color: primaryColor,
                    child: const Icon(
                      Icons.notifications,
                      size: 80,
                      color: Colors.white54,
                    ),
                  ),
                // Gradient mờ bên dưới
                Container(
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      begin: Alignment.topCenter,
                      end: Alignment.bottomCenter,
                      colors: [
                        Colors.transparent,
                        Colors.black.withOpacity(0.8),
                      ],
                      stops: const [0.6, 1.0],
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),

        // 2. Nội dung chính
        SliverToBoxAdapter(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(20, 24, 20, 40),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Container(
                      width: 4,
                      height: 24,
                      decoration: BoxDecoration(
                        color: primaryColor,
                        borderRadius: BorderRadius.circular(2),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Text(
                      "Thông tin sự kiện",
                      style: GoogleFonts.poppins(
                        fontSize: 20,
                        fontWeight: FontWeight.bold,
                        color: Colors.black87,
                      ),
                    ),
                  ],
                ).animate().fadeIn().slideX(begin: -0.1),

                const SizedBox(height: 20),

                // 3. Grid thông tin (Staggered Grid)
                StaggeredGrid.count(
                  crossAxisCount: 2,
                  mainAxisSpacing: 16,
                  crossAxisSpacing: 16,
                  children: [
                        // Loại cảnh báo
                        _buildStatTile(
                          icon:
                              alertType == 'fire'
                                  ? Icons.local_fire_department
                                  : Icons.warning_amber_rounded,
                          color:
                              alertType == 'fire'
                                  ? Colors.redAccent
                                  : Colors.orangeAccent,
                          title: "Loại cảnh báo",
                          value: alertType.toUpperCase(),
                          isHighlight: true,
                        ),
                        // Thời gian
                        _buildStatTile(
                          icon: Icons.access_time_filled,
                          color: Colors.blueAccent,
                          title: "Thời gian phát hiện",
                          value: timeString,
                        ),
                        // Camera ID
                        _buildStatTile(
                          icon: Icons.videocam,
                          color:
                              Colors.purpleAccent, // Đổi màu chút cho sinh động
                          title: "Camera ID",
                          value: cameraId,
                        ),
                        // Vị trí (Để cuối cùng vì thường text dài)
                        _buildStatTile(
                          icon: Icons.location_on,
                          color: Colors.green,
                          title: "Khu vực / Vị trí",
                          value: location,
                        ),
                      ]
                      .animate(interval: 100.ms)
                      .fadeIn(duration: 400.ms)
                      .slideY(begin: 0.2, end: 0, curve: Curves.easeOutQuad),
                ),

                const SizedBox(height: 40), // Khoảng trống dưới cùng
              ],
            ),
          ),
        ),
      ],
    );
  }

  // Widget con: Thẻ thông tin dạng Grid
  Widget _buildStatTile({
    required IconData icon,
    required Color color,
    required String title,
    required String value,
    bool isHighlight = false,
  }) {
    return Container(
      padding: const EdgeInsets.all(20), // Tăng padding bên trong thẻ
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24), // Bo tròn mềm mại hơn
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.05),
            blurRadius: 15,
            offset: const Offset(0, 5),
          ),
        ],
        border:
            isHighlight
                ? Border.all(color: color.withOpacity(0.5), width: 1.5)
                : Border.all(color: Colors.transparent),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: color.withOpacity(0.1),
                  shape: BoxShape.circle,
                ),
                child: Icon(icon, color: color, size: 28),
              ),
              if (isHighlight)
                Icon(
                  Icons.priority_high,
                  size: 16,
                  color: color.withOpacity(0.5),
                ),
            ],
          ),
          const SizedBox(height: 16),
          Text(
            title,
            style: GoogleFonts.poppins(
              fontSize: 13,
              color: Colors.grey.shade500,
              fontWeight: FontWeight.w500,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            value,
            style: GoogleFonts.poppins(
              fontSize: 16,
              color: Colors.black87,
              fontWeight: FontWeight.w600,
              height: 1.3,
            ),
            maxLines: 3, // Cho phép hiện nhiều dòng hơn nếu địa chỉ dài
            overflow: TextOverflow.ellipsis,
          ),
        ],
      ),
    );
  }

  // --- LOGIC XỬ LÝ (GIỮ NGUYÊN) ---
  Future<void> _updateReadStatus(DocumentReference alertRef) async {
    try {
      await alertRef.update({'isRead': true});
      print("✅ Đã cập nhật trạng thái isRead cho alert: $alertId");
    } catch (e) {
      print("❌ Lỗi cập nhật isRead: $e");
    }
  }

  String _formatTimestamp(Timestamp timestamp) {
    final dateTime = timestamp.toDate();
    return "${dateTime.hour.toString().padLeft(2, '0')}:${dateTime.minute.toString().padLeft(2, '0')} - ${dateTime.day.toString().padLeft(2, '0')}/${dateTime.month.toString().padLeft(2, '0')}/${dateTime.year}";
  }
}
