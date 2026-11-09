import 'package:flutter/material.dart';

import '../../models/task_activity.dart';
import '../../services/activity_service.dart';
import '../../services/api_client.dart';
import '../../utils/date_formatter.dart';
import '../../widgets/loading_view.dart';

class TaskActivityScreen extends StatefulWidget {
  final String taskId;
  final String taskTitle;

  const TaskActivityScreen({
    super.key,
    required this.taskId,
    required this.taskTitle,
  });

  @override
  State<TaskActivityScreen> createState() => _TaskActivityScreenState();
}

class _TaskActivityScreenState extends State<TaskActivityScreen> {
  final _service = ActivityService();

  List<TaskActivity> _items = [];
  bool _isLoading = true;
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
      final items = await _service.list(widget.taskId);
      if (!mounted) return;
      setState(() {
        _items = items;
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

  // Biểu tượng theo loại hành động
  IconData _iconFor(String action) {
    switch (action) {
      case 'created':
        return Icons.add_circle_outline;
      case 'updated':
        return Icons.edit_outlined;
      case 'status_changed':
        return Icons.sync_alt;
      case 'assigned':
      case 'unassigned':
      case 'primary_assignee_changed':
        return Icons.assignment_ind_outlined;
      case 'shared':
      case 'share_permission_changed':
      case 'share_revoked':
        return Icons.share_outlined;
      default:
        return Icons.history;
    }
  }

  Widget _buildList() {
    return RefreshIndicator(
      onRefresh: () => _load(showLoading: false),
      child: _items.isEmpty
          ? ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        children: const [
          SizedBox(height: 120),
          Center(child: Icon(Icons.history, size: 64)),
          SizedBox(height: 12),
          Center(child: Text('Chưa có hoạt động nào')),
        ],
      )
          : ListView.separated(
        physics: const AlwaysScrollableScrollPhysics(),
        itemCount: _items.length,
        separatorBuilder: (_, _) => const Divider(height: 1),
        itemBuilder: (context, index) {
          final item = _items[index];
          return ListTile(
            leading: CircleAvatar(child: Icon(_iconFor(item.action))),
            title: Text(item.summary),
            subtitle: Text(DateFormatter.relative(item.createdAt)),
          );
        },
      ),
    );
  }

  Widget _buildBody() {
    if (_isLoading) {
      return const LoadingView();
    }
    if (_error != null) {
      return ErrorView(message: _error!, onRetry: () => _load());
    }
    return _buildList();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Lịch sử hoạt động')),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
            child: Align(
              alignment: Alignment.centerLeft,
              child: Text(
                widget.taskTitle,
                style: Theme.of(context).textTheme.titleMedium,
              ),
            ),
          ),
          Expanded(child: _buildBody()),
        ],
      ),
    );
  }
}