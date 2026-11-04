const express = require('express');
const { listTaskEmailLogs } = require('../controllers/emailLogController');
const { validateTaskId } = require('../validators/taskValidator');
const { protect } = require('../middleware/authMiddleware');
const { requireTaskAccess } = require('../middleware/permissionMiddleware');

// mergeParams: để đọc được :id từ đường dẫn cha (/api/tasks/:id/email-logs)
const router = express.Router({ mergeParams: true });

router.use(protect);

// Chỉ người có quyền 'manage' (người tạo) mới xem được lịch sử email,
// vì danh sách này chứa địa chỉ email của nhiều người
router.get('/', validateTaskId, requireTaskAccess('manage'), listTaskEmailLogs);

module.exports = router;