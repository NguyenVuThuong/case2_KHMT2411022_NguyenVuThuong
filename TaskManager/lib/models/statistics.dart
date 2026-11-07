int _asInt(dynamic value) => (value as num?)?.toInt() ?? 0;

// Số công việc theo từng trạng thái
class StatusCounts {
  final int todo;
  final int inProgress;
  final int completed;

  const StatusCounts({
    required this.todo,
    required this.inProgress,
    required this.completed,
  });

  factory StatusCounts.fromJson(Map<String, dynamic> json) {
    return StatusCounts(
      todo: _asInt(json['todo']),
      inProgress: _asInt(json['in_progress']),
      completed: _asInt(json['completed']),
    );
  }
}

// Kết quả của GET /statistics/tasks
class TaskStatistics {
  final int total;
  final int completionRate;
  final StatusCounts byStatus;

  const TaskStatistics({
    required this.total,
    required this.completionRate,
    required this.byStatus,
  });

  factory TaskStatistics.fromJson(Map<String, dynamic> json) {
    return TaskStatistics(
      total: _asInt(json['total']),
      completionRate: _asInt(json['completionRate']),
      byStatus: StatusCounts.fromJson(json['byStatus'] as Map<String, dynamic>),
    );
  }
}

// Một nhóm công việc giao: tổng, số chưa hoàn thành, số theo trạng thái
class AssignmentGroup {
  final int total;
  final int active;
  final StatusCounts byStatus;

  const AssignmentGroup({
    required this.total,
    required this.active,
    required this.byStatus,
  });

  factory AssignmentGroup.fromJson(Map<String, dynamic> json) {
    return AssignmentGroup(
      total: _asInt(json['total']),
      active: _asInt(json['active']),
      byStatus: StatusCounts.fromJson(json['byStatus'] as Map<String, dynamic>),
    );
  }
}

// Kết quả của GET /statistics/assignments
class AssignmentStatistics {
  final AssignmentGroup assignedToMe;
  final AssignmentGroup primaryAssignee;

  const AssignmentStatistics({
    required this.assignedToMe,
    required this.primaryAssignee,
  });

  factory AssignmentStatistics.fromJson(Map<String, dynamic> json) {
    return AssignmentStatistics(
      assignedToMe: AssignmentGroup.fromJson(
        json['assignedToMe'] as Map<String, dynamic>,
      ),
      primaryAssignee: AssignmentGroup.fromJson(
        json['primaryAssignee'] as Map<String, dynamic>,
      ),
    );
  }
}

// Một công việc rút gọn trong thống kê hạn
class DeadlineItem {
  final String id;
  final String title;
  final DateTime? dueDate;
  final String status;
  final String priority;

  const DeadlineItem({
    required this.id,
    required this.title,
    required this.dueDate,
    required this.status,
    required this.priority,
  });

  factory DeadlineItem.fromJson(Map<String, dynamic> json) {
    return DeadlineItem(
      id: (json['id'] ?? '').toString(),
      title: (json['title'] ?? '').toString(),
      dueDate: DateTime.tryParse((json['dueDate'] ?? '').toString())?.toLocal(),
      status: (json['status'] ?? 'todo').toString(),
      priority: (json['priority'] ?? 'medium').toString(),
    );
  }
}

// Một nhóm hạn: tổng số (count) và các công việc được liệt kê (tối đa 10)
class DeadlineBucket {
  final int count;
  final List<DeadlineItem> tasks;

  const DeadlineBucket({required this.count, required this.tasks});

  factory DeadlineBucket.fromJson(Map<String, dynamic> json) {
    final list = (json['tasks'] as List?) ?? [];
    return DeadlineBucket(
      count: _asInt(json['count']),
      tasks: list
          .map((item) => DeadlineItem.fromJson(item as Map<String, dynamic>))
          .toList(),
    );
  }
}

// Kết quả của GET /statistics/deadlines
class DeadlineStatistics {
  final int days;
  final DeadlineBucket overdue;
  final DeadlineBucket upcoming;

  const DeadlineStatistics({
    required this.days,
    required this.overdue,
    required this.upcoming,
  });

  factory DeadlineStatistics.fromJson(Map<String, dynamic> json) {
    return DeadlineStatistics(
      days: _asInt(json['days']),
      overdue: DeadlineBucket.fromJson(json['overdue'] as Map<String, dynamic>),
      upcoming: DeadlineBucket.fromJson(json['upcoming'] as Map<String, dynamic>),
    );
  }
}

// Gom cả ba kết quả để màn hình hiển thị cùng lúc
class StatisticsOverview {
  final TaskStatistics tasks;
  final AssignmentStatistics assignments;
  final DeadlineStatistics deadlines;

  const StatisticsOverview({
    required this.tasks,
    required this.assignments,
    required this.deadlines,
  });
}