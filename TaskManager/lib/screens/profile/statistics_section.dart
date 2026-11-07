import 'package:flutter/material.dart';

import '../../models/statistics.dart';
import '../../models/task.dart';
import '../../services/api_client.dart';
import '../../services/statistics_service.dart';
import '../../utils/date_formatter.dart';
import '../../widgets/loading_view.dart';
import '../../widgets/status_badge.dart';
import '../tasks/task_detail_screen.dart';

// Khối thống kê công việc trên màn hình Cá nhân.
// Tự tải dữ liệu, tự hiện trạng thái đang tải và lỗi.
class StatisticsSection extends StatefulWidget {
  const StatisticsSection({super.key});

  @override
  State<StatisticsSection> createState() => _StatisticsSectionState();
}

class _StatisticsSectionState extends State<StatisticsSection> {
  // Số ngày tới tính là "sắp đến hạn" (khớp tham số days của backend)
  static const int _upcomingDays = 7;

  final _service = StatisticsService();

  StatisticsOverview? _overview;
  bool _isLoading = true;
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
      final overview = await _service.overview(days: _upcomingDays);
      if (!mounted) return;
      setState(() => _overview = overview);
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() => _error = e.displayMessage);
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  // Mở chi tiết công việc; quay về thì tải lại vì trạng thái có thể đã đổi
  Future<void> _openTask(String taskId) async {
    await Navigator.of(context).push(
      MaterialPageRoute(builder: (_) => TaskDetailScreen(taskId: taskId)),
    );

    if (!mounted) return;
    _load();
  }

  // ----- Khối theo trạng thái -----
  Widget _buildStatusRow(String label, int count, int total, Color color) {
    final fraction = total == 0 ? 0.0 : count / total;

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(child: Text(label)),
              Text('$count', style: const TextStyle(fontWeight: FontWeight.bold)),
            ],
          ),
          const SizedBox(height: 4),
          ClipRRect(
            borderRadius: BorderRadius.circular(4),
            child: LinearProgressIndicator(
              value: fraction,
              minHeight: 8,
              color: color,
              backgroundColor: color.withValues(alpha: 0.15),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStatusCard(TaskStatistics stats) {
    final textTheme = Theme.of(context).textTheme;
    final counts = stats.byStatus;

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Theo trạng thái', style: textTheme.titleMedium),
            const SizedBox(height: 8),
            if (stats.total == 0)
              const Text('Chưa có công việc nào')
            else ...[
              Text('${stats.total} công việc', style: textTheme.headlineSmall),
              const SizedBox(height: 4),
              Text('${stats.completionRate}% đã hoàn thành'),
              const SizedBox(height: 8),
              _buildStatusRow(
                kStatusLabels['todo'] ?? 'todo',
                counts.todo,
                stats.total,
                Colors.grey,
              ),
              _buildStatusRow(
                kStatusLabels['in_progress'] ?? 'in_progress',
                counts.inProgress,
                stats.total,
                Colors.blue,
              ),
              _buildStatusRow(
                kStatusLabels['completed'] ?? 'completed',
                counts.completed,
                stats.total,
                Colors.green,
              ),
            ],
          ],
        ),
      ),
    );
  }

  // ----- Khối giao việc -----
  Widget _buildGroup(String title, AssignmentGroup group) {
    final textTheme = Theme.of(context).textTheme;

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(child: Text(title)),
              Text('${group.total}', style: textTheme.titleMedium),
            ],
          ),
          const SizedBox(height: 2),
          Text(
            'Chưa hoàn thành: ${group.active} · '
                'Đã hoàn thành: ${group.byStatus.completed}',
            style: textTheme.bodySmall,
          ),
        ],
      ),
    );
  }

  Widget _buildAssignmentCard(AssignmentStatistics stats) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Giao việc', style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 4),
            _buildGroup('Được giao cho bạn', stats.assignedToMe),
            const Divider(height: 8),
            _buildGroup('Bạn là người phụ trách chính', stats.primaryAssignee),
          ],
        ),
      ),
    );
  }

  // ----- Khối hạn hoàn thành -----
  Widget _buildDeadlineTile(DeadlineItem item) {
    return ListTile(
      dense: true,
      contentPadding: EdgeInsets.zero,
      title: Text(item.title, maxLines: 1, overflow: TextOverflow.ellipsis),
      subtitle: Text('Hạn: ${DateFormatter.date(item.dueDate)}'),
      trailing: StatusBadge(status: item.status),
      onTap: () => _openTask(item.id),
    );
  }

  Widget _buildBucket({
    required String title,
    required IconData icon,
    required Color? color,
    required DeadlineBucket bucket,
    required String emptyText,
  }) {
    final textTheme = Theme.of(context).textTheme;
    final hidden = bucket.count - bucket.tasks.length;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Icon(icon, size: 20, color: color),
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                '$title (${bucket.count})',
                style: textTheme.titleSmall?.copyWith(color: color),
              ),
            ),
          ],
        ),
        if (bucket.count == 0)
          Padding(
            padding: const EdgeInsets.only(top: 4),
            child: Text(emptyText, style: textTheme.bodySmall),
          )
        else
          ...bucket.tasks.map(_buildDeadlineTile),
        if (hidden > 0)
          Padding(
            padding: const EdgeInsets.only(top: 4),
            child: Text(
              '... và $hidden công việc khác, xem ở danh sách công việc',
              style: textTheme.bodySmall,
            ),
          ),
      ],
    );
  }

  Widget _buildDeadlineCard(DeadlineStatistics stats) {
    final errorColor = Theme.of(context).colorScheme.error;

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Hạn hoàn thành',
              style: Theme.of(context).textTheme.titleMedium,
            ),
            const SizedBox(height: 8),
            _buildBucket(
              title: 'Quá hạn',
              icon: Icons.warning_amber_rounded,
              color: errorColor,
              bucket: stats.overdue,
              emptyText: 'Không có công việc nào quá hạn',
            ),
            const Divider(height: 24),
            _buildBucket(
              title: 'Sắp đến hạn trong ${stats.days} ngày tới',
              icon: Icons.schedule,
              color: null,
              bucket: stats.upcoming,
              emptyText: 'Không có công việc nào sắp đến hạn',
            ),
            const SizedBox(height: 8),
            Text(
              'Công việc đã hoàn thành không được tính vào hai nhóm này.',
              style: Theme.of(context).textTheme.bodySmall,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildContent() {
    final overview = _overview;

    if (_error != null) {
      return ErrorView(message: _error!, onRetry: _load);
    }
    if (overview == null) {
      return const Padding(
        padding: EdgeInsets.symmetric(vertical: 32),
        child: LoadingView(),
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        _buildStatusCard(overview.tasks),
        const SizedBox(height: 8),
        _buildAssignmentCard(overview.assignments),
        const SizedBox(height: 8),
        _buildDeadlineCard(overview.deadlines),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Row(
          children: [
            Expanded(
              child: Text(
                'Thống kê công việc',
                style: Theme.of(context).textTheme.titleLarge,
              ),
            ),
            IconButton(
              icon: const Icon(Icons.refresh),
              tooltip: 'Làm mới thống kê',
              onPressed: _isLoading ? null : _load,
            ),
          ],
        ),
        // Đang tải lại mà đã có dữ liệu cũ thì hiện thanh nhỏ phía trên
        if (_isLoading && _overview != null) const LinearProgressIndicator(),
        const SizedBox(height: 4),
        _buildContent(),
      ],
    );
  }
}