const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const assignmentRoutes = require('./routes/assignmentRoutes');
const shareRoutes = require('./routes/shareRoutes');
const emailLogRoutes = require('./routes/emailLogRoutes');
const taskRoutes = require('./routes/taskRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const { notFound, errorHandler } = require('./middleware/errorMiddleware');

const app = express();

// Cho phép client (Flutter) gọi API
app.use(cors());

// Cho phép đọc dữ liệu JSON trong body của request
app.use(express.json());

// Route kiểm tra server còn sống không
app.get('/', (req, res) => {
  res.json({
    message: 'Task Manager API is running!',
    status: 'success'
  });
});

// Route kiểm tra sức khỏe: server và database
app.get('/api/health', (req, res) => {
  const dbStates = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting'
  };

  res.json({
    status: 'success',
    message: 'Task Manager API is running!',
    database: dbStates[mongoose.connection.readyState],
    timestamp: new Date().toISOString()
  });
});

// Các route xác thực: /api/auth/...
app.use('/api/auth', authRoutes);

// Các route người dùng: /api/users/...
app.use('/api/users', userRoutes);

// Giao việc, chia sẻ, lịch sử email: gắn trước /api/tasks để đường dẫn dài hơn được xử lý trước
app.use('/api/tasks/:id/assignees', assignmentRoutes);
app.use('/api/tasks/:id/shares', shareRoutes);
app.use('/api/tasks/:id/email-logs', emailLogRoutes);

// Các route công việc: /api/tasks/...
app.use('/api/tasks', taskRoutes);

// Các route thông báo: /api/notifications/...
app.use('/api/notifications', notificationRoutes);

// Hai middleware này PHẢI đặt cuối cùng, sau tất cả route
app.use(notFound);
app.use(errorHandler);

module.exports = app;