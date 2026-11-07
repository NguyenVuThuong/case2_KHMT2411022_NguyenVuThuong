import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../models/task.dart';
import '../../models/task_query.dart';
import '../../models/user.dart';
import '../../services/api_client.dart';
import '../../services/notification_service.dart';
import '../../services/task_service.dart';
import '../../widgets/loading_view.dart';
import '../../widgets/task_card.dart';
import '../../widgets/task_filter_sheet.dart';
import '../notifications/notification_screen.dart';
import '../profile/profile_screen.dart';
import 'task_create_screen.dart';
import 'task_detail_screen.dart';

class TaskListScreen extends StatefulWidget {
  final User user;

  const TaskListScreen({super.key, required this.user});

  @override
  State<TaskListScreen> createState() => _TaskListScreenState();
}

class _TaskListScreenState extends State<TaskListScreen>
    with SingleTickerProviderStateMixin {
  // Các phạm vi khớp với tham số scope của backend
  static const List<String> _scopes = ['all', 'created', 'assigned', 'shared'];

  static const Map<String, String> _scopeLabels = {
    'all': 'Tất cả',
    'created': 'Của tôi',
    'assigned': 'Được giao',
    'shared': 'Được chia sẻ',
  };

  static const Map<String, String> _emptyMessages = {
    'all': 'Chưa có công việc nào.\nBấm nút bên dưới để thêm.',
    'created': 'Bạn chưa tạo công việc nào.',
    'assigned': 'Chưa có công việc nào được giao cho bạn.',
    'shared': 'Chưa có công việc nào được chia sẻ cho bạn.',
  };

  // Cứ 30 giây hỏi server số thông báo chưa đọc một lần
  static const Duration _unreadPollInterval = Duration(seconds: 30);

  // Chờ người dùng ngừng gõ rồi mới tìm, tránh gọi API sau mỗi ký tự
  static const Duration _searchDelay = Duration(milliseconds: 400);

  final _taskService = TaskService();
  final _notificationService = NotificationService();
  final _searchController = TextEditingController();
  late final TabController _tabController;
  Timer? _unreadTimer;
  Timer? _searchDebounce;

  late User _user;
  List<Task> _tasks = [];
  String _scope = 'all';
  TaskQuery _query = const TaskQuery();
  bool _isLoading = true;
  String? _error;
  int _unreadCount = 0;

  // Số thứ tự của lần tải mới nhất, để bỏ qua kết quả cũ về chậm
  int _requestId = 0;

  @override
  void initState() {
    super.initState();
    _user = widget.user;
    _tabController = TabController(length: _scopes.length, vsync: this);
    _tabController.addListener(_onTabChanged);
    _loadTasks();
    _loadUnreadCount();
    _unreadTimer = Timer.periodic(_unreadPollInterval, (_) => _loadUnreadCount());
  }

  @override
  void dispose() {
    _unreadTimer?.cancel();
    _searchDebounce?.cancel();
    _searchController.dispose();
    _tabController.dispose();
    super.dispose();
  }

  void _onTabChanged() {
    final scope = _scopes[_tabController.index];
    if (scope != _scope) {
      _scope = scope;
      _loadTasks();
    }
  }

  // Lấy số thông báo chưa đọc; lỗi thì giữ nguyên số cũ, không làm phiền người dùng
  Future<void> _loadUnreadCount() async {
    try {
      final count = await _notificationService.unreadCount();
      if (!mounted) return;
      setState(() => _unreadCount = count);
    } on ApiException {
      // Bỏ qua
    }
  }

  // showLoading = false khi kéo để tải lại (đã có vòng quay của RefreshIndicator)
  Future<void> _loadTasks({bool showLoading = true}) async {
    final requestId = ++_requestId;

    if (showLoading) {
      setState(() {
        _isLoading = true;
        _error = null;
      });
    }

    try {
      final tasks = await _taskService.getTasks(scope: _scope, query: _query);
      if (!mounted || requestId != _requestId) return;
      setState(() {
        _tasks = tasks;
        _error = null;
      });
    } on ApiException catch (e) {
      if (!mounted || requestId != _requestId) return;
      setState(() => _error = e.displayMessage);
    } finally {
      if (mounted && requestId == _requestId) {
        setState(() => _isLoading = false);
      }
    }
  }

  // Đổi điều kiện tìm, lọc, sắp xếp rồi tải lại danh sách
  void _applyQuery(TaskQuery query) {
    setState(() => _query = query);
    _loadTasks();
  }

  // ----- Tìm kiếm -----
  void _onSearchChanged(String value) {
    // Cập nhật để nút xóa từ khóa hiện hoặc ẩn đúng lúc
    setState(() {});
    _searchDebounce?.cancel();
    _searchDebounce = Timer(_searchDelay, () {
      if (!mounted) return;
      _applySearch(_searchController.text);
    });
  }

  void _submitSearch(String value) {
    _searchDebounce?.cancel();
    _applySearch(value);
  }

  void _applySearch(String value) {
    final text = value.trim();
    // Từ khóa không đổi thì không cần tải lại
    if (text == _query.search.trim()) {
      return;
    }
    _applyQuery(_query.withSearch(text));
  }

  void _clearSearch() {
    _searchDebounce?.cancel();
    _searchController.clear();
    setState(() {});
    _applySearch('');
  }

  // ----- Bộ lọc -----
  Future<void> _openFilters() async {
    // Áp dụng ngay từ khóa đang gõ dở để bảng lọc dùng điều kiện mới nhất
    _searchDebounce?.cancel();
    final current = _query.withSearch(_searchController.text.trim());

    final result = await showTaskFilterSheet(context, current);
    if (!mounted) return;

    if (result != null) {
      _applyQuery(result);
    } else if (current.search != _query.search) {
      _applyQuery(current);
    }
  }

  void _clearFilters() {
    _searchDebounce?.cancel();
    _searchController.clear();
    _applyQuery(_query.cleared());
  }

  void _showMessage(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(message)),
    );
  }

  Future<void> _openCreate() async {
    final created = await Navigator.of(context).push<bool>(
      MaterialPageRoute(builder: (_) => const TaskCreateScreen()),
    );

    if (!mounted) return;
    if (created == true) {
      _showMessage('Đã thêm công việc');
      _loadTasks(showLoading: false);
    }
  }

  Future<void> _openDetail(Task task) async {
    final deleted = await Navigator.of(context).push<bool>(
      MaterialPageRoute(builder: (_) => TaskDetailScreen(taskId: task.id)),
    );

    if (!mounted) return;
    if (deleted == true) {
      _showMessage('Đã xóa công việc');
    }
    // Luôn tải lại vì trạng thái hay quyền có thể đã đổi ở màn hình chi tiết
    _loadTasks(showLoading: false);
    _loadUnreadCount();
  }

  Future<void> _openNotifications() async {
    await Navigator.of(context).push(
      MaterialPageRoute(builder: (_) => const NotificationScreen()),
    );

    if (!mounted) return;
    // Số chưa đọc đã đổi, và người dùng có thể vừa đổi trạng thái công việc
    _loadUnreadCount();
    _loadTasks(showLoading: false);
  }

  void _openProfile() {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => ProfileScreen(
          user: _user,
          onUserUpdated: (updated) => setState(() => _user = updated),
        ),
      ),
    );
  }

  // Hàng gồm ô tìm kiếm, nút lọc và nút sắp xếp
  Widget _buildSearchBar() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 12, 4, 4),
      child: Row(
        children: [
          Expanded(
            child: TextField(
              controller: _searchController,
              textInputAction: TextInputAction.search,
              // Backend giới hạn từ khóa tối đa 100 ký tự
              inputFormatters: [LengthLimitingTextInputFormatter(100)],
              onChanged: _onSearchChanged,
              onSubmitted: _submitSearch,
              decoration: InputDecoration(
                hintText: 'Tìm theo tên công việc',
                prefixIcon: const Icon(Icons.search),
                suffixIcon: _searchController.text.isEmpty
                    ? null
                    : IconButton(
                  icon: const Icon(Icons.clear),
                  tooltip: 'Xóa từ khóa',
                  onPressed: _clearSearch,
                ),
                border: const OutlineInputBorder(),
                isDense: true,
              ),
            ),
          ),
          IconButton(
            tooltip: 'Bộ lọc',
            onPressed: _openFilters,
            icon: Badge(
              label: Text('${_query.filterCount}'),
              isLabelVisible: _query.filterCount > 0,
              child: const Icon(Icons.filter_list),
            ),
          ),
          PopupMenuButton<SortOption>(
            icon: const Icon(Icons.sort),
            tooltip: 'Sắp xếp',
            onSelected: (option) =>
                _applyQuery(_query.withSort(option.sortBy, option.order)),
            itemBuilder: (context) => kSortOptions
                .map(
                  (option) => CheckedPopupMenuItem<SortOption>(
                value: option,
                checked: _query.isSortedBy(option),
                child: Text(option.label),
              ),
            )
                .toList(),
          ),
        ],
      ),
    );
  }

  // Các chip cho bộ lọc đang áp dụng, bấm dấu X để bỏ từng điều kiện
  Widget _buildActiveFilters() {
    final chips = <Widget>[];

    final status = _query.status;
    if (status != null) {
      chips.add(
        InputChip(
          label: Text(kStatusLabels[status] ?? status),
          onDeleted: () => _applyQuery(_query.withStatus(null)),
        ),
      );
    }

    final priority = _query.priority;
    if (priority != null) {
      chips.add(
        InputChip(
          label: Text('Ưu tiên: ${kPriorityLabels[priority] ?? priority}'),
          onDeleted: () => _applyQuery(_query.withPriority(null)),
        ),
      );
    }

    final assignee = _query.assignee;
    if (assignee != null) {
      final label = assignee == 'me'
          ? 'Giao cho tôi'
          : 'Giao cho ${_query.assigneeName ?? 'người đã chọn'}';
      chips.add(
        InputChip(
          label: Text(label),
          onDeleted: () => _applyQuery(_query.withAssignee(null, null)),
        ),
      );
    }

    if (chips.isEmpty) {
      return const SizedBox.shrink();
    }

    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 0, 16, 4),
      child: Align(
        alignment: Alignment.centerLeft,
        child: Wrap(spacing: 8, runSpacing: 4, children: chips),
      ),
    );
  }

  Widget _buildEmptyState() {
    if (_query.hasFilters) {
      return ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        children: [
          const SizedBox(height: 120),
          const Center(child: Icon(Icons.search_off, size: 64)),
          const SizedBox(height: 12),
          const Center(
            child: Text(
              'Không có công việc nào phù hợp\nvới tìm kiếm hoặc bộ lọc.',
              textAlign: TextAlign.center,
            ),
          ),
          const SizedBox(height: 16),
          Center(
            child: FilledButton.tonal(
              onPressed: _clearFilters,
              child: const Text('Xóa bộ lọc'),
            ),
          ),
        ],
      );
    }

    return ListView(
      physics: const AlwaysScrollableScrollPhysics(),
      children: [
        const SizedBox(height: 120),
        const Center(child: Icon(Icons.inbox_outlined, size: 64)),
        const SizedBox(height: 12),
        Center(
          child: Text(
            _emptyMessages[_scope] ?? 'Chưa có công việc nào.',
            textAlign: TextAlign.center,
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
      return ErrorView(message: _error!, onRetry: () => _loadTasks());
    }

    return RefreshIndicator(
      onRefresh: () async {
        _loadUnreadCount();
        await _loadTasks(showLoading: false);
      },
      child: _tasks.isEmpty
          ? _buildEmptyState()
          : ListView.builder(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.only(top: 8, bottom: 88),
        itemCount: _tasks.length,
        itemBuilder: (context, index) {
          final task = _tasks[index];
          return TaskCard(task: task, onTap: () => _openDetail(task));
        },
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Công việc'),
        actions: [
          IconButton(
            tooltip: 'Thông báo',
            onPressed: _openNotifications,
            icon: Badge.count(
              count: _unreadCount,
              isLabelVisible: _unreadCount > 0,
              child: const Icon(Icons.notifications_outlined),
            ),
          ),
          IconButton(
            icon: const Icon(Icons.account_circle),
            tooltip: 'Cá nhân',
            onPressed: _openProfile,
          ),
        ],
        bottom: TabBar(
          controller: _tabController,
          isScrollable: true,
          tabs: _scopes
              .map((scope) => Tab(text: _scopeLabels[scope]))
              .toList(),
        ),
      ),
      // Ô tìm kiếm và chip bộ lọc nằm NGOÀI phần danh sách,
      // nên vẫn giữ nguyên con trỏ khi danh sách đang tải lại
      body: Column(
        children: [
          _buildSearchBar(),
          _buildActiveFilters(),
          Expanded(child: _buildBody()),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _openCreate,
        icon: const Icon(Icons.add),
        label: const Text('Thêm công việc'),
      ),
    );
  }
}