const { PRIORITIES, STATUSES } = require('../models/Task');

const SCOPES = ['all', 'created', 'assigned', 'shared'];
const SORT_FIELDS = ['createdAt', 'dueDate', 'priority'];
const ORDERS = ['asc', 'desc'];

// Chiều sắp xếp mặc định của từng tiêu chí
const DEFAULT_ORDER = {
  createdAt: 'desc', // mới nhất trước
  dueDate: 'asc', // hạn gần nhất trước
  priority: 'desc' // ưu tiên cao trước
};

const OBJECT_ID_REGEX = /^[0-9a-fA-F]{24}$/;
const MAX_QUERY_LENGTH = 100;

// Đọc một tham số trên URL. Không gửi hoặc gửi chuỗi rỗng thì coi như không có.
// Gửi nhiều lần (?status=a&status=b) sẽ ra mảng, ta từ chối.
function readParam(query, name, errors) {
  const value = query[name];
  if (value === undefined) {
    return undefined;
  }
  if (typeof value !== 'string') {
    errors.push(`${name} chỉ được gửi một lần và phải là chuỗi ký tự`);
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed === '' ? undefined : trimmed;
}

// Kiểm tra các tham số tìm kiếm, lọc, sắp xếp của GET /api/tasks.
// Hợp lệ thì gắn kết quả đã chuẩn hóa vào req.taskQuery.
function validateTaskQuery(req, res, next) {
  const errors = [];
  const query = req.query;

  const scope = readParam(query, 'scope', errors) || 'all';
  if (!SCOPES.includes(scope)) {
    errors.push(`scope phải là một trong: ${SCOPES.join(', ')}`);
  }

  const q = readParam(query, 'q', errors);
  if (q !== undefined && q.length > MAX_QUERY_LENGTH) {
    errors.push(`q tối đa ${MAX_QUERY_LENGTH} ký tự`);
  }

  const status = readParam(query, 'status', errors);
  if (status !== undefined && !STATUSES.includes(status)) {
    errors.push(`status phải là một trong: ${STATUSES.join(', ')}`);
  }

  const priority = readParam(query, 'priority', errors);
  if (priority !== undefined && !PRIORITIES.includes(priority)) {
    errors.push(`priority phải là một trong: ${PRIORITIES.join(', ')}`);
  }

  // assignee là mã người dùng, hoặc "me" nghĩa là chính người đang đăng nhập
  const assignee = readParam(query, 'assignee', errors);
  if (assignee !== undefined && assignee !== 'me' && !OBJECT_ID_REGEX.test(assignee)) {
    errors.push('assignee phải là mã người dùng hợp lệ hoặc "me"');
  }

  const sortBy = readParam(query, 'sortBy', errors) || 'createdAt';
  if (!SORT_FIELDS.includes(sortBy)) {
    errors.push(`sortBy phải là một trong: ${SORT_FIELDS.join(', ')}`);
  }

  const order = readParam(query, 'order', errors);
  if (order !== undefined && !ORDERS.includes(order)) {
    errors.push(`order phải là một trong: ${ORDERS.join(', ')}`);
  }

  if (errors.length > 0) {
    return res.status(400).json({
      status: 'error',
      message: 'Tham số tìm kiếm hoặc lọc không hợp lệ',
      errors
    });
  }

  req.taskQuery = {
    scope,
    q,
    status,
    priority,
    assigneeId: assignee === 'me' ? String(req.user._id) : assignee,
    sortBy,
    order: order || DEFAULT_ORDER[sortBy]
  };

  next();
}

module.exports = { validateTaskQuery };