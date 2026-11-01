import '../models/assignee.dart';
import 'api_client.dart';

class AssignmentService {
  final ApiClient _api = ApiClient();

  // Mọi API giao việc đều trả về danh sách người được giao mới nhất
  List<Assignee> _parse(Map<String, dynamic> response) {
    final data = response['data'] as Map<String, dynamic>;
    final list = data['assignees'] as List;
    return list
        .map((item) => Assignee.fromJson(item as Map<String, dynamic>))
        .toList();
  }

  Future<List<Assignee>> list(String taskId) async {
    final response = await _api.get('/tasks/$taskId/assignees');
    return _parse(response);
  }

  // Giao việc cho một hoặc nhiều người (theo mã tài khoản)
  Future<List<Assignee>> add(
      String taskId, {
        required List<String> userIds,
      }) async {
    final response = await _api.post('/tasks/$taskId/assignees', {
      'userIds': userIds,
    });
    return _parse(response);
  }

  // Đặt một người trong danh sách làm người phụ trách chính
  Future<List<Assignee>> setPrimary(String taskId, String userId) async {
    final response = await _api.patch(
      '/tasks/$taskId/assignees/$userId',
      {'isPrimary': true},
    );
    return _parse(response);
  }

  // Hủy giao việc cho một người
  Future<List<Assignee>> remove(String taskId, String userId) async {
    final response = await _api.delete('/tasks/$taskId/assignees/$userId');
    return _parse(response);
  }
}