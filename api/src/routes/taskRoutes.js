const express = require('express');
const {
  createTask,
  getTasks,
  getTask,
  updateTask,
  updateTaskStatus,
  deleteTask
} = require('../controllers/taskController');
const {
  validateCreateTask,
  validateUpdateTask,
  validateStatus,
  validateTaskId
} = require('../validators/taskValidator');
const { protect } = require('../middleware/authMiddleware');
const { requireTaskAccess } = require('../middleware/permissionMiddleware');

const router = express.Router();

// Mọi API công việc đều yêu cầu đăng nhập
router.use(protect);

// GET /api/tasks và POST /api/tasks
router.get('/', getTasks);
router.post('/', validateCreateTask, createTask);

// Các route theo :id. Thứ tự: kiểm tra id, kiểm tra quyền, kiểm tra dữ liệu, xử lý
router.get('/:id', validateTaskId, requireTaskAccess('view'), getTask);

router.put(
  '/:id',
  validateTaskId,
  requireTaskAccess('editContent'),
  validateUpdateTask,
  updateTask
);

router.patch(
  '/:id/status',
  validateTaskId,
  requireTaskAccess('changeStatus'),
  validateStatus,
  updateTaskStatus
);

router.delete('/:id', validateTaskId, requireTaskAccess('delete'), deleteTask);

module.exports = router;