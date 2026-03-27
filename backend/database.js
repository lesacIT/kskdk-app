const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');

let db;

async function initDatabase() {
  db = await open({
    filename: path.join(__dirname, 'kskdk.db'),
    driver: sqlite3.Database
  });

  // Tạo bảng patients
  await db.exec(`
    CREATE TABLE IF NOT EXISTS patients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      gender TEXT NOT NULL,
      dob TEXT,
      age INTEGER,
      job TEXT,
      medical_history TEXT,
      hazard_factors TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Tạo bảng examinations
  await db.exec(`
    CREATE TABLE IF NOT EXISTS examinations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_id INTEGER NOT NULL,
      exam_date TEXT NOT NULL,
      
      -- Tổng quát
      height REAL,
      weight REAL,
      bmi REAL,
      pulse INTEGER,
      bp_systolic INTEGER,
      bp_diastolic INTEGER,
      physical_class TEXT,
      
      -- Nội khoa
      nk_cardiovascular TEXT,
      nk_cardiovascular_class TEXT,
      nk_respiratory TEXT,
      nk_respiratory_class TEXT,
      nk_digestive TEXT,
      nk_digestive_class TEXT,
      nk_urinary TEXT,
      nk_urinary_class TEXT,
      nk_endocrine TEXT,
      nk_endocrine_class TEXT,
      nk_musculoskeletal TEXT,
      nk_musculoskeletal_class TEXT,
      nk_neurological TEXT,
      nk_neurological_class TEXT,
      nk_mental TEXT,
      nk_mental_class TEXT,
      
      -- Ngoại khoa/Da liễu
      ng_surgical TEXT,
      ng_surgical_class TEXT,
      ng_dermatology TEXT,
      ng_dermatology_class TEXT,
      
      -- Sản phụ khoa
      sp_content TEXT,
      sp_class TEXT,
      
      -- Mắt
      mt_vision_no_glass_r TEXT,
      mt_vision_no_glass_l TEXT,
      mt_vision_glass_r TEXT,
      mt_vision_glass_l TEXT,
      mt_diagnosis TEXT,
      mt_class TEXT,
      
      -- Tai Mũi Họng
      tmh_hearing_r_normal REAL,
      tmh_hearing_r_whisper REAL,
      tmh_hearing_l_normal REAL,
      tmh_hearing_l_whisper REAL,
      tmh_ent TEXT,
      tmh_diagnosis TEXT,
      tmh_class TEXT,
      
      -- Răng Hàm Mặt
      rhm_teeth TEXT,
      rhm_notes TEXT,
      rhm_class TEXT,
      
      -- Kết luận
      health_class INTEGER,
      conclusion_diseases TEXT,
      conclusion_fit TEXT,
      conclusion_resolution TEXT,
      doctor_name TEXT,
      sign_date TEXT,
      clinic_name TEXT,
      
      FOREIGN KEY (patient_id) REFERENCES patients (id)
    )
  `);

  console.log('Database initialized');
  return db;
}

function getDb() {
  return db;
}

module.exports = { initDatabase, getDb };