const EmailLog = require('../models/EmailLog');

// Chuẩn hóa một bản ghi lịch sử email trả về cho client
function toEmailLogResponse(log) {
  return {
    id: log._id,
    recipientEmail: log.recipientEmail,
    eventType: log.eventType,
    subject: log.subject,
    status: log.status,
    attempts: log.attempts,
    errorMessage: log.errorMessage,
    sentAt: log.sentAt,
    createdAt: log.createdAt
  };
}

// GET /api/tasks/:id/email-logs  (middleware đã kiểm tra quyền và gắn req.task)
async function listTaskEmailLogs(req, res) {
  const logs = await EmailLog.find({ taskId: req.task._id })
    .sort({ createdAt: -1 }) // mới nhất lên đầu
    .limit(100);

  res.json({
    status: 'success',
    data: {
      count: logs.length,
      logs: logs.map(toEmailLogResponse)
    }
  });
}

module.exports = { listTaskEmailLogs };