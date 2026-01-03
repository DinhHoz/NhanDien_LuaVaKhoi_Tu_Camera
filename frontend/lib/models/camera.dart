class Camera {
  final String id;
  final String cameraName;
  final String location;
  final String streamUrl;

  Camera({
    required this.id,
    required this.cameraName,
    required this.location,
    required this.streamUrl,
  });

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'cameraName': cameraName,
      'location': location,
      'streamUrl': streamUrl,
    };
  }

  factory Camera.fromJson(Map<String, dynamic> json) {
    return Camera(
      id: json['id'] ?? DateTime.now().millisecondsSinceEpoch.toString(),
      cameraName: json['cameraName'],
      location: json['location'],
      streamUrl: json['streamUrl'],
    );
  }
}
