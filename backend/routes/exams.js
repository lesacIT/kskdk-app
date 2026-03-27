const express = require('express');
const router = express.Router();
const PatientModel = require('../models/patient');
const ExaminationModel = require('../models/examination');

// Lưu phiếu khám
router.post('/', async (req, res) => {
  try {
    const { patient_code, exam_data } = req.body;
    
    // Tìm patient_id từ patient_code
    const patient = await PatientModel.getByCode(patient_code);
    if (!patient) {
      return res.status(404).json({ success: false, error: 'Patient not found' });
    }
    
    const exam = await ExaminationModel.create(patient.id, exam_data);
    res.json({ success: true, data: exam });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Lấy phiếu khám mới nhất của bệnh nhân
router.get('/patient/:code', async (req, res) => {
  try {
    const patient = await PatientModel.getByCode(req.params.code);
    if (!patient) {
      return res.status(404).json({ success: false, error: 'Patient not found' });
    }
    
    const exam = await ExaminationModel.getLatestByPatientId(patient.id);
    res.json({ success: true, data: { patient, examination: exam } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;