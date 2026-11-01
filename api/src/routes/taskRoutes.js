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

const router = express.Router();

// Mọi API công việc đều yêu cầu đăng nhập
router.use(protect);

// GET /api/tasks và POST /api/tasks
router.get('/', getTasks);
router.post('/', validateCreateTask, createTask);

// Các route theo :id (luôn kiểm tra :id hợp lệ trước)
router.get('/:id', validateTaskId, getTask);
router.put('/:id', validateTaskId, validateUpdateTask, updateTask);
router.patch('/:id/status', validateTaskId, validateStatus, updateTaskStatus);
router.delete('/:id', validateTaskId, deleteTask);

module.exports = router;