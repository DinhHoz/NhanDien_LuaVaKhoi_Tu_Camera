import 'package:flutter_dotenv/flutter_dotenv.dart';

class ApiConfig {
  static String get baseUrl {
    final url = dotenv.env['API_BACKEND_URL'];
    if (url == null || url.isEmpty) {
      throw Exception("API_BACKEND_URL is missing in .env");
    }
    return url;
  }

  static String path(String route) {
    return "$baseUrl$route";
  }
}
