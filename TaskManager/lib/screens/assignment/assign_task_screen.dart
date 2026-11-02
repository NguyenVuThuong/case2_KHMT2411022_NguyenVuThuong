import 'package:flutter/material.dart';

import '../../models/assignee.dart';
import '../../models/user.dart';
import '../../services/api_client.dart';
import '../../services/assignment_service.dart';
import '../../widgets/loading_view.dart';
import '../../widgets/user_avatar.dart';
import '../../widgets/user_selector.dart';

class AssignTaskScreen extends StatefulWidget {
  final String taskId;
  final String taskTitle;

  const AssignTaskScreen({
    super.key,
    required this.taskId,
    required this.taskTitle,
  });

  @override
  State<AssignTaskScreen> createState() => _AssignTaskScreenState();
}

class _AssignTaskScreenState extends State<AssignTaskScreen> {
  final _service = AssignmentService();

  List<Assignee> _assignees = [];
  // Những người vừa chọn, chưa bấm "Giao việc"
  final List<User> _pending = [];

  bool _isLoading = true;
  bool _isBusy = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final list = await _service.list(widget.taskId);
      if (!mounted) return;
      setState(() => _assignees = list);
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

  // Chạy một thao tác thay đổi danh sách; trả true nếu thành công
  Future<bool> _runChange(
      Future<List<Assignee>> Function() action,
      String successMessage,
      ) async {
    setState(() => _isBusy = true);
    try {
      final list = await action();
      if (!mounted) return false;
      setState(() => _assignees = list);
      _showMessage(successMessage);
      return true;
    } on ApiException catch (e) {
      if (!mounted) return false;
      _showMessage(e.displayMessage);
      return false;
    } finally {
      if (mounted) {
        setState(() => _isBusy = false);
      }
    }
  }

  Future<void> _assignPending() async {
    final ids = _pending.map((u) => u.id).toList();
    final ok = await _runChange(
          () => _service.add(widget.taskId, userIds: ids),
      'Giao việc thành công',
    );

    if (ok && mounted) {
      setState(() => _pending.clear());
    }
  }

  Widget _buildAssigneeTile(Assignee assignee) {
    return ListTile(
      contentPadding: EdgeInsets.zero,
      leading: UserAvatar(user: assignee.user),
      title: Text(assignee.user.fullName),
      subtitle: Text(
        assignee.isPrimary
            ? '${assignee.user.email}\nNgười phụ trách chính'
            : assignee.user.email,
      ),
      isThreeLine: assignee.isPrimary,
      trailing: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (assignee.isPrimary)
            const Icon(Icons.star, color: Colors.amber)
          else
            IconButton(
              icon: const Icon(Icons.star_outline),
              tooltip: 'Đặt làm người phụ trách chính',
              onPressed: _isBusy
                  ? null
                  : () => _runChange(
                    () => _service.setPrimary(
                  widget.taskId,
                  assignee.user.id,
                ),
                'Đã đặt người phụ trách chính',
              ),
            ),
          IconButton(
            icon: const Icon(Icons.person_remove_outlined),
            tooltip: 'Hủy giao việc',
            onPressed: _isBusy
                ? null
                : () => _runChange(
                  () => _service.remove(widget.taskId, assignee.user.id),
              'Đã hủy giao việc',
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildBody() {
    if (_isLoading) {
      return const LoadingView();
    }
    if (_error != null) {
      return ErrorView(message: _error!, onRetry: _load);
    }

    // Ẩn khỏi kết quả tìm kiếm những người đã được giao hoặc đã được chọn
    final excluded = <String>{
      ..._assignees.map((a) => a.user.id),
      ..._pending.map((u) => u.id),
    };

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Text(widget.taskTitle, style: Theme.of(context).textTheme.titleLarge),
        const SizedBox(height: 16),
        Text(
          'Người được giao hiện tại',
          style: Theme.of(context).textTheme.titleMedium,
        ),
        const SizedBox(height: 4),
        if (_assignees.isEmpty)
          const Padding(
            padding: EdgeInsets.symmetric(vertical: 8),
            child: Text('Chưa giao cho ai'),
          )
        else
          ..._assignees.map(_buildAssigneeTile),
        const Divider(height: 32),
        Text(
          'Thêm người được giao',
          style: Theme.of(context).textTheme.titleMedium,
        ),
        const SizedBox(height: 8),
        UserSelector(
          excludeIds: excluded,
          onSelected: (user) => setState(() => _pending.add(user)),
        ),
        if (_pending.isNotEmpty) ...[
          const SizedBox(height: 12),
          Wrap(
            spacing: 8,
            runSpacing: 4,
            children: _pending
                .map(
                  (user) => InputChip(
                avatar: UserAvatar(user: user, radius: 12),
                label: Text(user.fullName),
                onDeleted: () => setState(() => _pending.remove(user)),
              ),
            )
                .toList(),
          ),
          const SizedBox(height: 12),
          FilledButton.icon(
            onPressed: _isBusy ? null : _assignPending,
            icon: const Icon(Icons.group_add),
            label: Text('Giao việc cho ${_pending.length} người'),
          ),
        ],
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Giao công việc')),
      body: _buildBody(),
    );
  }
}