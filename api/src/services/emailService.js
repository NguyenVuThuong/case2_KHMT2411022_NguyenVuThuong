const User = require('../models/User');
const EmailLog = require('../models/EmailLog');
const { getTransporter, getFromAddress } = require('../config/email');
const { buildTaskEmail } = require('../utils/emailTemplates');

const { MAX_ATTEMPTS } = EmailLog;

// Nghỉ giữa hai email: một số dịch vụ thử (như Mailtrap) giới hạn số email mỗi giây
const DELAY_BETWEEN_EMAILS_MS = 1000;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function logError(error) {
  console.error('Không gửi được email:', error.message);
}

function toPlain(doc) {
  return doc && typeof doc.toObject === 'function' ? doc.toObject() : doc;
}

function describeError(error) {
  return String((error && error.message) || 'Lỗi không xác định').slice(0, 300);
}

// Gửi MỘT email rồi ghi kết quả vào log: sent hoặc failed.
// Hàm này KHÔNG đụng đến attempts (nơi gọi tự đếm).
async function sendAndRecord(log, message) {
  log.lastAttemptAt = new Date();
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
    log.errorMessage = describeError(error);
  }

  await log.save();
}

// Xử lý toàn bộ một đợt gửi email cho một sự kiện.
//   actor: người thực hiện thao tác, hoặc null nếu do hệ thống (ví dụ nhắc hạn)
async function processTaskEventEmails({ eventType, task, actor, userIds, extra }) {
  const actorId = actor ? String(actor._id) : null;

  // Bỏ trùng và bỏ người thực hiện thao tác
  const recipientIds = [...new Set(userIds.map(String))].filter(
    (id) => id !== actorId
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
    buildTaskEmail(eventType, { task, actor, recipient: user, extra: extra || {} })
  );

  // Ghi nhận TRƯỚC khi gửi (pending), để dù gửi lỗi vẫn có dấu vết.
  // attempts = 1 vì ngay sau đây là lần thử đầu tiên.
  const logs = await EmailLog.insertMany(
    users.map((user, index) => ({
      taskId: task._id,
      recipientEmail: user.email,
      eventType,
      subject: messages[index].subject,
      status: 'pending',
      attempts: 1,
      lastAttemptAt: new Date(),
      actorId: actor ? actor._id : null,
      permission: (extra && extra.permission) || ''
    }))
  );

  for (let i = 0; i < logs.length; i += 1) {
    try {
      await sendAndRecord(logs[i], messages[i]);
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
      task: toPlain(task),
      actor: actor ? { _id: actor._id, fullName: actor.fullName } : null,
      userIds: userIds.map(String),
      extra: extra || {}
    };

    processTaskEventEmails(job).catch(logError);
  } catch (error) {
    logError(error);
  }
}

// Thử gửi lại một email đã thất bại. Trả về bản ghi log sau khi thử,
// hoặc null nếu email không còn đủ điều kiện (người khác vừa xử lý).
async function retryEmail(logId, task) {
  // Chuyển failed -> pending và tăng attempts trong MỘT thao tác nguyên tử.
  // Hai yêu cầu cùng lúc thì chỉ một yêu cầu "giành" được bản ghi.
  const claimed = await EmailLog.findOneAndUpdate(
    { _id: logId, status: 'failed', attempts: { $lt: MAX_ATTEMPTS } },
    { $set: { status: 'pending', errorMessage: '' }, $inc: { attempts: 1 } },
    { new: true }
  );
  if (!claimed) {
    return null;
  }

  try {
    const [recipientUser, actorUser] = await Promise.all([
      User.findOne({ email: claimed.recipientEmail }).select('fullName email'),
      claimed.actorId ? User.findById(claimed.actorId).select('fullName') : null
    ]);

    const message = buildTaskEmail(claimed.eventType, {
      task: toPlain(task),
      actor: actorUser || { _id: null, fullName: 'Một thành viên' },
      recipient: recipientUser || { fullName: claimed.recipientEmail },
      extra: { permission: claimed.permission }
    });

    claimed.subject = message.subject;
    await sendAndRecord(claimed, message);
  } catch (error) {
    // Không để bản ghi kẹt ở pending
    claimed.status = 'failed';
    claimed.errorMessage = describeError(error);
    claimed.lastAttemptAt = new Date();
    await claimed.save();
  }

  return claimed;
}

module.exports = {
  queueTaskEventEmails,
  sendTaskEventEmails: processTaskEventEmails,
  retryEmail
};