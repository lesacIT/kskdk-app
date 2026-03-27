// backend/models/examination.js
const { getDb } = require('../database');

class ExaminationModel {
  static async create(patientId, data) {
    const db = getDb();
    const currentDate = new Date().toISOString().slice(0, 10);
    
    try {
      const result = await db.run(`
        INSERT INTO examinations (
          patient_id,
          exam_date,
          height,
          weight,
          bmi,
          pulse,
          bp_systolic,
          bp_diastolic,
          physical_class,
          nk_cardiovascular,
          nk_cardiovascular_class,
          nk_respiratory,
          nk_respiratory_class,
          nk_digestive,
          nk_digestive_class,
          nk_urinary,
          nk_urinary_class,
          nk_endocrine,
          nk_endocrine_class,
          nk_musculoskeletal,
          nk_musculoskeletal_class,
          nk_neurological,
          nk_neurological_class,
          nk_mental,
          nk_mental_class,
          ng_surgical,
          ng_surgical_class,
          ng_dermatology,
          ng_dermatology_class,
          sp_content,
          sp_class,
          mt_vision_no_glass_r,
          mt_vision_no_glass_l,
          mt_vision_glass_r,
          mt_vision_glass_l,
          mt_diagnosis,
          mt_class,
          tmh_hearing_r_normal,
          tmh_hearing_r_whisper,
          tmh_hearing_l_normal,
          tmh_hearing_l_whisper,
          tmh_ent,
          tmh_diagnosis,
          tmh_class,
          rhm_teeth,
          rhm_notes,
          rhm_class,
          health_class,
          conclusion_diseases,
          conclusion_fit,
          conclusion_resolution,
          doctor_name,
          sign_date,
          clinic_name
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        patientId,
        data.exam_date || currentDate,
        data.height || null,
        data.weight || null,
        data.bmi || null,
        data.pulse || null,
        data.bp_systolic || null,
        data.bp_diastolic || null,
        data.physical_class || null,
        data.nk_cardiovascular || null,
        data.nk_cardiovascular_class || null,
        data.nk_respiratory || null,
        data.nk_respiratory_class || null,
        data.nk_digestive || null,
        data.nk_digestive_class || null,
        data.nk_urinary || null,
        data.nk_urinary_class || null,
        data.nk_endocrine || null,
        data.nk_endocrine_class || null,
        data.nk_musculoskeletal || null,
        data.nk_musculoskeletal_class || null,
        data.nk_neurological || null,
        data.nk_neurological_class || null,
        data.nk_mental || null,
        data.nk_mental_class || null,
        data.ng_surgical || null,
        data.ng_surgical_class || null,
        data.ng_dermatology || null,
        data.ng_dermatology_class || null,
        data.sp_content || null,
        data.sp_class || null,
        data.mt_vision_no_glass_r || null,
        data.mt_vision_no_glass_l || null,
        data.mt_vision_glass_r || null,
        data.mt_vision_glass_l || null,
        data.mt_diagnosis || null,
        data.mt_class || null,
        data.tmh_hearing_r_normal || null,
        data.tmh_hearing_r_whisper || null,
        data.tmh_hearing_l_normal || null,
        data.tmh_hearing_l_whisper || null,
        data.tmh_ent || null,
        data.tmh_diagnosis || null,
        data.tmh_class || null,
        data.rhm_teeth ? JSON.stringify(data.rhm_teeth) : null,
        data.rhm_notes || null,
        data.rhm_class || null,
        data.health_class || null,
        data.conclusion_diseases || null,
        data.conclusion_fit || null,
        data.conclusion_resolution || null,
        data.doctor_name || null,
        data.sign_date || currentDate,
        data.clinic_name || null
      ]);
      
      return { 
        success: true, 
        id: result.lastID,
        message: 'Examination saved successfully'
      };
    } catch (error) {
      console.error('Error saving examination:', error);
      throw error;
    }
  }
  
  static async getByPatientId(patientId) {
    const db = getDb();
    try {
      const examinations = await db.all(`
        SELECT * FROM examinations 
        WHERE patient_id = ? 
        ORDER BY exam_date DESC, created_at DESC
      `, [patientId]);
      
      // Parse JSON fields
      examinations.forEach(exam => {
        if (exam.rhm_teeth) {
          try {
            exam.rhm_teeth = JSON.parse(exam.rhm_teeth);
          } catch (e) {
            exam.rhm_teeth = {};
          }
        }
      });
      
      return examinations;
    } catch (error) {
      console.error('Error getting examinations by patient:', error);
      throw error;
    }
  }
  
  static async getLatestByPatientId(patientId) {
    const db = getDb();
    try {
      const examination = await db.get(`
        SELECT * FROM examinations 
        WHERE patient_id = ? 
        ORDER BY exam_date DESC, created_at DESC 
        LIMIT 1
      `, [patientId]);
      
      // Parse JSON fields
      if (examination && examination.rhm_teeth) {
        try {
          examination.rhm_teeth = JSON.parse(examination.rhm_teeth);
        } catch (e) {
          examination.rhm_teeth = {};
        }
      }
      
      return examination;
    } catch (error) {
      console.error('Error getting latest examination:', error);
      throw error;
    }
  }
  
  static async getById(id) {
    const db = getDb();
    try {
      const examination = await db.get(`
        SELECT * FROM examinations WHERE id = ?
      `, [id]);
      
      // Parse JSON fields
      if (examination && examination.rhm_teeth) {
        try {
          examination.rhm_teeth = JSON.parse(examination.rhm_teeth);
        } catch (e) {
          examination.rhm_teeth = {};
        }
      }
      
      return examination;
    } catch (error) {
      console.error('Error getting examination by id:', error);
      throw error;
    }
  }
  
  static async update(id, patientId, data) {
    const db = getDb();
    const currentDate = new Date().toISOString().slice(0, 10);
    
    try {
      const result = await db.run(`
        UPDATE examinations SET
          exam_date = ?,
          height = ?,
          weight = ?,
          bmi = ?,
          pulse = ?,
          bp_systolic = ?,
          bp_diastolic = ?,
          physical_class = ?,
          nk_cardiovascular = ?,
          nk_cardiovascular_class = ?,
          nk_respiratory = ?,
          nk_respiratory_class = ?,
          nk_digestive = ?,
          nk_digestive_class = ?,
          nk_urinary = ?,
          nk_urinary_class = ?,
          nk_endocrine = ?,
          nk_endocrine_class = ?,
          nk_musculoskeletal = ?,
          nk_musculoskeletal_class = ?,
          nk_neurological = ?,
          nk_neurological_class = ?,
          nk_mental = ?,
          nk_mental_class = ?,
          ng_surgical = ?,
          ng_surgical_class = ?,
          ng_dermatology = ?,
          ng_dermatology_class = ?,
          sp_content = ?,
          sp_class = ?,
          mt_vision_no_glass_r = ?,
          mt_vision_no_glass_l = ?,
          mt_vision_glass_r = ?,
          mt_vision_glass_l = ?,
          mt_diagnosis = ?,
          mt_class = ?,
          tmh_hearing_r_normal = ?,
          tmh_hearing_r_whisper = ?,
          tmh_hearing_l_normal = ?,
          tmh_hearing_l_whisper = ?,
          tmh_ent = ?,
          tmh_diagnosis = ?,
          tmh_class = ?,
          rhm_teeth = ?,
          rhm_notes = ?,
          rhm_class = ?,
          health_class = ?,
          conclusion_diseases = ?,
          conclusion_fit = ?,
          conclusion_resolution = ?,
          doctor_name = ?,
          sign_date = ?,
          clinic_name = ?
        WHERE id = ? AND patient_id = ?
      `, [
        data.exam_date || currentDate,
        data.height || null,
        data.weight || null,
        data.bmi || null,
        data.pulse || null,
        data.bp_systolic || null,
        data.bp_diastolic || null,
        data.physical_class || null,
        data.nk_cardiovascular || null,
        data.nk_cardiovascular_class || null,
        data.nk_respiratory || null,
        data.nk_respiratory_class || null,
        data.nk_digestive || null,
        data.nk_digestive_class || null,
        data.nk_urinary || null,
        data.nk_urinary_class || null,
        data.nk_endocrine || null,
        data.nk_endocrine_class || null,
        data.nk_musculoskeletal || null,
        data.nk_musculoskeletal_class || null,
        data.nk_neurological || null,
        data.nk_neurological_class || null,
        data.nk_mental || null,
        data.nk_mental_class || null,
        data.ng_surgical || null,
        data.ng_surgical_class || null,
        data.ng_dermatology || null,
        data.ng_dermatology_class || null,
        data.sp_content || null,
        data.sp_class || null,
        data.mt_vision_no_glass_r || null,
        data.mt_vision_no_glass_l || null,
        data.mt_vision_glass_r || null,
        data.mt_vision_glass_l || null,
        data.mt_diagnosis || null,
        data.mt_class || null,
        data.tmh_hearing_r_normal || null,
        data.tmh_hearing_r_whisper || null,
        data.tmh_hearing_l_normal || null,
        data.tmh_hearing_l_whisper || null,
        data.tmh_ent || null,
        data.tmh_diagnosis || null,
        data.tmh_class || null,
        data.rhm_teeth ? JSON.stringify(data.rhm_teeth) : null,
        data.rhm_notes || null,
        data.rhm_class || null,
        data.health_class || null,
        data.conclusion_diseases || null,
        data.conclusion_fit || null,
        data.conclusion_resolution || null,
        data.doctor_name || null,
        data.sign_date || currentDate,
        data.clinic_name || null,
        id,
        patientId
      ]);
      
      return { 
        success: true, 
        changes: result.changes,
        message: 'Examination updated successfully'
      };
    } catch (error) {
      console.error('Error updating examination:', error);
      throw error;
    }
  }
  
  static async delete(id) {
    const db = getDb();
    try {
      const result = await db.run(`
        DELETE FROM examinations WHERE id = ?
      `, [id]);
      
      return { 
        success: true, 
        changes: result.changes,
        message: 'Examination deleted successfully'
      };
    } catch (error) {
      console.error('Error deleting examination:', error);
      throw error;
    }
  }
  
  static async countByPatientId(patientId) {
    const db = getDb();
    try {
      const result = await db.get(`
        SELECT COUNT(*) as count FROM examinations WHERE patient_id = ?
      `, [patientId]);
      
      return result.count;
    } catch (error) {
      console.error('Error counting examinations:', error);
      throw error;
    }
  }
}

module.exports = ExaminationModel;