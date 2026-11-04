// Kiểm tra cấu hình SMTP trong api/.env
// Cách dùng:
//   node scripts\checkEmail.js                 chỉ kiểm tra kết nối
//   node scripts\checkEmail.js ten@example.com kiểm tra kết nối và gửi một email thử
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const {
  isEmailConfigured,
  getTransporter,
  getFromAddress
} = require('../src/config/email');

async function main() {
  if (!isEmailConfigured()) {
    console.error('Chua cau hinh SMTP: can SMTP_HOST, SMTP_USER, SMTP_PASS trong api/.env');
    process.exit(1);
  }

  const transporter = getTransporter();

  try {
    await transporter.verify();
    console.log('OK: ket noi SMTP thanh cong toi', process.env.SMTP_HOST);
  } catch (error) {
    console.error('LOI ket noi SMTP:', error.message);
    process.exit(1);
  }

  const to = process.argv[2];
  if (to) {
    try {
      await transporter.sendMail({
        from: getFromAddress(),
        to,
        subject: 'Task Manager - email thu',
        text: 'Day la email thu tu Task Manager.'
      });
      console.log('OK: da gui email thu den', to);
    } catch (error) {
      console.error('LOI gui email:', error.message);
      process.exit(1);
    }
  }

  transporter.close();
}

main();