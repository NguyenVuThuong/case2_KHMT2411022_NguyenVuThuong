import '../models/task_activity.dart';
import 'api_client.dart';

class ActivityService {
  final ApiClient _api = ApiClient();

  // Lấy lịch sử hoạt động của một công việc (mới nhất trước)
  Future<List<TaskActivity>> list(String taskId) async {
    final response = await _api.get('/tasks/$taskId/activities?limit=100');
    final data = response['data'] as Map<String, dynamic>;
    final list = data['activities'] as List;
    return list
        .map((item) => TaskActivity.fromJson(item as Map<String, dynamic>))
        .toList();
  }
}