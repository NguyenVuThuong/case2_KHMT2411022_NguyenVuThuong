import 'package:flutter/material.dart';

import '../models/task.dart';
import '../utils/date_formatter.dart';
import 'priority_badge.dart';
import 'status_badge.dart';

// Thẻ hiển thị một công việc trong danh sách
class TaskCard extends StatelessWidget {
  final Task task;
  final VoidCallback onTap;

  const TaskCard({super.key, required this.task, required this.onTap});

  // Nhãn vai trò, chỉ hiện khi công việc không phải do mình tạo
  Widget _buildRoleBadge(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: scheme.secondaryContainer,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Text(
        kRoleLabels[task.myRole] ?? '',
        style: TextStyle(
          color: scheme.onSecondaryContainer,
          fontSize: 12,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final errorColor = Theme.of(context).colorScheme.error;
    final overdue = task.isOverdue;
    final showRole = task.myRole != null && task.myRole != 'owner';

    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                task.title,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: Theme.of(context).textTheme.titleMedium,
              ),
              const SizedBox(height: 8),
              Wrap(
                spacing: 8,
                runSpacing: 4,
                children: [
                  StatusBadge(status: task.status),
                  PriorityBadge(priority: task.priority),
                  if (showRole) _buildRoleBadge(context),
                ],
              ),
              const SizedBox(height: 8),
              Row(
                children: [
                  Icon(
                    Icons.event,
                    size: 16,
                    color: overdue ? errorColor : null,
                  ),
                  const SizedBox(width: 4),
                  Expanded(
                    child: Text(
                      overdue
                          ? 'Hạn: ${DateFormatter.date(task.dueDate)} (quá hạn)'
                          : 'Hạn: ${DateFormatter.date(task.dueDate)}',
                      style: TextStyle(color: overdue ? errorColor : null),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}