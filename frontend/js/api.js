const API_BASE = window.location.origin + '/api';

// Hàm request chung, luôn gửi cookie
async function request(endpoint, options = {}) {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    },
    credentials: 'include'   // gửi cookie session
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Yêu cầu thất bại');
  return data;
}

// ========== Auth ==========
async function login(username, password, rememberMe) {
  return request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password, rememberMe })
  });
}

async function logout() {
  return request('/auth/logout', { method: 'POST' }).catch(() => {});
}

async function getCurrentUser() {
  return request('/auth/me');
}

// ========== Employees ==========
async function getEmployees() { return request('/employees'); }
async function getEmployee(code) { return request(`/employees/${code}`); }
async function createEmployee(emp) { return request('/employees', { method: 'POST', body: JSON.stringify(emp) }); }
async function updateEmployee(code, emp) { return request(`/employees/${code}`, { method: 'PUT', body: JSON.stringify(emp) }); }
async function deleteEmployee(code) { return request(`/employees/${code}`, { method: 'DELETE' }); }

// ========== Registrations ==========
async function createRegistration(reg) { return request('/registrations', { method: 'POST', body: JSON.stringify(reg) }); }
async function getTodayRegistrations() { return request('/registrations/today'); }

// ========== Examinations ==========
async function getLatestExamination(patientCode) { return request(`/examinations/${patientCode}`); }
async function saveExamination(patientCode, examData) {
  return request('/examinations', {
    method: 'POST',
    body: JSON.stringify({ patient_code: patientCode, exam_data: examData })
  });
}

export default {
  login, logout, getCurrentUser,
  getEmployees, getEmployee, createEmployee, updateEmployee, deleteEmployee,
  createRegistration, getTodayRegistrations,
  getLatestExamination, saveExamination
};