const nodemailer = require('nodemailer');

let transporter = null;

// Đã cấu hình SMTP trong .env chưa?
function isEmailConfigured() {
  return Boolean(
    process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS
  );
}

// Tạo "người đưa thư" (transporter) một lần rồi dùng lại.
// Chưa cấu hình SMTP thì trả null để nơi gọi ghi log "failed" thay vì bị lỗi.
function getTransporter() {
  if (!isEmailConfigured()) {
    return null;
  }

  if (!transporter) {
    const port = Number(process.env.SMTP_PORT) || 587;

    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      // Cổng 465 dùng SSL ngay từ đầu; các cổng khác (587, 2525) nâng cấp bảo mật khi kết nối
      secure: port === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      },
      // Không chờ vô hạn nếu máy chủ SMTP không phản hồi
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000
    });
  }

  return transporter;
}

// Địa chỉ người gửi hiển thị trong email
function getFromAddress() {
  return process.env.EMAIL_FROM || `Task Manager <${process.env.SMTP_USER}>`;
}

module.exports = { isEmailConfigured, getTransporter, getFromAddress };