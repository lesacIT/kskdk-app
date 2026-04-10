require('dotenv').config();
const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const path = require('path');
const { initDatabase, getDb } = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;
const { PythonShell } = require('python-shell');

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
// ========== XUẤT PHIẾU KHÁM (DOCX/PDF) ==========
app.post('/api/xuat-phieu', requireAuth, async (req, res) => {
  try {
    const hoso = req.body; // Dữ liệu đầu vào từ frontend
    const jsonData = JSON.stringify({ hoso });

    const options = {
      mode: 'json',
      pythonPath: 'py',
      scriptPath: path.join(__dirname, 'python-scripts'),
      args: [jsonData]
    };

    PythonShell.run('xuat_phieu_kham.py', options)
      .then((messages) => {
        const result = messages[0];
        if (result.success) {
          // Đọc file đã tạo (DOCX hoặc PDF)
          const fileBuffer = fs.readFileSync(result.filePath);
          const base64 = fileBuffer.toString('base64');
          const filename = path.basename(result.filePath);
          // Xóa file tạm sau khi đọc (giải phóng bộ nhớ)
          fs.unlinkSync(result.filePath);
          res.json({ success: true, base64, filename });
        } else {
          res.status(500).json({ error: result.error });
        }
      })
      .catch((err) => {
        console.error('Python error:', err);
        res.status(500).json({ error: err.message });
      });
  } catch (err) {
    console.error('API error:', err);
    res.status(500).json({ error: err.message });
  }
});

