const express = require('express');
const {
  getTaskStatistics,
  getAssignmentStatistics,
  getDeadlineStatistics
} = require('../controllers/statisticsController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// Mọi API thống kê đều yêu cầu đăng nhập
router.use(protect);

router.get('/tasks', getTaskStatistics);
router.get('/assignments', getAssignmentStatistics);
router.get('/deadlines', getDeadlineStatistics);

module.exports = router;