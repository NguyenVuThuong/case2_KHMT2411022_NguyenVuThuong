import 'user.dart';

// Hai mức quyền khi chia sẻ (khớp với backend)
const List<String> kSharePermissions = ['viewer', 'editor'];

// Tên hiển thị tiếng Việt
const Map<String, String> kPermissionLabels = {
  'viewer': 'Chỉ xem',
  'editor': 'Chỉnh sửa',
};

// Một bản ghi chia sẻ: người được chia sẻ và quyền của họ
class TaskShare {
  final String id;
  final String permission;
  final User user;
  final DateTime? createdAt;

  const TaskShare({
    required this.id,
    required this.permission,
    required this.user,
    required this.createdAt,
  });

  factory TaskShare.fromJson(Map<String, dynamic> json) {
    return TaskShare(
      id: (json['id'] ?? '').toString(),
      permission: (json['permission'] ?? 'viewer').toString(),
      user: User.fromJson(json['user'] as Map<String, dynamic>),
      createdAt: DateTime.tryParse((json['createdAt'] ?? '').toString())
          ?.toLocal(),
    );
  }
}