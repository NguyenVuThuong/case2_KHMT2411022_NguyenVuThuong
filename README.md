# Case Study 2 – Task Manager

## Thông tin sinh viên

- Họ tên: Nguyễn Vũ Thương
- MSSV: KHMT2411022

## Giới thiệu

Ứng dụng cho phép quản lý công việc cá nhân, giao việc cho một hoặc nhiều người, chia sẻ công việc theo quyền xem hoặc chỉnh sửa, theo dõi tiến độ, nhận thông báo trong ứng dụng và qua email.

## Công nghệ

- Frontend: Flutter (Dart), gói `http` và `shared_preferences`
- Backend: Node.js, Express 5, Mongoose
- Cơ sở dữ liệu: MongoDB Atlas
- Xác thực: JWT, mật khẩu băm bằng `bcryptjs`
- Email: Nodemailer qua SMTP, gửi từ backend
- Quản lý mã nguồn: Git và GitHub

## Cấu trúc thư mục

- `api/`: backend Node.js
  - `src/config`: kết nối MongoDB, cấu hình email
  - `src/models`: User, Task, TaskShare, Notification, EmailLog
  - `src/controllers`, `src/routes`: xử lý và định tuyến API
  - `src/services`: tính quyền, thông báo, email, thống kê
  - `src/middleware`: xác thực JWT, kiểm tra quyền, xử lý lỗi
  - `src/validators`, `src/utils`: kiểm tra dữ liệu, mẫu email
  - `scripts/`: các script kiểm thử
- `TaskManager/`: ứng dụng Flutter
  - `lib/models`, `lib/services`, `lib/screens`, `lib/widgets`, `lib/utils`

## Chức năng đã hoàn thành

| Nhóm | Chức năng |
|---|---|
| A. Tài khoản | Đăng ký, đăng nhập, đăng xuất, xem và cập nhật thông tin cá nhân, đổi mật khẩu |
| B. Công việc | Tạo, xem, sửa, xóa; đổi trạng thái; mức ưu tiên; ngày bắt đầu và hạn; tìm kiếm theo tên (không phân biệt dấu); lọc theo trạng thái, ưu tiên, người phụ trách; sắp xếp theo hạn, ưu tiên, thời gian tạo |
| C. Giao việc và chia sẻ | Giao cho nhiều người, người phụ trách chính; chia sẻ với quyền viewer hoặc editor; đổi và thu hồi quyền; phân loại công việc của tôi, được giao, được chia sẻ |
| D. Thông báo | Thông báo trong ứng dụng (đánh dấu đã đọc, mở công việc liên quan, số chưa đọc); email khi giao việc, chia sẻ, đổi hạn, hoàn thành; lưu lịch sử email sent hoặc failed |
| E. Thống kê | Số công việc theo trạng thái, việc được giao và đang phụ trách, việc sắp đến hạn và quá hạn; trạng thái tải, lỗi, kết quả thao tác |

## Yêu cầu cài đặt

- Node.js và npm
- Flutter SDK và Android Studio (hoặc Chrome để chạy bản web)
- Một cluster MongoDB Atlas (cho phép địa chỉ IP của máy trong mục Network Access)
- Tài khoản SMTP để gửi email, ví dụ Mailtrap (hộp thư giả lập) hoặc Gmail với mật khẩu ứng dụng

Địa chỉ API được chọn tự động trong `lib/utils/constants.dart`:

| Chạy trên | Địa chỉ API |
|---|---|
| Android Emulator | `http://10.0.2.2:3000/api` |
| Chrome hoặc Windows | `http://localhost:3000/api` |
| Điện thoại thật | Đổi sang địa chỉ IP của máy tính trong cùng mạng WiFi |

Bản Android cho phép gọi `http` (không mã hóa) trong `AndroidManifest.xml` để phục vụ phát triển. Sản phẩm thật nên dùng `https`.

## Biến môi trường (`api/.env`)

| Biến | Ý nghĩa |
|---|---|
| `PORT` | Cổng chạy API (mặc định 3000) |
| `MONGODB_URI` | Chuỗi kết nối MongoDB Atlas |
| `JWT_SECRET` | Khóa ký token JWT, chuỗi ngẫu nhiên dài |
| `JWT_EXPIRES_IN` | Thời hạn token, ví dụ `7d` |
| `SMTP_HOST`, `SMTP_PORT` | Máy chủ và cổng SMTP |
| `SMTP_USER`, `SMTP_PASS` | Tên đăng nhập và mật khẩu SMTP |
| `EMAIL_FROM` | Tên và địa chỉ người gửi hiển thị trong email |


## Phân quyền

| Vai trò | Xem | Đổi trạng thái | Sửa nội dung | Xóa | Giao việc và chia sẻ |
|---|:-:|:-:|:-:|:-:|:-:|
| Người tạo | có | có | có | có | có |
| Editor | có | có | có | không | không |
| Người được giao | có | có | không | không | không |
| Viewer | có | không | không | không | không |

Một người có nhiều vai trò thì quyền là hợp của các vai trò. Quyền được kiểm tra ở backend, không chỉ ẩn nút trên giao diện. Người không liên quan nhận 404, người đã thấy công việc nhưng thiếu quyền nhận 403.

## API chính

Base URL: `http://localhost:3000/api`. Các API nghiệp vụ yêu cầu header `Authorization: Bearer <token>`.

| Nhóm | Endpoint |
|---|---|
| Xác thực | `POST /auth/register`, `POST /auth/login`, `GET /auth/me`, `PUT /auth/me`, `PUT /auth/change-password` |
| Người dùng | `GET /users/search?q=`, `GET /users/:id` |
| Công việc | `GET /tasks` (tham số `scope`, `q`, `status`, `priority`, `assignee`, `sortBy`, `order`), `POST /tasks`, `GET /tasks/:id`, `PUT /tasks/:id`, `PATCH /tasks/:id/status`, `DELETE /tasks/:id` |
| Giao việc | `GET`, `POST /tasks/:id/assignees`, `PATCH`, `DELETE /tasks/:id/assignees/:userId` |
| Chia sẻ | `GET`, `POST /tasks/:id/shares`, `PATCH`, `DELETE /tasks/:id/shares/:shareId` |
| Thông báo | `GET /notifications`, `GET /notifications/unread-count`, `PATCH /notifications/:id/read`, `PATCH /notifications/read-all` |
| Email | `GET /tasks/:id/email-logs` (chỉ người tạo) |
| Thống kê | `GET /statistics/tasks`, `GET /statistics/assignments`, `GET /statistics/deadlines?days=` |




|