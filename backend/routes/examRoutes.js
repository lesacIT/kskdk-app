// Xuất HTML kết quả khám (dùng để in PDF bằng trình duyệt)
router.get('/:id/html', authMiddleware, async (req, res) => {
    const examinationId = req.params.id;
    try {
        const [rows] = await pool.query(`
      SELECT e.*, emp.name as emp_name, emp.gender, emp.dob, emp.dept
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

        // Hàm render dòng trong bảng
        const renderRow = (specialty, data, classField) => {
            if (!data) return `<tr><td>${specialty}</td><td colspan="2">Chưa khám</td></tr>`;
            let notes = '';
            if (specialty === 'Tổng quát') {
                notes = `Cao: ${data.height || ''} cm, Nặng: ${data.weight || ''} kg, Mạch: ${data.pulse || ''}, HA: ${data.bpDisplay || ''}`;
            } else {
                const otherFields = Object.entries(data).filter(([k]) => k !== classField);
                notes = otherFields.map(([k, v]) => `${k}: ${v}`).join('; ');
            }
            const classValue = data[classField] || 'Chưa phân loại';
            return `<tr><td>${specialty}</td><td>${classValue}</td><td>${notes}</td></tr>`;
        };

        const html = `
      <!DOCTYPE html>
      <html>
      <head><meta charset="UTF-8"><title>Kết quả khám sức khỏe</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; }
        @media print { .no-print { display: none; } }
        .info-table, .exam-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        .info-table td, .exam-table td, .exam-table th { border: 1px solid #ccc; padding: 8px; vertical-align: top; }
        .exam-table th { background: #f2f2f2; }
        button { padding: 10px 20px; background: #1D9E75; color: white; border: none; cursor: pointer; }
      </style>
      </head>
      <body>
        <div class="no-print" style="text-align:right; margin-bottom:20px;">
          <button onclick="window.print()">🖨️ In / Lưu PDF</button>
        </div>
        <h2 style="text-align:center">PHIẾU KHÁM SỨC KHỎE</h2>
        <table class="info-table">
          <tr><td style="width:150px"><strong>Mã NV</strong></td><td>${exam.emp_id}</td></tr>
          <tr><td><strong>Họ tên</strong></td><td>${exam.emp_name}</td></tr>
          <tr><td><strong>Giới tính</strong></td><td>${exam.gender}</td></tr>
          <tr><td><strong>Ngày sinh</strong></td><td>${exam.dob}</td></tr>
          <tr><td><strong>Phòng ban</strong></td><td>${exam.dept || ''}</td></tr>
          <tr><td><strong>Ngày khám</strong></td><td>${new Date(exam.exam_date).toLocaleString('vi-VN')}</td></tr>
        </table>
        <h3>Kết quả chi tiết</h3>
        <table class="exam-table">
          <tr><th>Chuyên khoa</th><th>Phân loại</th><th>Ghi chú</th></tr>
          ${renderRow('Tổng quát', examData.tq, 'physicalClass')}
          ${renderRow('Nội khoa', examData.nk, 'class')}
          ${renderRow('Ngoại khoa/Da liễu', examData.ng, 'class')}
          ${renderRow('Mắt', examData.mt, 'class')}
          ${renderRow('Tai Mũi Họng', examData.tmh, 'class')}
          ${renderRow('Răng Hàm Mặt', examData.rhm, 'class')}
          ${exam.gender === 'Nữ' ? renderRow('Sản phụ khoa', examData.sp, 'class') : ''}
        </table>
        <p><em>Ngày in: ${new Date().toLocaleString('vi-VN')}</em></p>
      </body>
      </html>
    `;
        res.send(html);
    } catch (err) {
        console.error(err);
        res.status(500).send('<h3>Lỗi hiển thị kết quả</h3>');
    }
});