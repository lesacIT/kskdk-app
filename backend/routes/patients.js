const express = require('express');
const router = express.Router();
const PatientModel = require('../models/patient');
const ExaminationModel = require('../models/examination');

// Lấy danh sách bệnh nhân
router.get('/', async (req, res) => {
  try {
    const patients = await PatientModel.getAll();
    res.json({ success: true, data: patients });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Tìm bệnh nhân theo mã
router.get('/:code', async (req, res) => {
  try {
    const patient = await PatientModel.getByCode(req.params.code);
    if (!patient) {
      return res.status(404).json({ success: false, error: 'Patient not found' });
    }
    const exams = await ExaminationModel.getByPatientId(patient.id);
    res.json({ success: true, data: { patient, examinations: exams } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Tạo bệnh nhân mới
router.post('/', async (req, res) => {
  try {
    const patient = await PatientModel.create(req.body);
    res.json({ success: true, data: patient });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Cập nhật bệnh nhân
router.put('/:id', async (req, res) => {
  try {
    await PatientModel.update(req.params.id, req.body);
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;