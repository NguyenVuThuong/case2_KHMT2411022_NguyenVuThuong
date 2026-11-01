const mongoose = require('mongoose');

// Các giá trị hợp lệ (theo tài liệu mục 4.2)
const PRIORITIES = ['low', 'medium', 'high'];
const STATUSES = ['todo', 'in_progress', 'completed'];

const taskSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Tên công việc là bắt buộc'],
      trim: true,
      maxlength: 200
    },
    description: {
      type: String,
      default: '',
      trim: true,
      maxlength: 2000
    },
    // Người tạo công việc (tham chiếu đến collection users)
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true // tạo index để tìm công việc của một người nhanh hơn
    },
    // Danh sách người được giao (sẽ dùng ở Giai đoạn 5)
    assigneeIds: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
      default: []
    },
    // Người phụ trách chính (sẽ dùng ở Giai đoạn 5)
    primaryAssigneeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    startDate: {
      type: Date,
      default: null
    },
    dueDate: {
      type: Date,
      default: null
    },
    priority: {
      type: String,
      enum: PRIORITIES,
      default: 'medium'
    },
    status: {
      type: String,
      enum: STATUSES,
      default: 'todo'
    }
  },
  {
    // Mongoose tự thêm và cập nhật createdAt, updatedAt
    timestamps: true
  }
);

const Task = mongoose.model('Task', taskSchema);

module.exports = Task;
module.exports.PRIORITIES = PRIORITIES;
module.exports.STATUSES = STATUSES;