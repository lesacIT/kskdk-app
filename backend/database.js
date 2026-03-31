const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

let pool;

async function initDatabase() {
  pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '',           // XAMPP thường để trống, nếu có mật khẩu thì nhập
    database: 'kskdk_app',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  });

  // Kiểm tra kết nối
  const connection = await pool.getConnection();
  console.log('✅ Kết nối MySQL thành công');
  connection.release();

  // Đảm bảo các bảng tồn tại (tạo nếu chưa có) – có thể dùng file SQL đã import
  // Nếu bạn đã import file SQL thì không cần tạo lại, nhưng vẫn giữ code để phòng trường hợp chưa có.
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      username VARCHAR(100) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      name VARCHAR(255) NOT NULL,
      role VARCHAR(50) NOT NULL,
      specialty VARCHAR(100) NULL
    )
  `);
  // ... tạo các bảng khác tương tự nếu chưa có

  return pool;
}

function getDb() {
  if (!pool) throw new Error('Database not initialized');
  return pool;
}

module.exports = { initDatabase, getDb };