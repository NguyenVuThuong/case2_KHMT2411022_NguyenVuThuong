const User = require('../models/User');

// Chỉ trả về thông tin công khai, TUYỆT ĐỐI không trả passwordHash
function toPublicUser(user) {
  return {
    id: user._id,
    fullName: user.fullName,
    email: user.email,
    avatarUrl: user.avatarUrl
  };
}

// GET /api/users/search?q=
async function searchUsers(req, res) {
  const q = req.query.q;

  if (typeof q !== 'string' || q.trim().length < 2) {
    return res.status(400).json({
      status: 'error',
      message: 'Từ khóa tìm kiếm phải có ít nhất 2 ký tự'
    });
  }
  if (q.trim().length > 100) {
    return res.status(400).json({
      status: 'error',
      message: 'Từ khóa tìm kiếm tối đa 100 ký tự'
    });
  }

  // Thoát các ký tự đặc biệt của biểu thức chính quy để từ khóa được hiểu là chữ thường
  const escaped = q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(escaped, 'i'); // 'i' = không phân biệt hoa thường

  const users = await User.find({
    $or: [{ fullName: regex }, { email: regex }]
  })
    .select('fullName email avatarUrl')
    .sort({ fullName: 1 })
    .limit(10);

  res.json({
    status: 'success',
    data: { users: users.map(toPublicUser) }
  });
}

// GET /api/users/:id
async function getUser(req, res) {
  if (!/^[0-9a-fA-F]{24}$/.test(req.params.id)) {
    return res.status(400).json({
      status: 'error',
      message: 'Mã người dùng không hợp lệ'
    });
  }

  const user = await User.findById(req.params.id).select(
    'fullName email avatarUrl'
  );

  if (!user) {
    return res.status(404).json({
      status: 'error',
      message: 'Không tìm thấy người dùng'
    });
  }

  res.json({
    status: 'success',
    data: { user: toPublicUser(user) }
  });
}

module.exports = { searchUsers, getUser };