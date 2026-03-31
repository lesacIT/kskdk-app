require('dotenv').config();
const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const path = require('path');
const { initDatabase, getDb } = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

// Cấu hình session – phải đặt trước các route
app.use(session({
  secret: process.env.SESSION_SECRET || 'my_super_secret_key_change_me',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: false,          // true nếu dùng HTTPS
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 ngày
  }
}));

// CORS: cho phép gửi cookie từ frontend
app.use(cors({
  origin: 'http://localhost:3000', // frontend URL
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, '../frontend')));

// Middleware kiểm tra đăng nhập
function requireAuth(req, res, next) {
  if (req.session && req.session.userId) {
    next();
  } else {
    res.status(401).json({ error: 'Chưa đăng nhập' });
  }
}

// ========== AUTH ==========
app.post('/api/auth/login', async (req, res) => {
  const { username, password, rememberMe } = req.body;
  if (!username || !password) {
    return res.status(400).json({ success: false, error: 'Thiếu tên đăng nhập hoặc mật khẩu' });
  }
  try {
    const db = getDb();
    const [rows] = await db.execute('SELECT * FROM users WHERE username = ?', [username]);
    if (rows.length === 0) {
      return res.status(401).json({ success: false, error: 'Sai tên đăng nhập hoặc mật khẩu' });
    }
    const user = rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ success: false, error: 'Sai tên đăng nhập hoặc mật khẩu' });
    }
    // Lưu session
    req.session.userId = user.id;
    req.session.user = {
      id: user.id,
      name: user.name,
      username: user.username,
      role: user.role,
      specialty: user.specialty
    };
    if (rememberMe) {
      req.session.cookie.maxAge = 7 * 24 * 60 * 60 * 1000; // 7 ngày
    } else {
      req.session.cookie.expires = false; // session cookie
    }
    res.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        username: user.username,
        role: user.role
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

app.get('/api/auth/me', requireAuth, (req, res) => {
  res.json({ success: true, user: req.session.user });
});

app.post('/api/auth/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) console.error('Logout error:', err);
    res.clearCookie('connect.sid');
    res.json({ success: true });
  });
});

// ========== EMPLOYEES ==========
app.get('/api/employees', requireAuth, async (req, res) => {
  const db = getDb();
  const [rows] = await db.execute('SELECT * FROM employees ORDER BY created_at DESC');
  res.json({ success: true, data: rows });
});

app.get('/api/employees/:code', requireAuth, async (req, res) => {
  const db = getDb();
  const [rows] = await db.execute('SELECT * FROM employees WHERE patient_code = ?', [req.params.code]);
  if (rows.length === 0) return res.status(404).json({ error: 'Không tìm thấy' });
  res.json({ success: true, data: rows[0] });
});

app.post('/api/employees', requireAuth, async (req, res) => {
  const { patient_code, name, gender, dob, dept, position, phone, email, note } = req.body;
  const db = getDb();
  try {
    await db.execute(
      `INSERT INTO employees (patient_code, name, gender, dob, dept, position, phone, email, note)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [patient_code, name, gender, dob, dept, position, phone, email, note]
    );
    res.json({ success: true });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      res.status(409).json({ error: 'Mã nhân viên đã tồn tại' });
    } else {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  }
});

app.put('/api/employees/:code', requireAuth, async (req, res) => {
  const { name, gender, dob, dept, position, phone, email, note } = req.body;
  const db = getDb();
  await db.execute(
    `UPDATE employees SET name=?, gender=?, dob=?, dept=?, position=?, phone=?, email=?, note=?
     WHERE patient_code=?`,
    [name, gender, dob, dept, position, phone, email, note, req.params.code]
  );
  res.json({ success: true });
});

app.delete('/api/employees/:code', requireAuth, async (req, res) => {
  const db = getDb();
  await db.execute('DELETE FROM employees WHERE patient_code = ?', [req.params.code]);
  res.json({ success: true });
});

// ========== REGISTRATIONS ==========
app.post('/api/registrations', requireAuth, async (req, res) => {
  const { empId, name, gender, dob, age, job, history, hazard, dept, registerDate } = req.body;
  const db = getDb();
  await db.execute(
    `INSERT INTO registrations (emp_id, name, gender, dob, age, job, history, hazard, dept, register_date)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [empId, name, gender, dob, age, job, history, hazard, dept, registerDate || new Date().toISOString().slice(0,10)]
  );
  res.json({ success: true });
});

app.get('/api/registrations/today', requireAuth, async (req, res) => {
  const db = getDb();
  const today = new Date().toISOString().slice(0,10);
  const [rows] = await db.execute(
    'SELECT * FROM registrations WHERE register_date = ? ORDER BY register_time DESC',
    [today]
  );
  res.json({ success: true, data: rows });
});

// ========== EXAMINATIONS ==========
app.get('/api/examinations/:patientCode', requireAuth, async (req, res) => {
  const db = getDb();
  const [rows] = await db.execute(
    `SELECT * FROM examinations WHERE emp_id = ? ORDER BY exam_date DESC LIMIT 1`,
    [req.params.patientCode]
  );
  if (rows.length === 0) {
    return res.json({ success: true, data: null });
  }
  const exam = rows[0];
  exam.data = JSON.parse(exam.data);
  exam.completed_sections = exam.completed_sections ? JSON.parse(exam.completed_sections) : [];
  res.json({ success: true, data: exam });
});

app.post('/api/examinations', requireAuth, async (req, res) => {
  const { patient_code, exam_data } = req.body;
  const db = getDb();

  // Kiểm tra bản ghi cũ
  const [existing] = await db.execute(
    `SELECT id FROM examinations WHERE emp_id = ? ORDER BY exam_date DESC LIMIT 1`,
    [patient_code]
  );

  const dataJson = JSON.stringify(exam_data);
  const sectionsJson = JSON.stringify(exam_data.completed_sections || []);

  if (existing.length > 0) {
    await db.execute(
      `UPDATE examinations SET data = ?, completed_sections = ?, exam_date = NOW()
       WHERE id = ?`,
      [dataJson, sectionsJson, existing[0].id]
    );
  } else {
    await db.execute(
      `INSERT INTO examinations (emp_id, data, completed_sections, exam_date)
       VALUES (?, ?, ?, NOW())`,
      [patient_code, dataJson, sectionsJson]
    );
  }
  res.json({ success: true });
});
// ========== REGISTER ==========
app.post('/api/auth/register', async (req, res) => {
  const { username, password, name, role, specialty } = req.body;
  if (!username || !password || !name) {
    return res.status(400).json({ success: false, error: 'Vui lòng điền đầy đủ thông tin' });
  }
  try {
    const db = getDb();
    const [existing] = await db.execute('SELECT id FROM users WHERE username = ?', [username]);
    if (existing.length > 0) {
      return res.status(409).json({ success: false, error: 'Tên đăng nhập đã tồn tại' });
    }
    const hashedPassword = bcrypt.hashSync(password, 8);
    await db.execute(
      `INSERT INTO users (username, password_hash, name, role, specialty)
       VALUES (?, ?, ?, ?, ?)`,
      [username, hashedPassword, name, role || 'user', specialty || null]
    );
    res.json({ success: true, message: 'Đăng ký thành công' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Lỗi server' });
  }
});
// ========== SERVE FRONTEND ==========
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// ========== KHỞI ĐỘNG SERVER ==========
async function start() {
  try {
    await initDatabase();
    app.listen(PORT, () => {
      console.log(`🚀 Server chạy tại http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('❌ Không thể khởi động server:', err);
    process.exit(1);
  }
}

start();