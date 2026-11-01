import 'dart:async';
import 'dart:convert';

import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

import '../utils/constants.dart';

// Lỗi do API trả về (hoặc lỗi kết nối)
class ApiException implements Exception {
  final String message;
  final int? statusCode;
  final List<String> errors;

  ApiException(this.message, {this.statusCode, this.errors = const []});

  // Nội dung nên hiển thị cho người dùng: ưu tiên danh sách lỗi chi tiết
  String get displayMessage => errors.isEmpty ? message : errors.join('\n');

  @override
  String toString() => message;
}

class ApiClient {
  // ----- Quản lý token -----
  Future<String?> getToken() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(AppConstants.tokenKey);
  }

  Future<void> saveToken(String token) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(AppConstants.tokenKey, token);
  }

  Future<void> clearToken() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(AppConstants.tokenKey);
  }

  // ----- Các phương thức gọi API -----
  Future<Map<String, dynamic>> get(String path) {
    return _request('GET', path);
  }

  Future<Map<String, dynamic>> post(
      String path,
      Map<String, dynamic> body, {
        bool auth = true,
      }) {
    return _request('POST', path, body: body, auth: auth);
  }

  Future<Map<String, dynamic>> put(
      String path,
      Map<String, dynamic> body, {
        bool auth = true,
      }) {
    return _request('PUT', path, body: body, auth: auth);
  }

  Future<Map<String, dynamic>> patch(
      String path,
      Map<String, dynamic> body, {
        bool auth = true,
      }) {
    return _request('PATCH', path, body: body, auth: auth);
  }

  Future<Map<String, dynamic>> delete(String path, {bool auth = true}) {
    return _request('DELETE', path, auth: auth);
  }

  // ----- Hàm gửi request dùng chung -----
  Future<Map<String, dynamic>> _request(
      String method,
      String path, {
        Map<String, dynamic>? body,
        bool auth = true,
      }) async {
    final uri = Uri.parse('${AppConstants.baseUrl}$path');
    final request = http.Request(method, uri);
    request.headers['Content-Type'] = 'application/json';

    // Gắn token vào header nếu API này cần đăng nhập
    if (auth) {
      final token = await getToken();
      if (token != null) {
        request.headers['Authorization'] = 'Bearer $token';
      }
    }

    if (body != null) {
      request.body = jsonEncode(body);
    }

    // 1. Gửi request
    http.Response response;
    try {
      final streamed = await request.send().timeout(const Duration(seconds: 15));
      response = await http.Response.fromStream(streamed);
    } on TimeoutException {
      throw ApiException('Máy chủ phản hồi quá lâu, vui lòng thử lại');
    } catch (_) {
      throw ApiException(
        'Không kết nối được máy chủ. Hãy kiểm tra API đã chạy chưa.',
      );
    }

    // 2. Đọc JSON (dùng utf8.decode để tiếng Việt không bị lỗi)
    Map<String, dynamic> json;
    try {
      json = jsonDecode(utf8.decode(response.bodyBytes)) as Map<String, dynamic>;
    } catch (_) {
      throw ApiException(
        'Phản hồi từ máy chủ không hợp lệ',
        statusCode: response.statusCode,
      );
    }

    // 3. Mã từ 400 trở lên là lỗi: ném ApiException với thông báo của backend
    if (response.statusCode >= 400) {
      final errors = (json['errors'] as List?)
          ?.map((e) => e.toString())
          .toList() ??
          <String>[];
      throw ApiException(
        json['message']?.toString() ?? 'Có lỗi xảy ra',
        statusCode: response.statusCode,
        errors: errors,
      );
    }

    return json;
  }
}