import 'package:flutter/material.dart';

import '../../models/assignee.dart';
import '../../models/task.dart';
import '../../services/api_client.dart';
import '../../services/assignment_service.dart';
import '../../services/task_service.dart';
import '../../utils/date_formatter.dart';
import '../../widgets/loading_view.dart';
import '../../widgets/priority_badge.dart';
import '../../widgets/status_badge.dart';
import '../../widgets/user_avatar.dart';
import '../assignment/assign_task_screen.dart';
import 'task_edit_screen.dart';

class TaskDetailScreen extends StatefulWidget {
  final String taskId;

  const TaskDetailScreen({super.key, required this.taskId});

  @override
  State<TaskDetailScreen> createState() => _TaskDetailScreenState();
}

class _TaskDetailScreenState extends State<TaskDetailScreen> {
  final _taskService = TaskService();
  final _assignmentService = AssignmentService();

  Task? _task;
  List<Assignee> _assignees = [];
  bool _isLoading = true;
  bool _isUpdating = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadTask();
  }

  Future<void> _loadTask() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final task = await _taskService.getTask(widget.taskId);
      if (!mounted) return;
      setState(() => _task = task);
      // Tải danh sách người được giao song song, không chặn màn hình
      _loadAssignees();
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() => _error = e.displayMessage);
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  Future<void> _loadAssignees() async {
    try {
      final list = await _assignmentService.list(widget.taskId);
      if (!mounted) return;
      setState(() => _assignees = list);
    } on ApiException {
      // Không tải được danh sách người được giao thì bỏ qua, không chặn màn hình
    }
  }

  void _showMessage(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(message)),
    );
  }

  // Mở màn hình sửa; nếu sửa xong sẽ nhận lại công việc đã cập nhật
  Future<void> _openEdit() async {
    final task = _task;
    if (task == null) {
      return;
    }

    final updated = await Navigator.of(context).push<Task>(
      MaterialPageRoute(builder: (_) => TaskEditScreen(task: task)),
    );

    if (!mounted) return;
    if (updated != null) {
      setState(() => _task = updated);
      _showMessage('Đã cập nhật công việc');
    }
  }

  // Mở màn hình giao việc, quay về thì tải lại danh sách người được giao
  Future<void> _openAssign() async {
    final task = _task;
    if (task == null) {
      return;
    }

    await Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => AssignTaskScreen(taskId: task.id, taskTitle: task.title),
      ),
    );

    if (!mounted) return;
    _loadAssignees();
  }

  Future<void> _changeStatus(String newStatus) async {
    final task = _task;
    if (task == null || task.status == newStatus) {
      return;
    }

    setState(() => _isUpdating = true);
    try {
      final updated = await _taskService.updateStatus(task.id, newStatus);
      if (!mounted) return;
      setState(() => _task = updated);
      _showMessage('Đã cập nhật trạng thái');
    } on ApiException catch (e) {
      if (!mounted) return;
      _showMessage(e.displayMessage);
    } finally {
      if (mounted) {
        setState(() => _isUpdating = false);
      }
    }
  }

  Future<void> _confirmDelete() async {
    final task = _task;
    if (task == null) {
      return;
    }

    final confirmed = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('Xóa công việc'),
        content: Text(
          'Bạn có chắc muốn xóa "${task.title}"? '
              'Hành động này không thể hoàn tác.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(dialogContext).pop(false),
            child: const Text('Hủy'),
          ),
          FilledButton(
            onPressed: () => Navigator.of(dialogContext).pop(true),
            child: const Text('Xóa'),
          ),
        ],
      ),
    );

    if (confirmed != true) {
      return;
    }

    setState(() => _isUpdating = true);
    try {
      await _taskService.deleteTask(task.id);
      if (!mounted) return;
      // Trả true để màn hình danh sách biết công việc đã bị xóa
      Navigator.of(context).pop(true);
    } on ApiException catch (e) {
      if (!mounted) return;
      _showMessage(e.displayMessage);
    } finally {
      if (mounted) {
        setState(() => _isUpdating = false);
      }
    }
  }

  Widget _buildInfoRow(IconData icon, String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        children: [
          Icon(icon, size: 20),
          const SizedBox(width: 12),
          Text('$label: ', style: const TextStyle(fontWeight: FontWeight.w600)),
          Expanded(child: Text(value)),
        ],
      ),
    );
  }

  Widget _buildAssigneesSection(Task task) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Người được giao', style: Theme.of(context).textTheme.titleMedium),
        const SizedBox(height: 4),
        if (_assignees.isEmpty)
          const Text('Chưa giao cho ai')
        else
          ..._assignees.map(
                (a) => ListTile(
              contentPadding: EdgeInsets.zero,
              dense: true,
              leading: UserAvatar(user: a.user),
              title: Text(a.user.fullName),
              subtitle: Text(a.user.email),
              trailing: a.isPrimary
                  ? const Chip(
                label: Text('Phụ trách chính'),
                visualDensity: VisualDensity.compact,
              )
                  : null,
            ),
          ),
        // Chỉ người có quyền quản lý (người tạo) mới thấy nút này
        if (task.can('manage')) ...[
          const SizedBox(height: 8),
          OutlinedButton.icon(
            onPressed: _isUpdating ? null : _openAssign,
            icon: const Icon(Icons.group_add_outlined),
            label: const Text('Quản lý người được giao'),
          ),
        ],
      ],
    );
  }

  Widget _buildContent(Task task) {
    final overdue = task.isOverdue;
    final canChangeStatus = task.can('changeStatus');

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Text(task.title, style: Theme.of(context).textTheme.headlineSmall),
        const SizedBox(height: 12),
        Wrap(
          spacing: 8,
          runSpacing: 4,
          children: [
            StatusBadge(status: task.status),
            PriorityBadge(priority: task.priority),
            if (overdue)
              Chip(
                label: const Text('Quá hạn'),
                backgroundColor: Theme.of(context).colorScheme.errorContainer,
                visualDensity: VisualDensity.compact,
              ),
          ],
        ),
        const SizedBox(height: 16),
        Text('Mô tả', style: Theme.of(context).textTheme.titleMedium),
        const SizedBox(height: 4),
        Text(task.description.isEmpty ? 'Không có mô tả' : task.description),
        const SizedBox(height: 16),
        _buildInfoRow(
          Icons.badge_outlined,
          'Vai trò của bạn',
          kRoleLabels[task.myRole] ?? 'Không xác định',
        ),
        _buildInfoRow(
          Icons.play_arrow,
          'Bắt đầu',
          DateFormatter.date(task.startDate),
        ),
        _buildInfoRow(
          Icons.event,
          'Hạn hoàn thành',
          DateFormatter.date(task.dueDate),
        ),
        _buildInfoRow(
          Icons.schedule,
          'Ngày tạo',
          DateFormatter.date(task.createdAt),
        ),
        const SizedBox(height: 16),
        _buildAssigneesSection(task),
        const SizedBox(height: 16),
        Text(
          'Cập nhật trạng thái',
          style: Theme.of(context).textTheme.titleMedium,
        ),
        const SizedBox(height: 8),
        Wrap(
          spacing: 8,
          children: kStatuses.map((s) {
            return ChoiceChip(
              label: Text(kStatusLabels[s] ?? s),
              selected: task.status == s,
              // Không có quyền đổi trạng thái thì vô hiệu hóa các nút
              onSelected: (_isUpdating || !canChangeStatus)
                  ? null
                  : (selected) {
                if (selected) {
                  _changeStatus(s);
                }
              },
            );
          }).toList(),
        ),
        if (!canChangeStatus)
          Padding(
            padding: const EdgeInsets.only(top: 8),
            child: Text(
              'Bạn không có quyền đổi trạng thái công việc này',
              style: Theme.of(context).textTheme.bodySmall,
            ),
          ),
      ],
    );
  }

  Widget _buildBody() {
    if (_isLoading) {
      return const LoadingView();
    }
    if (_error != null) {
      return ErrorView(message: _error!, onRetry: _loadTask);
    }
    final task = _task;
    if (task == null) {
      return ErrorView(message: 'Không có dữ liệu', onRetry: _loadTask);
    }
    return _buildContent(task);
  }

  @override
  Widget build(BuildContext context) {
    final task = _task;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Chi tiết công việc'),
        actions: [
          // Chỉ hiện nút khi có đúng quyền (backend vẫn kiểm tra lại)
          if (task != null && task.can('editContent'))
            IconButton(
              icon: const Icon(Icons.edit_outlined),
              tooltip: 'Sửa',
              onPressed: _isUpdating ? null : _openEdit,
            ),
          if (task != null && task.can('delete'))
            IconButton(
              icon: const Icon(Icons.delete_outline),
              tooltip: 'Xóa',
              onPressed: _isUpdating ? null : _confirmDelete,
            ),
        ],
      ),
      body: _buildBody(),
    );
  }
}