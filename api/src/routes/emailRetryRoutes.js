const express = require('express');
const { retryEmailLog } = require('../controllers/emailLogController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// Kiểm tra :id có đúng dạng ObjectId (24 ký tự hex) không
function validateEmailLogId(req, res, next) {
  if (!/^[0-9a-fA-F]{24}$/.test(req.params.id)) {
    return res.status(400).json({
      status: 'error',
      message: 'Mã email không hợp lệ'
    });
  }
  next();
}

router.use(protect);

// POST /api/email-logs/:id/retry
router.post('/:id/retry', validateEmailLogId, retryEmailLog);

module.exports = router;