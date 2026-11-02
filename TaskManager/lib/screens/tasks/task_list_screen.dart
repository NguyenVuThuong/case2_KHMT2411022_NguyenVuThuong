import 'package:flutter/material.dart';

import '../../models/task.dart';
import '../../models/user.dart';
import '../../services/api_client.dart';
import '../../services/task_service.dart';
import '../../widgets/loading_view.dart';
import '../../widgets/task_card.dart';
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

  final _taskService = TaskService();
  late final TabController _tabController;

  late User _user;
  List<Task> _tasks = [];
  String _scope = 'all';
  bool _isLoading = true;
  String? _error;

  // Số thứ tự của lần tải mới nhất, để bỏ qua kết quả cũ về chậm
  int _requestId = 0;

  @override
  void initState() {
    super.initState();
    _user = widget.user;
    _tabController = TabController(length: _scopes.length, vsync: this);
    _tabController.addListener(_onTabChanged);
    _loadTasks();
  }

  @override
  void dispose() {
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
      final tasks = await _taskService.getTasks(scope: _scope);
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

  Widget _buildBody() {
    if (_isLoading) {
      return const LoadingView();
    }
    if (_error != null) {
      return ErrorView(message: _error!, onRetry: () => _loadTasks());
    }

    return RefreshIndicator(
      onRefresh: () => _loadTasks(showLoading: false),
      child: _tasks.isEmpty
          ? ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        children: [
          const SizedBox(height: 160),
          const Center(child: Icon(Icons.inbox_outlined, size: 64)),
          const SizedBox(height: 12),
          Center(
            child: Text(
              _emptyMessages[_scope] ?? 'Chưa có công việc nào.',
              textAlign: TextAlign.center,
            ),
          ),
        ],
      )
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
      body: _buildBody(),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _openCreate,
        icon: const Icon(Icons.add),
        label: const Text('Thêm công việc'),
      ),
    );
  }
}