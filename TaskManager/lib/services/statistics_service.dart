import '../models/statistics.dart';
import 'api_client.dart';

class StatisticsService {
  final ApiClient _api = ApiClient();

  Future<TaskStatistics> tasks() async {
    final response = await _api.get('/statistics/tasks');
    return TaskStatistics.fromJson(response['data'] as Map<String, dynamic>);
  }

  Future<AssignmentStatistics> assignments() async {
    final response = await _api.get('/statistics/assignments');
    return AssignmentStatistics.fromJson(
      response['data'] as Map<String, dynamic>,
    );
  }

  Future<DeadlineStatistics> deadlines({int days = 7}) async {
    final response = await _api.get('/statistics/deadlines?days=$days');
    return DeadlineStatistics.fromJson(response['data'] as Map<String, dynamic>);
  }

  // Gọi cả ba API cùng lúc. Một API lỗi thì ném lỗi gốc (ApiException)
  Future<StatisticsOverview> overview({int days = 7}) async {
    final results = await Future.wait<Object>([
      tasks(),
      assignments(),
      deadlines(days: days),
    ]);

    return StatisticsOverview(
      tasks: results[0] as TaskStatistics,
      assignments: results[1] as AssignmentStatistics,
      deadlines: results[2] as DeadlineStatistics,
    );
  }
}