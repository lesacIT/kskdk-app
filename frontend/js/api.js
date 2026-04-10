const API_BASE = window.location.origin + '/api';

async function request(endpoint, options = {}) {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    },
    credentials: 'include'
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Yêu cầu thất bại');
  return data;
}

// Auth
async function login(username, password, rememberMe) {
  return request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password, rememberMe })
  });
}
async function logout() { return request('/auth/logout', { method: 'POST' }).catch(() => { }); }
async function getCurrentUser() { return request('/auth/me'); }

// Employees
async function getEmployees() { return request('/employees'); }
async function getEmployee(code) { return request(`/employees/${code}`); }
async function createEmployee(emp) { return request('/employees', { method: 'POST', body: JSON.stringify(emp) }); }
async function updateEmployee(code, emp) { return request(`/employees/${code}`, { method: 'PUT', body: JSON.stringify(emp) }); }
async function deleteEmployee(code) { return request(`/employees/${code}`, { method: 'DELETE' }); }

// Registrations
async function createRegistration(reg) { return request('/registrations', { method: 'POST', body: JSON.stringify(reg) }); }
async function getTodayRegistrations() { return request('/registrations/today'); }

// Examinations
async function getLatestExamination(patientCode) {
  // Tách riêng tham số _ nếu có
  let url = `/examinations/${patientCode}`;
  if (!patientCode.includes('?_=')) {
    url += `?_=${Date.now()}`;
  }
  return request(url);
}

async function saveExamination(patientCode, examData) {
  let { completed_sections, ...dataToSave } = examData;
  if (!completed_sections) completed_sections = [];

  let latestResp;
  try {
    latestResp = await getLatestExamination(patientCode);
  } catch (e) {
    latestResp = { success: false, data: null };
  }
  let examId = latestResp?.data?.id;
  if (!examId) {
    const createResp = await request('/examinations', {
      method: 'POST',
      body: JSON.stringify({ patient_code: patientCode })
    });
    examId = createResp.data.id;
  }

  return request(`/examinations/${examId}`, {
    method: 'PUT',
    body: JSON.stringify({
      data: dataToSave,
      completed_sections: completed_sections
    })
  });
}

export default {
  login, logout, getCurrentUser,
  getEmployees, getEmployee, createEmployee, updateEmployee, deleteEmployee,
  createRegistration, getTodayRegistrations,
  getLatestExamination, saveExamination
};