// Một kiểu sắp xếp hiển thị trong menu
class SortOption {
  final String label;
  final String sortBy;
  final String order;

  const SortOption(this.label, this.sortBy, this.order);
}

// Các kiểu sắp xếp khớp với tham số sortBy và order của backend
const List<SortOption> kSortOptions = [
  SortOption('Mới tạo nhất', 'createdAt', 'desc'),
  SortOption('Cũ nhất', 'createdAt', 'asc'),
  SortOption('Hạn gần nhất', 'dueDate', 'asc'),
  SortOption('Hạn xa nhất', 'dueDate', 'desc'),
  SortOption('Ưu tiên cao trước', 'priority', 'desc'),
  SortOption('Ưu tiên thấp trước', 'priority', 'asc'),
];

// Toàn bộ điều kiện tìm kiếm, lọc và sắp xếp danh sách công việc
class TaskQuery {
  final String search;
  final String? status;
  final String? priority;

  // Mã người được giao, hoặc 'me' nghĩa là chính người đang đăng nhập
  final String? assignee;

  // Tên hiển thị khi chọn một người khác (chỉ để hiện trên chip)
  final String? assigneeName;

  final String sortBy;
  final String order;

  const TaskQuery({
    this.search = '',
    this.status,
    this.priority,
    this.assignee,
    this.assigneeName,
    this.sortBy = 'createdAt',
    this.order = 'desc',
  });

  // Số bộ lọc đang bật (không tính từ khóa tìm kiếm)
  int get filterCount =>
      (status != null ? 1 : 0) +
          (priority != null ? 1 : 0) +
          (assignee != null ? 1 : 0);

  // Có từ khóa hoặc bộ lọc nào đang áp dụng không
  bool get hasFilters => search.trim().isNotEmpty || filterCount > 0;

  bool isSortedBy(SortOption option) =>
      sortBy == option.sortBy && order == option.order;

  TaskQuery withSearch(String value) => TaskQuery(
    search: value,
    status: status,
    priority: priority,
    assignee: assignee,
    assigneeName: assigneeName,
    sortBy: sortBy,
    order: order,
  );

  TaskQuery withStatus(String? value) => TaskQuery(
    search: search,
    status: value,
    priority: priority,
    assignee: assignee,
    assigneeName: assigneeName,
    sortBy: sortBy,
    order: order,
  );

  TaskQuery withPriority(String? value) => TaskQuery(
    search: search,
    status: status,
    priority: value,
    assignee: assignee,
    assigneeName: assigneeName,
    sortBy: sortBy,
    order: order,
  );

  TaskQuery withAssignee(String? id, String? name) => TaskQuery(
    search: search,
    status: status,
    priority: priority,
    assignee: id,
    assigneeName: name,
    sortBy: sortBy,
    order: order,
  );

  TaskQuery withSort(String newSortBy, String newOrder) => TaskQuery(
    search: search,
    status: status,
    priority: priority,
    assignee: assignee,
    assigneeName: assigneeName,
    sortBy: newSortBy,
    order: newOrder,
  );

  // Xóa từ khóa và mọi bộ lọc, giữ nguyên kiểu sắp xếp
  TaskQuery cleared() => TaskQuery(sortBy: sortBy, order: order);

  // Đổi thành tham số gửi lên API
  Map<String, String> toParams(String scope) {
    final params = <String, String>{
      'scope': scope,
      'sortBy': sortBy,
      'order': order,
    };

    final text = search.trim();
    if (text.isNotEmpty) {
      params['q'] = text;
    }

    final statusValue = status;
    if (statusValue != null) {
      params['status'] = statusValue;
    }

    final priorityValue = priority;
    if (priorityValue != null) {
      params['priority'] = priorityValue;
    }

    final assigneeValue = assignee;
    if (assigneeValue != null) {
      params['assignee'] = assigneeValue;
    }

    return params;
  }
}