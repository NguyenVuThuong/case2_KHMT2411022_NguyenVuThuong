import 'package:flutter/material.dart';

import '../../models/task.dart';
import '../../services/api_client.dart';
import '../../services/task_service.dart';
import '../../utils/date_formatter.dart';
import '../../widgets/loading_view.dart';
import '../../widgets/priority_badge.dart';
import '../../widgets/status_badge.dart';

class TaskDetailScreen extends StatefulWidget {
  final String taskId;

  const TaskDetailScreen({super.key, required this.taskId});

  @override
  State<TaskDetailScreen> createState() => _TaskDetailScreenState();
}

class _TaskDetailScreenState extends State<TaskDetailScreen> {
  final _taskService = TaskService();

  Task? _task;
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

  Widget _buildContent(Task task) {
    final overdue = task.isOverdue;

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
                backgroundColor:
                Theme.of(context).colorScheme.errorContainer,
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
        Text('Cập nhật trạng thái',
            style: Theme.of(context).textTheme.titleMedium),
        const SizedBox(height: 8),
        Wrap(
          spacing: 8,
          children: kStatuses.map((s) {
            return ChoiceChip(
              label: Text(kStatusLabels[s] ?? s),
              selected: task.status == s,
              onSelected: _isUpdating
                  ? null
                  : (selected) {
                if (selected) {
                  _changeStatus(s);
                }
              },
            );
          }).toList(),
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
    return Scaffold(
      appBar: AppBar(
        title: const Text('Chi tiết công việc'),
        actions: [
          if (_task != null)
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