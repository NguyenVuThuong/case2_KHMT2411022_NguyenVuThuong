class Validators {
  static String? fullName(String? value) {
    if (value == null || value.trim().length < 2) {
      return 'Họ tên phải có ít nhất 2 ký tự';
    }
    return null;
  }

  static String? email(String? value) {
    if (value == null || value.trim().isEmpty) {
      return 'Vui lòng nhập email';
    }
    final regex = RegExp(r'^[^\s@]+@[^\s@]+\.[^\s@]+$');
    if (!regex.hasMatch(value.trim())) {
      return 'Email không hợp lệ';
    }
    return null;
  }

  // Dùng cho đăng ký: kiểm tra độ dài
  static String? newPassword(String? value) {
    if (value == null || value.length < 6 || value.length > 72) {
      return 'Mật khẩu phải từ 6 đến 72 ký tự';
    }
    return null;
  }

  // Dùng cho đăng nhập: chỉ cần không để trống
  static String? passwordRequired(String? value) {
    if (value == null || value.isEmpty) {
      return 'Vui lòng nhập mật khẩu';
    }
    return null;
  }

  static String? confirmPassword(String? value, String original) {
    if (value == null || value.isEmpty) {
      return 'Vui lòng nhập lại mật khẩu';
    }
    if (value != original) {
      return 'Mật khẩu xác nhận không khớp';
    }
    return null;
  }

  // Tên công việc: bắt buộc, tối đa 200 ký tự (khớp backend)
  static String? taskTitle(String? value) {
    if (value == null || value.trim().isEmpty) {
      return 'Vui lòng nhập tên công việc';
    }
    if (value.trim().length > 200) {
      return 'Tên công việc tối đa 200 ký tự';
    }
    return null;
  }
}