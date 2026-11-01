import '../models/task.dart';
import 'api_client.dart';

class TaskService {
  final ApiClient _api = ApiClient();

  // Lấy danh sách công việc của người dùng
  Future<List<Task>> getTasks() async {
    final response = await _api.get('/tasks');
    final data = response['data'] as Map<String, dynamic>;
    final list = data['tasks'] as List;
    return list
        .map((item) => Task.fromJson(item as Map<String, dynamic>))
        .toList();
  }

  // Xem chi tiết một công việc
  Future<Task> getTask(String id) async {
    final response = await _api.get('/tasks/$id');
    final data = response['data'] as Map<String, dynamic>;
    return Task.fromJson(data['task'] as Map<String, dynamic>);
  }

  // Tạo công việc. Ngày được gửi dạng UTC (ISO 8601)
  Future<Task> createTask({
    required String title,
    String description = '',
    DateTime? startDate,
    DateTime? dueDate,
    String priority = 'medium',
    String status = 'todo',
  }) async {
    final response = await _api.post('/tasks', {
      'title': title,
      'description': description,
      'startDate': startDate?.toUtc().toIso8601String(),
      'dueDate': dueDate?.toUtc().toIso8601String(),
      'priority': priority,
      'status': status,
    });
    final data = response['data'] as Map<String, dynamic>;
    return Task.fromJson(data['task'] as Map<String, dynamic>);
  }

  // Sửa công việc (sẽ dùng ở Bước 4.4). Ngày null nghĩa là xóa ngày đó
  Future<Task> updateTask(
      String id, {
        required String title,
        required String description,
        required DateTime? startDate,
        required DateTime? dueDate,
        required String priority,
      }) async {
    final response = await _api.put('/tasks/$id', {
      'title': title,
      'description': description,
      'startDate': startDate?.toUtc().toIso8601String(),
      'dueDate': dueDate?.toUtc().toIso8601String(),
      'priority': priority,
    });
    final data = response['data'] as Map<String, dynamic>;
    return Task.fromJson(data['task'] as Map<String, dynamic>);
  }

  // Đổi trạng thái
  Future<Task> updateStatus(String id, String status) async {
    final response = await _api.patch('/tasks/$id/status', {'status': status});
    final data = response['data'] as Map<String, dynamic>;
    return Task.fromJson(data['task'] as Map<String, dynamic>);
  }

  // Xóa công việc
  Future<void> deleteTask(String id) async {
    await _api.delete('/tasks/$id');
  }
}