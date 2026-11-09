// Một dòng trong lịch sử hoạt động của công việc
class TaskActivity {
  final String id;
  final String action;

  // Câu mô tả tiếng Việt do backend tạo, ví dụ "A đã đổi trạng thái từ ... sang ..."
  final String summary;
  final String userName;
  final DateTime? createdAt;

  const TaskActivity({
    required this.id,
    required this.action,
    required this.summary,
    required this.userName,
    required this.createdAt,
  });

  factory TaskActivity.fromJson(Map<String, dynamic> json) {
    final user = json['user'];
    return TaskActivity(
      id: (json['id'] ?? '').toString(),
      action: (json['action'] ?? '').toString(),
      summary: (json['summary'] ?? '').toString(),
      userName: user is Map ? (user['fullName'] ?? '').toString() : '',
      createdAt: DateTime.tryParse((json['createdAt'] ?? '').toString())
          ?.toLocal(),
    );
  }
}