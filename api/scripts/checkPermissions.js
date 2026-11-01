const assert = require('node:assert');
const { computeAccess } = require('../src/services/taskService');

// Dùng chuỗi đơn giản thay cho ObjectId để dễ đọc
const task = {
  createdBy: 'owner1',
  assigneeIds: ['assignee1'],
  primaryAssigneeId: 'assignee1'
};

function can(access, capability) {
  return access !== null && access.capabilities.includes(capability);
}

// 1. Người tạo: toàn quyền
const owner = computeAccess(task, 'owner1', null);
assert.strictEqual(owner.role, 'owner');
['view', 'changeStatus', 'editContent', 'delete', 'manage'].forEach((cap) => {
  assert.ok(can(owner, cap), `owner phai co quyen ${cap}`);
});

// 2. Người được giao: xem và đổi trạng thái, KHÔNG sửa nội dung/xóa/quản lý
const assignee = computeAccess(task, 'assignee1', null);
assert.strictEqual(assignee.role, 'assignee');
assert.ok(can(assignee, 'view'));
assert.ok(can(assignee, 'changeStatus'));
assert.ok(!can(assignee, 'editContent'));
assert.ok(!can(assignee, 'delete'));
assert.ok(!can(assignee, 'manage'));

// 3. Editor: xem, đổi trạng thái, sửa nội dung; KHÔNG xóa, KHÔNG quản lý chia sẻ
const editor = computeAccess(task, 'editor1', { permission: 'editor' });
assert.strictEqual(editor.role, 'editor');
assert.ok(can(editor, 'view'));
assert.ok(can(editor, 'changeStatus'));
assert.ok(can(editor, 'editContent'));
assert.ok(!can(editor, 'delete'));
assert.ok(!can(editor, 'manage'));

// 4. Viewer: chỉ xem
const viewer = computeAccess(task, 'viewer1', { permission: 'viewer' });
assert.strictEqual(viewer.role, 'viewer');
assert.ok(can(viewer, 'view'));
assert.ok(!can(viewer, 'changeStatus'));
assert.ok(!can(viewer, 'editContent'));
assert.ok(!can(viewer, 'delete'));
assert.ok(!can(viewer, 'manage'));

// 5. Người không liên quan: không có quyền gì
assert.strictEqual(computeAccess(task, 'stranger1', null), null);

// 6. Vừa được giao, vừa là viewer: quyền là HỢP (được đổi trạng thái)
const assigneeAndViewer = computeAccess(task, 'assignee1', { permission: 'viewer' });
assert.strictEqual(assigneeAndViewer.role, 'assignee');
assert.ok(can(assigneeAndViewer, 'changeStatus'));
assert.ok(!can(assigneeAndViewer, 'editContent'));

// 7. Vừa được giao, vừa là editor: được sửa nội dung nhưng vẫn không được xóa
const assigneeAndEditor = computeAccess(task, 'assignee1', { permission: 'editor' });
assert.strictEqual(assigneeAndEditor.role, 'editor');
assert.ok(can(assigneeAndEditor, 'editContent'));
assert.ok(!can(assigneeAndEditor, 'delete'));
assert.ok(!can(assigneeAndEditor, 'manage'));

// 8. Người tạo dù có thêm bản ghi chia sẻ viewer vẫn giữ toàn quyền
const ownerAndViewer = computeAccess(task, 'owner1', { permission: 'viewer' });
assert.strictEqual(ownerAndViewer.role, 'owner');
assert.ok(can(ownerAndViewer, 'delete'));
assert.ok(can(ownerAndViewer, 'manage'));

// 9. Người phụ trách chính (primaryAssigneeId) cũng được tính là người được giao
const primaryOnly = computeAccess(
  { createdBy: 'owner1', assigneeIds: [], primaryAssigneeId: 'primary1' },
  'primary1',
  null
);
assert.strictEqual(primaryOnly.role, 'assignee');

console.log('OK: tat ca kiem tra quyen deu dat');