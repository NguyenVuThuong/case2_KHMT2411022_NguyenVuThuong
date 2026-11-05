// Một thông báo trong ứng dụng.
// Đặt tên AppNotification vì Flutter đã có sẵn lớp Notification.
class AppNotification {
  final String id;
  final String? taskId;
  final String type;
  final String title;
  final String message;
  final bool isRead;
  final DateTime? createdAt;

  const AppNotification({
    required this.id,
    required this.taskId,
    required this.type,
    required this.title,
    required this.message,
    required this.isRead,
    required this.createdAt,
  });

  // Tạo bản sao với trạng thái đã đọc mới (model không sửa trực tiếp)
  AppNotification copyWith({bool? isRead}) {
    return AppNotification(
      id: id,
      taskId: taskId,
      type: type,
      title: title,
      message: message,
      isRead: isRead ?? this.isRead,
      createdAt: createdAt,
    );
  }

  factory AppNotification.fromJson(Map<String, dynamic> json) {
    return AppNotification(
      id: (json['id'] ?? '').toString(),
      taskId: json['taskId']?.toString(),
      type: (json['type'] ?? '').toString(),
      title: (json['title'] ?? '').toString(),
      message: (json['message'] ?? '').toString(),
      isRead: json['isRead'] == true,
      createdAt: DateTime.tryParse((json['createdAt'] ?? '').toString())
          ?.toLocal(),
    );
  }
}