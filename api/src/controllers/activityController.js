const TaskActivity = require('../models/TaskActivity');
const { buildSummary } = require('../services/activityService');

// Chuẩn hóa một hoạt động trả về cho client (userId đã được populate)
function toActivityResponse(activity) {
  const user = activity.userId;
  const actorName = user ? user.fullName : 'Một người dùng đã xóa tài khoản';

  return {
    id: activity._id,
    action: activity.action,
    summary: buildSummary(activity, actorName),
    details: activity.details || {},
    createdAt: activity.createdAt,
    user: user
      ? {
          id: user._id,
          fullName: user.fullName,
          email: user.email,
          avatarUrl: user.avatarUrl
        }
      : null
  };
}

// GET /api/tasks/:id/activities?limit=50  (middleware đã kiểm tra quyền xem)
async function listActivities(req, res) {
  // limit mặc định 50, tối đa 100
  let limit = parseInt(String(req.query.limit), 10);
  if (Number.isNaN(limit) || limit < 1) {
    limit = 50;
  }
  limit = Math.min(limit, 100);

  const activities = await TaskActivity.find({ taskId: req.task._id })
    .sort({ createdAt: -1, _id: -1 }) // mới nhất lên đầu
    .limit(limit)
    .populate('userId', 'fullName email avatarUrl');

  res.json({
    status: 'success',
    data: {
      count: activities.length,
      activities: activities.map(toActivityResponse)
    }
  });
}

module.exports = { listActivities };