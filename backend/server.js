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


// ========== HTML RESULT (IN PDF) - THEO ĐÚNG MẪU ==========
// app.get('/api/exams/:id/html', requireAuth, async (req, res) => {
//   const examinationId = req.params.id;
//   try {
//     const db = getDb();
//     const [rows] = await db.execute(`
//       SELECT e.*, emp.name as emp_name, emp.gender, emp.dob, emp.dept, emp.phone, emp.email
//       FROM examinations e
//       JOIN employees emp ON e.emp_id = emp.patient_code
//       WHERE e.id = ?
//     `, [examinationId]);
//     if (rows.length === 0) {
//       return res.status(404).send('<h3>Không tìm thấy phiếu khám</h3>');
//     }
//     const exam = rows[0];
//     let examData = {};
//     try { examData = JSON.parse(exam.data); } catch (e) { }

//     // Lấy thông tin đăng ký (tiền sử, yếu tố có hại, vị trí nghề)
//     let registration = null;
//     try {
//       const [regRows] = await db.execute(
//         `SELECT history, hazard, job FROM registrations WHERE emp_id = ? ORDER BY register_date DESC LIMIT 1`,
//         [exam.emp_id]
//       );
//       if (regRows.length) registration = regRows[0];
//     } catch (e) { }

//     // Lấy chữ ký bác sĩ (nếu có bảng examination_signatures)
//     let signatures = {};
//     try {
//       const [sigRows] = await db.execute(
//         `SELECT specialty, doctor_name, signed_at FROM examination_signatures WHERE examination_id = ?`,
//         [examinationId]
//       );
//       for (let s of sigRows) {
//         signatures[s.specialty] = { doctor_name: s.doctor_name, signed_at: s.signed_at };
//       }
//     } catch (e) { }

//     const safe = (val) => (val !== undefined && val !== null) ? val : '';
//     const formatClass = (cls) => cls ? `Loại ${cls}` : 'Chưa phân loại';

//     // Hàm lấy chữ ký theo chuyên khoa (ánh xạ tên chuyên khoa sang key trong signatures)
//     const getSignature = (specialtyKey) => {
//       const sig = signatures[specialtyKey];
//       if (sig) return `Ngày ký: ${new Date(sig.signed_at).toLocaleString('vi-VN')}<br>Người ký: ${sig.doctor_name}`;
//       return '';
//     };

//     // Dữ liệu từng chuyên khoa
//     const tq = examData.tq || {};
//     const nk = examData.nk || {};
//     const ng = examData.ng || {};
//     const mt = examData.mt || {};
//     const tmh = examData.tmh || {};
//     const rhm = examData.rhm || {};
//     const sp = examData.sp || {};
//     const kl = examData.kl || {};

//     // Tính tuổi
//     let age = '';
//     if (exam.dob) {
//       const birth = new Date(exam.dob);
//       const today = new Date();
//       let ageNum = today.getFullYear() - birth.getFullYear();
//       const m = today.getMonth() - birth.getMonth();
//       if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) ageNum--;
//       age = ageNum.toString();
//     }

//     // Helper để tạo dòng cho bảng Nội khoa (8 dòng)
//     const nkRows = [
//       { label: 'a) Tuần hoàn', value: nk.nkTH, class: nk.class, sigKey: 'Nội khoa' },
//       { label: 'b) Hô hấp', value: nk.nkHH, class: nk.class, sigKey: 'Nội khoa' },
//       { label: 'c) Tiêu hóa', value: nk.nkTHoa, class: nk.class, sigKey: 'Nội khoa' },
//       { label: 'd) Thận - Tiết niệu', value: nk.nkTTN, class: nk.class, sigKey: 'Nội khoa' },
//       { label: 'đ) Nội tiết', value: nk.nkNT, class: nk.class, sigKey: 'Nội khoa' },
//       { label: 'e) Cơ - xương - khớp', value: nk.nkCXK, class: nk.class, sigKey: 'Nội khoa' },
//       { label: 'g) Thần kinh', value: nk.nkTK, class: nk.class, sigKey: 'Nội khoa' },
//       { label: 'h) Tâm thần', value: nk.nkTThan, class: nk.class, sigKey: 'Nội khoa' }
//     ];

