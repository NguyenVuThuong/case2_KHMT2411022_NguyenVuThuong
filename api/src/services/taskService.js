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

// Lấy các công việc người dùng có thể truy cập, theo phạm vi:
//   created:  do mình tạo
//   assigned: được giao cho mình
//   shared:   được chia sẻ cho mình
//   all:      tất cả những loại trên
async function findAccessibleTasks(userId, scope) {
  const shares = await TaskShare.find({ userId });
  const sharedTaskIds = shares.map((s) => s.taskId);

  const createdCondition = { createdBy: userId };
  const assignedCondition = {
    $or: [{ assigneeIds: userId }, { primaryAssigneeId: userId }]
  };
  const sharedCondition = { _id: { $in: sharedTaskIds } };

  let filter;
  if (scope === 'created') {
    filter = createdCondition;
  } else if (scope === 'assigned') {
    filter = assignedCondition;
  } else if (scope === 'shared') {
    filter = sharedCondition;
  } else {
    filter = { $or: [createdCondition, assignedCondition, sharedCondition] };
  }

  const tasks = await Task.find(filter).sort({ createdAt: -1 });

  // Tính quyền cho từng công việc (đã có sẵn danh sách chia sẻ nên không tốn thêm truy vấn)
  const shareByTask = new Map(shares.map((s) => [String(s.taskId), s]));

  return tasks.map((task) => ({
    task,
    access: computeAccess(task, userId, shareByTask.get(String(task._id)))
  }));
}

module.exports = { computeAccess, loadTaskAccess, findAccessibleTasks };