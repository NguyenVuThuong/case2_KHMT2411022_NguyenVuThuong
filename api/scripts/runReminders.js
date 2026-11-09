// Chạy MỘT lượt nhắc hạn ngay (không cần server đang chạy).
// Cách dùng: node scripts\runReminders.js
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const mongoose = require('mongoose');
const { processDueReminders } = require('../src/services/reminderService');

async function main() {
  await mongoose.connect(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 10000
  });

  const result = await processDueReminders();
  console.log(`Da kiem tra ${result.checked} cong viec, nhac ${result.reminded} cong viec`);

  await mongoose.disconnect();
  process.exit(0);
}

main().catch((error) => {
  console.error('LOI:', error.message);
  process.exit(1);
});