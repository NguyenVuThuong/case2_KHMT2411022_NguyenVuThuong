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

// Kiểm tra dữ liệu khi giao việc: emails và/hoặc userIds, primaryUserId tùy chọn
function validateAssign(req, res, next) {
  const body = req.body || {};
  const { emails, userIds, primaryUserId } = body;
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
    errors.push(`Mỗi lần chỉ giao tối đa ${MAX_PER_REQUEST} người`);
  }

  if (
    primaryUserId !== undefined &&
    !(typeof primaryUserId === 'string' && OBJECT_ID_REGEX.test(primaryUserId))
  ) {
    errors.push('primaryUserId không hợp lệ');
  }

  if (errors.length > 0) {
    return sendErrors(res, errors);
  }
  next();
}

// Kiểm tra :userId trên đường dẫn
function validateUserIdParam(req, res, next) {
  if (!OBJECT_ID_REGEX.test(req.params.userId)) {
    return res.status(400).json({
      status: 'error',
      message: 'Mã người dùng không hợp lệ'
    });
  }
  next();
}

// Kiểm tra dữ liệu khi cập nhật người được giao: hiện chỉ hỗ trợ đặt phụ trách chính
function validateAssigneeUpdate(req, res, next) {
  const body = req.body || {};
  if (body.isPrimary !== true) {
    return sendErrors(res, ['Cần gửi isPrimary: true để đặt người phụ trách chính']);
  }
  next();
}

module.exports = { validateAssign, validateUserIdParam, validateAssigneeUpdate };