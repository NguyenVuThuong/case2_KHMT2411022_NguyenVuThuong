const mongoose = require('mongoose');

// Các loại hành động được ghi lại
const ACTIVITY_ACTIONS = [
  'created',
  'updated',
  'status_changed',
  'assigned',
  'unassigned',
  'primary_assignee_changed',
  'shared',
  'share_permission_changed',
  'share_revoked'
];

const taskActivitySchema = new mongoose.Schema(
  {
    taskId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Task',
      required: true
    },
    // Người thực hiện
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    action: {
      type: String,
      enum: ACTIVITY_ACTIONS,
      required: true
    },
    // Chi tiết thay đổi (cấu trúc khác nhau tùy hành động)
    details: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    }
  },
  {
    // Tài liệu chỉ có createdAt (thời điểm thực hiện)
    timestamps: { createdAt: true, updatedAt: false },
    // Đúng tên collection như tài liệu
    collection: 'task_activities'
  }
);

// Truy vấn thường dùng: lịch sử của một công việc, mới nhất trước
taskActivitySchema.index({ taskId: 1, createdAt: -1 });

const TaskActivity = mongoose.model('TaskActivity', taskActivitySchema);

module.exports = TaskActivity;
module.exports.ACTIVITY_ACTIONS = ACTIVITY_ACTIONS;