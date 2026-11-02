const express = require('express');
const {
  listAssignees,
  addAssignees,
  updateAssignee,
  removeAssignee
} = require('../controllers/assignmentController');
const {
  validateAssign,
  validateUserIdParam,
  validateAssigneeUpdate
} = require('../validators/assignmentValidator');
const { validateTaskId } = require('../validators/taskValidator');
const { protect } = require('../middleware/authMiddleware');
const { requireTaskAccess } = require('../middleware/permissionMiddleware');

// mergeParams: để đọc được :id từ đường dẫn cha (/api/tasks/:id/assignees)
const router = express.Router({ mergeParams: true });

router.use(protect);

// Ai xem được công việc thì xem được danh sách người được giao
router.get('/', validateTaskId, requireTaskAccess('view'), listAssignees);

// Giao việc, đổi người phụ trách chính, hủy giao: cần quyền 'manage' (chỉ người tạo)
router.post(
  '/',
  validateTaskId,
  requireTaskAccess('manage'),
  validateAssign,
  addAssignees
);

router.patch(
  '/:userId',
  validateTaskId,
  validateUserIdParam,
  requireTaskAccess('manage'),
  validateAssigneeUpdate,
  updateAssignee
);

router.delete(
  '/:userId',
  validateTaskId,
  validateUserIdParam,
  requireTaskAccess('manage'),
  removeAssignee
);

module.exports = router;