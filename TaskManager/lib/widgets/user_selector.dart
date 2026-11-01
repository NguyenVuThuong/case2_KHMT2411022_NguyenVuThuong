import 'dart:async';

import 'package:flutter/material.dart';

import '../models/user.dart';
import '../services/api_client.dart';
import '../services/user_service.dart';
import 'user_avatar.dart';

// Ô tìm người dùng: gõ tên hoặc email, bấm vào kết quả để chọn
class UserSelector extends StatefulWidget {
  // Mã những người cần ẩn khỏi kết quả (đã được giao hoặc đã được chọn)
  final Set<String> excludeIds;

  // Gọi khi người dùng bấm chọn một người
  final ValueChanged<User> onSelected;

  const UserSelector({
    super.key,
    required this.excludeIds,
    required this.onSelected,
  });

  @override
  State<UserSelector> createState() => _UserSelectorState();
}

class _UserSelectorState extends State<UserSelector> {
  final _controller = TextEditingController();
  final _userService = UserService();
  Timer? _debounce;

  List<User> _results = [];
  bool _isSearching = false;
  String? _error;
  String _query = '';

  @override
  void dispose() {
    _debounce?.cancel();
    _controller.dispose();
    super.dispose();
  }

  void _onChanged(String value) {
    // Đợi người dùng ngừng gõ 0,4 giây mới gọi API, tránh gọi quá nhiều lần
    _debounce?.cancel();
    final query = value.trim();

    if (query.length < 2) {
      setState(() {
        _query = query;
        _results = [];
        _error = null;
        _isSearching = false;
      });
      return;
    }

    _debounce = Timer(const Duration(milliseconds: 400), () => _search(query));
  }

  Future<void> _search(String query) async {
    setState(() {
      _query = query;
      _isSearching = true;
      _error = null;
    });

    try {
      final users = await _userService.search(query);
      // Bỏ qua kết quả cũ nếu người dùng đã gõ từ khóa khác
      if (!mounted || query != _query) return;
      setState(() => _results = users);
    } on ApiException catch (e) {
      if (!mounted || query != _query) return;
      setState(() {
        _error = e.displayMessage;
        _results = [];
      });
    } finally {
      if (mounted && query == _query) {
        setState(() => _isSearching = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final visible =
    _results.where((u) => !widget.excludeIds.contains(u.id)).toList();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        TextField(
          controller: _controller,
          onChanged: _onChanged,
          decoration: const InputDecoration(
            labelText: 'Tìm theo tên hoặc email',
            hintText: 'Nhập ít nhất 2 ký tự',
            prefixIcon: Icon(Icons.search),
            border: OutlineInputBorder(),
          ),
        ),
        if (_isSearching)
          const Padding(
            padding: EdgeInsets.only(top: 8),
            child: LinearProgressIndicator(),
          ),
        if (_error != null)
          Padding(
            padding: const EdgeInsets.only(top: 8),
            child: Text(
              _error!,
              style: TextStyle(color: Theme.of(context).colorScheme.error),
            ),
          ),
        if (!_isSearching &&
            _error == null &&
            _query.length >= 2 &&
            visible.isEmpty)
          const Padding(
            padding: EdgeInsets.only(top: 8),
            child: Text('Không có người dùng nào để thêm'),
          ),
        ...visible.map(
              (user) => ListTile(
            contentPadding: EdgeInsets.zero,
            leading: UserAvatar(user: user),
            title: Text(user.fullName),
            subtitle: Text(user.email),
            trailing: const Icon(Icons.add_circle_outline),
            onTap: () => widget.onSelected(user),
          ),
        ),
      ],
    );
  }
}