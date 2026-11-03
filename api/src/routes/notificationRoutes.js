const express = require('express');
const {
  listNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead
} = require('../controllers/notificationController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// Kiểm tra :id trên đường dẫn có đúng dạng ObjectId (24 ký tự hex) không
function validateNotificationId(req, res, next) {
  if (!/^[0-9a-fA-F]{24}$/.test(req.params.id)) {
    return res.status(400).json({
      status: 'error',
      message: 'Mã thông báo không hợp lệ'
    });
  }
  next();
}

// Mọi API thông báo đều yêu cầu đăng nhập
router.use(protect);

router.get('/', listNotifications);
router.get('/unread-count', getUnreadCount);
router.patch('/read-all', markAllAsRead);
router.patch('/:id/read', validateNotificationId, markAsRead);

module.exports = router;