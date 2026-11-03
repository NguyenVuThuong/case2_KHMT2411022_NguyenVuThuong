const User = require('../models/User');
const TaskShare = require('../models/TaskShare');
const { notifyTaskShared } = require('../services/notificationService');

// Chuẩn hóa một bản ghi chia sẻ (đã populate thông tin người được chia sẻ)
function toShareResponse(share) {
  const user = share.userId;
  return {
    id: share._id,
    permission: share.permission,
    sharedBy: share.sharedBy,
    createdAt: share.createdAt,
    user: {
      id: user._id,
      fullName: user.fullName,
      email: user.email,
      avatarUrl: user.avatarUrl
    }
  };
}

// Lấy danh sách chia sẻ của một công việc, kèm thông tin từng người
async function buildShareList(taskId) {
  const shares = await TaskShare.find({ taskId })
    .populate('userId', 'fullName email avatarUrl')
    .sort({ createdAt: 1 });

  // Bỏ qua bản ghi mà tài khoản đã không còn tồn tại
  return shares.filter((s) => s.userId).map(toShareResponse);
}

// GET /api/tasks/:id/shares
async function listShares(req, res) {
  const shares = await buildShareList(req.task._id);

  res.json({
    status: 'success',
    data: { count: shares.length, shares }
  });
}

// POST /api/tasks/:id/shares
async function addShares(req, res) {
  const task = req.task;
  const { emails = [], userIds = [], permission = 'viewer' } = req.body;

  // Chuẩn hóa và bỏ trùng
  const normalizedEmails = [...new Set(emails.map((e) => e.trim().toLowerCase()))];
  const uniqueIds = [...new Set(userIds.map((id) => id.toLowerCase()))];

  // Tìm các tài khoản theo email hoặc mã
  const users = await User.find({
    $or: [{ email: { $in: normalizedEmails } }, { _id: { $in: uniqueIds } }]
  }).select('fullName email avatarUrl');

  // Có email hoặc mã nào không tồn tại thì từ chối cả yêu cầu
  const foundEmails = new Set(users.map((u) => u.email));
  const foundIds = new Set(users.map((u) => String(u._id)));
  const missing = [
    ...normalizedEmails.filter((e) => !foundEmails.has(e)),
    ...uniqueIds.filter((id) => !foundIds.has(id))
  ];

  if (missing.length > 0) {
    return res.status(404).json({
      status: 'error',
      message: 'Không tìm thấy một số tài khoản',
      errors: missing.map((m) => `Không tìm thấy tài khoản: ${m}`)
    });
  }

  // Người tạo đã có toàn quyền nên không cần (và không được) chia sẻ cho chính họ
  if (users.some((u) => String(u._id) === String(task.createdBy))) {
    return res.status(400).json({
      status: 'error',
      message: 'Dữ liệu không hợp lệ',
      errors: ['Không thể chia sẻ công việc cho chính người tạo']
    });
  }

  // Bỏ qua những người đã được chia sẻ trước đó
  const existing = await TaskShare.find({
    taskId: task._id,
    userId: { $in: users.map((u) => u._id) }
  });
  const existingIds = new Set(existing.map((s) => String(s.userId)));
  const newUsers = users.filter((u) => !existingIds.has(String(u._id)));

  if (newUsers.length > 0) {
    try {
      await TaskShare.insertMany(
        newUsers.map((u) => ({
          taskId: task._id,
          userId: u._id,
          permission,
          // Người cấp quyền lấy từ token, KHÔNG lấy từ body
          sharedBy: req.user._id
        }))
      );
    } catch (error) {
      // Mã 11000 = vi phạm unique index (hai yêu cầu chia sẻ cùng lúc)
      if (error.code === 11000) {
        return res.status(409).json({
          status: 'error',
          message: 'Một số người vừa được chia sẻ, vui lòng thử lại'
        });
      }
      throw error;
    }

    // Báo cho những người MỚI được chia sẻ
    await notifyTaskShared(
      task,
      req.user,
      newUsers.map((u) => u._id),
      permission
    );
  }

  const shares = await buildShareList(task._id);

  res.json({
    status: 'success',
    message: 'Chia sẻ công việc thành công',
    data: {
      added: newUsers.length,
      alreadyShared: users.length - newUsers.length,
      shares
    }
  });
}

// PATCH /api/tasks/:id/shares/:shareId  (đổi quyền viewer/editor)
async function updateShare(req, res) {
  // Điều kiện taskId bảo đảm bản ghi chia sẻ thuộc đúng công việc này
  const share = await TaskShare.findOne({
    _id: req.params.shareId,
    taskId: req.task._id
  });

  if (!share) {
    return res.status(404).json({
      status: 'error',
      message: 'Không tìm thấy bản ghi chia sẻ'
    });
  }

  share.permission = req.body.permission;
  await share.save();

  const shares = await buildShareList(req.task._id);

  res.json({
    status: 'success',
    message: 'Đã đổi quyền chia sẻ',
    data: { shares }
  });
}

// DELETE /api/tasks/:id/shares/:shareId  (thu hồi quyền chia sẻ)
async function removeShare(req, res) {
  const share = await TaskShare.findOne({
    _id: req.params.shareId,
    taskId: req.task._id
  });

  if (!share) {
    return res.status(404).json({
      status: 'error',
      message: 'Không tìm thấy bản ghi chia sẻ'
    });
  }

  await share.deleteOne();

  const shares = await buildShareList(req.task._id);

  res.json({
    status: 'success',
    message: 'Đã thu hồi quyền chia sẻ',
    data: { shares }
  });
}

module.exports = { listShares, addShares, updateShare, removeShare };