//     // Hàm tạo bảng HTML cho phần khám lâm sàng (giống mẫu)
//     const renderClinicalTable = () => {
//       let html = `<table class="clinical-table" style="width:100%; border-collapse: collapse; border: 1px solid #000;">
//         <thead>
//           <tr>
//             <th style="border:1px solid #000; padding:6px; width:18%">Chuyên khoa</th>
//             <th style="border:1px solid #000; padding:6px; width:42%">Nội dung khám</th>
//             <th style="border:1px solid #000; padding:6px; width:15%">Phân loại</th>
//             <th style="border:1px solid #000; padding:6px; width:25%">Họ tên và chữ ký của<br>Bác sĩ chuyên khoa</th>
//           </tr>
//         </thead>
//         <tbody>`;

//       // 1. Nội khoa (gộp 8 dòng)
//       html += `<tr><td rowspan="8" style="border:1px solid #000; padding:6px; vertical-align:top; background:#f9f9f9;"><strong>1. Nội khoa</strong></td>`;
//       for (let i = 0; i < nkRows.length; i++) {
//         const r = nkRows[i];
//         html += `<td style="border:1px solid #000; padding:6px; vertical-align:top;"><strong>${r.label}</strong><br>${safe(r.value)}</td>
//                  <td style="border:1px solid #000; padding:6px; vertical-align:top;">${formatClass(r.class)}</td>
//                  <td style="border:1px solid #000; padding:6px; vertical-align:top;">${getSignature(r.sigKey)}</td></tr>`;
//         if (i < nkRows.length - 1) html += `<tr>`;
//       }

//       // 2. Ngoại khoa, Da liễu (2 dòng riêng biệt? Mẫu gộp chung một dòng? Theo mẫu: 2. Ngoại khoa, Da liễu có a) Ngoại khoa, b) Da liễu)
//       html += `<tr><td style="border:1px solid #000; padding:6px; background:#f9f9f9;"><strong>2. Ngoại khoa, Da liễu</strong></td>
//                <td style="border:1px solid #000; padding:6px;"><strong>a) Ngoại khoa</strong><br>${safe(ng.ngNgoai)}<br><strong>b) Da liễu</strong><br>${safe(ng.ngDa)}</td>
//                <td style="border:1px solid #000; padding:6px;">${formatClass(ng.class)}</td>
//                <td style="border:1px solid #000; padding:6px;">${getSignature('Ngoại khoa')}</td></tr>`;

//       // 3. Sản phụ khoa (nếu nữ)
//       if (exam.gender === 'Nữ') {
//         html += `<tr><td style="border:1px solid #000; padding:6px; background:#f9f9f9;"><strong>3. Sản phụ khoa</strong></td>
//                  <td style="border:1px solid #000; padding:6px;">Các bệnh sản phụ khoa (nếu có): ${safe(sp.spContent)}</td>
//                  <td style="border:1px solid #000; padding:6px;">${formatClass(sp.class)}</td>
//                  <td style="border:1px solid #000; padding:6px;">${getSignature('Sản phụ khoa')}</td></tr>`;
//       }

//       // 4. Mắt
//       html += `<tr><td style="border:1px solid #000; padding:6px; background:#f9f9f9;"><strong>4. Mắt</strong></td>
//                <td style="border:1px solid #000; padding:6px;">
//                  Kết quả khám thị lực:<br>
//                  + Không kính: Mắt phải ${safe(mt.mtNoGlassR)}; Mắt trái ${safe(mt.mtNoGlassL)}<br>
//                  + Có kính: Mắt phải ${safe(mt.mtGlassR)}; Mắt trái ${safe(mt.mtGlassL)}<br>
//                  Các bệnh về mắt (nếu có): ${safe(mt.mtDiag)}
//                </td>
//                <td style="border:1px solid #000; padding:6px;">${formatClass(mt.class)}</td>
//                <td style="border:1px solid #000; padding:6px;">${getSignature('Mắt')}</td></tr>`;

//       // 5. Tai – Mũi – Họng
//       html += `<tr><td style="border:1px solid #000; padding:6px; background:#f9f9f9;"><strong>5. Tai – Mũi – Họng</strong></td>
//                <td style="border:1px solid #000; padding:6px;">
//                  Kết quả khám thính lực:<br>
//                  + Tai trái: Nói thường ${safe(tmh.tmhLN)} m; Nói thầm ${safe(tmh.tmhLW)} m<br>
//                  + Tai phải: Nói thường ${safe(tmh.tmhRN)} m; Nói thầm ${safe(tmh.tmhRW)} m<br>
//                  Các bệnh về TMH (nếu có): ${safe(tmh.tmhDiag)}<br>
//                  Mũi – Họng – Thanh quản: ${safe(tmh.tmhNH)}
//                </td>
//                <td style="border:1px solid #000; padding:6px;">${formatClass(tmh.class)}</td>
//                <td style="border:1px solid #000; padding:6px;">${getSignature('Tai Mũi Họng')}</td></tr>`;

