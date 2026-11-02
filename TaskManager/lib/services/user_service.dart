import '../models/user.dart';
import 'api_client.dart';

class UserService {
  final ApiClient _api = ApiClient();

  // Tìm người dùng theo tên hoặc email (backend yêu cầu ít nhất 2 ký tự)
  Future<List<User>> search(String query) async {
    final encoded = Uri.encodeQueryComponent(query);
    final response = await _api.get('/users/search?q=$encoded');
    final data = response['data'] as Map<String, dynamic>;
    final list = data['users'] as List;
    return list
        .map((item) => User.fromJson(item as Map<String, dynamic>))
        .toList();
  }
}