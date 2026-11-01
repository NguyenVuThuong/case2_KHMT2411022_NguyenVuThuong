const { PRIORITIES, STATUSES } = require('../models/Task');

// Đổi giá trị gửi lên thành Date. Trả về:
//   null      nếu không có ngày (undefined, null hoặc chuỗi rỗng)
//   Date      nếu hợp lệ
//   undefined nếu sai định dạng
function parseOptionalDate(value) {
  if (value === undefined || value === null || value === '') {
    return null;
  }
  if (typeof value !== 'string') {
    return undefined;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

// Gom các lỗi chung của dữ liệu công việc.
// isCreate = true: bắt buộc có tên và cho phép gửi trạng thái ban đầu.
function collectTaskErrors(body, isCreate) {
  const errors = [];
  const { title, description, startDate, dueDate, priority, status } = body;

  if (isCreate || title !== undefined) {
    if (typeof title !== 'string' || title.trim().length === 0) {
      errors.push('Tên công việc là bắt buộc');
    } else if (title.trim().length > 200) {
      errors.push('Tên công việc tối đa 200 ký tự');
    }
  }

  if (description !== undefined) {
    if (typeof description !== 'string') {
      errors.push('Mô tả phải là chuỗi ký tự');
    } else if (description.length > 2000) {
      errors.push('Mô tả tối đa 2000 ký tự');
    }
  }

  const start = parseOptionalDate(startDate);
  const due = parseOptionalDate(dueDate);

  if (start === undefined) {
    errors.push('Ngày bắt đầu không hợp lệ');
  }
  if (due === undefined) {
    errors.push('Hạn hoàn thành không hợp lệ');
  }
  // Chỉ so sánh khi cả hai ngày đều có và hợp lệ
  if (start && due && due < start) {
    errors.push('Hạn hoàn thành không được trước ngày bắt đầu');
  }

  if (priority !== undefined && !PRIORITIES.includes(priority)) {
    errors.push(`Mức độ ưu tiên phải là một trong: ${PRIORITIES.join(', ')}`);
  }

  if (isCreate && status !== undefined && !STATUSES.includes(status)) {
    errors.push(`Trạng thái phải là một trong: ${STATUSES.join(', ')}`);
  }

  return errors;
}

function sendValidationErrors(res, errors) {
  return res.status(400).json({
    status: 'error',
    message: 'Dữ liệu không hợp lệ',
    errors
  });
}

// Kiểm tra dữ liệu khi tạo công việc
function validateCreateTask(req, res, next) {
  const errors = collectTaskErrors(req.body || {}, true);
  if (errors.length > 0) {
    return sendValidationErrors(res, errors);
  }
  next();
}

// Kiểm tra dữ liệu khi sửa công việc (mọi trường đều tùy chọn)
// Trạng thái không sửa ở đây mà dùng PATCH /:id/status
function validateUpdateTask(req, res, next) {
  const body = req.body || {};
  const editableFields = ['title', 'description', 'startDate', 'dueDate', 'priority'];

  if (!editableFields.some((field) => body[field] !== undefined)) {
    return sendValidationErrors(res, [
      'Cần gửi ít nhất một trường: title, description, startDate, dueDate hoặc priority'
    ]);
  }

  const errors = collectTaskErrors(body, false);
  if (errors.length > 0) {
    return sendValidationErrors(res, errors);
  }
  next();
}

// Kiểm tra dữ liệu khi đổi trạng thái
function validateStatus(req, res, next) {
  const { status } = req.body || {};
  if (!STATUSES.includes(status)) {
    return sendValidationErrors(res, [
      `Trạng thái phải là một trong: ${STATUSES.join(', ')}`
    ]);
  }
  next();
}

// Kiểm tra :id trên đường dẫn có đúng dạng ObjectId (24 ký tự hex) không
function validateTaskId(req, res, next) {
  if (!/^[0-9a-fA-F]{24}$/.test(req.params.id)) {
    return res.status(400).json({
      status: 'error',
      message: 'Mã công việc không hợp lệ'
    });
  }
  next();
}

module.exports = {
  parseOptionalDate,
  validateCreateTask,
  validateUpdateTask,
  validateStatus,
  validateTaskId
};