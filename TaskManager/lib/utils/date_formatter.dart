class DateFormatter {
  // Định dạng ngày dd/MM/yyyy theo giờ địa phương
  static String date(DateTime? value) {
    if (value == null) {
      return 'Chưa đặt';
    }
    final d = value.toLocal();
    final day = d.day.toString().padLeft(2, '0');
    final month = d.month.toString().padLeft(2, '0');
    return '$day/$month/${d.year}';
  }

  // Thời gian tương đối so với bây giờ, ví dụ "5 phút trước"
  static String relative(DateTime? value) {
    if (value == null) {
      return '';
    }
    final diff = DateTime.now().difference(value);

    if (diff.inMinutes < 1) {
      return 'Vừa xong';
    }
    if (diff.inMinutes < 60) {
      return '${diff.inMinutes} phút trước';
    }
    if (diff.inHours < 24) {
      return '${diff.inHours} giờ trước';
    }
    if (diff.inDays < 7) {
      return '${diff.inDays} ngày trước';
    }
    return date(value);
  }
}