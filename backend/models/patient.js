const { getDb } = require('../database');

class PatientModel {
  static async create(data) {
    const db = getDb();
    const patientCode = `BN${String(Date.now()).slice(-6)}`;
    
    const result = await db.run(`
      INSERT INTO patients (patient_code, name, gender, dob, age, job, medical_history, hazard_factors)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      patientCode,
      data.name,
      data.gender,
      data.dob,
      data.age,
      data.job,
      data.medical_history,
      data.hazard_factors
    ]);
    
    return { id: result.lastID, patient_code: patientCode };
  }
  
  static async getByCode(patientCode) {
    const db = getDb();
    return await db.get(`
      SELECT * FROM patients WHERE patient_code = ?
    `, [patientCode]);
  }
  
  static async getAll() {
    const db = getDb();
    return await db.all(`
      SELECT * FROM patients ORDER BY created_at DESC
    `);
  }
  
  static async update(id, data) {
    const db = getDb();
    await db.run(`
      UPDATE patients 
      SET name = ?, gender = ?, dob = ?, age = ?, job = ?, 
          medical_history = ?, hazard_factors = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [
      data.name,
      data.gender,
      data.dob,
      data.age,
      data.job,
      data.medical_history,
      data.hazard_factors,
      id
    ]);
  }
}

module.exports = PatientModel;