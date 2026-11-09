const User = require('../models/User');
const { notifyTaskAssigned } = require('../services/notificationService');
const {
  logActivity,
  snapshotOf,
  snapshotUser
} = require('../services/activityService');

function sameId(a, b) {
  return String(a) === String(b);
}

// Chuẩn hóa thông tin một người được giao
function toAssigneeResponse(user, task) {
  return {
    id: user._id,
    fullName: user.fullName,
    email: user.email,
    avatarUrl: user.avatarUrl,
    isPrimary: Boolean(
      task.primaryAssigneeId && sameId(task.primaryAssigneeId, user._id)
    )
  };
}

// Lấy danh sách người được giao, giữ đúng thứ tự trong task.assigneeIds
async function buildAssigneeList(task) {
  const users = await User.find({ _id: { $in: task.assigneeIds } }).select(
    'fullName email avatarUrl'
  );
  const byId = new Map(users.map((u) => [String(u._id), u]));

  return task.assigneeIds
    .map((id) => byId.get(String(id)))
    .filter(Boolean)
    .map((u) => toAssigneeResponse(u, task));
}

// GET /api/tasks/:id/assignees
async function listAssignees(req, res) {
  const assignees = await buildAssigneeList(req.task);

  res.json({
    status: 'success',
    data: { count: assignees.length, assignees }
  });
}

// POST /api/tasks/:id/assignees
async function addAssignees(req, res) {
  const task = req.task;
  const { emails = [], userIds = [], primaryUserId } = req.body;

  // Ghi nhớ người phụ trách chính hiện tại để biết sau đó có đổi không
  const oldPrimaryId = task.primaryAssigneeId ? String(task.primaryAssigneeId) : null;

  // Chuẩn hóa và bỏ trùng
  const normalizedEmails = [...new Set(emails.map((e) => e.trim().toLowerCase()))];
  const uniqueIds = [...new Set(userIds.map((id) => id.toLowerCase()))];

  // Tìm các tài khoản theo email hoặc mã
  const users = await User.find({
    $or: [{ email: { $in: normalizedEmails } }, { _id: { $in: uniqueIds } }]
  }).select('fullName email avatarUrl');

  // Có email hoặc mã nào không tồn tại thì từ chối cả yêu cầu
  const foundEmails = new Set(users.map((u) => u.email));
  const foundIds = new Set(users.map((u) => String(u._id)));
  const missing = [
    ...normalizedEmails.filter((e) => !foundEmails.has(e)),
    ...uniqueIds.filter((id) => !foundIds.has(id))
  ];

  if (missing.length > 0) {
    return res.status(404).json({
      status: 'error',
      message: 'Không tìm thấy một số tài khoản',
      errors: missing.map((m) => `Không tìm thấy tài khoản: ${m}`)
    });
  }

  // Chỉ thêm những người chưa được giao
  const alreadyAssigned = new Set(task.assigneeIds.map(String));
  const newUsers = users.filter((u) => !alreadyAssigned.has(String(u._id)));
  newUsers.forEach((u) => task.assigneeIds.push(u._id));

  // Xác định người phụ trách chính
  if (primaryUserId !== undefined) {
    const inList = task.assigneeIds.some((id) => sameId(id, primaryUserId));
    if (!inList) {
      return res.status(400).json({
        status: 'error',
        message: 'Dữ liệu không hợp lệ',
        errors: ['Người phụ trách chính phải nằm trong danh sách được giao']
      });
    }
    task.primaryAssigneeId = primaryUserId;
  } else if (!task.primaryAssigneeId && task.assigneeIds.length > 0) {
    // Chưa có người phụ trách chính: lấy người đầu tiên trong danh sách
    task.primaryAssigneeId = task.assigneeIds[0];
  }

  await task.save();

  // Báo cho những người MỚI được giao (người đã được giao trước đó không bị báo lại)
  await notifyTaskAssigned(
    task,
    req.user,
    newUsers.map((u) => u._id)
  );

  // Ghi lịch sử
  if (newUsers.length > 0) {
    await logActivity(task._id, req.user, 'assigned', {
      users: newUsers.map(snapshotOf)
    });
  }
  if (
    primaryUserId !== undefined &&
    String(primaryUserId).toLowerCase() !== oldPrimaryId
  ) {
    await logActivity(task._id, req.user, 'primary_assignee_changed', {
      user: await snapshotUser(primaryUserId)
    });
  }

  const assignees = await buildAssigneeList(task);

  res.json({
    status: 'success',
    message: 'Giao việc thành công',
    data: {
      added: newUsers.length,
      alreadyAssigned: users.length - newUsers.length,
      assignees
    }
  });
}

// PATCH /api/tasks/:id/assignees/:userId  (đặt người phụ trách chính)
async function updateAssignee(req, res) {
  const task = req.task;
  const { userId } = req.params;

  const isAssigned = task.assigneeIds.some((id) => sameId(id, userId));
  if (!isAssigned) {
    return res.status(404).json({
      status: 'error',
      message: 'Người này chưa được giao công việc'
    });
  }

  const wasPrimary = Boolean(
    task.primaryAssigneeId && sameId(task.primaryAssigneeId, userId)
  );

  task.primaryAssigneeId = userId;
  await task.save();

  // Chỉ ghi lịch sử khi người phụ trách chính thật sự đổi
  if (!wasPrimary) {
    await logActivity(task._id, req.user, 'primary_assignee_changed', {
      user: await snapshotUser(userId)
    });
  }

  const assignees = await buildAssigneeList(task);

  res.json({
    status: 'success',
    message: 'Đã đặt người phụ trách chính',
    data: { assignees }
  });
}

// DELETE /api/tasks/:id/assignees/:userId
async function removeAssignee(req, res) {
  const task = req.task;
  const { userId } = req.params;

  const isAssigned = task.assigneeIds.some((id) => sameId(id, userId));
  if (!isAssigned) {
    return res.status(404).json({
      status: 'error',
      message: 'Người này chưa được giao công việc'
    });
  }

  const removedUser = await snapshotUser(userId);

  task.assigneeIds = task.assigneeIds.filter((id) => !sameId(id, userId));

  // Nếu vừa gỡ người phụ trách chính: người kế tiếp lên thay, hết người thì để trống
  if (task.primaryAssigneeId && sameId(task.primaryAssigneeId, userId)) {
    task.primaryAssigneeId =
      task.assigneeIds.length > 0 ? task.assigneeIds[0] : null;
  }

  await task.save();

  await logActivity(task._id, req.user, 'unassigned', { user: removedUser });

  const assignees = await buildAssigneeList(task);

  res.json({
    status: 'success',
    message: 'Đã hủy giao việc',
    data: { assignees }
  });
}

module.exports = {
  listAssignees,
  addAssignees,
  updateAssignee,
  removeAssignee
};