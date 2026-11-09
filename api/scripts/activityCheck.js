// Kiểm tra lịch sử hoạt động của công việc.
// Cách dùng: node scripts\activityCheck.js   (server API phải đang chạy)
// Mỗi lần chạy tạo 4 tài khoản và 1 công việc mới, nên chạy lại được nhiều lần.
const assert = require('node:assert');

const baseUrl = process.env.API_URL || 'http://localhost:3000/api';
const PASSWORD = '123456';
const runId = Date.now();
const emailOf = (name) => `act_${runId}_${name}@example.com`;
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
  const title = `ACT ${runId}`;
  const SECRET_TEXT = 'noi dung mo ta bi mat';
  let taskId = '';
  let shareId = '';

  await step('Dang ky va dang nhap 4 tai khoan', async () => {
    for (const name of ['a', 'b', 'c', 'd']) {
      expectStatus(
        await api('POST', '/auth/register', null, {
          fullName: `ACT ${name.toUpperCase()}`,
          email: emailOf(name),
          password: PASSWORD
        }),
        201,
        `dang ky ${name}`
      );
      const res = await api('POST', '/auth/login', null, {
        email: emailOf(name),
        password: PASSWORD
      });
      expectStatus(res, 200, `dang nhap ${name}`);
      token[name] = res.json.data.token;
      userId[name] = res.json.data.user.id;
    }
  });

  await step('Tao va sua cong viec (sua giong cu thi khong ghi)', async () => {
    const created = await api('POST', '/tasks', token.a, { title });
    expectStatus(created, 201, 'tao');
    taskId = created.json.data.task.id;

    const put = (body, label) =>
      api('PUT', `/tasks/${taskId}`, token.a, body).then((res) =>
        expectStatus(res, 200, label)
      );
    await put({ title: `${title} v2` }, 'doi ten');
    await put({ title: `${title} v2` }, 'doi ten giong cu');
    await put({ priority: 'high', dueDate: dayOffset(5) }, 'doi uu tien va han');
    await put({ description: SECRET_TEXT }, 'doi mo ta');

    const patch = (status, label) =>
      api('PATCH', `/tasks/${taskId}/status`, token.a, { status }).then((res) =>
        expectStatus(res, 200, label)
      );
    await patch('in_progress', 'doi trang thai');
    await patch('in_progress', 'dat lai dung trang thai cu');
  });

  await step('Giao viec, doi nguoi phu trach chinh, huy giao', async () => {
    const post = (body, label) =>
      api('POST', `/tasks/${taskId}/assignees`, token.a, body).then((res) =>
        expectStatus(res, 200, label)
      );
    await post({ emails: [emailOf('b')] }, 'giao B');
    await post({ emails: [emailOf('b')] }, 'giao lai B');
    await post(
      { emails: [emailOf('c')], primaryUserId: userId.c },
      'giao C va dat C phu trach chinh'
    );

    const primaryB = () =>
      api('PATCH', `/tasks/${taskId}/assignees/${userId.b}`, token.a, {
        isPrimary: true
      }).then((res) => expectStatus(res, 200, 'dat B phu trach chinh'));
    await primaryB();
    await primaryB(); // B da la phu trach chinh: khong ghi them

    expectStatus(
      await api('DELETE', `/tasks/${taskId}/assignees/${userId.c}`, token.a),
      200,
      'huy giao C'
    );
  });

  await step('Chia se, doi quyen, thu hoi', async () => {
    const body = { emails: [emailOf('d')], permission: 'viewer' };
    const shared = await api('POST', `/tasks/${taskId}/shares`, token.a, body);
    expectStatus(shared, 200, 'chia se D');
    shareId = shared.json.data.shares[0].id;
    expectStatus(
      await api('POST', `/tasks/${taskId}/shares`, token.a, body),
      200,
      'chia se lai D'
    );

    const toEditor = () =>
      api('PATCH', `/tasks/${taskId}/shares/${shareId}`, token.a, {
        permission: 'editor'
      }).then((res) => expectStatus(res, 200, 'nang len editor'));
    await toEditor();
    await toEditor(); // da la editor: khong ghi them

    expectStatus(
      await api('DELETE', `/tasks/${taskId}/shares/${shareId}`, token.a),
      200,
      'thu hoi'
    );
  });

  await step('Lich su dung thu tu va dung hanh dong', async () => {
    const res = await api('GET', `/tasks/${taskId}/activities`, token.a);
    expectStatus(res, 200, 'lay lich su');

    const newestFirst = res.json.data.activities;
    const list = [...newestFirst].reverse(); // cu -> moi

    assert.deepStrictEqual(
      list.map((item) => item.action),
      [
        'created',
        'updated',
        'updated',
        'updated',
        'status_changed',
        'assigned',
        'assigned',
        'primary_assignee_changed',
        'primary_assignee_changed',
        'unassigned',
        'shared',
        'share_permission_changed',
        'share_revoked'
      ]
    );
    assert.strictEqual(res.json.data.count, 13);
    assert.strictEqual(newestFirst[0].action, 'share_revoked', 'moi nhat o dau');

    list.forEach((item) => {
      assert.strictEqual(item.user.fullName, 'ACT A', 'nguoi thuc hien la A');
      assert.ok(item.summary.startsWith('ACT A '), `summary: ${item.summary}`);
    });

    const text = (index) => list[index].summary;
    assert.ok(text(1).includes('tên công việc'));
    assert.ok(text(2).includes('mức độ ưu tiên') && text(2).includes('hạn hoàn thành'));
    assert.ok(text(3).includes('mô tả'));
    assert.ok(text(4).includes('Chưa thực hiện') && text(4).includes('Đang thực hiện'));
    assert.ok(text(5).includes('ACT B'));
    assert.ok(text(6).includes('ACT C'));
    assert.ok(text(7).includes('ACT C') && text(7).includes('phụ trách chính'));
    assert.ok(text(8).includes('ACT B'));
    assert.ok(text(9).includes('ACT C'));
    assert.ok(text(10).includes('ACT D') && text(10).includes('chỉ xem'));
    assert.ok(text(11).includes('chỉ xem') && text(11).includes('chỉnh sửa'));
    assert.ok(text(12).includes('ACT D'));

    const raw = JSON.stringify(res.json);
    assert.ok(!raw.includes(SECRET_TEXT), 'khong duoc luu noi dung mo ta');
    assert.ok(!raw.includes('passwordHash'), 'khong duoc lo passwordHash');
  });

  await step('Tham so limit', async () => {
    const five = await api('GET', `/tasks/${taskId}/activities?limit=5`, token.a);
    expectStatus(five, 200, 'limit=5');
    assert.strictEqual(five.json.data.count, 5);
    assert.strictEqual(five.json.data.activities[0].action, 'share_revoked');

    const bad = await api('GET', `/tasks/${taskId}/activities?limit=abc`, token.a);
    expectStatus(bad, 200, 'limit khong hop le');
    assert.strictEqual(bad.json.data.count, 13);
  });

  await step('Quyen xem lich su', async () => {
    expectStatus(
      await api('GET', `/tasks/${taskId}/activities`, token.b),
      200,
      'B (nguoi duoc giao) xem'
    );
    expectStatus(
      await api('GET', `/tasks/${taskId}/activities`, token.c),
      404,
      'C (da bi huy giao) xem'
    );
    expectStatus(
      await api('GET', `/tasks/${taskId}/activities`, token.d),
      404,
      'D (da bi thu hoi chia se) xem'
    );
    expectStatus(await api('GET', `/tasks/${taskId}/activities`), 401, 'khong token');
    expectStatus(await api('GET', '/tasks/abc/activities', token.a), 400, 'ma sai');
  });

  console.log(`\nOK: ${passed} buoc kiem tra lich su hoat dong deu dat`);
  console.log(`(Cong viec "${title}" va 4 tai khoan act_${runId}_* con lai trong database)`);
}

main().catch((error) => {
  console.error('LOI:', error.message);
  process.exit(1);
});