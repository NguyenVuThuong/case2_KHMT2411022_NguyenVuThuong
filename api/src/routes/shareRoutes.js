const express = require('express');
const {
  listShares,
  addShares,
  updateShare,
  removeShare
} = require('../controllers/shareController');
const {
  validateShare,
  validateSharePermission,
  validateShareIdParam
} = require('../validators/shareValidator');
const { validateTaskId } = require('../validators/taskValidator');
const { protect } = require('../middleware/authMiddleware');
const { requireTaskAccess } = require('../middleware/permissionMiddleware');

// mergeParams: để đọc được :id từ đường dẫn cha (/api/tasks/:id/shares)
const router = express.Router({ mergeParams: true });

router.use(protect);

// Ai xem được công việc thì xem được danh sách chia sẻ
router.get('/', validateTaskId, requireTaskAccess('view'), listShares);

// Chia sẻ, đổi quyền, thu hồi: cần quyền 'manage' (chỉ người tạo)
// Editor KHÔNG có quyền này, đúng yêu cầu của đề
router.post(
  '/',
  validateTaskId,
  requireTaskAccess('manage'),
  validateShare,
  addShares
);

router.patch(
  '/:shareId',
  validateTaskId,
  validateShareIdParam,
  requireTaskAccess('manage'),
  validateSharePermission,
  updateShare
);

router.delete(
  '/:shareId',
  validateTaskId,
  validateShareIdParam,
  requireTaskAccess('manage'),
  removeShare
);

module.exports = router;