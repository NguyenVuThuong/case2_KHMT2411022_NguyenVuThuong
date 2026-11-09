const User = require('../models/User');
const TaskActivity = require('../models/TaskActivity');

const STATUS_LABELS = {
  todo: 'Chưa thực hiện',
  in_progress: 'Đang thực hiện',
  completed: 'Đã hoàn thành'
};

const PRIORITY_LABELS = { low: 'Thấp', medium: 'Trung bình', high: 'Cao' };

const PERMISSION_LABELS = { viewer: 'chỉ xem', editor: 'chỉnh sửa' };

const DATE_FIELD_LABELS = {
  startDate: 'ngày bắt đầu',
  dueDate: 'hạn hoàn thành'
};

// Ngày dd/MM/yyyy theo giờ Việt Nam
function formatDate(value) {
  if (!value) {
    return 'chưa đặt';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }
  return date.toLocaleDateString('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

function shorten(value, max = 60) {
  const text = String(value === null || value === undefined ? '' : value);
  return text.length > max ? `${text.slice(0, max)}...` : text;
}

// Ghi một hoạt động. Lỗi ở đây KHÔNG được làm hỏng thao tác chính, chỉ ghi log.
async function logActivity(taskId, user, action, details = {}) {
  try {
    await TaskActivity.create({ taskId, userId: user._id, action, details });
  } catch (error) {
    console.error('Không ghi được lịch sử hoạt động:', error.message);
  }
}

// "Ảnh chụp" tên người dùng tại thời điểm thao tác
function snapshotOf(user) {
  return { id: String(user._id), fullName: user.fullName };
}

async function snapshotUser(userId) {
  const user = await User.findById(userId).select('fullName');
  return {
    id: String(userId),
    fullName: user ? user.fullName : 'Người dùng không còn tồn tại'
  };
}

// Chụp các trường của công việc để so sánh trước và sau khi sửa
function takeTaskSnapshot(task) {
  return {
    title: task.title,
    description: task.description,
    priority: task.priority,
    startDate: task.startDate ? task.startDate.getTime() : null,
    dueDate: task.dueDate ? task.dueDate.getTime() : null
  };
}

// Liệt kê các trường đã thay đổi. Mô tả chỉ ghi "có đổi", không lưu nội dung.
function diffTaskSnapshots(before, after) {
  const changes = [];

  ['title', 'description', 'priority', 'startDate', 'dueDate'].forEach((field) => {
    if (before[field] === after[field]) {
      return;
    }
    if (field === 'description') {
      changes.push({ field });
      return;
    }

    const isDate = field === 'startDate' || field === 'dueDate';
    const convert = (value) =>
      isDate && value !== null ? new Date(value).toISOString() : value;

    changes.push({ field, from: convert(before[field]), to: convert(after[field]) });
  });

  return changes;
}

function describeChange(change) {
  switch (change.field) {
    case 'title':
      return `tên công việc từ "${shorten(change.from)}" sang "${shorten(change.to)}"`;
    case 'description':
      return 'mô tả';
    case 'priority':
      return (
        `mức độ ưu tiên từ "${PRIORITY_LABELS[change.from] || change.from}" ` +
        `sang "${PRIORITY_LABELS[change.to] || change.to}"`
      );
    case 'startDate':
    case 'dueDate':
      return (
        `${DATE_FIELD_LABELS[change.field]} từ ${formatDate(change.from)} ` +
        `sang ${formatDate(change.to)}`
      );
    default:
      return String(change.field);
  }
}

const nameOf = (user) => (user && user.fullName) || 'một người dùng';
const namesOf = (users) =>
  (users || []).map((user) => nameOf(user)).join(', ') || 'một người dùng';

// Câu mô tả tiếng Việt của một hoạt động
function buildSummary(activity, actorName) {
  const d = activity.details || {};

  switch (activity.action) {
    case 'created':
      return `${actorName} đã tạo công việc`;
    case 'updated':
      return `${actorName} đã cập nhật ${(d.changes || []).map(describeChange).join('; ')}`;
    case 'status_changed':
      return (
        `${actorName} đã đổi trạng thái từ "${STATUS_LABELS[d.from] || d.from}" ` +
        `sang "${STATUS_LABELS[d.to] || d.to}"`
      );
    case 'assigned':
      return `${actorName} đã giao việc cho ${namesOf(d.users)}`;
    case 'unassigned':
      return `${actorName} đã hủy giao việc của ${nameOf(d.user)}`;
    case 'primary_assignee_changed':
      return `${actorName} đã đặt ${nameOf(d.user)} làm người phụ trách chính`;
    case 'shared':
      return (
        `${actorName} đã chia sẻ công việc cho ${namesOf(d.users)} ` +
        `(quyền ${PERMISSION_LABELS[d.permission] || d.permission})`
      );
    case 'share_permission_changed':
      return (
        `${actorName} đã đổi quyền của ${nameOf(d.user)} từ ` +
        `"${PERMISSION_LABELS[d.from] || d.from}" sang "${PERMISSION_LABELS[d.to] || d.to}"`
      );
    case 'share_revoked':
      return `${actorName} đã thu hồi quyền chia sẻ của ${nameOf(d.user)}`;
    default:
      return `${actorName} đã thực hiện một thao tác`;
  }
}

module.exports = {
  logActivity,
  snapshotOf,
  snapshotUser,
  takeTaskSnapshot,
  diffTaskSnapshots,
  buildSummary
};