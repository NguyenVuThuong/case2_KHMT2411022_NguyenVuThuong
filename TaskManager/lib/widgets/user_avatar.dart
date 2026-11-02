import 'package:flutter/material.dart';

import '../models/user.dart';

// Ảnh đại diện tròn; chưa có ảnh hoặc ảnh lỗi thì hiện chữ cái đầu của họ tên
class UserAvatar extends StatelessWidget {
  final User user;
  final double radius;

  const UserAvatar({super.key, required this.user, this.radius = 20});

  @override
  Widget build(BuildContext context) {
    final name = user.fullName.trim();
    final initial = name.isEmpty ? '?' : name[0].toUpperCase();
    final url = user.avatarUrl;

    return CircleAvatar(
      radius: radius,
      foregroundImage: url.isEmpty ? null : NetworkImage(url),
      onForegroundImageError: url.isEmpty ? null : (_, __) {},
      child: Text(initial),
    );
  }
}