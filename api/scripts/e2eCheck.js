// Kiểm thử tích hợp: đi qua toàn bộ luồng nghiệp vụ chính bằng 4 tài khoản tạo mới.
// Cách dùng: node scripts\e2eCheck.js   (server API phải đang chạy)
// Mỗi lần chạy tạo tài khoản và công việc mới với tên không trùng, nên chạy lại được nhiều lần.
const assert = require('node:assert');

const baseUrl = process.env.API_URL || 'http://localhost:3000/api';
const PASSWORD = '123456';
const NEW_PASSWORD = '654321';
const runId = Date.now();
const emailOf = (name) => `e2e_${runId}_${name}@example.com`;
const title = `E2E ${runId}`;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const dayOffset = (n) =>
  new Date(Date.now() + n * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

let passed = 0;

async function api(method, path, token, body) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: body === undefined ? undefined : JSON.stringify(body)
  });

  let json = null;
  try {
    json = await response.json();
  } catch (error) {
    json = null;
  }
  return { status: response.status, json };
}

function expectStatus(res, expected, label) {
  const detail = res.json && res.json.message ? res.json.message : '';
  assert.strictEqual(
    res.status,
    expected,
    `${label}: mong doi ${expected}, nhan ${res.status} ${detail}`
  );
}

async function step(name, fn) {
  try {
    await fn();
    passed += 1;
    console.log(`OK   ${name}`);
  } catch (error) {
    console.error(`LOI  ${name}`);
    console.error(`     ${error.message}`);
    if (String(error.message).includes('fetch failed')) {
      console.error('     Server API da chay chua? Kiem tra npm run dev.');
    }
    process.exit(1);
  }
}

