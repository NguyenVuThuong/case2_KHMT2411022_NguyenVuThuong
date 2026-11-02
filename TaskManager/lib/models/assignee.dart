import 'user.dart';

// Một người được giao việc, kèm cờ "người phụ trách chính"
class Assignee {
  final User user;
  final bool isPrimary;

  const Assignee({required this.user, required this.isPrimary});

  // JSON của API giao việc có cùng các trường id, fullName, email, avatarUrl
  // như người dùng, cộng thêm isPrimary
  factory Assignee.fromJson(Map<String, dynamic> json) {
    return Assignee(
      user: User.fromJson(json),
      isPrimary: json['isPrimary'] == true,
    );
  }
}