import '../models/task_share.dart';
import 'api_client.dart';

class TaskShareService {
  final ApiClient _api = ApiClient();

  // Mọi API chia sẻ đều trả về danh sách chia sẻ mới nhất
  List<TaskShare> _parse(Map<String, dynamic> response) {
    final data = response['data'] as Map<String, dynamic>;
    final list = data['shares'] as List;
    return list
        .map((item) => TaskShare.fromJson(item as Map<String, dynamic>))
        .toList();
  }

  Future<List<TaskShare>> list(String taskId) async {
    final response = await _api.get('/tasks/$taskId/shares');
    return _parse(response);
  }

  // Chia sẻ cho một hoặc nhiều người (theo mã tài khoản) với một mức quyền
  Future<List<TaskShare>> add(
      String taskId, {
        required List<String> userIds,
        required String permission,
      }) async {
    final response = await _api.post('/tasks/$taskId/shares', {
      'userIds': userIds,
      'permission': permission,
    });
    return _parse(response);
  }

  // Đổi quyền viewer/editor của một bản ghi chia sẻ
  Future<List<TaskShare>> updatePermission(
      String taskId,
      String shareId,
      String permission,
      ) async {
    final response = await _api.patch(
      '/tasks/$taskId/shares/$shareId',
      {'permission': permission},
    );
    return _parse(response);
  }

  // Thu hồi quyền chia sẻ
  Future<List<TaskShare>> remove(String taskId, String shareId) async {
    final response = await _api.delete('/tasks/$taskId/shares/$shareId');
    return _parse(response);
  }
}