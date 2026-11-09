const EmailLog = require('../models/EmailLog');
const { retryEmail } = require('../services/emailService');
const { loadTaskAccess } = require('../services/taskService');

const { MAX_ATTEMPTS } = EmailLog;

// Chuẩn hóa một bản ghi lịch sử email trả về cho client
function toEmailLogResponse(log) {
  return {
    id: log._id,
    recipientEmail: log.recipientEmail,
    eventType: log.eventType,
    subject: log.subject,
    status: log.status,
    attempts: log.attempts,
    maxAttempts: MAX_ATTEMPTS,
    // Còn gửi lại được không (chỉ email thất bại và chưa hết số lần thử)
    canRetry: log.status === 'failed' && log.attempts < MAX_ATTEMPTS,
    errorMessage: log.errorMessage,
    sentAt: log.sentAt,
    lastAttemptAt: log.lastAttemptAt,
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

// POST /api/email-logs/:id/retry
async function retryEmailLog(req, res) {
  const log = await EmailLog.findById(req.params.id);

  // Không có email, hoặc email không gắn với công việc nào: cùng một thông báo 404
  if (!log || !log.taskId) {
    return res.status(404).json({
      status: 'error',
      message: 'Không tìm thấy email'
    });
  }

  // Quyền dựa trên công việc của email. Công việc đã bị xóa hoặc không liên quan
  // đến người gọi thì cũng là 404, để không lộ email có tồn tại hay không
  const result = await loadTaskAccess(log.taskId, req.user._id);
  if (!result) {
    return res.status(404).json({
      status: 'error',
      message: 'Không tìm thấy email'
    });
  }

  // Chỉ người có quyền quản lý (người tạo) mới được gửi lại
  if (!result.access.capabilities.includes('manage')) {
    return res.status(403).json({
      status: 'error',
      message: 'Bạn không có quyền thực hiện thao tác này'
    });
  }

  if (log.status === 'sent') {
    return res.status(409).json({
      status: 'error',
      message: 'Email này đã gửi thành công, không cần gửi lại'
    });
  }
  if (log.status === 'pending') {
    return res.status(409).json({
      status: 'error',
      message: 'Email đang được gửi, vui lòng chờ'
    });
  }
  if (log.attempts >= MAX_ATTEMPTS) {
    return res.status(409).json({
      status: 'error',
      message: `Email đã được thử gửi tối đa ${MAX_ATTEMPTS} lần`
    });
  }

  const outcome = await retryEmail(log._id, result.task);
  if (!outcome) {
    // Người khác vừa gửi lại cùng lúc
    return res.status(409).json({
      status: 'error',
      message: 'Email vừa được xử lý, vui lòng tải lại danh sách'
    });
  }

  res.json({
    status: 'success',
    message:
      outcome.status === 'sent'
        ? 'Đã gửi lại email thành công'
        : `Đã thử gửi lại nhưng chưa thành công: ${outcome.errorMessage}`,
    data: { log: toEmailLogResponse(outcome) }
  });
}

module.exports = { listTaskEmailLogs, retryEmailLog };