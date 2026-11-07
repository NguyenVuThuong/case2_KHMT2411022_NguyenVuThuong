const {
  loadTasksForUser,
  buildTaskStats,
  buildAssignmentStats,
  buildDeadlineStats
} = require('../services/statisticsService');

const DEFAULT_DAYS = 7;
const MAX_DAYS = 30;

// Đọc tham số days: trả về số nguyên từ 1 đến 30, hoặc null nếu không hợp lệ.
// Không gửi hoặc gửi chuỗi rỗng thì dùng mặc định.
function parseDays(raw) {
  if (raw === undefined) {
    return DEFAULT_DAYS;
  }
  if (typeof raw !== 'string') {
    return null; // gửi nhiều lần (?days=1&days=2) sẽ ra mảng
  }
  const text = raw.trim();
  if (text === '') {
    return DEFAULT_DAYS;
  }
  if (!/^\d{1,2}$/.test(text)) {
    return null;
  }
  const value = Number(text);
  return value >= 1 && value <= MAX_DAYS ? value : null;
}

// GET /api/statistics/tasks
async function getTaskStatistics(req, res) {
  const tasks = await loadTasksForUser(req.user._id);

  res.json({
    status: 'success',
    data: buildTaskStats(tasks)
  });
}

// GET /api/statistics/assignments
async function getAssignmentStatistics(req, res) {
  const tasks = await loadTasksForUser(req.user._id);

  res.json({
    status: 'success',
    data: buildAssignmentStats(tasks, req.user._id)
  });
}

// GET /api/statistics/deadlines?days=7
async function getDeadlineStatistics(req, res) {
  const days = parseDays(req.query.days);
  if (days === null) {
    return res.status(400).json({
      status: 'error',
      message: 'Tham số không hợp lệ',
      errors: [`days phải là số nguyên từ 1 đến ${MAX_DAYS}`]
    });
  }

  const tasks = await loadTasksForUser(req.user._id);

  res.json({
    status: 'success',
    data: buildDeadlineStats(tasks, days)
  });
}

module.exports = {
  getTaskStatistics,
  getAssignmentStatistics,
  getDeadlineStatistics
};