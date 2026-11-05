const User = require('../models/User');
const EmailLog = require('../models/EmailLog');
const { getTransporter, getFromAddress } = require('../config/email');
const { buildTaskEmail } = require('../utils/emailTemplates');

// Nghỉ giữa hai email: một số dịch vụ thử (như Mailtrap) giới hạn số email mỗi giây
const DELAY_BETWEEN_EMAILS_MS = 1000;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function logError(error) {
  console.error('Không gửi được email:', error.message);
}

// Gửi MỘT email rồi cập nhật bản ghi log: sent hoặc failed.
// Chỉ thử một lần, không tự gửi lại để tránh gửi trùng.
async function deliver(log, message) {
  log.attempts += 1;
  const transporter = getTransporter();

  if (!transporter) {
    log.status = 'failed';
    log.errorMessage = 'Chưa cấu hình SMTP trong file .env';
    await log.save();
    return;
  }

  try {
    await transporter.sendMail({
      from: getFromAddress(),
      to: log.recipientEmail,
      subject: message.subject,
      text: message.text,
      html: message.html
    });
    log.status = 'sent';
    log.sentAt = new Date();
    log.errorMessage = '';
  } catch (error) {
    log.status = 'failed';
    log.errorMessage = String(error.message || 'Lỗi không xác định').slice(0, 300);
  }

  await log.save();
}

// Xử lý toàn bộ một đợt gửi email cho một sự kiện
async function processTaskEventEmails({ eventType, task, actor, userIds, extra }) {
  // Bỏ trùng và bỏ người thực hiện thao tác
  const recipientIds = [...new Set(userIds)].filter(
    (id) => id !== String(actor._id)
  );
  if (recipientIds.length === 0) {
    return;
  }

  const users = await User.find({ _id: { $in: recipientIds } }).select(
    'fullName email'
  );
  if (users.length === 0) {
    return;
  }

  // Soạn nội dung từng email
  const messages = users.map((user) =>
    buildTaskEmail(eventType, { task, actor, recipient: user, extra })
  );

  // Ghi nhận TRƯỚC khi gửi (pending), để dù gửi lỗi vẫn có dấu vết
  const logs = await EmailLog.insertMany(
    users.map((user, index) => ({
      taskId: task._id,
      recipientEmail: user.email,
      eventType,
      subject: messages[index].subject,
      status: 'pending',
      attempts: 0
    }))
  );

  for (let i = 0; i < logs.length; i += 1) {
    try {
      await deliver(logs[i], messages[i]);
    } catch (error) {
      logError(error);
    }
    if (i < logs.length - 1) {
      await sleep(DELAY_BETWEEN_EMAILS_MS);
    }
  }
}

// Đưa việc gửi email vào chạy NỀN: hàm này trả về ngay, không chờ SMTP,
// nên API trả lời nhanh và lỗi gửi email không làm hỏng thao tác chính.
function queueTaskEventEmails({ eventType, task, actor, userIds, extra }) {
  try {
    // Chụp lại dữ liệu ngay lúc này, vì việc gửi chạy sau khi API đã trả lời
    const job = {
      eventType,
      task: typeof task.toObject === 'function' ? task.toObject() : task,
      actor: { _id: actor._id, fullName: actor.fullName },
      userIds: userIds.map(String),
      extra: extra || {}
    };

    processTaskEventEmails(job).catch(logError);
  } catch (error) {
    logError(error);
  }
}

module.exports = { queueTaskEventEmails };