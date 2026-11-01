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

  @override
  Widget build(BuildContext context) {
    final errorColor = Theme.of(context).colorScheme.error;
    final overdue = task.isOverdue;

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