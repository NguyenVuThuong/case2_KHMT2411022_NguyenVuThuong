const express = require('express');
const { searchUsers, getUser } = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// Phải đăng nhập mới tìm và xem được người dùng khác
router.use(protect);

// Đặt /search TRƯỚC /:id, nếu không "search" sẽ bị hiểu là một :id
router.get('/search', searchUsers);
router.get('/:id', getUser);

module.exports = router;