//       // 6. Răng – Hàm – Mặt
//       html += `<tr><td style="border:1px solid #000; padding:6px; background:#f9f9f9;"><strong>6. Răng – Hàm – Mặt</strong></td>
//                <td style="border:1px solid #000; padding:6px;">Kết quả khám: ${safe(rhm.rhmNotes)}<br>Các bệnh về răng hàm mặt (nếu có): ${safe(rhm.rhmNotes)}</td>
//                <td style="border:1px solid #000; padding:6px;">${formatClass(rhm.class)}</td>
//                <td style="border:1px solid #000; padding:6px;">${getSignature('Răng Hàm Mặt')}</td></tr>`;

//       html += `</tbody></table>`;
//       return html;
//     };

//     const html = `<!DOCTYPE html>
// <html lang="vi">
// <head>
//   <meta charset="UTF-8">
//   <title>Phiếu khám sức khỏe</title>
//   <style>
//     * { margin: 0; padding: 0; box-sizing: border-box; }
//     body {
//       font-family: 'Times New Roman', Times, serif;
//       font-size: 13px;
//       padding: 15px;
//       background: white;
//       color: black;
//     }
//     @media print {
//       body { padding: 0; margin: 0; }
//       .no-print { display: none; }
//     }
//     .container {
//       max-width: 1100px;
//       margin: 0 auto;
//     }
//     .header {
//       text-align: center;
//       margin-bottom: 15px;
//     }
//     .header .unit {
//       font-weight: bold;
//       font-size: 14px;
//     }
//     .header .hospital {
//       font-weight: bold;
//       font-size: 14px;
//       margin-top: 2px;
//     }
//     .header .so-phieu {
//       margin-top: 5px;
//       font-style: italic;
//     }
//     .header .social {
//       margin-top: 8px;
//       font-weight: bold;
//     }
//     .header .title {
//       margin: 8px 0;
//       font-size: 16px;
//       font-weight: bold;
//       text-transform: uppercase;
//     }
//     .info-row {
//       display: flex;
//       margin: 4px 0;
//       flex-wrap: wrap;
//     }
//     .info-label {
//       width: 190px;
//       font-weight: bold;
//     }
//     .info-value {
//       flex: 1;
//       border-bottom: 1px dotted #000;
//       padding-left: 5px;
//     }
//     .photo {
//       float: left;
//       width: 100px;
//       height: 120px;
//       border: 1px solid #000;
//       text-align: center;
//       line-height: 120px;
//       margin-right: 15px;
//       margin-bottom: 10px;
//     }
//     h3, h4 {
//       margin: 12px 0 6px 0;
//     }
//     .clinical-table {
//       width: 100%;
//       border-collapse: collapse;
//       margin: 10px 0;
//       font-size: 12px;
//     }
//     .clinical-table th, .clinical-table td {
//       border: 1px solid #000;
//       padding: 6px;
//       vertical-align: top;
//     }
//     .clinical-table th {
//       background: #f2f2f2;
//       text-align: center;
//     }
//     .sign-line {
//       display: flex;
//       justify-content: space-between;
//       margin-top: 30px;
//     }
//     .clinic-name {
//       text-align: right;
//       font-style: italic;
//       margin-top: 10px;
//     }
//     .center {
//       text-align: center;
//     }
//     .bold {
//       font-weight: bold;
//     }
//     .subnote {
//       font-size: 11px;
//       font-style: italic;
//       margin-top: 10px;
//     }
//   </style>
// </head>
// <body>
// <div class="container">
//   <div class="no-print" style="text-align:right; margin-bottom:10px;">
//     <button onclick="window.print()" style="padding:6px 12px; background:#1D9E75; color:white; border:none; border-radius:4px;">🖨️ In / Lưu PDF</button>
//   </div>
//   <div class="header">
//     <div class="unit">CỤC HẬU CẦN - KỸ THUẬT QK9</div>
//     <div class="hospital">BỆNH VIỆN QUÂN Y 121</div>
//     <div class="so-phieu">Số: .... /GKSK-BV</div>
//     <div class="social">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
//     <div>Độc lập – Tự do – Hạnh phúc</div>
//     <div class="title">PHIẾU KHÁM SỨC KHỎE<br>TRƯỚC KHI BỐ TRÍ VIỆC LÀM</div>
//   </div>

