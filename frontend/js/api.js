// frontend/js/api.js
const API_BASE = window.location.origin + '/api';

class API {
  static async request(endpoint, options = {}) {
    const url = `${API_BASE}${endpoint}`;
    const config = {
      headers: { 'Content-Type': 'application/json' },
      ...options
    };
    
    try {
      const response = await fetch(url, config);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Request failed');
      }
      
      return data;
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  }
  
  static async createPatient(patientData) {
    return this.request('/patients', {
      method: 'POST',
      body: JSON.stringify(patientData)
    });
  }
  
  static async getPatientByCode(code) {
    return this.request(`/patients/${code}`);
  }
  
  static async saveExamination(patientCode, examData) {
    return this.request('/exams', {
      method: 'POST',
      body: JSON.stringify({ patient_code: patientCode, exam_data: examData })
    });
  }
  
  static async getLatestExamination(patientCode) {
    return this.request(`/exams/patient/${patientCode}`);
  }
}