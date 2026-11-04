const mongoose = require('mongoose');

const EMAIL_STATUSES = ['pending', 'sent', 'failed'];

// Các sự kiện kích hoạt gửi email
const EMAIL_EVENT_TYPES = [
  'task_assigned',
  'task_shared',
  'task_due_changed',
  'task_completed'
];

const emailLogSchema = new mongoose.Schema(
  {
    // Công việc liên quan (có thể rỗng theo tài liệu)
    taskId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Task',
      default: null
    },
    recipientEmail: {
      type: String,
      required: true,
      lowercase: true,
      trim: true
    },
    eventType: {
      type: String,
      enum: EMAIL_EVENT_TYPES,
      required: true
    },
    subject: {
      type: String,
      required: true,
      maxlength: 300
    },
    status: {
      type: String,
      enum: EMAIL_STATUSES,
      default: 'pending'
    },
    // Số lần đã thử gửi
    attempts: {
      type: Number,
      default: 0
    },
    errorMessage: {
      type: String,
      default: ''
    },
    // Thời điểm gửi thành công
    sentAt: {
      type: Date,
      default: null
    }
  },
  {
    // Tài liệu chỉ có createdAt (thời điểm tạo yêu cầu gửi)
    timestamps: { createdAt: true, updatedAt: false },
    // Đúng tên collection như tài liệu
    collection: 'email_logs'
  }
);

// Truy vấn thường dùng: lịch sử email của một công việc, mới nhất trước
emailLogSchema.index({ taskId: 1, createdAt: -1 });

const EmailLog = mongoose.model('EmailLog', emailLogSchema);

module.exports = EmailLog;
module.exports.EMAIL_STATUSES = EMAIL_STATUSES;
module.exports.EMAIL_EVENT_TYPES = EMAIL_EVENT_TYPES;