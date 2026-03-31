const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

(async () => {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',           // XAMPP thường để trống
    database: 'kskdk_app'
  });

  // Tạo bảng nếu chưa có
  await connection.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      username VARCHAR(100) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      name VARCHAR(255) NOT NULL,
      role VARCHAR(50) NOT NULL,
      specialty VARCHAR(100) NULL
    )
  `);

  const hash = bcrypt.hashSync('123456', 8);
  console.log('Hash for 123456:', hash);

  const users = [
    { username: 'nk', name: 'BS. Nguyễn Văn A', role: 'specialist', specialty: 'Nội khoa' },
    { username: 'ng', name: 'BS. Trần Văn B', role: 'specialist', specialty: 'Ngoại khoa' },
    { username: 'mt', name: 'BS. Lê Thị C', role: 'specialist', specialty: 'Mắt' },
    { username: 'tmh', name: 'BS. Phạm Văn D', role: 'specialist', specialty: 'Tai Mũi Họng' },
    { username: 'rhm', name: 'BS. Hoàng Văn E', role: 'specialist', specialty: 'Răng Hàm Mặt' },
    { username: 'sp', name: 'BS. Nguyễn Thị F', role: 'specialist', specialty: 'Sản phụ khoa' },
    { username: 'nurse', name: 'Điều dưỡng', role: 'nurse', specialty: null },
    { username: 'conclusion', name: 'BS. Kết luận', role: 'conclusion', specialty: null }
  ];

  for (const user of users) {
    await connection.execute(
      `INSERT INTO users (username, password_hash, name, role, specialty)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
       password_hash = VALUES(password_hash),
       name = VALUES(name),
       role = VALUES(role),
       specialty = VALUES(specialty)`,
      [user.username, hash, user.name, user.role, user.specialty]
    );
    console.log(`✅ User ${user.username} created/updated`);
  }

  await connection.end();
  console.log('Done.');
})();