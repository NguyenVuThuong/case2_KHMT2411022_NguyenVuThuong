// Nạp biến môi trường từ file .env (phải làm đầu tiên)
require('dotenv').config();

const app = require('./app');
const connectDatabase = require('./config/database');
const { startReminderScheduler } = require('./services/reminderService');

const PORT = process.env.PORT || 3000;

// Kết nối database trước, thành công mới mở server
async function startServer() {
  await connectDatabase();

  app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
    // Bật tác vụ nhắc hạn định kỳ
    startReminderScheduler();
  });
}

startServer();