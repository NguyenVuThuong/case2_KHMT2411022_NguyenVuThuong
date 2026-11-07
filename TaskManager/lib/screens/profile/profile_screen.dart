import 'package:flutter/material.dart';

import '../../models/user.dart';
import '../../services/api_client.dart';
import '../../services/auth_service.dart';
import '../../utils/validators.dart';
import '../auth/login_screen.dart';
import 'statistics_section.dart';

class ProfileScreen extends StatefulWidget {
  final User user;

  // Gọi khi cập nhật hồ sơ thành công để màn hình trước đó cập nhật theo
  final ValueChanged<User> onUserUpdated;

  const ProfileScreen({
    super.key,
    required this.user,
    required this.onUserUpdated,
  });

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  final _formKey = GlobalKey<FormState>();
  final _authService = AuthService();
  late final TextEditingController _fullNameController;
  late final TextEditingController _avatarController;
  late User _user;

  bool _isSaving = false;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    _user = widget.user;
    _fullNameController = TextEditingController(text: _user.fullName);
    _avatarController = TextEditingController(text: _user.avatarUrl);
  }

  @override
  void dispose() {
    _fullNameController.dispose();
    _avatarController.dispose();
    super.dispose();
  }

  // Ảnh đại diện để trống thì hợp lệ; nếu có thì phải bắt đầu bằng http(s)
  String? _validateAvatarUrl(String? value) {
    final text = (value ?? '').trim();
    if (text.isEmpty) {
      return null;
    }
    if (!RegExp(r'^https?://\S+$').hasMatch(text)) {
      return 'Đường dẫn phải bắt đầu bằng http:// hoặc https://';
    }
    if (text.length > 500) {
      return 'Đường dẫn tối đa 500 ký tự';
    }
    return null;
  }

  Future<void> _handleSave() async {
    if (!_formKey.currentState!.validate()) {
      return;
    }

    setState(() {
      _isSaving = true;
      _errorMessage = null;
    });

    try {
      final updated = await _authService.updateProfile(
        fullName: _fullNameController.text.trim(),
        avatarUrl: _avatarController.text.trim(),
      );

      if (!mounted) return;
      widget.onUserUpdated(updated);
      setState(() => _user = updated);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Cập nhật thông tin thành công')),
      );
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() => _errorMessage = e.displayMessage);
    } finally {
      if (mounted) {
        setState(() => _isSaving = false);
      }
    }
  }

  Future<void> _handleChangePassword() async {
    final changed = await showDialog<bool>(
      context: context,
      builder: (_) => const _ChangePasswordDialog(),
    );

    if (changed == true && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Đổi mật khẩu thành công')),
      );
    }
  }

  Future<void> _handleLogout() async {
    await _authService.logout();
    if (!mounted) return;
    // Về màn hình đăng nhập và xóa hết các màn hình trước đó
    Navigator.of(context).pushAndRemoveUntil(
      MaterialPageRoute(builder: (_) => const LoginScreen()),
          (route) => false,
    );
  }

  // Chữ cái đầu của họ tên, hiện khi chưa có ảnh hoặc ảnh tải lỗi
  Widget _buildInitial() {
    final name = _user.fullName.trim();
    final initial = name.isEmpty ? '?' : name[0].toUpperCase();
    return CircleAvatar(
      radius: 48,
      child: Text(initial, style: const TextStyle(fontSize: 36)),
    );
  }

  Widget _buildAvatar() {
    final url = _user.avatarUrl;
    if (url.isEmpty) {
      return _buildInitial();
    }
    return ClipOval(
      child: Image.network(
        url,
        width: 96,
        height: 96,
        fit: BoxFit.cover,
        // Đường dẫn ảnh sai hoặc không tải được thì hiện chữ cái đầu
        errorBuilder: (_, __, ___) => _buildInitial(),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Cá nhân và thống kê')),
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 500),
              child: Form(
                key: _formKey,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Center(child: _buildAvatar()),
                    const SizedBox(height: 16),
                    Text(
                      _user.email,
                      textAlign: TextAlign.center,
                      style: Theme.of(context).textTheme.bodyLarge,
                    ),
                    const SizedBox(height: 24),
                    // Khối thống kê công việc (tự tải dữ liệu của nó)
                    const StatisticsSection(),
                    const Divider(height: 40),
                    Text(
                      'Thông tin cá nhân',
                      style: Theme.of(context).textTheme.titleLarge,
                    ),
                    const SizedBox(height: 16),
                    TextFormField(
                      controller: _fullNameController,
                      textCapitalization: TextCapitalization.words,
                      decoration: const InputDecoration(
                        labelText: 'Họ tên',
                        prefixIcon: Icon(Icons.person_outline),
                        border: OutlineInputBorder(),
                      ),
                      validator: Validators.fullName,
                    ),
                    const SizedBox(height: 16),
                    TextFormField(
                      controller: _avatarController,
                      keyboardType: TextInputType.url,
                      decoration: const InputDecoration(
                        labelText: 'Đường dẫn ảnh đại diện (tùy chọn)',
                        prefixIcon: Icon(Icons.image_outlined),
                        border: OutlineInputBorder(),
                      ),
                      validator: _validateAvatarUrl,
                    ),
                    if (_errorMessage != null) ...[
                      const SizedBox(height: 16),
                      Text(
                        _errorMessage!,
                        textAlign: TextAlign.center,
                        style: TextStyle(
                          color: Theme.of(context).colorScheme.error,
                        ),
                      ),
                    ],
                    const SizedBox(height: 24),
                    FilledButton(
                      onPressed: _isSaving ? null : _handleSave,
                      child: _isSaving
                          ? const SizedBox(
                        height: 20,
                        width: 20,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                          : const Text('Lưu thay đổi'),
                    ),
                    const SizedBox(height: 12),
                    OutlinedButton.icon(
                      onPressed: _handleChangePassword,
                      icon: const Icon(Icons.lock_reset),
                      label: const Text('Đổi mật khẩu'),
                    ),
                    const SizedBox(height: 12),
                    OutlinedButton.icon(
                      onPressed: _handleLogout,
                      icon: const Icon(Icons.logout),
                      label: const Text('Đăng xuất'),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

// Hộp thoại đổi mật khẩu (không cần màn hình riêng, đúng ghi chú của đề)
class _ChangePasswordDialog extends StatefulWidget {
  const _ChangePasswordDialog();

  @override
  State<_ChangePasswordDialog> createState() => _ChangePasswordDialogState();
}

class _ChangePasswordDialogState extends State<_ChangePasswordDialog> {
  final _formKey = GlobalKey<FormState>();
  final _currentController = TextEditingController();
  final _newController = TextEditingController();
  final _confirmController = TextEditingController();
  final _authService = AuthService();

  bool _isLoading = false;
  String? _errorMessage;

  @override
  void dispose() {
    _currentController.dispose();
    _newController.dispose();
    _confirmController.dispose();
    super.dispose();
  }

  String? _validateNewPassword(String? value) {
    final basic = Validators.newPassword(value);
    if (basic != null) {
      return basic;
    }
    if (value == _currentController.text) {
      return 'Mật khẩu mới phải khác mật khẩu hiện tại';
    }
    return null;
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) {
      return;
    }

    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      await _authService.changePassword(
        _currentController.text,
        _newController.text,
      );

      if (!mounted) return;
      // Đóng hộp thoại và báo "đã đổi thành công" cho màn hình cha
      Navigator.of(context).pop(true);
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() => _errorMessage = e.displayMessage);
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: const Text('Đổi mật khẩu'),
      content: SingleChildScrollView(
        child: Form(
          key: _formKey,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextFormField(
                controller: _currentController,
                obscureText: true,
                decoration: const InputDecoration(
                  labelText: 'Mật khẩu hiện tại',
                ),
                validator: Validators.passwordRequired,
              ),
              const SizedBox(height: 8),
              TextFormField(
                controller: _newController,
                obscureText: true,
                decoration: const InputDecoration(labelText: 'Mật khẩu mới'),
                validator: _validateNewPassword,
              ),
              const SizedBox(height: 8),
              TextFormField(
                controller: _confirmController,
                obscureText: true,
                decoration: const InputDecoration(
                  labelText: 'Xác nhận mật khẩu mới',
                ),
                validator: (value) =>
                    Validators.confirmPassword(value, _newController.text),
              ),
              if (_errorMessage != null) ...[
                const SizedBox(height: 12),
                Text(
                  _errorMessage!,
                  style: TextStyle(color: Theme.of(context).colorScheme.error),
                ),
              ],
            ],
          ),
        ),
      ),
      actions: [
        TextButton(
          onPressed: _isLoading ? null : () => Navigator.of(context).pop(false),
          child: const Text('Hủy'),
        ),
        FilledButton(
          onPressed: _isLoading ? null : _submit,
          child: _isLoading
              ? const SizedBox(
            height: 18,
            width: 18,
            child: CircularProgressIndicator(strokeWidth: 2),
          )
              : const Text('Đổi mật khẩu'),
        ),
      ],
    );
  }
}