import 'package:flutter/material.dart';
import '../screens/UI_device.dart';
import '../screens/UI_notification.dart';
// 🚀 1. THÊM IMPORT CHO PROFILE SCREEN
import '../screens/UI_profile.dart'; // Giả định tên file ProfileScreen của bạn

class BottomNavBar extends StatefulWidget {
  final int initialIndex;
  final Function(int) onTabChanged;

  const BottomNavBar({
    super.key,
    required this.initialIndex,
    required this.onTabChanged,
  });

  @override
  _BottomNavBarState createState() => _BottomNavBarState();
}

class _BottomNavBarState extends State<BottomNavBar> {
  late int _selectedIndex;

  @override
  void initState() {
    super.initState();
    _selectedIndex = widget.initialIndex;
  }

  void _onItemTapped(int index) {
    if (_selectedIndex != index) {
      setState(() {
        _selectedIndex = index;
      });
      widget.onTabChanged(index); // Gọi callback để thông báo thay đổi tab

      // 🚀 2. CẬP NHẬT LOGIC ĐIỀU HƯỚNG
      switch (index) {
        case 0:
          Navigator.pushReplacement(
            context,
            MaterialPageRoute(builder: (_) => const DeviceScreen()),
          );
          break;
        case 1:
          Navigator.pushReplacement(
            context,
            MaterialPageRoute(builder: (_) => const NotificationScreen()),
          );
          break;
        case 2:
          // Điều hướng đến ProfileScreen
          Navigator.pushReplacement(
            context,
            MaterialPageRoute(builder: (_) => const ProfileScreen()),
          );
          break;
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return BottomNavigationBar(
      type: BottomNavigationBarType.fixed,
      backgroundColor: Colors.white,
      selectedItemColor: Colors.lightBlue,
      unselectedItemColor: Colors.blueGrey,
      selectedFontSize: 14,
      unselectedFontSize: 13,
      elevation: 8,
      // 🚀 3. CẬP NHẬT DANH SÁCH ITEMS
      items: const [
        BottomNavigationBarItem(icon: Icon(Icons.home), label: 'Trang chủ'),
        BottomNavigationBarItem(
          icon: Icon(Icons.notifications_outlined),
          label: 'Thông báo',
        ),
        BottomNavigationBarItem(
          icon: Icon(Icons.person_outline),
          label: 'Tôi', // Tab thứ ba cho Profile
        ),
      ],
      currentIndex: _selectedIndex,
      onTap: _onItemTapped,
    );
  }
}
