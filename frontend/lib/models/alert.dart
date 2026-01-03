import 'package:cloud_firestore/cloud_firestore.dart';

class Alert {
  final String alertId;
  final String cameraId;
  final String cameraName;
  final String location;
  final String type;
  final String imageUrl;
  final String status;
  final DateTime timestamp;
  final double? confidence;
  final String? fcmMessageId;
  final bool isRead;

  Alert({
    required this.alertId,
    required this.cameraId,
    required this.cameraName,
    required this.location,
    required this.type,
    required this.imageUrl,
    required this.status,
    required this.timestamp,
    this.confidence,
    this.fcmMessageId,
    this.isRead = false,
  });

  factory Alert.fromJson(Map<String, dynamic> json) {
    return Alert(
      alertId: json['alertId'] ?? '',
      cameraId: json['cameraId'] ?? '',
      cameraName: json['cameraName'] ?? '',
      location: json['location'] ?? '',
      type: json['type'] ?? 'unknown',
      imageUrl: json['imageUrl'] ?? '',
      status: json['status'] ?? 'active',
      timestamp:
          json['timestamp'] is Timestamp
              ? (json['timestamp'] as Timestamp).toDate()
              : (json['timestamp'] is String
                  ? DateTime.parse(json['timestamp'])
                  : DateTime.now()),
      confidence:
          json['confidence'] != null
              ? (json['confidence'] is num
                  ? json['confidence'].toDouble()
                  : null)
              : null,
      fcmMessageId: json['fcmMessageId'],
      isRead: json['isRead'] ?? false,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'alertId': alertId,
      'cameraId': cameraId,
      'cameraName': cameraName,
      'location': location,
      'type': type,
      'imageUrl': imageUrl,
      'status': status,
      'timestamp': Timestamp.fromDate(timestamp),
      'confidence': confidence,
      'fcmMessageId': fcmMessageId,
      'isRead': isRead,
    };
  }
}
