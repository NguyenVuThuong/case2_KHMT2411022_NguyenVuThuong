const { loadTaskAccess } = require('../services/taskService');

// Tạo middleware yêu cầu người dùng có quyền `capability` trên công việc :id.
// Qua được thì gắn req.task và req.access để controller dùng.
function requireTaskAccess(capability) {
  return async function checkTaskAccess(req, res, next) {
    const result = await loadTaskAccess(req.params.id, req.user._id);

    // Không có công việc, hoặc không liên quan gì: cùng một thông báo 404
    // để không tiết lộ công việc đó có tồn tại hay không
    if (!result) {
      return res.status(404).json({
        status: 'error',
        message: 'Không tìm thấy công việc'
      });
    }

    // Có thấy công việc nhưng thiếu quyền thực hiện thao tác này
    if (!result.access.capabilities.includes(capability)) {
      return res.status(403).json({
        status: 'error',
        message: 'Bạn không có quyền thực hiện thao tác này'
      });
    }

    req.task = result.task;
    req.access = result.access;
    next();
  };
}

module.exports = { requireTaskAccess };