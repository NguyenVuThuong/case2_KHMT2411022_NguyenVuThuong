const Task = require('../models/Task');
const { parseOptionalDate } = require('../validators/taskValidator');

// Chuẩn hóa dữ liệu công việc trả về cho client
function toTaskResponse(task) {
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
    updatedAt: task.updatedAt
  };
}

// Tìm công việc theo :id trên URL, chỉ khi do người dùng hiện tại tạo.
// Giai đoạn 5 sẽ thay hàm này bằng kiểm tra quyền đầy đủ.
function findOwnTask(req) {
  return Task.findOne({ _id: req.params.id, createdBy: req.user._id });
}

// Không có công việc, hoặc công việc của người khác: cùng một thông báo 404,
// để không tiết lộ công việc đó có tồn tại hay không
function sendTaskNotFound(res) {
  return res.status(404).json({
    status: 'error',
    message: 'Không tìm thấy công việc'
  });
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
    data: { task: toTaskResponse(task) }
  });
}

// GET /api/tasks
async function getTasks(req, res) {
  // Giai đoạn 4: chỉ trả công việc do chính người dùng tạo.
  // Giai đoạn 5 sẽ mở rộng thêm công việc được giao và được chia sẻ.
  const tasks = await Task.find({ createdBy: req.user._id }).sort({
    createdAt: -1 // mới nhất lên đầu
  });

  res.json({
    status: 'success',
    data: {
      count: tasks.length,
      tasks: tasks.map(toTaskResponse)
    }
  });
}

// GET /api/tasks/:id
async function getTask(req, res) {
  const task = await findOwnTask(req);
  if (!task) {
    return sendTaskNotFound(res);
  }

  res.json({
    status: 'success',
    data: { task: toTaskResponse(task) }
  });
}

// PUT /api/tasks/:id
async function updateTask(req, res) {
  const task = await findOwnTask(req);
  if (!task) {
    return sendTaskNotFound(res);
  }

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

  res.json({
    status: 'success',
    message: 'Cập nhật công việc thành công',
    data: { task: toTaskResponse(task) }
  });
}

// PATCH /api/tasks/:id/status
async function updateTaskStatus(req, res) {
  const task = await findOwnTask(req);
  if (!task) {
    return sendTaskNotFound(res);
  }

  task.status = req.body.status;
  await task.save();

  res.json({
    status: 'success',
    message: 'Cập nhật trạng thái thành công',
    data: { task: toTaskResponse(task) }
  });
}

// DELETE /api/tasks/:id
async function deleteTask(req, res) {
  const task = await findOwnTask(req);
  if (!task) {
    return sendTaskNotFound(res);
  }

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