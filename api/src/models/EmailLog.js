const mongoose = require('mongoose');

const EMAIL_STATUSES = ['pending', 'sent', 'failed'];

// Các sự kiện kích hoạt gửi email
const EMAIL_EVENT_TYPES = [
  'task_assigned',
  'task_shared',
  'task_due_changed',
  'task_completed',
  'task_due_soon'
];

// Mỗi email được thử gửi tối đa bấy nhiêu lần (gồm cả lần gửi đầu tiên)
const MAX_ATTEMPTS = 3;

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
    },
    // Thời điểm của lần thử gần nhất
    lastAttemptAt: {
      type: Date,
      default: null
    },
    // Người thực hiện thao tác (để dựng lại nội dung email khi gửi lại)
    actorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    // Quyền chia sẻ (chỉ dùng cho email chia sẻ)
    permission: {
      type: String,
      default: ''
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
module.exports.MAX_ATTEMPTS = MAX_ATTEMPTS;