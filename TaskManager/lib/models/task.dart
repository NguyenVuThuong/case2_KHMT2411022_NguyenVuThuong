// Các giá trị trạng thái và mức ưu tiên (khớp với backend)
const List<String> kStatuses = ['todo', 'in_progress', 'completed'];
const List<String> kPriorities = ['low', 'medium', 'high'];

// Tên hiển thị tiếng Việt
const Map<String, String> kStatusLabels = {
  'todo': 'Chưa thực hiện',
  'in_progress': 'Đang thực hiện',
  'completed': 'Đã hoàn thành',
};

const Map<String, String> kPriorityLabels = {
  'low': 'Thấp',
  'medium': 'Trung bình',
  'high': 'Cao',
};

class Task {
  final String id;
  final String title;
  final String description;
  final String createdBy;
  final DateTime? startDate;
  final DateTime? dueDate;
  final String priority;
  final String status;
  final DateTime? createdAt;

  const Task({
    required this.id,
    required this.title,
    required this.description,
    required this.createdBy,
    required this.startDate,
    required this.dueDate,
    required this.priority,
    required this.status,
    required this.createdAt,
  });

  // Quá hạn: có hạn, chưa hoàn thành, và hạn trước ngày hôm nay
  bool get isOverdue {
    final due = dueDate;
    if (due == null || status == 'completed') {
      return false;
    }
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    return due.toLocal().isBefore(today);
  }

  // Tạo Task từ JSON mà API trả về
  factory Task.fromJson(Map<String, dynamic> json) {
    return Task(
      id: (json['id'] ?? '').toString(),
      title: (json['title'] ?? '').toString(),
      description: (json['description'] ?? '').toString(),
      createdBy: (json['createdBy'] ?? '').toString(),
      startDate: _parseDate(json['startDate']),
      dueDate: _parseDate(json['dueDate']),
      priority: (json['priority'] ?? 'medium').toString(),
      status: (json['status'] ?? 'todo').toString(),
      createdAt: _parseDate(json['createdAt']),
    );
  }

  static DateTime? _parseDate(dynamic value) {
    if (value == null) {
      return null;
    }
    return DateTime.tryParse(value.toString())?.toLocal();
  }
}