const Task = require('../models/Task');
const TaskShare = require('../models/TaskShare');

// Mỗi vai trò được làm những việc gì
const ROLE_CAPABILITIES = {
  owner: ['view', 'changeStatus', 'editContent', 'delete', 'manage'],
  editor: ['view', 'changeStatus', 'editContent'],
  assignee: ['view', 'changeStatus'],
  viewer: ['view']
};

// Thứ tự ưu tiên để chọn vai trò hiển thị khi một người có nhiều vai trò
const ROLE_PRIORITY = ['owner', 'editor', 'assignee', 'viewer'];

// Trọng số mức ưu tiên để sắp xếp (chữ "high", "low", "medium" xếp theo bảng chữ cái là sai)
const PRIORITY_WEIGHT = { low: 1, medium: 2, high: 3 };

// Tính quyền của một người trên một công việc.
//   task:   công việc (cần createdBy, assigneeIds, primaryAssigneeId)
//   userId: id người đang thao tác
//   share:  bản ghi chia sẻ của người đó với công việc này (hoặc null)
// Trả về { role, capabilities } hoặc null nếu người đó không liên quan.
function computeAccess(task, userId, share) {
  const uid = String(userId);
  const roles = [];

  if (String(task.createdBy) === uid) {
    roles.push('owner');
  }

  if (share && share.permission === 'editor') {
    roles.push('editor');
  }

  const inAssignees = (task.assigneeIds || []).some((id) => String(id) === uid);
  const isPrimary =
    task.primaryAssigneeId && String(task.primaryAssigneeId) === uid;
  if (inAssignees || isPrimary) {
    roles.push('assignee');
  }

  if (share && share.permission === 'viewer') {
    roles.push('viewer');
  }

  if (roles.length === 0) {
    return null;
  }

  // Quyền cuối cùng là HỢP của quyền từ mọi vai trò
  const capabilities = new Set();
  roles.forEach((role) => {
    ROLE_CAPABILITIES[role].forEach((cap) => capabilities.add(cap));
  });

  const role = ROLE_PRIORITY.find((r) => roles.includes(r));

  return { role, capabilities: [...capabilities] };
}

// Tải công việc theo id và tính quyền của người dùng.
// Trả về { task, access } hoặc null nếu không có công việc / không có quyền xem.
async function loadTaskAccess(taskId, userId) {
  const task = await Task.findById(taskId);
  if (!task) {
    return null;
  }

  const share = await TaskShare.findOne({ taskId: task._id, userId });
  const access = computeAccess(task, userId, share);
  if (!access) {
    return null;
  }

  return { task, access };
}

// Đưa chữ về dạng không dấu, chữ thường để so sánh khi tìm kiếm:
// "Việc Đặng" -> "viec dang"
function normalizeText(value) {
  return String(value === null || value === undefined ? '' : value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // bỏ các dấu thanh và dấu mũ
    .toLowerCase()
    .replace(/đ/g, 'd'); // "đ" không tách được bằng NFD nên xử lý riêng
}

// So sánh hai phần tử { task, access } theo tiêu chí sắp xếp.
// Số âm: a đứng trước b. Số dương: b đứng trước a.
function compareItems(a, b, sortBy, order) {
  const factor = order === 'asc' ? 1 : -1;
  let result = 0;

  if (sortBy === 'dueDate') {
    const aDue = a.task.dueDate ? a.task.dueDate.getTime() : null;
    const bDue = b.task.dueDate ? b.task.dueDate.getTime() : null;

    // Việc không có hạn luôn đứng cuối, bất kể chiều sắp xếp
    if (aDue === null && bDue !== null) {
      return 1;
    }
    if (aDue !== null && bDue === null) {
      return -1;
    }
    if (aDue !== null && bDue !== null) {
      result = (aDue - bDue) * factor;
    }
  } else if (sortBy === 'priority') {
    const aWeight = PRIORITY_WEIGHT[a.task.priority] || 0;
    const bWeight = PRIORITY_WEIGHT[b.task.priority] || 0;
    result = (aWeight - bWeight) * factor;
  } else {
    result = (a.task.createdAt - b.task.createdAt) * factor;
  }

  if (result !== 0) {
    return result;
  }

  // Bằng nhau ở tiêu chí chính thì việc tạo sau đứng trước
  return b.task.createdAt - a.task.createdAt;
}

// Lấy các công việc người dùng có thể truy cập, kèm tìm kiếm, lọc và sắp xếp.
//   options.scope:      created | assigned | shared | all (mặc định all)
//   options.q:          tìm theo tên (không phân biệt hoa thường và dấu)
//   options.status:     lọc theo trạng thái
//   options.priority:   lọc theo mức ưu tiên
//   options.assigneeId: lọc theo người được giao
//   options.sortBy:     createdAt | dueDate | priority
//   options.order:      asc | desc
async function findAccessibleTasks(userId, options = {}) {
  const {
    scope = 'all',
    q,
    status,
    priority,
    assigneeId,
    sortBy = 'createdAt',
    order = 'desc'
  } = options;

  const shares = await TaskShare.find({ userId });
  const sharedTaskIds = shares.map((s) => s.taskId);

  const createdCondition = { createdBy: userId };
  const assignedCondition = {
    $or: [{ assigneeIds: userId }, { primaryAssigneeId: userId }]
  };
  const sharedCondition = { _id: { $in: sharedTaskIds } };

  // Điều kiện quyền truy cập đi TRƯỚC, các bộ lọc chỉ thu hẹp thêm
  let accessFilter;
  if (scope === 'created') {
    accessFilter = createdCondition;
  } else if (scope === 'assigned') {
    accessFilter = assignedCondition;
  } else if (scope === 'shared') {
    accessFilter = sharedCondition;
  } else {
    accessFilter = {
      $or: [createdCondition, assignedCondition, sharedCondition]
    };
  }

  const conditions = [accessFilter];

  if (status) {
    conditions.push({ status });
  }
  if (priority) {
    conditions.push({ priority });
  }
  if (assigneeId) {
    conditions.push({
      $or: [{ assigneeIds: assigneeId }, { primaryAssigneeId: assigneeId }]
    });
  }

  const tasks = await Task.find({ $and: conditions });

  // Tính quyền cho từng công việc (đã có sẵn danh sách chia sẻ nên không tốn thêm truy vấn)
  const shareByTask = new Map(shares.map((s) => [String(s.taskId), s]));

  let items = tasks.map((task) => ({
    task,
    access: computeAccess(task, userId, shareByTask.get(String(task._id)))
  }));

  // Tìm theo tên: so sánh dạng không dấu, chữ thường, khớp một phần
  if (q) {
    const keyword = normalizeText(q);
    items = items.filter(({ task }) => normalizeText(task.title).includes(keyword));
  }

  items.sort((a, b) => compareItems(a, b, sortBy, order));

  return items;
}

module.exports = { computeAccess, loadTaskAccess, findAccessibleTasks };