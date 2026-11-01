import 'package:flutter/material.dart';

import '../../models/task.dart';
import '../../services/api_client.dart';
import '../../services/task_service.dart';
import '../../utils/validators.dart';
import '../../widgets/date_picker_field.dart';

class TaskEditScreen extends StatefulWidget {
  final Task task;

  const TaskEditScreen({super.key, required this.task});

  @override
  State<TaskEditScreen> createState() => _TaskEditScreenState();
}

class _TaskEditScreenState extends State<TaskEditScreen> {
  final _formKey = GlobalKey<FormState>();
  final _taskService = TaskService();

  late final TextEditingController _titleController;
  late final TextEditingController _descriptionController;
  late DateTime? _startDate;
  late DateTime? _dueDate;
  late String _priority;

  bool _isSaving = false;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    // Điền sẵn dữ liệu hiện tại của công việc vào các ô nhập
    final task = widget.task;
    _titleController = TextEditingController(text: task.title);
    _descriptionController = TextEditingController(text: task.description);
    _startDate = task.startDate;
    _dueDate = task.dueDate;
    _priority = task.priority;
  }

  @override
  void dispose() {
    _titleController.dispose();
    _descriptionController.dispose();
    super.dispose();
  }

  Future<void> _handleSave() async {
    if (!_formKey.currentState!.validate()) {
      return;
    }

    // Hạn hoàn thành không được trước ngày bắt đầu
    final start = _startDate;
    final due = _dueDate;
    if (start != null && due != null && due.isBefore(start)) {
      setState(() {
        _errorMessage = 'Hạn hoàn thành không được trước ngày bắt đầu';
      });
      return;
    }

    setState(() {
      _isSaving = true;
      _errorMessage = null;
    });

    try {
      final updated = await _taskService.updateTask(
        widget.task.id,
        title: _titleController.text.trim(),
        description: _descriptionController.text.trim(),
        startDate: _startDate,
        dueDate: _dueDate,
        priority: _priority,
      );

      if (!mounted) return;
      // Trả công việc đã cập nhật về màn hình chi tiết
      Navigator.of(context).pop(updated);
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() => _errorMessage = e.displayMessage);
    } finally {
      if (mounted) {
        setState(() => _isSaving = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Sửa công việc')),
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
                    TextFormField(
                      controller: _titleController,
                      textCapitalization: TextCapitalization.sentences,
                      decoration: const InputDecoration(
                        labelText: 'Tên công việc',
                        prefixIcon: Icon(Icons.title),
                        border: OutlineInputBorder(),
                      ),
                      validator: Validators.taskTitle,
                    ),
                    const SizedBox(height: 16),
                    TextFormField(
                      controller: _descriptionController,
                      maxLines: 4,
                      maxLength: 2000,
                      decoration: const InputDecoration(
                        labelText: 'Mô tả (tùy chọn)',
                        alignLabelWithHint: true,
                        border: OutlineInputBorder(),
                      ),
                    ),
                    const SizedBox(height: 8),
                    DatePickerField(
                      label: 'Ngày bắt đầu',
                      value: _startDate,
                      onChanged: (date) => setState(() => _startDate = date),
                    ),
                    const SizedBox(height: 16),
                    DatePickerField(
                      label: 'Hạn hoàn thành',
                      value: _dueDate,
                      onChanged: (date) => setState(() => _dueDate = date),
                    ),
                    const SizedBox(height: 16),
                    DropdownButtonFormField<String>(
                      initialValue: _priority,
                      decoration: const InputDecoration(
                        labelText: 'Mức độ ưu tiên',
                        prefixIcon: Icon(Icons.flag_outlined),
                        border: OutlineInputBorder(),
                      ),
                      items: kPriorities
                          .map(
                            (p) => DropdownMenuItem(
                          value: p,
                          child: Text(kPriorityLabels[p] ?? p),
                        ),
                      )
                          .toList(),
                      onChanged: (value) {
                        if (value != null) {
                          setState(() => _priority = value);
                        }
                      },
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