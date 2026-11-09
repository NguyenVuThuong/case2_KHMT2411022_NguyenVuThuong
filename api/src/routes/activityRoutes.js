const express = require('express');
const { listActivities } = require('../controllers/activityController');
const { validateTaskId } = require('../validators/taskValidator');
const { protect } = require('../middleware/authMiddleware');
const { requireTaskAccess } = require('../middleware/permissionMiddleware');

// mergeParams: để đọc được :id từ đường dẫn cha (/api/tasks/:id/activities)
const router = express.Router({ mergeParams: true });

router.use(protect);

// Ai xem được công việc thì xem được lịch sử hoạt động
router.get('/', validateTaskId, requireTaskAccess('view'), listActivities);

module.exports = router;