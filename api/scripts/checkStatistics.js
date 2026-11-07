const assert = require('node:assert');
const {
  MAX_LISTED,
  countByStatus,
  startOfToday,
  buildTaskStats,
  buildAssignmentStats,
  buildDeadlineStats
} = require('../src/services/statisticsService');

let nextId = 1;

// Tạo công việc giả để kiểm tra
function makeTask(overrides = {}) {
  return {
    _id: `t${nextId++}`,
    title: 'Task',
    status: 'todo',
    priority: 'medium',
    assigneeIds: [],
    primaryAssigneeId: null,
    dueDate: null,
    ...overrides
  };
}

const date = (iso) => new Date(iso);

// 1. "Hôm nay" tính theo giờ Việt Nam (UTC+7)
assert.strictEqual(
  startOfToday(date('2026-11-10T05:00:00Z')).toISOString(),
  '2026-11-09T17:00:00.000Z' // 12:00 ngày 10/11 giờ VN
);
assert.strictEqual(
  startOfToday(date('2026-11-10T16:59:59Z')).toISOString(),
  '2026-11-09T17:00:00.000Z' // 23:59:59 ngày 10/11 vẫn là ngày 10/11
);
assert.strictEqual(
  startOfToday(date('2026-11-10T17:00:00Z')).toISOString(),
  '2026-11-10T17:00:00.000Z' // 00:00 ngày 11/11
);

// 2. Đếm theo trạng thái
const counted = countByStatus([
  makeTask({ status: 'todo' }),
  makeTask({ status: 'todo' }),
  makeTask({ status: 'in_progress' }),
  makeTask({ status: 'completed' })
]);
assert.deepStrictEqual(counted, { todo: 2, in_progress: 1, completed: 1 });

// 3. Thống kê tổng và tỷ lệ hoàn thành
assert.deepStrictEqual(buildTaskStats([]), {
  total: 0,
  completionRate: 0,
  byStatus: { todo: 0, in_progress: 0, completed: 0 }
});
const oneOfThree = buildTaskStats([
  makeTask({ status: 'completed' }),
  makeTask(),
  makeTask()
]);
assert.strictEqual(oneOfThree.total, 3);
assert.strictEqual(oneOfThree.completionRate, 33);
const twoOfThree = buildTaskStats([
  makeTask({ status: 'completed' }),
  makeTask({ status: 'completed' }),
  makeTask()
]);
assert.strictEqual(twoOfThree.completionRate, 67);
assert.strictEqual(
  buildTaskStats([makeTask({ status: 'completed' })]).completionRate,
  100
);

// 4. Thống kê giao việc (người dùng là 'u1')
const assignmentTasks = [
  // A: được giao và là người phụ trách chính
  makeTask({ status: 'todo', assigneeIds: ['u1'], primaryAssigneeId: 'u1' }),
  // B: được giao nhưng người phụ trách chính là người khác, đã hoàn thành
  makeTask({
    status: 'completed',
    assigneeIds: ['u1', 'u2'],
    primaryAssigneeId: 'u2'
  }),
  // C: chỉ là người phụ trách chính (cũng tính là được giao)
  makeTask({ status: 'in_progress', assigneeIds: [], primaryAssigneeId: 'u1' }),
  // D: giao cho người khác, không liên quan đến u1
  makeTask({ status: 'todo', assigneeIds: ['u2'], primaryAssigneeId: 'u2' }),
  // E: không giao cho ai
  makeTask({ status: 'todo' })
];
const assignments = buildAssignmentStats(assignmentTasks, 'u1');
assert.strictEqual(assignments.assignedToMe.total, 3);
assert.strictEqual(assignments.assignedToMe.active, 2);
assert.deepStrictEqual(assignments.assignedToMe.byStatus, {
  todo: 1,
  in_progress: 1,
  completed: 1
});
assert.strictEqual(assignments.primaryAssignee.total, 2);
assert.strictEqual(assignments.primaryAssignee.active, 2);
assert.deepStrictEqual(assignments.primaryAssignee.byStatus, {
  todo: 1,
  in_progress: 1,
  completed: 0
});
// Người dùng không liên quan: toàn số 0
assert.strictEqual(buildAssignmentStats(assignmentTasks, 'u9').assignedToMe.total, 0);

// 5. Hạn hoàn thành. Giả sử bây giờ là 12:00 ngày 10/11/2026 giờ VN,
//    nên 0 giờ hôm nay = 2026-11-09T17:00:00Z
const now = date('2026-11-10T05:00:00Z');
const deadlineTasks = [
  makeTask({ title: 'overdue-edge', dueDate: date('2026-11-09T16:59:59Z') }),
  makeTask({
    title: 'today-start',
    status: 'in_progress',
    dueDate: date('2026-11-09T17:00:00Z')
  }),
  makeTask({ title: 'window-last', dueDate: date('2026-11-16T16:59:59Z') }),
  makeTask({ title: 'window-end', dueDate: date('2026-11-16T17:00:00Z') }),
  makeTask({
    title: 'done-overdue',
    status: 'completed',
    dueDate: date('2026-11-01T00:00:00Z')
  }),
  makeTask({ title: 'no-due' })
];

const week = buildDeadlineStats(deadlineTasks, 7, now);
assert.strictEqual(week.days, 7);
assert.strictEqual(week.today.toISOString(), '2026-11-09T17:00:00.000Z');
// Quá hạn: chỉ 'overdue-edge' (việc đã hoàn thành và việc không có hạn không tính)
assert.deepStrictEqual(
  week.overdue.tasks.map((t) => t.title),
  ['overdue-edge']
);
assert.strictEqual(week.overdue.count, 1);
// Sắp đến hạn 7 ngày: 'today-start' và 'window-last', theo thứ tự hạn tăng dần
assert.deepStrictEqual(
  week.upcoming.tasks.map((t) => t.title),
  ['today-start', 'window-last']
);
assert.strictEqual(week.upcoming.count, 2);

// Cửa sổ 1 ngày: chỉ việc đến hạn trong hôm nay
const oneDay = buildDeadlineStats(deadlineTasks, 1, now);
assert.deepStrictEqual(
  oneDay.upcoming.tasks.map((t) => t.title),
  ['today-start']
);

// Cửa sổ 30 ngày: có thêm 'window-end'
const month = buildDeadlineStats(deadlineTasks, 30, now);
assert.strictEqual(month.upcoming.count, 3);

// 6. Chỉ liệt kê tối đa MAX_LISTED việc nhưng count vẫn là tổng
const manyOverdue = [];
for (let i = 12; i >= 1; i -= 1) {
  // Tạo ngược để kiểm tra việc sắp xếp: ngày 01 là cũ nhất
  const day = String(i).padStart(2, '0');
  manyOverdue.push(
    makeTask({ title: `old-${day}`, dueDate: date(`2026-10-${day}T00:00:00Z`) })
  );
}
const many = buildDeadlineStats(manyOverdue, 7, now);
assert.strictEqual(many.overdue.count, 12);
assert.strictEqual(many.overdue.tasks.length, MAX_LISTED);
assert.strictEqual(many.overdue.tasks[0].title, 'old-01'); // cũ nhất trước

console.log('OK: tat ca kiem tra thong ke deu dat');