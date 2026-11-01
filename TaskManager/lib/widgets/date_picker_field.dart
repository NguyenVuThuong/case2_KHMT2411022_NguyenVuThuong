import 'package:flutter/material.dart';

import '../utils/date_formatter.dart';

// Ô chọn ngày: bấm để mở lịch, có nút xóa ngày đã chọn
class DatePickerField extends StatelessWidget {
  final String label;
  final DateTime? value;
  final ValueChanged<DateTime?> onChanged;

  const DatePickerField({
    super.key,
    required this.label,
    required this.value,
    required this.onChanged,
  });

  Future<void> _pickDate(BuildContext context) async {
    final picked = await showDatePicker(
      context: context,
      initialDate: value ?? DateTime.now(),
      firstDate: DateTime(2020),
      lastDate: DateTime(2100),
    );
    if (picked != null) {
      onChanged(picked);
    }
  }

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: () => _pickDate(context),
      child: InputDecorator(
        decoration: InputDecoration(
          labelText: label,
          prefixIcon: const Icon(Icons.event),
          border: const OutlineInputBorder(),
          suffixIcon: value == null
              ? null
              : IconButton(
            icon: const Icon(Icons.clear),
            tooltip: 'Xóa ngày',
            onPressed: () => onChanged(null),
          ),
        ),
        child: Text(DateFormatter.date(value)),
      ),
    );
  }
}