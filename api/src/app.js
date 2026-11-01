const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const authRoutes = require('./routes/authRoutes');
const taskRoutes = require('./routes/taskRoutes');
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

// Các route công việc: /api/tasks/...
app.use('/api/tasks', taskRoutes);

// Hai middleware này PHẢI đặt cuối cùng, sau tất cả route
app.use(notFound);
app.use(errorHandler);

module.exports = app;