import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:flutter_animate/flutter_animate.dart'; // Cần thêm package này

import '../widgets/bottom_nav_bar.dart';
import 'UI_alert_detail.dart';
import 'UI_device.dart';
import 'UI_profile.dart';
import '../models/camera.dart';

class NotificationScreen extends StatefulWidget {
  const NotificationScreen({super.key});

  @override
  _NotificationScreenState createState() => _NotificationScreenState();
}

class _NotificationScreenState extends State<NotificationScreen> {
  // ==================== GIỮ NGUYÊN LOGIC GỐC (Bắt đầu) ====================
  final User? currentUser = FirebaseAuth.instance.currentUser;
  String _filterStatus = 'all';
  String? _filterCamera;
  String _filterDate = 'all';
  DateTime? _startDate;
  DateTime? _endDate;
  List<Camera> _cameras = [];
  bool _isLoadingCameras = true;
  
  // (Đã loại bỏ AnimationController thủ công để dùng flutter_animate hiện đại hơn)
  
  final primaryColor = Colors.lightBlue.shade700;

  @override
  void initState() {
    super.initState();
    _loadCameras();
    // Animation tự động chạy nhờ flutter_animate, không cần init controller
  }

  Future<void> _loadCameras() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      List<String> saved = prefs.getStringList('cameras') ?? [];
      setState(() {
        _cameras = saved.map((c) {
          try {
            final data = jsonDecode(c) as Map<String, dynamic>;
            return Camera(
              id: data['id'] ?? DateTime.now().millisecondsSinceEpoch.toString(),
              cameraName: data['cameraName'] ?? 'Camera',
              location: data['location'] ?? 'Không rõ',
              streamUrl: data['streamUrl'] ?? '',
            );
          } catch (e) {
            return Camera(
              id: DateTime.now().millisecondsSinceEpoch.toString(),
              cameraName: 'Camera lỗi',
              location: 'Không rõ',
              streamUrl: '',
            );
          }
        }).toList();
        _isLoadingCameras = false;
      });
    } catch (e) {
      print('Error loading cameras: $e');
      setState(() => _isLoadingCameras = false);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Lỗi tải danh sách camera: $e')));
      }
    }
  }

  Future<void> _showCustomDatePicker() async {
    final picked = await showDateRangePicker(
      context: context,
      firstDate: DateTime(2000),
      lastDate: DateTime.now(),
      builder: (context, child) => Theme(
        data: ThemeData.light().copyWith(
          colorScheme: ColorScheme.light(primary: primaryColor),
        ),
        child: child!,
      ),
    );
    if (picked != null && picked.start != null && picked.end != null && mounted) {
      setState(() {
        _filterDate = 'custom';
        _startDate = picked.start;
        _endDate = picked.end;
      });
    }
  }

  Future<void> _markAsRead(String alertId) async {
    if (currentUser == null) return;
    try {
      await FirebaseFirestore.instance
          .collection("users")
          .doc(currentUser!.uid)
          .collection("alerts")
          .doc(alertId)
          .set({'isRead': true}, SetOptions(merge: true));
    } catch (e) {
      print('Error marking alert as read: $e');
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Lỗi khi đánh dấu đã đọc: $e')));
      }
    }
  }
  // ==================== GIỮ NGUYÊN LOGIC GỐC (Kết thúc) ====================

  @override
  Widget build(BuildContext context) {
    // ==================== TÁI SỬ DỤNG LOGIC QUERY (Bắt đầu) ====================
    Query<Map<String, dynamic>> query = FirebaseFirestore.instance
        .collection("users")
        .doc(currentUser?.uid)
        .collection("alerts")
        .orderBy("timestamp", descending: true)
        .limit(50);

    List<Query<Map<String, dynamic>>> filters = [];

    if (_filterStatus == 'unread') {
      filters.add(query.where('isRead', isEqualTo: false));
    }

    if (_filterCamera != null && _filterCamera != 'all') {
      filters.add(query.where('cameraName', isEqualTo: _filterCamera));
    }

    if (_filterDate != 'all') {
      DateTime now = DateTime.now();
      DateTime startDate;
      DateTime endDate = now.add(const Duration(days: 1));

      if (_filterDate == 'today') {
        startDate = DateTime(now.year, now.month, now.day);
      } else if (_filterDate == 'last7days') {
        startDate = now.subtract(const Duration(days: 7));
      } else if (_filterDate == 'custom' && _startDate != null && _endDate != null) {
        startDate = _startDate!;
        endDate = _endDate!.add(const Duration(days: 1));
      } else {
        startDate = now.subtract(const Duration(days: 30));
      }

      filters.add(query.where('timestamp', isGreaterThanOrEqualTo: Timestamp.fromDate(startDate)));
      filters.add(query.where('timestamp', isLessThan: Timestamp.fromDate(endDate)));
    }

    // Apply filters sequentially
    for (var filter in filters) {
      query = filter;
    }
    // ==================== TÁI SỬ DỤNG LOGIC QUERY (Kết thúc) ====================

    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return Scaffold(
      backgroundColor: theme.colorScheme.surface,
      // Sử dụng CustomScrollView để UI hiện đại hơn (Appbar co giãn)
      body: StreamBuilder<QuerySnapshot>(
        stream: query.snapshots(),
        builder: (context, snapshot) {
          
          // Xử lý các trạng thái hiển thị
          Widget bodySliver;

          if (currentUser == null) {
            bodySliver = SliverFillRemaining(
              child: Center(child: Text('Chưa đăng nhập', style: TextStyle(color: theme.colorScheme.secondary))),
            );
          } else if (snapshot.hasError) {
             bodySliver = SliverFillRemaining(
              child: Center(child: Text('Lỗi tải dữ liệu: ${snapshot.error}')),
            );
          } else if (snapshot.connectionState == ConnectionState.waiting) {
             bodySliver = SliverFillRemaining(
              child: Center(child: CircularProgressIndicator(color: primaryColor)),
            );
          } else {
            final docs = snapshot.data!.docs;
            if (docs.isEmpty) {
              bodySliver = SliverFillRemaining(child: _buildEmptyState());
            } else {
              bodySliver = SliverPadding(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                sliver: SliverList(
                  delegate: SliverChildBuilderDelegate(
                    (context, index) {
                      final doc = docs[index];
                      // Gọi hàm build item mới (nhưng logic lấy data bên trong vẫn giữ nguyên)
                      return _buildNotificationItem(doc, context)
                          .animate(delay: (30 * index).ms) // Hiệu ứng cascade
                          .fadeIn(duration: 400.ms)
                          .slideY(begin: 0.1, end: 0, curve: Curves.easeOutQuad);
                    },
                    childCount: docs.length,
                  ),
                ),
              );
            }
          }

          return CustomScrollView(
            physics: const BouncingScrollPhysics(),
            slivers: [
              // AppBar hiện đại
              SliverAppBar.medium(
                title: Text(
                  'Thông báo',
                  style: TextStyle(
                    color: theme.colorScheme.onSurface,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                backgroundColor: theme.colorScheme.surface,
                centerTitle: false,
                actions: [
                  // Nút filter giữ nguyên logic PopupMenuButton
                  _buildFilterButton(theme),
                ],
              ),
              // Phần nội dung danh sách
              bodySliver,
              // Khoảng trắng dưới cùng để tránh BottomBar
              const SliverToBoxAdapter(child: SizedBox(height: 80)),
            ],
          );
        },
      ),
      bottomNavigationBar: BottomNavBar(
        initialIndex: 1,
        onTabChanged: (index) {
          // Giữ nguyên logic chuyển trang
          switch (index) {
            case 0:
              Navigator.pushReplacement(context, MaterialPageRoute(builder: (_) => const DeviceScreen()));
              break;
            case 1:
              Navigator.pushReplacement(context, MaterialPageRoute(builder: (_) => const NotificationScreen()));
              break;
            case 2:
              Navigator.pushReplacement(context, MaterialPageRoute(builder: (_) => const ProfileScreen()));
              break;
          }
        },
      ),
    );
  }

  // Widget nút Filter (Giữ nguyên logic menu, chỉ chỉnh style icon)
  Widget _buildFilterButton(ThemeData theme) {
    if (_isLoadingCameras) {
      return Padding(
        padding: const EdgeInsets.all(16.0),
        child: SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: primaryColor)),
      );
    }
    
    return Container(
      margin: const EdgeInsets.only(right: 8),
      child: PopupMenuButton<String>(
        icon: Icon(Icons.filter_list_rounded, color: primaryColor),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        offset: const Offset(0, 45),
        onSelected: (value) {
          // Giữ nguyên logic xử lý onSelected
          setState(() {
            if (value == 'reset') {
              _filterStatus = 'all';
              _filterCamera = null;
              _filterDate = 'all';
              _startDate = null;
              _endDate = null;
            } else if (value.startsWith('status_')) {
              _filterStatus = value.replaceFirst('status_', '');
            } else if (value.startsWith('camera_')) {
              _filterCamera = value.replaceFirst('camera_', '');
            } else if (value.startsWith('date_')) {
              _filterDate = value.replaceFirst('date_', '');
              if (_filterDate == 'custom') {
                _showCustomDatePicker();
              }
            }
          });
        },
        // Giữ nguyên danh sách menu item
        itemBuilder: (BuildContext context) => <PopupMenuEntry<String>>[
          const PopupMenuItem<String>(value: 'status_all', child: Row(children: [Icon(Icons.all_inclusive, size: 20), SizedBox(width: 8), Text('Tất cả trạng thái')])),
          const PopupMenuItem<String>(value: 'status_unread', child: Row(children: [Icon(Icons.mark_email_unread, size: 20), SizedBox(width: 8), Text('Chưa đọc')])),
          const PopupMenuDivider(),
          const PopupMenuItem<String>(value: 'camera_all', child: Row(children: [Icon(Icons.videocam, size: 20), SizedBox(width: 8), Text('Tất cả camera')])),
          ..._cameras.map((camera) => PopupMenuItem<String>(value: 'camera_${camera.cameraName}', child: Row(children: [Icon(Icons.camera_alt, size: 20), SizedBox(width: 8), Text(camera.cameraName)]))),
          const PopupMenuDivider(),
          const PopupMenuItem<String>(value: 'date_all', child: Row(children: [Icon(Icons.calendar_today, size: 20), SizedBox(width: 8), Text('Tất cả ngày')])),
          const PopupMenuItem<String>(value: 'date_today', child: Row(children: [Icon(Icons.today, size: 20), SizedBox(width: 8), Text('Hôm nay')])),
          const PopupMenuItem<String>(value: 'date_last7days', child: Row(children: [Icon(Icons.calendar_view_week, size: 20), SizedBox(width: 8), Text('7 ngày qua')])),
          const PopupMenuItem<String>(value: 'date_custom', child: Row(children: [Icon(Icons.date_range, size: 20), SizedBox(width: 8), Text('Tùy chỉnh')])),
          const PopupMenuDivider(),
          const PopupMenuItem<String>(value: 'reset', child: Row(children: [Icon(Icons.refresh, size: 20, color: Colors.red), SizedBox(width: 8), Text('Đặt lại bộ lọc', style: TextStyle(color: Colors.red))])),
        ],
      ),
    );
  }

  // Widget hiển thị item thông báo (Giao diện mới, logic cũ)
  Widget _buildNotificationItem(DocumentSnapshot doc, BuildContext context) {
    // Lấy dữ liệu y hệt code cũ
    final alert = doc.data() as Map<String, dynamic>;
    final alertId = doc.id;
    final cameraName = alert["cameraName"] ?? "Không rõ";
    final location = alert["location"] ?? "";
    final type = alert["type"] ?? "";
    final isRead = alert["isRead"] ?? false;
    final timestamp = (alert["timestamp"] as Timestamp?)?.toDate();
    
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    // Giao diện Card hiện đại hơn
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        // Logic màu nền: Chưa đọc thì sáng/nổi bật hơn
        color: isDark 
            ? (isRead ? theme.cardColor : theme.colorScheme.primary.withOpacity(0.1))
            : (isRead ? Colors.white : Colors.blue.shade50),
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.05),
            blurRadius: 10,
            offset: const Offset(0, 4),
          )
        ],
        border: isRead ? Border.all(color: Colors.transparent) : Border.all(color: primaryColor.withOpacity(0.3)),
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          borderRadius: BorderRadius.circular(16),
          // Giữ nguyên logic onTap
          onTap: () {
            _markAsRead(alertId);
            Navigator.push(
              context,
              MaterialPageRoute(
                builder: (_) => AlertDetailScreen(alertId: alertId),
              ),
            );
          },
          child: Padding(
            padding: const EdgeInsets.all(16.0),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Icon trạng thái (Fire/Smoke)
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: type == "fire" ? Colors.red.withOpacity(0.1) : Colors.grey.withOpacity(0.1),
                    shape: BoxShape.circle,
                  ),
                  child: Icon(
                    type == "fire" ? Icons.local_fire_department : Icons.smoke_free,
                    color: type == "fire" ? Colors.red.shade700 : Colors.grey,
                    size: 28,
                  ),
                ),
                const SizedBox(width: 16),
                // Nội dung text
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Expanded(
                            child: Text(
                              "Camera: $cameraName",
                              style: TextStyle(
                                fontSize: 16,
                                fontWeight: isRead ? FontWeight.w600 : FontWeight.bold, // Chưa đọc thì đậm hơn
                                color: theme.textTheme.bodyLarge?.color,
                              ),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                          // Chấm xanh đánh dấu chưa đọc
                          if (!isRead)
                            Container(
                              margin: const EdgeInsets.only(left: 8),
                              width: 10, height: 10,
                              decoration: BoxDecoration(color: primaryColor, shape: BoxShape.circle),
                            ),
                        ],
                      ),
                      const SizedBox(height: 6),
                      Text(
                        location,
                        style: TextStyle(
                          fontSize: 14,
                          color: theme.textTheme.bodyMedium?.color?.withOpacity(0.7),
                        ),
                      ),
                      const SizedBox(height: 8),
                      Row(
                        children: [
                          Icon(Icons.access_time, size: 14, color: theme.disabledColor),
                          const SizedBox(width: 4),
                          Text(
                            timestamp != null ? timestamp.toString().substring(0, 19) : 'Không rõ thời gian',
                            style: TextStyle(
                              fontSize: 12,
                              color: theme.disabledColor,
                              fontStyle: FontStyle.italic
                            ),
                          ),
                        ],
                      )
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

  // Widget hiển thị khi danh sách trống
  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.notifications_none, size: 80, color: Colors.grey.shade400)
              .animate(onPlay: (c) => c.repeat(reverse: true))
              .scaleXY(begin: 1, end: 1.1, duration: 1.seconds), // Animation nhẹ
          const SizedBox(height: 16),
          Text(
            'Không có thông báo nào.',
            style: TextStyle(
              fontSize: 18,
              color: Colors.grey.shade600,
              fontWeight: FontWeight.w500,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'Thử thay đổi bộ lọc xem sao nhé!',
            style: TextStyle(color: Colors.grey.shade500),
          ),
        ],
      ).animate().fadeIn().moveY(begin: 20, end: 0),
    );
  }
}