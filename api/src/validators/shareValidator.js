const { SHARE_PERMISSIONS } = require('../models/TaskShare');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const OBJECT_ID_REGEX = /^[0-9a-fA-F]{24}$/;
const MAX_PER_REQUEST = 20;

function sendErrors(res, errors) {
  return res.status(400).json({
    status: 'error',
    message: 'Dữ liệu không hợp lệ',
    errors
  });
}

// Kiểm tra dữ liệu khi chia sẻ: emails và/hoặc userIds, permission tùy chọn
function validateShare(req, res, next) {
  const body = req.body || {};
  const { emails, userIds, permission } = body;
  const errors = [];

  if (emails !== undefined) {
    const valid =
      Array.isArray(emails) &&
      emails.every((e) => typeof e === 'string' && EMAIL_REGEX.test(e.trim()));
    if (!valid) {
      errors.push('emails phải là danh sách email hợp lệ');
    }
  }

  if (userIds !== undefined) {
    const valid =
      Array.isArray(userIds) &&
      userIds.every((id) => typeof id === 'string' && OBJECT_ID_REGEX.test(id));
    if (!valid) {
      errors.push('userIds phải là danh sách mã người dùng hợp lệ');
    }
  }

  const emailCount = Array.isArray(emails) ? emails.length : 0;
  const idCount = Array.isArray(userIds) ? userIds.length : 0;

  if (errors.length === 0 && emailCount + idCount === 0) {
    errors.push('Cần gửi ít nhất một email hoặc một mã người dùng');
  }
  if (emailCount + idCount > MAX_PER_REQUEST) {
    errors.push(`Mỗi lần chỉ chia sẻ tối đa ${MAX_PER_REQUEST} người`);
  }

  if (permission !== undefined && !SHARE_PERMISSIONS.includes(permission)) {
    errors.push(`Quyền phải là một trong: ${SHARE_PERMISSIONS.join(', ')}`);
  }

  if (errors.length > 0) {
    return sendErrors(res, errors);
  }
  next();
}

// Kiểm tra dữ liệu khi đổi quyền: bắt buộc có permission hợp lệ
function validateSharePermission(req, res, next) {
  const { permission } = req.body || {};
  if (!SHARE_PERMISSIONS.includes(permission)) {
    return sendErrors(res, [
      `Quyền phải là một trong: ${SHARE_PERMISSIONS.join(', ')}`
    ]);
  }
  next();
}

// Kiểm tra :shareId trên đường dẫn
function validateShareIdParam(req, res, next) {
  if (!OBJECT_ID_REGEX.test(req.params.shareId)) {
    return res.status(400).json({
      status: 'error',
      message: 'Mã chia sẻ không hợp lệ'
    });
  }
  next();
}

module.exports = {
  validateShare,
  validateSharePermission,
  validateShareIdParam
};