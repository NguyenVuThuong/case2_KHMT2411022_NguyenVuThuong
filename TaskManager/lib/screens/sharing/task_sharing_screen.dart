import 'package:flutter/material.dart';

import '../../models/task_share.dart';
import '../../models/user.dart';
import '../../services/api_client.dart';
import '../../services/task_share_service.dart';
import '../../widgets/loading_view.dart';
import '../../widgets/user_avatar.dart';
import '../../widgets/user_selector.dart';

class TaskSharingScreen extends StatefulWidget {
  final String taskId;
  final String taskTitle;

  // Mã người tạo: ẩn khỏi kết quả tìm vì không thể chia sẻ cho chính người tạo
  final String ownerId;

  const TaskSharingScreen({
    super.key,
    required this.taskId,
    required this.taskTitle,
    required this.ownerId,
  });

  @override
  State<TaskSharingScreen> createState() => _TaskSharingScreenState();
}

class _TaskSharingScreenState extends State<TaskSharingScreen> {
  final _service = TaskShareService();

  List<TaskShare> _shares = [];
  // Những người vừa chọn, chưa bấm "Chia sẻ"
  final List<User> _pending = [];
  String _newPermission = 'viewer';

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
      setState(() => _shares = list);
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
      Future<List<TaskShare>> Function() action,
      String successMessage,
      ) async {
    setState(() => _isBusy = true);
    try {
      final list = await action();
      if (!mounted) return false;
      setState(() => _shares = list);
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

  Future<void> _sharePending() async {
    final ids = _pending.map((u) => u.id).toList();
    final ok = await _runChange(
          () => _service.add(
        widget.taskId,
        userIds: ids,
        permission: _newPermission,
      ),
      'Chia sẻ công việc thành công',
    );

    if (ok && mounted) {
      setState(() => _pending.clear());
    }
  }

  Future<void> _confirmRevoke(TaskShare share) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('Thu hồi quyền'),
        content: Text(
          'Thu hồi quyền truy cập của ${share.user.fullName}? '
              'Họ sẽ không còn thấy công việc này (trừ khi vẫn đang được giao việc).',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(dialogContext).pop(false),
            child: const Text('Hủy'),
          ),
          FilledButton(
            onPressed: () => Navigator.of(dialogContext).pop(true),
            child: const Text('Thu hồi'),
          ),
        ],
      ),
    );

    if (confirmed == true) {
      await _runChange(
            () => _service.remove(widget.taskId, share.id),
        'Đã thu hồi quyền chia sẻ',
      );
    }
  }

  Widget _buildShareTile(TaskShare share) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        children: [
          UserAvatar(user: share.user),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  share.user.fullName,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                Text(
                  share.user.email,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: Theme.of(context).textTheme.bodySmall,
                ),
              ],
            ),
          ),
          DropdownButton<String>(
            value: share.permission,
            underline: const SizedBox.shrink(),
            items: kSharePermissions
                .map(
                  (p) => DropdownMenuItem(
                value: p,
                child: Text(kPermissionLabels[p] ?? p),
              ),
            )
                .toList(),
            onChanged: _isBusy
                ? null
                : (value) {
              if (value != null && value != share.permission) {
                _runChange(
                      () => _service.updatePermission(
                    widget.taskId,
                    share.id,
                    value,
                  ),
                  'Đã đổi quyền chia sẻ',
                );
              }
            },
          ),
          IconButton(
            icon: const Icon(Icons.person_remove_outlined),
            tooltip: 'Thu hồi quyền',
            onPressed: _isBusy ? null : () => _confirmRevoke(share),
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

    // Ẩn khỏi kết quả tìm kiếm: người tạo, người đã được chia sẻ, người đã chọn
    final excluded = <String>{
      widget.ownerId,
      ..._shares.map((s) => s.user.id),
      ..._pending.map((u) => u.id),
    };

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Text(widget.taskTitle, style: Theme.of(context).textTheme.titleLarge),
        const SizedBox(height: 16),
        Text(
          'Người được chia sẻ',
          style: Theme.of(context).textTheme.titleMedium,
        ),
        const SizedBox(height: 4),
        if (_shares.isEmpty)
          const Padding(
            padding: EdgeInsets.symmetric(vertical: 8),
            child: Text('Chưa chia sẻ cho ai'),
          )
        else
          ..._shares.map(_buildShareTile),
        const Divider(height: 32),
        Text(
          'Thêm người được chia sẻ',
          style: Theme.of(context).textTheme.titleMedium,
        ),
        const SizedBox(height: 8),
        SegmentedButton<String>(
          segments: const [
            ButtonSegment<String>(
              value: 'viewer',
              label: Text('Chỉ xem'),
              icon: Icon(Icons.visibility_outlined),
            ),
            ButtonSegment<String>(
              value: 'editor',
              label: Text('Chỉnh sửa'),
              icon: Icon(Icons.edit_outlined),
            ),
          ],
          selected: {_newPermission},
          onSelectionChanged: (selection) {
            setState(() => _newPermission = selection.first);
          },
        ),
        const SizedBox(height: 8),
        Text(
          _newPermission == 'viewer'
              ? 'Chỉ xem: xem công việc, không sửa được.'
              : 'Chỉnh sửa: sửa nội dung và đổi trạng thái, '
              'nhưng không xóa hay quản lý chia sẻ.',
          style: Theme.of(context).textTheme.bodySmall,
        ),
        const SizedBox(height: 12),
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
            onPressed: _isBusy ? null : _sharePending,
            icon: const Icon(Icons.share_outlined),
            label: Text('Chia sẻ cho ${_pending.length} người'),
          ),
        ],
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Quản lý chia sẻ')),
      body: _buildBody(),
    );
  }
}