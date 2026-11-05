import 'dart:async';

import 'package:flutter/material.dart';

import '../../models/notification.dart';
import '../../services/api_client.dart';
import '../../services/notification_service.dart';
import '../../utils/date_formatter.dart';
import '../../widgets/loading_view.dart';
import '../tasks/task_detail_screen.dart';

class NotificationScreen extends StatefulWidget {
  const NotificationScreen({super.key});

  @override
  State<NotificationScreen> createState() => _NotificationScreenState();
}

class _NotificationScreenState extends State<NotificationScreen> {
  final _service = NotificationService();

  List<AppNotification> _items = [];
  int _unreadCount = 0;
  bool _isLoading = true;
  bool _isBusy = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  // showLoading = false khi kéo để tải lại (đã có vòng quay của RefreshIndicator)
  Future<void> _load({bool showLoading = true}) async {
    if (showLoading) {
      setState(() {
        _isLoading = true;
        _error = null;
      });
    }

    try {
      final page = await _service.list();
      if (!mounted) return;
      setState(() {
        _items = page.items;
        _unreadCount = page.unreadCount;
        _error = null;
      });
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() => _error = e.displayMessage);
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  void _showMessage(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(message)),
    );
  }

  // Đánh dấu đã đọc ở phía server; lỗi thì bỏ qua, lần tải lại sẽ đồng bộ
  Future<void> _markReadQuietly(String id) async {
    try {
      await _service.markRead(id);
    } on ApiException {
      // Bỏ qua
    }
  }

  Future<void> _openNotification(AppNotification notification) async {
    // Cập nhật giao diện ngay, không chờ server
    if (!notification.isRead) {
      setState(() {
        _items = _items
            .map((n) => n.id == notification.id ? n.copyWith(isRead: true) : n)
            .toList();
        if (_unreadCount > 0) {
          _unreadCount -= 1;
        }
      });
      unawaited(_markReadQuietly(notification.id));
    }

    final taskId = notification.taskId;
    if (taskId == null) {
      return;
    }

    await Navigator.of(context).push(
      MaterialPageRoute(builder: (_) => TaskDetailScreen(taskId: taskId)),
    );

    if (!mounted) return;
    // Đồng bộ lại với server sau khi quay về
    _load(showLoading: false);
  }

  Future<void> _markAllRead() async {
    setState(() => _isBusy = true);
    try {
      await _service.markAllRead();
      if (!mounted) return;
      setState(() {
        _items = _items.map((n) => n.copyWith(isRead: true)).toList();
        _unreadCount = 0;
      });
      _showMessage('Đã đánh dấu tất cả là đã đọc');
    } on ApiException catch (e) {
      if (!mounted) return;
      _showMessage(e.displayMessage);
    } finally {
      if (mounted) {
        setState(() => _isBusy = false);
      }
    }
  }

  // Biểu tượng theo loại thông báo
  IconData _iconFor(String type) {
    switch (type) {
      case 'task_assigned':
        return Icons.assignment_ind_outlined;
      case 'task_shared':
        return Icons.share_outlined;
      case 'task_completed':
        return Icons.check_circle_outline;
      case 'task_due_changed':
        return Icons.event_outlined;
      default:
        return Icons.sync;
    }
  }

  Widget _buildTile(AppNotification notification) {
    final scheme = Theme.of(context).colorScheme;
    final unread = !notification.isRead;

    return ListTile(
      tileColor: unread ? scheme.primaryContainer.withValues(alpha: 0.35) : null,
      leading: CircleAvatar(
        backgroundColor:
        unread ? scheme.primary : scheme.surfaceContainerHighest,
        foregroundColor: unread ? scheme.onPrimary : scheme.onSurfaceVariant,
        child: Icon(_iconFor(notification.type)),
      ),
      title: Text(
        notification.title,
        style: TextStyle(
          fontWeight: unread ? FontWeight.bold : FontWeight.normal,
        ),
      ),
      subtitle: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(notification.message),
          const SizedBox(height: 2),
          Text(
            DateFormatter.relative(notification.createdAt),
            style: Theme.of(context).textTheme.bodySmall,
          ),
        ],
      ),
      isThreeLine: true,
      trailing: unread
          ? Icon(Icons.circle, size: 10, color: scheme.primary)
          : null,
      onTap: () => _openNotification(notification),
    );
  }

  Widget _buildBody() {
    if (_isLoading) {
      return const LoadingView();
    }
    if (_error != null) {
      return ErrorView(message: _error!, onRetry: () => _load());
    }

    return RefreshIndicator(
      onRefresh: () => _load(showLoading: false),
      child: _items.isEmpty
          ? ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        children: const [
          SizedBox(height: 160),
          Center(child: Icon(Icons.notifications_none, size: 64)),
          SizedBox(height: 12),
          Center(child: Text('Chưa có thông báo nào')),
        ],
      )
          : ListView.separated(
        physics: const AlwaysScrollableScrollPhysics(),
        itemCount: _items.length,
        separatorBuilder: (_, _) => const Divider(height: 1),
        itemBuilder: (context, index) => _buildTile(_items[index]),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Thông báo'),
        actions: [
          if (_unreadCount > 0)
            IconButton(
              icon: const Icon(Icons.done_all),
              tooltip: 'Đánh dấu tất cả đã đọc',
              onPressed: _isBusy ? null : _markAllRead,
            ),
        ],
      ),
      body: _buildBody(),
    );
  }
}