const bwipjs = require('bwip-js');
app.post('/api/examinations', requireAuth, async (req, res) => {
  const { patient_code, exam_date } = req.body;
  if (!patient_code) return res.status(400).json({ success: false, error: 'Thiếu patient_code' });
  try {
    const db = getDb();
    // Kiểm tra xem đã có chưa (để tránh trùng)
    const [existing] = await db.execute('SELECT id FROM examinations WHERE emp_id = ?', [patient_code]);
    if (existing.length > 0) {
      return res.json({ success: true, data: existing[0], message: 'Đã tồn tại' });
    }
    const [result] = await db.execute(
      `INSERT INTO examinations (emp_id, exam_date, data, completed_sections, status) 
       VALUES (?, ?, ?, ?, ?)`,
      [patient_code, exam_date || new Date(), '{}', '[]', 'pending']
    );
    res.json({ success: true, data: { id: result.insertId } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});
app.put('/api/examinations/:id', requireAuth, async (req, res) => {
  const examId = req.params.id;
  const { data, completed_sections, status, doctor_name, sign_date } = req.body;
  try {
    const db = getDb();
    const [rows] = await db.execute('SELECT data, completed_sections FROM examinations WHERE id = ?', [examId]);
    if (rows.length === 0) return res.status(404).json({ success: false, error: 'Không tìm thấy' });

    let currentData = {};
    try { currentData = JSON.parse(rows[0].data); } catch (e) { }
    let currentSections = [];
    try { currentSections = JSON.parse(rows[0].completed_sections || '[]'); } catch (e) { }

    const newData = data ? { ...currentData, ...data } : currentData;
    const newSections = completed_sections
      ? [...new Set([...currentSections, ...completed_sections])]
      : currentSections;

    // Log để kiểm tra
    console.log('Updating exam', examId, 'with sections:', newSections);

    await db.execute(
      `UPDATE examinations 
       SET data = ?, completed_sections = ?, status = ?, doctor_name = ?, sign_date = ?
       WHERE id = ?`,
      [JSON.stringify(newData), JSON.stringify(newSections), status || 'pending',
      doctor_name || req.session.user?.name, sign_date || null, examId]
    );
    res.json({ success: true, message: 'Cập nhật thành công' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});
// API tạo mã vạch từ patient_code
app.get('/api/barcode/:code', async (req, res) => {
  const code = req.params.code;
  if (!code) return res.status(400).send('Missing code');
  try {
    const buffer = await bwipjs.toBuffer({
      bcid: 'code128',        // loại mã vạch (code128 phổ biến)
      text: code,
      scale: 3,
      height: 10,             // chiều cao (mm)
      includetext: true,      // hiển thị số bên dưới
      textxalign: 'center',
    });
    res.setHeader('Content-Type', 'image/png');
    res.send(buffer);
  } catch (err) {
    console.error(err);
    res.status(500).send('Lỗi tạo mã vạch');
  }
});
// ========== TEST PYTHON ==========
app.post('/api/xuat-phieu', requireAuth, async (req, res) => {
  try {
    // Giả sử bạn có dữ liệu hoso từ database
    const hoso = req.body;  // hoặc lấy từ database dựa trên ID

    // Chuyển dữ liệu thành JSON string
    const jsonData = JSON.stringify({ hoso });

    const options = {
      mode: 'json',
      pythonPath: 'py',
      scriptPath: path.join(__dirname, 'python-scripts'),
      args: [jsonData]
    };

    PythonShell.run('xuat_phieu_kham.py', options)
      .then(messages => {
        const result = messages[0];
        if (result.success) {
          // Trả về đường dẫn file hoặc nội dung file cho client tải về
          res.json({ success: true, filePath: result.filePath });
        } else {
          res.status(500).json({ error: result.error });
        }
      })
      .catch(err => {
        console.error(err);
        res.status(500).json({ error: err.message });
      });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


app.get('/test-python', (req, res) => {
  PythonShell.run('test.py', { scriptPath: './python-scripts' })
    .then(messages => res.send(messages))
    .catch(err => res.status(500).send(err.message));
});

// ========== TẠO QR CODE TỪ MÃ ==========
app.get('/api/qr/:code', async (req, res) => {
  const code = req.params.code;
  if (!code) return res.status(400).send('Missing code');
  try {
    const QRCode = require('qrcode');
    const qrBuffer = await QRCode.toBuffer(code, { width: 200 });
    res.setHeader('Content-Type', 'image/png');
    res.send(qrBuffer);
  } catch (err) {
    console.error(err);
    res.status(500).send('Lỗi tạo QR');
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
    [empId, name, gender, dob, age, job, history, hazard, dept, registerDate || new Date().toISOString().slice(0, 10)]
  );
  res.json({ success: true });
});

app.get('/api/registrations/today', requireAuth, async (req, res) => {
  const db = getDb();
  const today = new Date().toISOString().slice(0, 10);
  const [rows] = await db.execute(
    'SELECT * FROM registrations WHERE register_date = ? ORDER BY register_time DESC',
    [today]
  );
  res.json({ success: true, data: rows });
});

// ========== EXAMINATIONS ==========
// Lấy danh sách tất cả examinations (hoặc lọc theo specialty)
// Cập nhật dữ liệu khám theo id
app.put('/api/examinations/:id', requireAuth, async (req, res) => {
  const examId = req.params.id;
  const { data, completed_sections, status, doctor_name, sign_date } = req.body;
  try {
    const db = getDb();
    const [rows] = await db.execute('SELECT data, completed_sections FROM examinations WHERE id = ?', [examId]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Không tìm thấy phiếu khám' });
    }

    let currentData = {};
    try { currentData = JSON.parse(rows[0].data); } catch (e) { }
    let currentSections = [];
    try { currentSections = JSON.parse(rows[0].completed_sections || '[]'); } catch (e) { }

    // Merge dữ liệu mới (nếu data được gửi lên)
    const newData = data ? { ...currentData, ...data } : currentData;
    const newSections = completed_sections
      ? [...new Set([...currentSections, ...completed_sections])]
      : currentSections;

    const updateQuery = `
      UPDATE examinations 
      SET data = ?, completed_sections = ?, status = ?, doctor_name = ?, sign_date = ?
      WHERE id = ?
    `;
    await db.execute(updateQuery, [
      JSON.stringify(newData),
      JSON.stringify(newSections),
      status || 'pending',
      doctor_name || req.session.user?.name,
      sign_date || null,
      examId
    ]);
    res.json({ success: true, message: 'Cập nhật thành công' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});
// Lấy examination mới nhất theo mã bệnh nhân
app.get('/api/examinations/:patientCode', requireAuth, async (req, res) => {
  const patientCode = req.params.patientCode;
  try {
    const db = getDb();
    const [rows] = await db.execute(
      `SELECT * FROM examinations WHERE emp_id = ? ORDER BY exam_date DESC LIMIT 1`,
      [patientCode]
    );
    if (rows.length === 0) return res.json({ success: true, data: null });
    const exam = rows[0];
    exam.data = exam.data ? JSON.parse(exam.data) : {};
    exam.completed_sections = exam.completed_sections ? JSON.parse(exam.completed_sections) : [];
    res.json({ success: true, data: exam });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Ở ĐẦU FILE (app.js hoặc server.js) phải có:

const fs = require('fs');
// ... các require khác (mysql, session, ...)
// KHÔNG require mammoth nữa nếu bạn bỏ hẳn

// tạo file
// Tạo thư mục templates và file template nếu chưa tồn tại
const templatesDir = path.join(__dirname, '../templates');
const templateFile = path.join(templatesDir, 'phieu-kham-template.html');
if (!fs.existsSync(templatesDir)) {
  fs.mkdirSync(templatesDir, { recursive: true });
  console.log('Đã tạo thư mục templates');
}

if (!fs.existsSync(templateFile)) {
  const templateContent = `<!-- Nội dung HTML template ở đây -->`; // Paste nội dung HTML từ câu trước vào
  fs.writeFileSync(templateFile, templateContent, 'utf8');
  console.log('Đã tạo file phieu-kham-template.html');
}
//
// ========== HIỂN THỊ PHIẾU KHÁM TỪ FILE HTML TEMPLATE ==========
app.get('/api/exams/:id/html', requireAuth, async (req, res) => {
  const examinationId = req.params.id;
  try {
    const db = getDb();
    const [rows] = await db.execute(`
      SELECT e.*, emp.patient_code, emp.name as emp_name, emp.gender, emp.dob, emp.dept, emp.phone, emp.email
      FROM examinations e
      JOIN employees emp ON e.emp_id = emp.patient_code
      WHERE e.id = ?
    `, [examinationId]);
    if (rows.length === 0) {
      return res.status(404).send('<h3>Không tìm thấy phiếu khám</h3>');
    }
    const exam = rows[0];
    let examData = {};
    try { examData = JSON.parse(exam.data); } catch (e) { }

    // Lấy thông tin đăng ký
    let registration = null;
    try {
      const [regRows] = await db.execute(
        `SELECT history, hazard, job FROM registrations WHERE emp_id = ? ORDER BY register_date DESC LIMIT 1`,
        [exam.emp_id]
      );
      if (regRows.length) registration = regRows[0];
    } catch (e) { }

    // Lấy chữ ký bác sĩ
    let signatures = {};
    try {
      const [sigRows] = await db.execute(
        `SELECT specialty, doctor_name, signed_at FROM examination_signatures WHERE examination_id = ?`,
        [examinationId]
      );
      for (let s of sigRows) {
        signatures[s.specialty] = { doctor_name: s.doctor_name, signed_at: s.signed_at };
      }
    } catch (e) { }

    const safe = (val) => (val !== undefined && val !== null) ? val : '';
    const formatClass = (cls) => cls ? `Loại ${cls}` : '';

    const getNKClass = (field) => {
      if (examData.nk && examData.nk[`class${field}`]) return formatClass(examData.nk[`class${field}`]);
      if (examData.nk && examData.nk.class) return formatClass(examData.nk.class);
      return '';
    };

    const tq = examData.tq || {};
    const nk = examData.nk || {};
    const ng = examData.ng || {};
    const mt = examData.mt || {};
    const tmh = examData.tmh || {};
    const rhm = examData.rhm || {};
    const sp = examData.sp || {};
    const kl = examData.kl || {};

    // Tính tuổi
    let age = '';
    if (exam.dob) {
      const birth = new Date(exam.dob);
      const today = new Date();
      let ageNum = today.getFullYear() - birth.getFullYear();
      const m = today.getMonth() - birth.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) ageNum--;
      age = ageNum.toString();
    }

    const getSig = (specialtyKey) => {
      const sig = signatures[specialtyKey];
      if (sig) return `Ngày ký: ${new Date(sig.signed_at).toLocaleString('vi-VN')}<br>Người ký: ${sig.doctor_name}`;
      return '';
    };

    let conclusionDate = '';
    if (exam.sign_date) {
      const d = new Date(exam.sign_date);
      conclusionDate = `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
    } else {
      const d = new Date();
      conclusionDate = `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
    }

    // Đọc file HTML template (chỉ đọc 1 lần)
    const templatePath = path.join(__dirname, '../templates/phieu-kham-template.html');
    let htmlContent = fs.readFileSync(templatePath, 'utf8');

    // Map các placeholder
    const replaceMap = {
      '{{HOTEN}}': exam.emp_name,
      '{{GIOI_TINH}}': exam.gender,
      '{{NGAY_SINH}}': exam.dob,
      '{{TUOI}}': age,
      '{{SO_CMND}}': exam.patient_code,
      '{{CHOHIENTAI}}': exam.dept,
      '{{DIENTHOAI}}': exam.phone,
      '{{VITRI_NGHE}}': registration?.job || '',
      '{{TIENSU}}': registration?.history || '',
      '{{YEUTO_HAI}}': registration?.hazard || '',
      '{{CHIEU_CAO}}': tq.height,
      '{{CAN_NANG}}': tq.weight,
      '{{BMI}}': tq.bmi,
      '{{MACH}}': tq.pulse,
      '{{HUYET_AP}}': tq.bpDisplay,
      '{{PHANLOAI_THE_LUC}}': tq.physicalClass,
      '{{TUAN_HOAN}}': nk.nkTH,
      '{{PHAN_LOAI_TUAN_HOAN}}': getNKClass('TH'),
      '{{HO_HAP}}': nk.nkHH,
      '{{PHAN_LOAI_HO_HAP}}': getNKClass('HH'),
      '{{TIEU_HOA}}': nk.nkTHoa,
      '{{PHAN_LOAI_TIEU_HOA}}': getNKClass('THoa'),
      '{{THAN_TIET_NIEU}}': nk.nkTTN,
      '{{PHAN_LOAI_THAN_TIET_NIEU}}': getNKClass('TTN'),
      '{{NOI_TIET}}': nk.nkNT,
      '{{PHAN_LOAI_NOI_TIET}}': getNKClass('NT'),
      '{{CO_XUONG_KHOP}}': nk.nkCXK,
      '{{PHAN_LOAI_CO_XUONG_KHOP}}': getNKClass('CXK'),
      '{{THAN_KINH}}': nk.nkTK,
      '{{PHAN_LOAI_THAN_KINH}}': getNKClass('TK'),
      '{{TAM_THAN}}': nk.nkTThan,
      '{{PHAN_LOAI_TAM_THAN}}': getNKClass('TThan'),
      '{{NG_NGOAI_KHOA}}': ng.ngNgoai,
      '{{PHAN_LOAI_NGOAI_KHOA}}': ng.class ? formatClass(ng.class) : '',
      '{{NG_DA_LIEU}}': ng.ngDa,
      '{{SP_CONTENT}}': sp.spContent,
      '{{PHAN_LOAI_SP}}': sp.class ? formatClass(sp.class) : '',
      '{{MT_KHONG_KINH_R}}': mt.mtNoGlassR,
      '{{MT_KHONG_KINH_L}}': mt.mtNoGlassL,
      '{{MT_CO_KINH_R}}': mt.mtGlassR,
      '{{MT_CO_KINH_L}}': mt.mtGlassL,
      '{{MT_BENH}}': mt.mtDiag,
      '{{PHAN_LOAI_MT}}': mt.class ? formatClass(mt.class) : '',
      '{{TMH_TAI_TRAI_THUONG}}': tmh.tmhLN,
      '{{TMH_TAI_TRAI_THAM}}': tmh.tmhLW,
      '{{TMH_TAI_PHAI_THUONG}}': tmh.tmhRN,
      '{{TMH_TAI_PHAI_THAM}}': tmh.tmhRW,
      '{{TMH_BENH}}': tmh.tmhDiag,
      '{{TMH_NH}}': tmh.tmhNH,
      '{{PHAN_LOAI_TMH}}': tmh.class ? formatClass(tmh.class) : '',
      '{{RHM_KET_QUA}}': rhm.rhmNotes,
      '{{PHAN_LOAI_RHM}}': rhm.class ? formatClass(rhm.class) : '',
      '{{LAM_SANG}}': kl.clinical,
      '{{CAN_LAM_SANG}}': kl.paraclinical,
      '{{PHAN_LOAI_SK}}': kl.healthClass,
      '{{BENH_TAT}}': kl.diseases,
      '{{KETLUAN_CHUNG}}': kl.conclusion,
      '{{NGAY_KET_LUAN}}': conclusionDate,
      '{{SIG_NOI_KHOA}}': getSig('Nội khoa'),
      '{{SIG_NGOAI_KHOA}}': getSig('Ngoại khoa'),
      '{{SIG_SAN_PHU_KHOA}}': getSig('Sản phụ khoa'),
      '{{SIG_MAT}}': getSig('Mắt'),
      '{{SIG_TAI_MUI_HONG}}': getSig('Tai Mũi Họng'),
      '{{SIG_RANG_HAM_MAT}}': getSig('Răng Hàm Mặt'),
    };

    for (const [placeholder, value] of Object.entries(replaceMap)) {
      htmlContent = htmlContent.split(placeholder).join(safe(value));
    }

    // Bọc nội dung vào HTML hoàn chỉnh
    const finalHtml = `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <title>Phiếu khám sức khỏe</title>
  <style>
    body {
      margin: 0;
      padding: 10px;
      font-family: 'Times New Roman', Times, serif;
    }
    @media print {
      body { padding: 0; margin: 0; }
      .no-print { display: none; }
      @page {
        size: A4 landscape;
        margin: 12mm;
      }
    }
    .no-print {
      text-align: right;
      margin-bottom: 15px;
    }
    .no-print button {
      padding: 6px 12px;
      background: #1D9E75;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
    }
    table {
      width: 100%;
      border-collapse: collapse;
    }
    th, td {
      border: 1px solid #000;
      padding: 6px;
      vertical-align: top;
    }
  </style>
</head>
<body>
<div class="no-print">
  <button onclick="window.print()">🖨️ In / Lưu PDF</button>
</div>
${htmlContent}
</body>
</html>`;

    res.send(finalHtml);
  } catch (err) {
    console.error(err);
    res.status(500).send('<h3>Lỗi xử lý template HTML: ' + err.message + '</h3>');
  }
});

// ========== LẤY TOÀN BỘ DỮ LIỆU PHIẾU KHÁM ==========
app.get('/api/exam-full/:id', requireAuth, async (req, res) => {
  const examId = req.params.id;
  try {
    const db = getDb();

    // 1. Lấy thông tin khám
    const [examRows] = await db.execute(`
      SELECT e.*, emp.patient_code, emp.name as emp_name, emp.gender, emp.dob, emp.dept, emp.phone, emp.email, emp.position
      FROM examinations e
      JOIN employees emp ON e.emp_id = emp.patient_code
      WHERE e.id = ?
    `, [examId]);

    if (examRows.length === 0) {
      return res.status(404).json({ success: false, error: 'Không tìm thấy phiếu khám' });
    }

    const exam = examRows[0];
    const examData = exam.data ? JSON.parse(exam.data) : {};

    // 2. Lấy thông tin đăng ký khám (tiền sử, yếu tố có hại, công việc)
    const [regRows] = await db.execute(`
      SELECT history, hazard, job FROM registrations WHERE emp_id = ? ORDER BY register_date DESC LIMIT 1
    `, [exam.emp_id]);
    const registration = regRows[0] || {};

    // 3. Lấy chữ ký của các bác sĩ (kèm đường dẫn ảnh nếu có)
    const [signRows] = await db.execute(`
      SELECT specialty, doctor_name, signed_at, signature_image_path
      FROM examination_signatures
      WHERE examination_id = ?
    `, [examId]);

    const signatures = {};
    signRows.forEach(s => {
      signatures[s.specialty] = {
        doctor_name: s.doctor_name,
        signed_at: s.signed_at,
        image_path: s.signature_image_path || null
      };
    });

    // 4. Gom nhóm theo cấu trúc hoso của template
    const hoso = {
      makcb_barcode: exam.patient_code,
      hoten: exam.emp_name,
      tenphai: exam.gender === 'Nam' ? 'Nam' : 'Nữ',
      ngaysinh: exam.dob,
      tuoi: exam.age || '',
      socmnd: exam.patient_code,
      ngaycapcmnd: '',
      noicapcmnd: '',
      diachi: exam.dept,
      dienthoai: exam.phone,
      vitricongviec: registration.job || '',
      tiensubenh: registration.history || '',
      yeutocohai: registration.hazard || '',
      chieucao: examData.tq?.height || '',
      cannang: examData.tq?.weight || '',
      bmi: examData.tq?.bmi || '',
      mach: examData.tq?.pulse || '',
      huyetap: examData.tq?.bpDisplay || '',
      khamtheluc_pl: examData.tq?.physicalClass || '',

      // Khám lâm sàng nội khoa
      tuanhoan: examData.nk?.nkTH || '',
      tuanhoan_pl: examData.nk?.classTH || '',
      hohap: examData.nk?.nkHH || '',
      hohap_pl: examData.nk?.classHH || '',
      tieuhoa: examData.nk?.nkTHoa || '',
      tieuhoa_pl: examData.nk?.classTHoa || '',
      thantietnieu: examData.nk?.nkTTN || '',
      thantietnieu_pl: examData.nk?.classTTN || '',
      noitiet: examData.nk?.nkNT || '',
      noitiet_pl: examData.nk?.classNT || '',
      coxuongkhop: examData.nk?.nkCXK || '',
      coxuongkhop_pl: examData.nk?.classCXK || '',
      thankinh: examData.nk?.nkTK || '',
      thankinh_pl: examData.nk?.classTK || '',
      tamthan: examData.nk?.nkTThan || '',
      tamthan_pl: examData.nk?.classTThan || '',

      // Ngoại khoa - da liễu
      ngoaikhoa: examData.ng?.ngNgoai || '',
      ngoaikhoa_pl: examData.ng?.class || '',
      dalieu: examData.ng?.ngDa || '',
      dalieu_pl: examData.ng?.classDa || '',

      // Sản phụ khoa
      san: examData.sp?.spContent || '',
      san_pl: examData.sp?.class || '',

      // Mắt
      mat_kk_matphai: examData.mt?.mtNoGlassR || '',
      mat_kk_mattrai: examData.mt?.mtNoGlassL || '',
      mat_ck_matphai: examData.mt?.mtGlassR || '',
      mat_ck_mattrai: examData.mt?.mtGlassL || '',
      mat_benh: examData.mt?.mtDiag || '',
      mat_pl: examData.mt?.class || '',

      // Tai mũi họng
      tmh_tt_noithuong: examData.tmh?.tmhLN || '',
      tmh_tt_noitham: examData.tmh?.tmhLW || '',
      tmh_tp_noithuong: examData.tmh?.tmhRN || '',
      tmh_tp_noitham: examData.tmh?.tmhRW || '',
      tmh_benh: examData.tmh?.tmhDiag || '',
      tmh_pl: examData.tmh?.class || '',

      // Răng hàm mặt
      rhm_hamtren: examData.rhm?.rhmNotes || '',
      rhm_benh: examData.rhm?.rhmBenh || '',
      rhm_pl: examData.rhm?.class || '',

      // Kết luận
      lamsang: examData.kl?.clinical || '',
      canlamsang: examData.kl?.paraclinical || '',
      kl_TenPL: examData.kl?.healthClass || '',
      kl_tenBenh: examData.kl?.diseases || '',
      kl_ngayKL: exam.sign_date || new Date(),

      // Chữ ký (text tạm, sau sẽ thay bằng ảnh)
      tuanhoan_sign: signatures['Nội khoa']?.doctor_name || '',
      hohap_sign: signatures['Nội khoa']?.doctor_name || '',
      // ... tương tự cho các khoa khác, bạn có thể map theo specialty
    };

    res.json({ success: true, data: hoso });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
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