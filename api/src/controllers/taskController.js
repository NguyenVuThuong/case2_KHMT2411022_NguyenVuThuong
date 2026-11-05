const Task = require('../models/Task');
const TaskShare = require('../models/TaskShare');
const Notification = require('../models/Notification');
const { parseOptionalDate } = require('../validators/taskValidator');
const { computeAccess, findAccessibleTasks } = require('../services/taskService');
const {
  notifyTaskStatusChanged,
  notifyTaskDueChanged
} = require('../services/notificationService');

// Các phạm vi lọc cho GET /api/tasks
const SCOPES = ['all', 'created', 'assigned', 'shared'];

// Chuẩn hóa dữ liệu công việc trả về cho client.
// Thêm myRole và permissions để Flutter biết nên hiện nút nào
// (backend vẫn là nơi kiểm tra quyền thật sự).
function toTaskResponse(task, access) {
  return {
    id: task._id,
    title: task.title,
    description: task.description,
    createdBy: task.createdBy,
    assigneeIds: task.assigneeIds,
    primaryAssigneeId: task.primaryAssigneeId,
    startDate: task.startDate,
    dueDate: task.dueDate,
    priority: task.priority,
    status: task.status,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
    myRole: access ? access.role : null,
    permissions: access ? access.capabilities : []
  };
}

// POST /api/tasks
async function createTask(req, res) {
  const { title, description, startDate, dueDate, priority, status } = req.body;

  const task = await Task.create({
    title: title.trim(),
    description: description ? description.trim() : '',
    // Người tạo lấy từ token đã xác thực, KHÔNG lấy từ body
    createdBy: req.user._id,
    startDate: parseOptionalDate(startDate),
    dueDate: parseOptionalDate(dueDate),
    // Nếu client không gửi thì dùng giá trị mặc định của model
    priority,
    status
  });

  res.status(201).json({
    status: 'success',
    message: 'Tạo công việc thành công',
    data: { task: toTaskResponse(task, computeAccess(task, req.user._id, null)) }
  });
}

// GET /api/tasks?scope=all|created|assigned|shared
async function getTasks(req, res) {
  const scope = req.query.scope === undefined ? 'all' : req.query.scope;

  if (typeof scope !== 'string' || !SCOPES.includes(scope)) {
    return res.status(400).json({
      status: 'error',
      message: 'Phạm vi không hợp lệ',
      errors: [`scope phải là một trong: ${SCOPES.join(', ')}`]
    });
  }

  const items = await findAccessibleTasks(req.user._id, scope);

  res.json({
    status: 'success',
    data: {
      count: items.length,
      tasks: items.map(({ task, access }) => toTaskResponse(task, access))
    }
  });
}

// GET /api/tasks/:id  (middleware đã kiểm tra quyền và gắn req.task, req.access)
async function getTask(req, res) {
  res.json({
    status: 'success',
    data: { task: toTaskResponse(req.task, req.access) }
  });
}

// PUT /api/tasks/:id
async function updateTask(req, res) {
  const task = req.task;

  // Ghi nhớ hạn cũ để biết sau khi sửa hạn có thay đổi thật không
  const oldDueTime = task.dueDate ? task.dueDate.getTime() : null;

  // Chỉ cập nhật những trường được phép và có gửi lên.
  // Mọi trường khác (createdBy, status, ...) trong body đều bị bỏ qua.
  const body = req.body;
  if (body.title !== undefined) {
    task.title = body.title.trim();
  }
  if (body.description !== undefined) {
    task.description = body.description.trim();
  }
  if (body.priority !== undefined) {
    task.priority = body.priority;
  }
  if (body.startDate !== undefined) {
    task.startDate = parseOptionalDate(body.startDate);
  }
  if (body.dueDate !== undefined) {
    task.dueDate = parseOptionalDate(body.dueDate);
  }

  // Kiểm tra lại sau khi gộp với dữ liệu cũ (ví dụ chỉ gửi dueDate mới)
  if (task.startDate && task.dueDate && task.dueDate < task.startDate) {
    return res.status(400).json({
      status: 'error',
      message: 'Dữ liệu không hợp lệ',
      errors: ['Hạn hoàn thành không được trước ngày bắt đầu']
    });
  }

  await task.save();

  // Chỉ báo khi hạn hoàn thành thật sự thay đổi
  const newDueTime = task.dueDate ? task.dueDate.getTime() : null;
  if (oldDueTime !== newDueTime) {
    await notifyTaskDueChanged(task, req.user);
  }

  res.json({
    status: 'success',
    message: 'Cập nhật công việc thành công',
    data: { task: toTaskResponse(task, req.access) }
  });
}

// PATCH /api/tasks/:id/status
async function updateTaskStatus(req, res) {
  const task = req.task;

  const oldStatus = task.status;
  task.status = req.body.status;
  await task.save();

  // Chỉ báo khi trạng thái thật sự thay đổi
  if (oldStatus !== task.status) {
    await notifyTaskStatusChanged(task, req.user, oldStatus);
  }

  res.json({
    status: 'success',
    message: 'Cập nhật trạng thái thành công',
    data: { task: toTaskResponse(task, req.access) }
  });
}

// DELETE /api/tasks/:id
async function deleteTask(req, res) {
  const task = req.task;

  // Xóa luôn dữ liệu liên quan để không còn bản ghi mồ côi
  await TaskShare.deleteMany({ taskId: task._id });
  await Notification.deleteMany({ taskId: task._id });
  await task.deleteOne();

  res.json({
    status: 'success',
    message: 'Xóa công việc thành công'
  });
}

module.exports = {
  createTask,
  getTasks,
  getTask,
  updateTask,
  updateTaskStatus,
  deleteTask,
  toTaskResponse
};