//   <!-- Thông tin cá nhân + ảnh -->
//   <div style="position: relative;">
//     <div class="photo">Ảnh (4x6)</div>
//     <div class="info-row"><div class="info-label">1. Họ tên:</div><div class="info-value">${safe(exam.emp_name)}</div></div>
//     <div class="info-row"><div class="info-label">2. Giới tính:</div><div class="info-value">${safe(exam.gender)}</div></div>
//     <div class="info-row"><div class="info-label">3. Ngày tháng năm sinh:</div><div class="info-value">${safe(exam.dob)} (Tuổi: ${age})</div></div>
//     <div class="info-row"><div class="info-label">4. Số CMND/CCCD:</div><div class="info-value">${safe(exam.email?.split('@')[0] || '')}</div></div>
//     <div class="info-row"><div class="info-label">5. Cấp ngày ……… tại Cục cảnh sát quản lý hành chính về trật tự xã hội</div><div class="info-value"></div></div>
//     <div class="info-row"><div class="info-label">6. Chỗ ở hiện tại:</div><div class="info-value">${safe(exam.dept)}</div></div>
//     <div class="info-row"><div class="info-label">Số điện thoại liên hệ:</div><div class="info-value">${safe(exam.phone)}</div></div>
//     <div class="info-row"><div class="info-label">7. Vị trí nghề/công việc dự kiến bố trí:</div><div class="info-value">${safe(registration?.job || '')}</div></div>
//   </div>

//   <div class="info-row"><div class="info-label">I. TIỀN SỬ BỆNH, TẬT:</div><div class="info-value">${safe(registration?.history || '')}</div></div>
//   <div class="info-row"><div class="info-label">II. YẾU TỐ CÓ HẠI:</div><div class="info-value">${safe(registration?.hazard || '')}</div></div>

//   <h3>III. NỘI DUNG KHÁM</h3>
//   <h4>3.1. Khám tổng quát</h4>
//   <div class="info-row"><div class="info-label">- Chiều cao:</div><div class="info-value">${safe(tq.height)} cm</div></div>
//   <div class="info-row"><div class="info-label">- Cân nặng:</div><div class="info-value">${safe(tq.weight)} kg</div></div>
//   <div class="info-row"><div class="info-label">- Chỉ số BMI:</div><div class="info-value">${safe(tq.bmi)}</div></div>
//   <div class="info-row"><div class="info-label">- Mạch:</div><div class="info-value">${safe(tq.pulse)} lần/phút</div></div>
//   <div class="info-row"><div class="info-label">- Huyết áp:</div><div class="info-value">${safe(tq.bpDisplay)} mmHg</div></div>
//   <div class="info-row"><div class="info-label">Phân loại thể lực:</div><div class="info-value">${safe(tq.physicalClass)}</div></div>

//   <h4>3.2. Khám lâm sàng</h4>
//   ${renderClinicalTable()}

//   <div class="subnote">*Trường hợp người lao động đã khám sức khỏe tuyển dụng/khám sức khỏe định kỳ còn giá trị sử dụng theo quy định tại Thông tư 32/2023/TT-BYT ngày 31/12/2023 của Bộ Y tế hướng dẫn luật khám chữa bệnh sẽ không phải khám lại nội dung này.</div>

//   <h4>2. Khám phát hiện bệnh liên quan đến vị trí làm</h4>
//   <div class="info-row"><div class="info-label">2.1. Lâm sàng:</div><div class="info-value">${safe(kl.clinical || '')}</div></div>
//   <div class="info-row"><div class="info-label">2.2. Cận lâm sàng:</div><div class="info-value">${safe(kl.paraclinical || '')}</div></div>

//   <h3>IV. KẾT LUẬN</h3>
//   <div class="info-row"><div class="info-label">1. Phân loại sức khỏe:</div><div class="info-value">${safe(kl.healthClass || '')}</div></div>
//   <div class="info-row"><div class="info-label">2. Các bệnh, tật (nếu có):</div><div class="info-value">${safe(kl.diseases || '')}</div></div>
//   <div class="info-row"><div class="info-label">3. Hiện tại đủ/không đủ khám sức khỏe làm việc cho ngành nghề, công việc (Ghi cụ thể nếu có), hướng giải quyết (nếu có):</div><div class="info-value">${safe(kl.conclusion || '')}</div></div>

//   <div class="sign-line">
//     <div>${exam.sign_date ? new Date(exam.sign_date).toLocaleDateString('vi-VN') : ''}</div>
//     <div>GIÁM ĐỐC<br>(Ký, họ tên)</div>
//   </div>
//   <div class="clinic-name">(Đã ký điện tử)</div>
// </div>
// </body>
// </html>`;
//     res.send(html);
//   } catch (err) {
//     console.error(err);
//     res.status(500).send('<h3>Lỗi hiển thị kết quả</h3>');
//   }
// });

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