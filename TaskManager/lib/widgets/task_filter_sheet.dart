import 'package:flutter/material.dart';

import '../models/task.dart';
import '../models/task_query.dart';
import 'user_selector.dart';

// Mở bảng bộ lọc. Trả về điều kiện mới nếu bấm "Áp dụng", null nếu đóng bảng.
Future<TaskQuery?> showTaskFilterSheet(
    BuildContext context,
    TaskQuery current,
    ) {
  return showModalBottomSheet<TaskQuery>(
    context: context,
    isScrollControlled: true,
    showDragHandle: true,
    builder: (_) => _TaskFilterSheet(current: current),
  );
}

class _TaskFilterSheet extends StatefulWidget {
  final TaskQuery current;

  const _TaskFilterSheet({required this.current});

  @override
  State<_TaskFilterSheet> createState() => _TaskFilterSheetState();
}

class _TaskFilterSheetState extends State<_TaskFilterSheet> {
  String? _status;
  String? _priority;
  String? _assignee;
  String? _assigneeName;
  bool _showPicker = false;

  @override
  void initState() {
    super.initState();
    _status = widget.current.status;
    _priority = widget.current.priority;
    _assignee = widget.current.assignee;
    _assigneeName = widget.current.assigneeName;
  }

  void _reset() {
    setState(() {
      _status = null;
      _priority = null;
      _assignee = null;
      _assigneeName = null;
      _showPicker = false;
    });
  }

  void _apply() {
    Navigator.of(context).pop(
      widget.current
          .withStatus(_status)
          .withPriority(_priority)
          .withAssignee(_assignee, _assigneeName),
    );
  }

  // Một hàng chip: "Tất cả" cộng với các giá trị, chọn một
  Widget _buildChoiceChips({
    required List<String> values,
    required Map<String, String> labels,
    required String? selected,
    required ValueChanged<String?> onChanged,
  }) {
    return Wrap(
      spacing: 8,
      runSpacing: 4,
      children: [
        ChoiceChip(
          label: const Text('Tất cả'),
          selected: selected == null,
          onSelected: (_) => onChanged(null),
        ),
        ...values.map(
              (value) => ChoiceChip(
            label: Text(labels[value] ?? value),
            selected: selected == value,
            onSelected: (_) => onChanged(value),
          ),
        ),
      ],
    );
  }

  Widget _buildAssigneeSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Wrap(
          spacing: 8,
          runSpacing: 4,
          children: [
            ChoiceChip(
              label: const Text('Tất cả'),
              selected: _assignee == null,
              onSelected: (_) => setState(() {
                _assignee = null;
                _assigneeName = null;
              }),
            ),
            ChoiceChip(
              label: const Text('Tôi'),
              selected: _assignee == 'me',
              onSelected: (_) => setState(() {
                _assignee = 'me';
                _assigneeName = null;
                _showPicker = false;
              }),
            ),
            // Người khác đã chọn thì hiện thành một chip có nút xóa
            if (_assignee != null && _assignee != 'me')
              InputChip(
                label: Text(_assigneeName ?? 'Người đã chọn'),
                selected: true,
                onDeleted: () => setState(() {
                  _assignee = null;
                  _assigneeName = null;
                }),
              ),
            ActionChip(
              avatar: const Icon(Icons.person_search, size: 18),
              label: const Text('Chọn người khác'),
              onPressed: () => setState(() => _showPicker = !_showPicker),
            ),
          ],
        ),
        if (_showPicker)
          Padding(
            padding: const EdgeInsets.only(top: 12),
            child: UserSelector(
              excludeIds: const <String>{},
              onSelected: (user) => setState(() {
                _assignee = user.id;
                _assigneeName = user.fullName;
                _showPicker = false;
              }),
            ),
          ),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;

    return Padding(
      // Chừa chỗ cho bàn phím khi gõ tìm người
      padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
      child: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.fromLTRB(24, 0, 24, 24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              Text('Bộ lọc', style: textTheme.titleLarge),
              const SizedBox(height: 16),
              Text('Trạng thái', style: textTheme.titleSmall),
              const SizedBox(height: 8),
              _buildChoiceChips(
                values: kStatuses,
                labels: kStatusLabels,
                selected: _status,
                onChanged: (value) => setState(() => _status = value),
              ),
              const SizedBox(height: 16),
              Text('Mức độ ưu tiên', style: textTheme.titleSmall),
              const SizedBox(height: 8),
              _buildChoiceChips(
                values: kPriorities,
                labels: kPriorityLabels,
                selected: _priority,
                onChanged: (value) => setState(() => _priority = value),
              ),
              const SizedBox(height: 16),
              Text('Người được giao', style: textTheme.titleSmall),
              const SizedBox(height: 8),
              _buildAssigneeSection(),
              const SizedBox(height: 24),
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton(
                      onPressed: _reset,
                      child: const Text('Đặt lại'),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: FilledButton(
                      onPressed: _apply,
                      child: const Text('Áp dụng'),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}