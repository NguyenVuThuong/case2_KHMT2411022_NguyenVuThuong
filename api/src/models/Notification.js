const mongoose = require('mongoose');

// Các loại sự kiện có thông báo
const NOTIFICATION_TYPES = [
  'task_assigned',
  'task_shared',
  'task_status_changed',
  'task_completed',
  'task_due_changed'
];

const notificationSchema = new mongoose.Schema(
  {
    // Người nhận thông báo
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    // Công việc liên quan (để mở công việc khi bấm vào thông báo)
    taskId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Task',
      default: null
    },
    type: {
      type: String,
      enum: NOTIFICATION_TYPES,
      required: true
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500
    },
    isRead: {
      type: Boolean,
      default: false
    }
  },
  {
    // Tài liệu chỉ có createdAt, không cần updatedAt
    timestamps: { createdAt: true, updatedAt: false }
  }
);

// Truy vấn thường dùng: thông báo của một người, mới nhất trước
notificationSchema.index({ userId: 1, createdAt: -1 });
// Đếm thông báo chưa đọc của một người
notificationSchema.index({ userId: 1, isRead: 1 });

const Notification = mongoose.model('Notification', notificationSchema);

module.exports = Notification;
module.exports.NOTIFICATION_TYPES = NOTIFICATION_TYPES;