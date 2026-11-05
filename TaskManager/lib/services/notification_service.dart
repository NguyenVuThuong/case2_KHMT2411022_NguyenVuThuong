import '../models/notification.dart';
import 'api_client.dart';

// Kết quả tải danh sách: các thông báo kèm tổng số chưa đọc
class NotificationPage {
  final List<AppNotification> items;
  final int unreadCount;

  const NotificationPage({required this.items, required this.unreadCount});
}

class NotificationService {
  final ApiClient _api = ApiClient();

  // Lấy danh sách thông báo (mới nhất trước)
  Future<NotificationPage> list({int limit = 50}) async {
    final response = await _api.get('/notifications?limit=$limit');
    final data = response['data'] as Map<String, dynamic>;
    final list = data['notifications'] as List;

    return NotificationPage(
      items: list
          .map((item) => AppNotification.fromJson(item as Map<String, dynamic>))
          .toList(),
      unreadCount: (data['unreadCount'] as num?)?.toInt() ?? 0,
    );
  }

  // Chỉ lấy số thông báo chưa đọc (nhẹ hơn, dùng cho huy hiệu)
  Future<int> unreadCount() async {
    final response = await _api.get('/notifications/unread-count');
    final data = response['data'] as Map<String, dynamic>;
    return (data['unreadCount'] as num?)?.toInt() ?? 0;
  }

  // Đánh dấu một thông báo đã đọc
  Future<void> markRead(String id) async {
    await _api.patch('/notifications/$id/read', {});
  }

  // Đánh dấu tất cả đã đọc
  Future<void> markAllRead() async {
    await _api.patch('/notifications/read-all', {});
  }
}