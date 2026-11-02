const mongoose = require('mongoose');

// Hai mức quyền khi chia sẻ (theo tài liệu mục 4.3)
const SHARE_PERMISSIONS = ['viewer', 'editor'];

const taskShareSchema = new mongoose.Schema(
  {
    // Công việc được chia sẻ
    taskId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Task',
      required: true
    },
    // Người được chia sẻ
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true // tìm "các công việc được chia sẻ cho tôi" cho nhanh
    },
    permission: {
      type: String,
      enum: SHARE_PERMISSIONS,
      default: 'viewer'
    },
    // Người cấp quyền
    sharedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    }
  },
  {
    // Tài liệu chỉ có createdAt (thời điểm chia sẻ), không cần updatedAt
    timestamps: { createdAt: true, updatedAt: false }
  }
);

// Mỗi người chỉ có một bản ghi chia sẻ cho mỗi công việc
taskShareSchema.index({ taskId: 1, userId: 1 }, { unique: true });

const TaskShare = mongoose.model('TaskShare', taskShareSchema);

module.exports = TaskShare;
module.exports.SHARE_PERMISSIONS = SHARE_PERMISSIONS;