const { findAccessibleTasks } = require('./taskService');

const DAY_MS = 24 * 60 * 60 * 1000;

// Giờ Việt Nam là UTC+7 và không có giờ mùa hè
const UTC_OFFSET_MS = 7 * 60 * 60 * 1000;

// Mỗi nhóm hạn chỉ liệt kê tối đa bấy nhiêu công việc
const MAX_LISTED = 10;

function sameId(a, b) {
  return String(a) === String(b);
}

// Đếm số công việc theo từng trạng thái
function countByStatus(tasks) {
  const counts = { todo: 0, in_progress: 0, completed: 0 };
  tasks.forEach((task) => {
    if (counts[task.status] !== undefined) {
      counts[task.status] += 1;
    }
  });
  return counts;
}

// 0 giờ sáng hôm nay theo giờ Việt Nam, trả về dạng Date (UTC)
function startOfToday(now = new Date()) {
  const local = new Date(now.getTime() + UTC_OFFSET_MS);
  local.setUTCHours(0, 0, 0, 0);
  return new Date(local.getTime() - UTC_OFFSET_MS);
}

// Thống kê tổng số công việc theo trạng thái
function buildTaskStats(tasks) {
  const byStatus = countByStatus(tasks);
  const total = tasks.length;
  const completionRate =
    total === 0 ? 0 : Math.round((byStatus.completed / total) * 100);

  return { total, completionRate, byStatus };
}

// Một nhóm công việc: tổng, số chưa hoàn thành (active) và số theo trạng thái
function buildGroup(tasks) {
  const byStatus = countByStatus(tasks);
  return {
    total: tasks.length,
    active: tasks.length - byStatus.completed,
    byStatus
  };
}

// Thống kê việc được giao cho userId và việc userId là người phụ trách chính
function buildAssignmentStats(tasks, userId) {
  const assignedToMe = tasks.filter(
    (task) =>
      (task.assigneeIds || []).some((id) => sameId(id, userId)) ||
      (task.primaryAssigneeId && sameId(task.primaryAssigneeId, userId))
  );

  const primary = tasks.filter(
    (task) => task.primaryAssigneeId && sameId(task.primaryAssigneeId, userId)
  );

  return {
    assignedToMe: buildGroup(assignedToMe),
    primaryAssignee: buildGroup(primary)
  };
}

// Rút gọn công việc để liệt kê trong thống kê hạn
function toSummary(task) {
  return {
    id: task._id,
    title: task.title,
    dueDate: task.dueDate,
    status: task.status,
    priority: task.priority
  };
}

// Thống kê hạn hoàn thành.
//   days: số ngày tới tính là "sắp đến hạn" (tính cả hôm nay)
//   now:  thời điểm hiện tại (truyền vào để dễ kiểm tra bằng script)
function buildDeadlineStats(tasks, days, now = new Date()) {
  const today = startOfToday(now);
  const windowEnd = new Date(today.getTime() + days * DAY_MS);

  // Chỉ xét việc có hạn và chưa hoàn thành
  const open = tasks.filter((task) => task.dueDate && task.status !== 'completed');
  const byDueDate = (a, b) => a.dueDate.getTime() - b.dueDate.getTime();

  const overdue = open.filter((task) => task.dueDate < today).sort(byDueDate);
  const upcoming = open
    .filter((task) => task.dueDate >= today && task.dueDate < windowEnd)
    .sort(byDueDate);

  return {
    days,
    today,
    overdue: {
      count: overdue.length,
      tasks: overdue.slice(0, MAX_LISTED).map(toSummary)
    },
    upcoming: {
      count: upcoming.length,
      tasks: upcoming.slice(0, MAX_LISTED).map(toSummary)
    }
  };
}

// Lấy mọi công việc người dùng có quyền xem (dùng lại hàm lọc theo quyền)
async function loadTasksForUser(userId) {
  const items = await findAccessibleTasks(userId, { scope: 'all' });
  return items.map(({ task }) => task);
}

module.exports = {
  MAX_LISTED,
  countByStatus,
  startOfToday,
  buildTaskStats,
  buildAssignmentStats,
  buildDeadlineStats,
  loadTasksForUser
};