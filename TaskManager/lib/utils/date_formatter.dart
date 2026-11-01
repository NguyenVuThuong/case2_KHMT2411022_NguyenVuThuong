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
}