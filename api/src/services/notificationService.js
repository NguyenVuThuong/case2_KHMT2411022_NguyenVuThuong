const Notification = require('../models/Notification');
const TaskShare = require('../models/TaskShare');

const STATUS_LABELS = {
  todo: 'Chưa thực hiện',
  in_progress: 'Đang thực hiện',
  completed: 'Đã hoàn thành'
};

const PERMISSION_LABELS = {
  viewer: 'chỉ xem',
  editor: 'chỉnh sửa'
};

// Lưu thông báo. Lỗi ở đây KHÔNG được làm hỏng thao tác chính
// (giao việc, chia sẻ, ... vẫn thành công), chỉ ghi log để mình đọc.
async function createNotifications(items) {
  if (items.length === 0) {
    return;
  }
  try {
    await Notification.insertMany(items);
  } catch (error) {
    console.error('Không tạo được thông báo:', error.message);
  }
}

// Tạo danh sách thông báo: bỏ trùng người nhận và bỏ người thực hiện thao tác
function buildItems(userIds, actorId, data) {
  const unique = [...new Set(userIds.map(String))].filter(
    (id) => id !== String(actorId)
  );
  return unique.map((userId) => ({ userId, ...data }));
}

// Mọi người liên quan đến công việc: người tạo, người được giao, người được chia sẻ
async function getParticipantIds(task) {
  const shares = await TaskShare.find({ taskId: task._id }).select('userId');
  return [
    task.createdBy,
    ...task.assigneeIds,
    task.primaryAssigneeId,
    ...shares.map((s) => s.userId)
  ].filter(Boolean); // bỏ giá trị null (chưa có người phụ trách chính)
}

// Báo cho tất cả người liên quan (trừ người thao tác)
async function notifyParticipants(task, actor, data) {
  try {
    const participantIds = await getParticipantIds(task);
    const items = buildItems(participantIds, actor._id, {
      taskId: task._id,
      ...data
    });
    await createNotifications(items);
  } catch (error) {
    console.error('Không tạo được thông báo:', error.message);
  }
}

// Giao việc mới
async function notifyTaskAssigned(task, actor, userIds) {
  const items = buildItems(userIds, actor._id, {
    taskId: task._id,
    type: 'task_assigned',
    title: 'Bạn được giao công việc mới',
    message: `${actor.fullName} đã giao cho bạn công việc "${task.title}"`
  });
  await createNotifications(items);
}

// Chia sẻ công việc
async function notifyTaskShared(task, actor, userIds, permission) {
  const items = buildItems(userIds, actor._id, {
    taskId: task._id,
    type: 'task_shared',
    title: 'Có công việc được chia sẻ cho bạn',
    message:
      `${actor.fullName} đã chia sẻ công việc "${task.title}" cho bạn ` +
      `(quyền ${PERMISSION_LABELS[permission] || permission})`
  });
  await createNotifications(items);
}

// Đổi trạng thái (hoàn thành có loại thông báo riêng)
async function notifyTaskStatusChanged(task, actor, oldStatus) {
  if (task.status === 'completed') {
    await notifyParticipants(task, actor, {
      type: 'task_completed',
      title: 'Công việc đã hoàn thành',
      message: `${actor.fullName} đã đánh dấu hoàn thành công việc "${task.title}"`
    });
    return;
  }

  await notifyParticipants(task, actor, {
    type: 'task_status_changed',
    title: 'Trạng thái công việc thay đổi',
    message:
      `${actor.fullName} đã đổi trạng thái công việc "${task.title}" ` +
      `từ "${STATUS_LABELS[oldStatus] || oldStatus}" ` +
      `sang "${STATUS_LABELS[task.status] || task.status}"`
  });
}

// Đổi hạn hoàn thành
async function notifyTaskDueChanged(task, actor) {
  await notifyParticipants(task, actor, {
    type: 'task_due_changed',
    title: 'Hạn hoàn thành thay đổi',
    message: `${actor.fullName} đã thay đổi hạn hoàn thành của công việc "${task.title}"`
  });
}

module.exports = {
  notifyTaskAssigned,
  notifyTaskShared,
  notifyTaskStatusChanged,
  notifyTaskDueChanged
};