async function main() {
  const token = {};
  const userId = {};
  let taskId = '';
  let shareId = '';

  // ---------- Nhóm A: tài khoản và xác thực ----------
  await step('Dang ky 4 tai khoan (khong lo passwordHash)', async () => {
    for (const name of ['a', 'b', 'c', 'd']) {
      const res = await api('POST', '/auth/register', null, {
        fullName: `E2E ${name.toUpperCase()}`,
        email: emailOf(name),
        password: PASSWORD
      });
      expectStatus(res, 201, `dang ky ${name}`);
      assert.ok(!JSON.stringify(res.json).includes('passwordHash'), 'khong duoc tra passwordHash');
    }
  });

  await step('Dang ky trung email bi tu choi (409), du lieu sai bi tu choi (400)', async () => {
    expectStatus(
      await api('POST', '/auth/register', null, {
        fullName: 'E2E A',
        email: emailOf('a'),
        password: PASSWORD
      }),
      409,
      'trung email'
    );
    expectStatus(
      await api('POST', '/auth/register', null, {
        fullName: 'E2E X',
        email: 'khong-phai-email',
        password: PASSWORD
      }),
      400,
      'email sai dinh dang'
    );
    expectStatus(
      await api('POST', '/auth/register', null, {
        fullName: 'E2E X',
        email: emailOf('x'),
        password: '123'
      }),
      400,
      'mat khau qua ngan'
    );
  });

  await step('Dang nhap: sai mat khau 401, dung mat khau 200 va co token', async () => {
    expectStatus(
      await api('POST', '/auth/login', null, { email: emailOf('a'), password: 'sai-mat-khau' }),
      401,
      'sai mat khau'
    );
    for (const name of ['a', 'b', 'c', 'd']) {
      const res = await api('POST', '/auth/login', null, {
        email: emailOf(name),
        password: PASSWORD
      });
      expectStatus(res, 200, `dang nhap ${name}`);
      assert.ok(res.json.data.token, 'phai co token');
      assert.ok(!JSON.stringify(res.json).includes('passwordHash'), 'khong duoc tra passwordHash');
      token[name] = res.json.data.token;
      userId[name] = res.json.data.user.id;
    }
  });

  await step('GET /auth/me can token hop le', async () => {
    expectStatus(await api('GET', '/auth/me'), 401, 'khong co token');
    expectStatus(await api('GET', '/auth/me', 'abc.def.ghi'), 401, 'token gia');
    const res = await api('GET', '/auth/me', token.a);
    expectStatus(res, 200, 'me');
    assert.strictEqual(res.json.data.user.email, emailOf('a'));
  });

  await step('Cap nhat ho so: doi ten duoc, doi email khong duoc', async () => {
    const res = await api('PUT', '/auth/me', token.a, {
      fullName: 'E2E Owner',
      email: 'hack@example.com'
    });
    expectStatus(res, 200, 'PUT /auth/me');
    assert.strictEqual(res.json.data.user.fullName, 'E2E Owner');
    assert.strictEqual(res.json.data.user.email, emailOf('a'), 'email khong duoc doi');
    expectStatus(await api('PUT', '/auth/me', token.a, {}), 400, 'body rong');
  });

  await step('Doi mat khau: mat khau cu het hieu luc, mat khau moi dang nhap duoc', async () => {
    expectStatus(
      await api('PUT', '/auth/change-password', token.a, {
        currentPassword: 'sai',
        newPassword: NEW_PASSWORD
      }),
      400,
      'sai mat khau hien tai'
    );
    expectStatus(
      await api('PUT', '/auth/change-password', token.a, {
        currentPassword: PASSWORD,
        newPassword: PASSWORD
      }),
      400,
      'mat khau moi trung mat khau cu'
    );
    expectStatus(
      await api('PUT', '/auth/change-password', token.a, {
        currentPassword: PASSWORD,
        newPassword: NEW_PASSWORD
      }),
      200,
      'doi mat khau'
    );
    expectStatus(
      await api('POST', '/auth/login', null, { email: emailOf('a'), password: PASSWORD }),
      401,
      'mat khau cu'
    );
    expectStatus(
      await api('POST', '/auth/login', null, { email: emailOf('a'), password: NEW_PASSWORD }),
      200,
      'mat khau moi'
    );
  });

  // ---------- Nhóm B: công việc ----------
  await step('Tao cong viec: kiem tra du lieu dau vao va tao thanh cong', async () => {
    expectStatus(await api('POST', '/tasks', null, { title }), 401, 'tao khong token');
    expectStatus(await api('POST', '/tasks', token.a, {}), 400, 'thieu ten');
    expectStatus(
      await api('POST', '/tasks', token.a, { title, priority: 'urgent' }),
      400,
      'uu tien sai'
    );
    expectStatus(
      await api('POST', '/tasks', token.a, {
        title,
        startDate: dayOffset(5),
        dueDate: dayOffset(1)
      }),
      400,
      'han truoc ngay bat dau'
    );

    const res = await api('POST', '/tasks', token.a, {
      title,
      description: 'kiem thu tich hop',
      priority: 'high',
      dueDate: dayOffset(3)
    });
    expectStatus(res, 201, 'tao cong viec');
    taskId = res.json.data.task.id;
    assert.strictEqual(res.json.data.task.myRole, 'owner');
    assert.strictEqual(res.json.data.task.status, 'todo');
  });

  await step('Nguoi khong lien quan khong thay cong viec (404)', async () => {
    for (const name of ['b', 'c', 'd']) {
      expectStatus(await api('GET', `/tasks/${taskId}`, token[name]), 404, `${name} xem cong viec`);
    }
    const list = await api('GET', `/tasks?q=${encodeURIComponent(title)}`, token.d);
    expectStatus(list, 200, 'D tim kiem');
    assert.strictEqual(list.json.data.count, 0);
    expectStatus(await api('GET', '/tasks/abc', token.a), 400, 'ma cong viec sai');
  });

  // ---------- Nhóm C: giao việc, chia sẻ, phân quyền ----------
  await step('Giao viec cho B: B tu dong la nguoi phu trach chinh, giao lai khong trung', async () => {
    const res = await api('POST', `/tasks/${taskId}/assignees`, token.a, {
      emails: [emailOf('b')]
    });
    expectStatus(res, 200, 'giao viec');
    assert.strictEqual(res.json.data.added, 1);
    assert.strictEqual(res.json.data.assignees[0].isPrimary, true);

    const again = await api('POST', `/tasks/${taskId}/assignees`, token.a, {
      emails: [emailOf('b')]
    });
    assert.strictEqual(again.json.data.added, 0, 'giao lai khong duoc them nguoi');

    expectStatus(
      await api('POST', `/tasks/${taskId}/assignees`, token.a, { emails: [emailOf('khongco')] }),
      404,
      'email khong ton tai'
    );
  });

  await step('B (nguoi duoc giao): doi trang thai duoc; sua, xoa, giao viec, chia se bi 403', async () => {
    const mine = await api('GET', '/tasks?scope=assigned', token.b);
    assert.strictEqual(mine.json.data.count, 1);
    const task = mine.json.data.tasks[0];
    assert.strictEqual(task.myRole, 'assignee');
    assert.deepStrictEqual([...task.permissions].sort(), ['changeStatus', 'view']);

    const res = await api('PATCH', `/tasks/${taskId}/status`, token.b, { status: 'in_progress' });
    expectStatus(res, 200, 'B doi trang thai');
    expectStatus(await api('PUT', `/tasks/${taskId}`, token.b, { title: 'Hacker' }), 403, 'B sua noi dung');
    expectStatus(await api('DELETE', `/tasks/${taskId}`, token.b), 403, 'B xoa');
    expectStatus(
      await api('POST', `/tasks/${taskId}/assignees`, token.b, { emails: [emailOf('c')] }),
      403,
      'B giao viec'
    );
    expectStatus(
      await api('POST', `/tasks/${taskId}/shares`, token.b, { emails: [emailOf('c')] }),
      403,
      'B chia se'
    );
  });

  await step('Chia se cho C quyen viewer: chi duoc xem', async () => {
    expectStatus(
      await api('POST', `/tasks/${taskId}/shares`, token.a, {
        emails: [emailOf('a')],
        permission: 'viewer'
      }),
      400,
      'chia se cho chinh nguoi tao'
    );
    expectStatus(
      await api('POST', `/tasks/${taskId}/shares`, token.a, {
        emails: [emailOf('c')],
        permission: 'admin'
      }),
      400,
      'quyen khong hop le'
    );

    const res = await api('POST', `/tasks/${taskId}/shares`, token.a, {
      emails: [emailOf('c')],
      permission: 'viewer'
    });
    expectStatus(res, 200, 'chia se cho C');
    assert.strictEqual(res.json.data.added, 1);
    shareId = res.json.data.shares[0].id;

    const mine = await api('GET', '/tasks?scope=shared', token.c);
    assert.strictEqual(mine.json.data.count, 1);
    const task = mine.json.data.tasks[0];
    assert.strictEqual(task.myRole, 'viewer');
    assert.deepStrictEqual(task.permissions, ['view']);

    expectStatus(
      await api('PATCH', `/tasks/${taskId}/status`, token.c, { status: 'completed' }),
      403,
      'viewer doi trang thai'
    );
    expectStatus(await api('PUT', `/tasks/${taskId}`, token.c, { title: 'Hacker' }), 403, 'viewer sua');
    expectStatus(await api('DELETE', `/tasks/${taskId}`, token.c), 403, 'viewer xoa');
  });

  await step('Nang C len editor: sua noi dung duoc; xoa va quan ly chia se van bi 403', async () => {
    expectStatus(
      await api('PATCH', `/tasks/${taskId}/shares/${shareId}`, token.a, { permission: 'editor' }),
      200,
      'A doi quyen'
    );

    const mine = await api('GET', '/tasks?scope=shared', token.c);
    const task = mine.json.data.tasks[0];
    assert.strictEqual(task.myRole, 'editor');
    assert.deepStrictEqual([...task.permissions].sort(), ['changeStatus', 'editContent', 'view']);

    const edit = await api('PUT', `/tasks/${taskId}`, token.c, { title: `${title} (sua)` });
    expectStatus(edit, 200, 'editor sua noi dung');

    expectStatus(await api('DELETE', `/tasks/${taskId}`, token.c), 403, 'editor xoa');
    expectStatus(
      await api('POST', `/tasks/${taskId}/shares`, token.c, { emails: [emailOf('d')] }),
      403,
      'editor chia se'
    );
    expectStatus(
      await api('PATCH', `/tasks/${taskId}/shares/${shareId}`, token.c, { permission: 'viewer' }),
      403,
      'editor doi quyen'
    );
    expectStatus(
      await api('DELETE', `/tasks/${taskId}/shares/${shareId}`, token.c),
      403,
      'editor thu hoi'
    );
    expectStatus(await api('GET', `/tasks/${taskId}/email-logs`, token.c), 403, 'editor xem log email');
  });

  // ---------- Nhóm D: thông báo ----------
  await step('Thong bao: dung nguoi nhan, dung loai, danh dau da doc', async () => {
    const notificationsOf = async (name) =>
      (await api('GET', '/notifications', token[name])).json.data;

    const forB = await notificationsOf('b');
    const assignedNote = forB.notifications.find(
      (n) => n.type === 'task_assigned' && n.taskId === taskId
    );
    assert.ok(assignedNote, 'B phai co thong bao giao viec');
    assert.strictEqual(forB.unreadCount, 1, 'B co 1 thong bao chua doc');

    const forC = await notificationsOf('c');
    assert.ok(
      forC.notifications.some((n) => n.type === 'task_shared' && n.taskId === taskId),
      'C phai co thong bao chia se'
    );
    assert.strictEqual(forC.unreadCount, 1, 'C co 1 thong bao chua doc');

    const forA = await notificationsOf('a');
    assert.ok(
      forA.notifications.some((n) => n.type === 'task_status_changed' && n.taskId === taskId),
      'A phai co thong bao khi B doi trang thai'
    );
    assert.ok(
      !forA.notifications.some((n) => n.type === 'task_assigned' || n.type === 'task_shared'),
      'nguoi thao tac khong duoc nhan thong bao ve thao tac cua chinh minh'
    );

    expectStatus(
      await api('PATCH', `/notifications/${assignedNote.id}/read`, token.a),
      404,
      'A danh dau thong bao cua B'
    );
    expectStatus(await api('PATCH', '/notifications/abc/read', token.b), 400, 'ma thong bao sai');

    const read = await api('PATCH', `/notifications/${assignedNote.id}/read`, token.b);
    expectStatus(read, 200, 'B danh dau da doc');
    assert.strictEqual(read.json.data.notification.isRead, true);
    const count = await api('GET', '/notifications/unread-count', token.b);
    assert.strictEqual(count.json.data.unreadCount, 0);

    const all = await api('PATCH', '/notifications/read-all', token.c);
    expectStatus(all, 200, 'C danh dau tat ca');
    assert.strictEqual(all.json.data.updated, 1);
    const countC = await api('GET', '/notifications/unread-count', token.c);
    assert.strictEqual(countC.json.data.unreadCount, 0);
  });

  // ---------- Nhóm E: thống kê (trước khi hoàn thành) ----------
  await step('Thong ke han hoan thanh: viec han 3 ngay toi nam trong nhom sap den han', async () => {
    const week = await api('GET', '/statistics/deadlines?days=7', token.a);
    expectStatus(week, 200, 'deadlines 7 ngay');
    assert.strictEqual(week.json.data.upcoming.count, 1);
    assert.strictEqual(week.json.data.overdue.count, 0);

    const one = await api('GET', '/statistics/deadlines?days=1', token.a);
    assert.strictEqual(one.json.data.upcoming.count, 0, 'cua so 1 ngay khong co viec han sau 3 ngay');

    expectStatus(await api('GET', '/statistics/deadlines?days=0', token.a), 400, 'days = 0');
    expectStatus(await api('GET', '/statistics/deadlines?days=abc', token.a), 400, 'days khong phai so');
    expectStatus(await api('GET', '/statistics/tasks'), 401, 'thong ke khong token');
  });

  // ---------- Hoàn thành công việc ----------
  await step('C (editor) hoan thanh cong viec: A va B duoc bao, C thi khong', async () => {
    const res = await api('PATCH', `/tasks/${taskId}/status`, token.c, { status: 'completed' });
    expectStatus(res, 200, 'C hoan thanh');
    assert.strictEqual(res.json.data.task.status, 'completed');

    for (const name of ['a', 'b']) {
      const data = (await api('GET', '/notifications', token[name])).json.data;
      assert.ok(
        data.notifications.some((n) => n.type === 'task_completed' && n.taskId === taskId),
        `${name} phai co thong bao hoan thanh`
      );
    }
    const dataC = (await api('GET', '/notifications', token.c)).json.data;
    assert.ok(
      !dataC.notifications.some((n) => n.type === 'task_completed'),
      'nguoi thao tac khong nhan thong bao hoan thanh'
    );
  });

  // ---------- Tìm kiếm, lọc, sắp xếp ----------
  await step('Tim kiem, loc, sap xep, va khong lo cong viec cua nguoi khac', async () => {
    const q = encodeURIComponent(title);
    const countOf = async (query, name) => {
      const res = await api('GET', `/tasks?${query}`, token[name]);
      expectStatus(res, 200, `GET /tasks?${query}`);
      return res.json.data.count;
    };

    assert.strictEqual(await countOf(`q=${q}`, 'a'), 1, 'A tim theo ten');
    assert.strictEqual(await countOf(`q=${encodeURIComponent(`e2e ${runId}`)}`, 'a'), 1, 'khong phan biet hoa thuong');
    assert.strictEqual(await countOf(`q=${q}&status=completed`, 'a'), 1, 'loc completed');
    assert.strictEqual(await countOf(`q=${q}&status=todo`, 'a'), 0, 'loc todo');
    assert.strictEqual(await countOf(`q=${q}&priority=high`, 'a'), 1, 'loc uu tien cao');
    assert.strictEqual(await countOf(`q=${q}&priority=low`, 'a'), 0, 'loc uu tien thap');
    assert.strictEqual(await countOf(`q=${q}&assignee=${userId.b}`, 'a'), 1, 'loc theo nguoi phu trach');
    assert.strictEqual(await countOf(`q=${q}&assignee=me`, 'b'), 1, 'B loc assignee=me');
    assert.strictEqual(await countOf(`q=${q}&assignee=me`, 'a'), 0, 'A khong duoc giao viec nao');
    assert.strictEqual(await countOf(`q=${q}&sortBy=dueDate&order=desc`, 'a'), 1, 'sap xep');
    assert.strictEqual(await countOf(`q=${q}`, 'b'), 1, 'B thay cong viec duoc giao');
    assert.strictEqual(await countOf(`q=${q}`, 'c'), 1, 'C thay cong viec duoc chia se');
    assert.strictEqual(await countOf(`q=${q}`, 'd'), 0, 'D khong thay gi');
    assert.strictEqual(await countOf(`q=${q}&assignee=${userId.b}`, 'd'), 0, 'loc khong giup D thay viec cua nguoi khac');

    expectStatus(await api('GET', '/tasks?sortBy=title', token.a), 400, 'sortBy sai');
    expectStatus(await api('GET', '/tasks?status=xong', token.a), 400, 'status sai');
    expectStatus(await api('GET', '/tasks?scope=abc', token.a), 400, 'scope sai');
    expectStatus(await api('GET', '/tasks?status=todo&status=completed', token.a), 400, 'tham so gui hai lan');
    expectStatus(await api('GET', '/tasks?q=T71'), 401, 'khong token');
  });

  await step('Thong ke sau khi hoan thanh', async () => {
    const a = await api('GET', '/statistics/tasks', token.a);
    expectStatus(a, 200, 'thong ke cong viec cua A');
    assert.strictEqual(a.json.data.total, 1);
    assert.strictEqual(a.json.data.byStatus.completed, 1);
    assert.strictEqual(a.json.data.completionRate, 100);

    const deadlines = await api('GET', '/statistics/deadlines?days=7', token.a);
    assert.strictEqual(deadlines.json.data.upcoming.count, 0, 'viec da hoan thanh khong tinh vao han');
    assert.strictEqual(deadlines.json.data.overdue.count, 0);

    const b = await api('GET', '/statistics/assignments', token.b);
    expectStatus(b, 200, 'thong ke giao viec cua B');
    assert.strictEqual(b.json.data.assignedToMe.total, 1);
    assert.strictEqual(b.json.data.assignedToMe.active, 0);
    assert.strictEqual(b.json.data.primaryAssignee.total, 1);

    const d = await api('GET', '/statistics/tasks', token.d);
    assert.strictEqual(d.json.data.total, 0, 'D khong co cong viec nao');
    assert.strictEqual(d.json.data.completionRate, 0);
  });

  // ---------- Email ----------
  await step('Lich su email: ghi nhan day du, chi nguoi tao xem duoc', async () => {
    await sleep(4500); // email gui nen, cach nhau 1 giay
    const res = await api('GET', `/tasks/${taskId}/email-logs`, token.a);
    expectStatus(res, 200, 'email-logs');

    const logs = res.json.data.logs;
    assert.ok(logs.length >= 4, `can it nhat 4 email, nhan ${logs.length}`);

    const types = new Set(logs.map((log) => log.eventType));
    ['task_assigned', 'task_shared', 'task_completed'].forEach((type) => {
      assert.ok(types.has(type), `thieu email loai ${type}`);
    });

    const recipients = logs.map((log) => log.recipientEmail);
    assert.ok(recipients.includes(emailOf('b')), 'thieu email gui B');
    assert.ok(recipients.includes(emailOf('c')), 'thieu email gui C');
    assert.ok(
      !logs.some((log) => log.eventType === 'task_assigned' && log.recipientEmail === emailOf('a')),
      'nguoi thao tac khong nhan email ve thao tac cua minh'
    );

    logs.forEach((log) => {
      assert.ok(['pending', 'sent', 'failed'].includes(log.status), `trang thai la: ${log.status}`);
      assert.ok(log.attempts <= 1, 'moi email chi thu gui mot lan');
    });

    const summary = { sent: 0, failed: 0, pending: 0 };
    logs.forEach((log) => {
      summary[log.status] += 1;
    });
    console.log(
      `     email: sent=${summary.sent} failed=${summary.failed} pending=${summary.pending}`
    );

    expectStatus(await api('GET', `/tasks/${taskId}/email-logs`, token.b), 403, 'B xem log email');
    expectStatus(await api('GET', `/tasks/${taskId}/email-logs`, token.d), 404, 'D xem log email');
  });

  // ---------- Thu hồi quyền và xóa ----------
  await step('Thu hoi chia se va huy giao viec: mat quyen ngay', async () => {
    expectStatus(
      await api('DELETE', `/tasks/${taskId}/shares/abc`, token.a),
      400,
      'ma chia se sai'
    );
    expectStatus(
      await api('DELETE', `/tasks/${taskId}/shares/000000000000000000000000`, token.a),
      404,
      'ma chia se khong ton tai'
    );

    expectStatus(await api('DELETE', `/tasks/${taskId}/shares/${shareId}`, token.a), 200, 'thu hoi chia se');
    expectStatus(await api('GET', `/tasks/${taskId}`, token.c), 404, 'C het quyen xem');
    const shared = await api('GET', '/tasks?scope=shared', token.c);
    assert.strictEqual(shared.json.data.count, 0);

    expectStatus(
      await api('DELETE', `/tasks/${taskId}/assignees/${userId.b}`, token.a),
      200,
      'huy giao viec'
    );
    expectStatus(await api('GET', `/tasks/${taskId}`, token.b), 404, 'B het quyen xem');
  });

  await step('Xoa cong viec: chi nguoi tao; thong bao cua cong viec duoc don sach', async () => {
    expectStatus(await api('DELETE', `/tasks/${taskId}`, token.d), 404, 'D xoa');
    expectStatus(await api('DELETE', `/tasks/${taskId}`, token.a), 200, 'A xoa');
    expectStatus(await api('GET', `/tasks/${taskId}`, token.a), 404, 'xem sau khi xoa');

    for (const name of ['a', 'b', 'c']) {
      const data = (await api('GET', '/notifications', token[name])).json.data;
      assert.ok(
        !data.notifications.some((n) => n.taskId === taskId),
        `${name} con thong bao cua cong viec da xoa`
      );
    }
  });

  console.log(`\nOK: ${passed} buoc kiem tra tich hop deu dat`);
  console.log(`Con lai trong database: 4 tai khoan e2e_${runId}_*@example.com (khong co API xoa tai khoan)`);
}

main().catch((error) => {
  console.error('LOI:', error.message);
  process.exit(1);
});