const Notification = require('../models/Notification');

// Chuẩn hóa thông báo trả về cho client
function toNotificationResponse(notification) {
  return {
    id: notification._id,
    taskId: notification.taskId,
    type: notification.type,
    title: notification.title,
    message: notification.message,
    isRead: notification.isRead,
    createdAt: notification.createdAt
  };
}

// GET /api/notifications?unread=true&limit=50
async function listNotifications(req, res) {
  const filter = { userId: req.user._id };
  if (req.query.unread === 'true') {
    filter.isRead = false;
  }

  // limit mặc định 50, tối đa 100
  let limit = parseInt(String(req.query.limit), 10);
  if (Number.isNaN(limit) || limit < 1) {
    limit = 50;
  }
  limit = Math.min(limit, 100);

  const notifications = await Notification.find(filter)
    .sort({ createdAt: -1 }) // mới nhất lên đầu
    .limit(limit);

  const unreadCount = await Notification.countDocuments({
    userId: req.user._id,
    isRead: false
  });

  res.json({
    status: 'success',
    data: {
      count: notifications.length,
      unreadCount,
      notifications: notifications.map(toNotificationResponse)
    }
  });
}

// GET /api/notifications/unread-count
async function getUnreadCount(req, res) {
  const unreadCount = await Notification.countDocuments({
    userId: req.user._id,
    isRead: false
  });

  res.json({
    status: 'success',
    data: { unreadCount }
  });
}

// PATCH /api/notifications/:id/read
async function markAsRead(req, res) {
  // Điều kiện userId bảo đảm chỉ đánh dấu được thông báo của chính mình
  const notification = await Notification.findOneAndUpdate(
    { _id: req.params.id, userId: req.user._id },
    { isRead: true },
    { new: true }
  );

  if (!notification) {
    return res.status(404).json({
      status: 'error',
      message: 'Không tìm thấy thông báo'
    });
  }

  res.json({
    status: 'success',
    message: 'Đã đánh dấu đã đọc',
    data: { notification: toNotificationResponse(notification) }
  });
}

// PATCH /api/notifications/read-all
async function markAllAsRead(req, res) {
  const result = await Notification.updateMany(
    { userId: req.user._id, isRead: false },
    { isRead: true }
  );

  res.json({
    status: 'success',
    message: 'Đã đánh dấu tất cả là đã đọc',
    data: { updated: result.modifiedCount }
  });
}

module.exports = {
  listNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead
};