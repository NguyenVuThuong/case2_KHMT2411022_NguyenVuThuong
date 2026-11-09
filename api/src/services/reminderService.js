const Task = require('../models/Task');
const Notification = require('../models/Notification');
const { sendTaskEventEmails } = require('./emailService');

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

// Giờ Việt Nam là UTC+7 và không có giờ mùa hè
const VN_OFFSET_MS = 7 * HOUR_MS;

// Đọc một số từ .env, sai hoặc ngoài khoảng cho phép thì dùng giá trị mặc định
function readNumber(name, fallback, min, max) {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value >= min && value <= max ? value : fallback;
}

function getConfig() {
  return {
    enabled: process.env.REMINDERS_ENABLED !== 'false',
    hoursBefore: readNumber('REMINDER_HOURS_BEFORE', 24, 1, 168),
    checkMinutes: readNumber('REMINDER_CHECK_MINUTES', 15, 1, 1440)
  };
}

// Hạn cuối thực sự của một công việc: hết ngày hạn theo giờ Việt Nam
function deadlineEnd(dueDate) {
  const local = new Date(dueDate.getTime() + VN_OFFSET_MS);
  local.setUTCHours(0, 0, 0, 0);
  return new Date(local.getTime() - VN_OFFSET_MS + DAY_MS);
}

// Có đang trong khoảng "sắp đến hạn" không: [hạn cuối - hoursBefore, hạn cuối)
function isInReminderWindow(dueDate, now, hoursBefore) {
  const end = deadlineEnd(dueDate).getTime();
  return now.getTime() < end && now.getTime() >= end - hoursBefore * HOUR_MS;
}

// Ngày dd/MM/yyyy theo giờ Việt Nam
function formatDate(value) {
  return new Date(value).toLocaleDateString('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

// Gửi thông báo trong ứng dụng và email nhắc hạn cho người tạo và người được giao
async function sendReminder(task) {
  const recipientIds = [
    ...new Set(
      [task.createdBy, ...task.assigneeIds, task.primaryAssigneeId]
        .filter(Boolean)
        .map(String)
    )
  ];

  try {
    await Notification.insertMany(
      recipientIds.map((userId) => ({
        userId,
        taskId: task._id,
        type: 'task_due_soon',
        title: 'Công việc sắp đến hạn',
        message: `Công việc "${task.title}" sắp đến hạn (hạn: ${formatDate(task.dueDate)})`
      }))
    );
  } catch (error) {
    console.error('Không tạo được thông báo nhắc hạn:', error.message);
  }

  // actor = null: người gửi là hệ thống, không ai bị loại khỏi danh sách nhận
  await sendTaskEventEmails({
    eventType: 'task_due_soon',
    task: task.toObject(),
    actor: null,
    userIds: recipientIds,
    extra: {}
  });
}

// Kiểm tra một lượt và nhắc những công việc đến hạn nhắc. Trả về { checked, reminded }.
async function processDueReminders(now = new Date()) {
  const { hoursBefore } = getConfig();

  // Lọc thô trong database (chưa hoàn thành, hạn nằm trong khoảng rộng),
  // lọc chính xác bên dưới bằng JavaScript
  const candidates = await Task.find({
    status: { $ne: 'completed' },
    dueDate: {
      $gt: new Date(now.getTime() - DAY_MS),
      $lt: new Date(now.getTime() + hoursBefore * HOUR_MS)
    }
  });

  let reminded = 0;

  for (const task of candidates) {
    if (!isInReminderWindow(task.dueDate, now, hoursBefore)) {
      continue;
    }

    // Đã nhắc cho đúng hạn này rồi thì bỏ qua
    const sentFor = task.dueReminderSentFor;
    if (sentFor && sentFor.getTime() === task.dueDate.getTime()) {
      continue;
    }

    // "Giành" quyền nhắc bằng một lệnh nguyên tử: chỉ một tiến trình thành công,
    // kể cả khi có hai bản server cùng chạy. timestamps:false để không đổi updatedAt.
    const claim = await Task.updateOne(
      {
        _id: task._id,
        status: { $ne: 'completed' },
        dueDate: task.dueDate,
        dueReminderSentFor: { $ne: task.dueDate }
      },
      { $set: { dueReminderSentFor: task.dueDate } },
      { timestamps: false }
    );
    if (claim.modifiedCount !== 1) {
      continue;
    }

    reminded += 1;
    try {
      await sendReminder(task);
    } catch (error) {
      console.error(`Lỗi khi nhắc hạn công việc ${task._id}:`, error.message);
    }
  }

  return { checked: candidates.length, reminded };
}

// ----- Tác vụ định kỳ -----
let running = false;

async function runOnce() {
  // Lượt trước chưa xong thì bỏ qua lượt này, tránh chạy chồng nhau
  if (running) {
    return;
  }
  running = true;

  try {
    const result = await processDueReminders();
    if (result.reminded > 0) {
      console.log(`Đã nhắc hạn cho ${result.reminded} công việc`);
    }
  } catch (error) {
    console.error('Lỗi tác vụ nhắc hạn:', error.message);
  } finally {
    running = false;
  }
}

function startReminderScheduler() {
  const config = getConfig();

  if (!config.enabled) {
    console.log('Nhắc hạn tự động: đã tắt (REMINDERS_ENABLED=false)');
    return;
  }

  console.log(
    `Nhắc hạn tự động: bật, nhắc trước ${config.hoursBefore} giờ, ` +
      `kiểm tra mỗi ${config.checkMinutes} phút`
  );

  // Chạy lần đầu sau 10 giây (để server khởi động xong), rồi lặp lại định kỳ
  setTimeout(runOnce, 10 * 1000);
  setInterval(runOnce, config.checkMinutes * 60 * 1000);
}

module.exports = {
  deadlineEnd,
  isInReminderWindow,
  processDueReminders,
  startReminderScheduler
};