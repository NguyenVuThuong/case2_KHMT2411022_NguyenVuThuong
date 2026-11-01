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

// Vai trò của người dùng đối với một công việc (backend tính và trả về)
const Map<String, String> kRoleLabels = {
  'owner': 'Người tạo',
  'editor': 'Được chỉnh sửa',
  'assignee': 'Được giao',
  'viewer': 'Chỉ xem',
};

class Task {
  final String id;
  final String title;
  final String description;
  final String createdBy;
  final List<String> assigneeIds;
  final String? primaryAssigneeId;
  final DateTime? startDate;
  final DateTime? dueDate;
  final String priority;
  final String status;
  final DateTime? createdAt;

  // Vai trò và danh sách quyền của NGƯỜI ĐANG ĐĂNG NHẬP trên công việc này
  final String? myRole;
  final List<String> permissions;

  const Task({
    required this.id,
    required this.title,
    required this.description,
    required this.createdBy,
    required this.assigneeIds,
    required this.primaryAssigneeId,
    required this.startDate,
    required this.dueDate,
    required this.priority,
    required this.status,
    required this.createdAt,
    required this.myRole,
    required this.permissions,
  });

  // Kiểm tra có quyền không, ví dụ task.can('editContent').
  // Chỉ dùng để ẩn/hiện nút; backend mới là nơi kiểm tra quyền thật sự.
  bool can(String permission) => permissions.contains(permission);

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
      assigneeIds: ((json['assigneeIds'] as List?) ?? [])
          .map((e) => e.toString())
          .toList(),
      primaryAssigneeId: json['primaryAssigneeId']?.toString(),
      startDate: _parseDate(json['startDate']),
      dueDate: _parseDate(json['dueDate']),
      priority: (json['priority'] ?? 'medium').toString(),
      status: (json['status'] ?? 'todo').toString(),
      createdAt: _parseDate(json['createdAt']),
      myRole: json['myRole']?.toString(),
      permissions: ((json['permissions'] as List?) ?? [])
          .map((e) => e.toString())
          .toList(),
    );
  }

  static DateTime? _parseDate(dynamic value) {
    if (value == null) {
      return null;
    }
    return DateTime.tryParse(value.toString())?.toLocal();
  }
}