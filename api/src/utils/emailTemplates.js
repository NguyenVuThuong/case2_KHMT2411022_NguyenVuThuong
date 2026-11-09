const APP_NAME = 'Task Manager';

const STATUS_LABELS = {
  todo: 'Chưa thực hiện',
  in_progress: 'Đang thực hiện',
  completed: 'Đã hoàn thành'
};

const PRIORITY_LABELS = {
  low: 'Thấp',
  medium: 'Trung bình',
  high: 'Cao'
};

const PERMISSION_LABELS = {
  viewer: 'chỉ xem',
  editor: 'chỉnh sửa'
};

// Thoát ký tự đặc biệt của HTML: nội dung người dùng nhập (tên công việc, mô tả...)
// luôn đi qua hàm này, nên không thể chèn thẻ HTML vào email
function escapeHtml(value) {
  return String(value === null || value === undefined ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Gộp mọi khoảng trắng và xuống dòng thành một dấu cách (dùng cho tiêu đề email)
function oneLine(value) {
  return String(value === null || value === undefined ? '' : value)
    .replace(/\s+/g, ' ')
    .trim();
}

function truncate(value, max) {
  const text = String(value === null || value === undefined ? '' : value);
  return text.length > max ? `${text.slice(0, max)}...` : text;
}

// Ngày dạng dd/MM/yyyy theo giờ Việt Nam
function formatDate(value) {
  if (!value) {
    return 'Chưa đặt';
  }
  return new Date(value).toLocaleDateString('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

// Mỗi sự kiện có tiêu đề riêng và câu mở đầu riêng
const EVENTS = {
  task_assigned: {
    subject: 'Bạn được giao công việc',
    heading: 'Bạn được giao công việc mới',
    intro: ({ actor }) => `${actor.fullName} đã giao cho bạn một công việc mới.`
  },
  task_shared: {
    subject: 'Công việc được chia sẻ cho bạn',
    heading: 'Có công việc được chia sẻ cho bạn',
    intro: ({ actor, extra }) =>
      `${actor.fullName} đã chia sẻ một công việc với bạn ` +
      `(quyền ${PERMISSION_LABELS[extra.permission] || extra.permission || 'chỉ xem'}).`
  },
  task_due_changed: {
    subject: 'Hạn hoàn thành thay đổi',
    heading: 'Hạn hoàn thành đã thay đổi',
    intro: ({ actor }) =>
      `${actor.fullName} đã thay đổi hạn hoàn thành của công việc dưới đây.`
  },
  task_due_soon: {
    subject: 'Công việc sắp đến hạn',
    heading: 'Công việc sắp đến hạn',
    intro: () =>
      'Công việc dưới đây sắp đến hạn hoàn thành, hãy kiểm tra lại tiến độ.'
  },
  task_completed: {
    subject: 'Công việc đã hoàn thành',
    heading: 'Công việc đã hoàn thành',
    intro: ({ actor }) =>
      `${actor.fullName} đã đánh dấu hoàn thành công việc dưới đây.`
  }
};

// Các dòng thông tin công việc hiển thị trong email
function buildDetailRows(task) {
  const rows = [
    ['Công việc', task.title],
    ['Trạng thái', STATUS_LABELS[task.status] || task.status],
    ['Mức độ ưu tiên', PRIORITY_LABELS[task.priority] || task.priority],
    ['Ngày bắt đầu', formatDate(task.startDate)],
    ['Hạn hoàn thành', formatDate(task.dueDate)]
  ];

  if (task.description) {
    rows.push(['Mô tả', truncate(task.description, 300)]);
  }

  return rows;
}

function renderHtml({ greeting, heading, intro, rows }) {
  const rowsHtml = rows
    .map(
      ([label, value]) => `
        <tr>
          <td style="padding:6px 12px;color:#666;white-space:nowrap;vertical-align:top;">${escapeHtml(label)}</td>
          <td style="padding:6px 12px;"><strong>${escapeHtml(value).replace(/\n/g, '<br>')}</strong></td>
        </tr>`
    )
    .join('');

  return `<!DOCTYPE html>
<html>
  <body style="margin:0;padding:16px;background:#f4f4f7;">
    <div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;background:#ffffff;border-radius:8px;padding:24px;color:#222;">
      <h2 style="margin-top:0;color:#3f51b5;">${escapeHtml(heading)}</h2>
      <p>${escapeHtml(greeting)}</p>
      <p>${escapeHtml(intro)}</p>
      <table style="border-collapse:collapse;width:100%;background:#fafafa;border-radius:6px;">${rowsHtml}
      </table>
      <p style="color:#888;font-size:12px;margin-bottom:0;">Email tự động từ ${escapeHtml(APP_NAME)}, vui lòng không trả lời.</p>
    </div>
  </body>
</html>`;
}

// Tạo nội dung email cho một sự kiện, trả về { subject, text, html }
//   task:      dữ liệu công việc (title, status, priority, startDate, dueDate, description)
//   actor:     người thực hiện thao tác (cần fullName)
//   recipient: người nhận (cần fullName)
//   extra:     thông tin thêm, ví dụ { permission } khi chia sẻ
function buildTaskEmail(eventType, { task, actor, recipient, extra = {} }) {
  const config = EVENTS[eventType];
  if (!config) {
    throw new Error(`Loại email không hợp lệ: ${eventType}`);
  }

  const greeting = `Xin chào ${recipient.fullName},`;
  const intro = config.intro({ actor, extra });
  const rows = buildDetailRows(task);

  // Tiêu đề email phải trên một dòng (tên công việc có thể chứa xuống dòng)
  const subject = truncate(
    oneLine(`[${APP_NAME}] ${config.subject}: ${task.title}`),
    200
  );

  const text = [
    greeting,
    '',
    intro,
    '',
    ...rows.map(([label, value]) => `${label}: ${value}`),
    '',
    `-- Email tự động từ ${APP_NAME}`
  ].join('\n');

  const html = renderHtml({ greeting, heading: config.heading, intro, rows });

  return { subject, text, html };
}

module.exports = { buildTaskEmail };