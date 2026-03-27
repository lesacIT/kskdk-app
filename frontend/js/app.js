// frontend/js/app.js
// Đây là file chứa toàn bộ logic xử lý form và tương tác

// State quản lý
const state = {
  patient: { name: '', gender: '', dob: '', job: '', history: '', hazard: '' },
  currentScreen: 'home',
  doneSections: new Set(),
  selectedHealthClass: null,
  toothState: {}
};

const screenOrder = ['home', 'tq', 'nk', 'ng', 'sp', 'mt', 'tmh', 'rhm', 'kl'];
const sectionNames = {
  tq: 'Tổng quát',
  nk: 'Nội khoa',
  ng: 'Ngoại/Da liễu',
  sp: 'Sản phụ khoa',
  mt: 'Mắt',
  tmh: 'Tai Mũi Họng',
  rhm: 'Răng Hàm Mặt',
  kl: 'Kết luận'
};

// ===== NAVIGATION =====
function goToTab(section) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const target = section === 'home' ? 'screen-home' : 'screen-' + section;
  const el = document.getElementById(target);
  if (el) el.classList.add('active');
  state.currentScreen = section;
  updateHeader(section);
  if (section === 'kl') buildSummary();
  window.scrollTo(0, 0);
}

function goBack() {
  const idx = screenOrder.indexOf(state.currentScreen);
  if (idx > 0) goToTab(screenOrder[idx - 1]);
}

function updateHeader(section) {
  const backBtn = document.getElementById('backBtn');
  const navTabs = document.getElementById('navTabs');
  const patientBar = document.getElementById('patientBar');
  const titles = {
    home: 'Khám Sức Khỏe Lưu Động',
    tq: 'Khám Tổng Quát',
    nk: 'Nội Khoa',
    ng: 'Ngoại Khoa & Da Liễu',
    sp: 'Sản Phụ Khoa',
    mt: 'Khám Mắt',
    tmh: 'Tai – Mũi – Họng',
    rhm: 'Răng Hàm Mặt',
    kl: 'Kết Luận'
  };
  document.getElementById('headerTitle').textContent = titles[section] || 'Khám Sức Khỏe';
  
  if (section === 'home') {
    backBtn.style.visibility = 'hidden';
    navTabs.style.display = 'none';
    patientBar.style.display = 'none';
  } else {
    backBtn.style.visibility = 'visible';
    navTabs.style.display = 'flex';
    patientBar.style.display = 'flex';
    document.querySelectorAll('.nav-tab').forEach(t => {
      t.classList.remove('active');
      if (t.getAttribute('data-screen') === 'screen-' + section) t.classList.add('active');
    });
  }
  updateProgress();
}

function updateProgress() {
  const total = screenOrder.length - 1;
  const done = state.doneSections.size;
  document.getElementById('progressFill').style.width = Math.round((done / total) * 100) + '%';
  document.querySelectorAll('.nav-tab').forEach(t => {
    const s = t.getAttribute('data-screen').replace('screen-', '');
    if (state.doneSections.has(s)) t.classList.add('done');
    else t.classList.remove('done');
  });
}

// ===== FORM HELPERS =====
function selectGender(g) {
  document.getElementById('genderNam').classList.toggle('selected', g === 'Nam');
  document.getElementById('genderNu').classList.toggle('selected', g === 'Nữ');
}

function selectRadio(label, groupId) {
  document.querySelectorAll('#' + groupId + ' .radio-btn').forEach(l => l.classList.remove('selected'));
  label.classList.add('selected');
}

function calcBMI() {
  const h = parseFloat(document.getElementById('height').value);
  const w = parseFloat(document.getElementById('weight').value);
  const card = document.getElementById('bmiCard');
  if (h > 0 && w > 0) {
    const bmi = w / (h / 100) ** 2;
    const v = bmi.toFixed(1);
    document.getElementById('bmiValue').textContent = v;
    let status = '', cls = 'bmi-normal';
    if (bmi < 18.5) { status = 'Thiếu cân'; cls = 'bmi-warn'; }
    else if (bmi < 23) { status = 'Bình thường'; }
    else if (bmi < 25) { status = 'Thừa cân'; cls = 'bmi-warn'; }
    else { status = 'Béo phì'; cls = 'bmi-danger'; }
    document.getElementById('bmiStatus').textContent = status;
    card.className = 'vital-display ' + cls;
    card.style.display = 'block';
  } else { card.style.display = 'none'; }
}

function checkBP() {
  const s = document.getElementById('bpSys').value;
  const d = document.getElementById('bpDia').value;
  if (s && d) document.getElementById('bpDisplay').value = s + '/' + d + ' mmHg';
}

function selectHealthClass(n) {
  state.selectedHealthClass = n;
  document.querySelectorAll('.hc-btn').forEach(b => {
    b.className = 'hc-btn';
    if (parseInt(b.getAttribute('data-class')) === n) b.classList.add('sel-' + n);
  });
}

// ===== TOOTH CHART =====
function initTeeth() {
  const upper = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28];
  const lower = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38];
  buildTeethRow('upperTeeth', upper);
  buildTeethRow('lowerTeeth', lower);
}

function buildTeethRow(containerId, ids) {
  const row = document.getElementById(containerId);
  ids.forEach(id => {
    const el = document.createElement('div');
    el.className = 'tooth-box';
    el.textContent = id;
    el.setAttribute('data-tooth', id);
    el.onclick = () => cycleTooth(id, el);
    row.appendChild(el);
    state.toothState[id] = 0;
  });
}

function cycleTooth(id, el) {
  const s = (state.toothState[id] + 1) % 3;
  state.toothState[id] = s;
  el.className = 'tooth-box' + (s === 1 ? ' tooth-ok' : s === 2 ? ' tooth-issue' : '');
}

// ===== SUMMARY =====
function buildSummary() {
  const sections = [
    { label: 'Tổng quát', fields: [
      { l: 'Chiều cao', v: () => { const h = document.getElementById('height').value; return h ? h + ' cm' : '—'; } },
      { l: 'Cân nặng', v: () => { const w = document.getElementById('weight').value; return w ? w + ' kg' : '—'; } },
      { l: 'BMI', v: () => document.getElementById('bmiValue').textContent || '—' },
      { l: 'Huyết áp', v: () => document.getElementById('bpDisplay').value || '—' },
      { l: 'Thể lực', v: () => { const el = document.querySelector('#physicalClass .selected'); return el ? el.querySelector('input').value : '—'; } },
    ] },
    { label: 'Nội khoa', fields: [
      { l: 'Tuần hoàn', v: () => getClass('nkTH_class') },
      { l: 'Hô hấp', v: () => getClass('nkHH_class') },
      { l: 'Tiêu hóa', v: () => getClass('nkTHoa_class') },
      { l: 'Thận-TN', v: () => getClass('nkTTN_class') },
      { l: 'Nội tiết', v: () => getClass('nkNT_class') },
      { l: 'CXK', v: () => getClass('nkCXK_class') },
      { l: 'Thần kinh', v: () => getClass('nkTK_class') },
      { l: 'Tâm thần', v: () => getClass('nkTThan_class') },
    ] },
    { label: 'Ngoại/Da', fields: [
      { l: 'Ngoại khoa', v: () => getClass('ngNgoai_class') },
      { l: 'Da liễu', v: () => getClass('ngDa_class') },
    ] },
    { label: 'Mắt', fields: [{ l: 'Kết quả', v: () => getClass('mt_class') }] },
    { label: 'TMH', fields: [{ l: 'Kết quả', v: () => getClass('tmh_class') }] },
    { label: 'RHM', fields: [{ l: 'Kết quả', v: () => getClass('rhm_class') }] },
  ];
  
  if (state.patient.gender === 'Nữ') {
    sections.push({ label: 'Sản phụ', fields: [{ l: 'Kết quả', v: () => getClass('sp_class') }] });
  }
  
  let html = '';
  sections.forEach(sec => {
    html += `<div style="padding:8px 0;border-bottom:1px solid var(--border)"><div style="font-size:12px;font-weight:700;color:var(--text-hint);text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px">${sec.label}</div>`;
    sec.fields.forEach(f => {
      const v = f.v();
      const badge = v === 'Bình thường' || v === 'Đủ sức khỏe' ? 'badge-ok' : v === '—' || !v ? 'badge-pending' : v.includes('lý') || v.includes('nặng') ? 'badge-danger' : 'badge-warn';
      html += `<div class="summary-row" style="padding:6px 0;border:none"><span class="summary-label">${f.l}</span><span class="${badge}">${v || '—'}</span></div>`;
    });
    html += '</div>';
  });
  document.getElementById('summaryBody').innerHTML = html;
}

function getClass(groupId) {
  const el = document.querySelector('#' + groupId + ' .selected');
  return el ? el.querySelector('input').value : '—';
}

function getSelectedRadioValue(groupId) {
  const selected = document.querySelector(`#${groupId} .selected`);
  return selected ? selected.querySelector('input')?.value : null;
}

// ===== TOAST =====
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2000);
}

// ===== API INTEGRATION =====
async function startExam() {
  const name = document.getElementById('patientName').value.trim();
  if (!name) { showToast('⚠️ Vui lòng nhập họ tên bệnh nhân'); return; }

  const patientData = {
    name: name,
    gender: document.querySelector('.gender-card.selected span')?.textContent || '',
    dob: document.getElementById('patientDob').value,
    age: parseInt(document.getElementById('patientAge').value) || 0,
    job: document.getElementById('patientJob').value,
    medical_history: document.getElementById('patientHistory').value,
    hazard_factors: document.getElementById('hazardFactors').value
  };

  try {
    showToast('Đang lưu thông tin...');
    const result = await API.createPatient(patientData);

    sessionStorage.setItem('currentPatientCode', result.data.patient_code);

    state.patient = {
      ...patientData,
      code: result.data.patient_code
    };

    document.getElementById('pBarName').textContent = name;
    document.getElementById('pBarDob').textContent = patientData.dob || '—';
    document.getElementById('pBarGender').textContent = patientData.gender || '—';

    const isMale = patientData.gender === 'Nam';
    document.getElementById('spSkipNote').style.display = isMale ? 'block' : 'none';
    document.getElementById('spCard').style.display = isMale ? 'none' : 'block';

    document.getElementById('signDate').value = new Date().toISOString().slice(0, 10);
    goToTab('tq');
  } catch (error) {
    showToast('❌ Lỗi: ' + error.message);
  }
}

function collectExamData() {
  return {
    height: parseFloat(document.getElementById('height').value),
    weight: parseFloat(document.getElementById('weight').value),
    bmi: parseFloat(document.getElementById('bmiValue').textContent),
    pulse: parseInt(document.getElementById('pulse').value),
    bp_systolic: parseInt(document.getElementById('bpSys').value),
    bp_diastolic: parseInt(document.getElementById('bpDia').value),
    physical_class: getSelectedRadioValue('physicalClass'),
    
    nk_cardiovascular: document.getElementById('nkTH').value,
    nk_cardiovascular_class: getSelectedRadioValue('nkTH_class'),
    nk_respiratory: document.getElementById('nkHH').value,
    nk_respiratory_class: getSelectedRadioValue('nkHH_class'),
    nk_digestive: document.getElementById('nkTHoa').value,
    nk_digestive_class: getSelectedRadioValue('nkTHoa_class'),
    nk_urinary: document.getElementById('nkTTN').value,
    nk_urinary_class: getSelectedRadioValue('nkTTN_class'),
    nk_endocrine: document.getElementById('nkNT').value,
    nk_endocrine_class: getSelectedRadioValue('nkNT_class'),
    nk_musculoskeletal: document.getElementById('nkCXK').value,
    nk_musculoskeletal_class: getSelectedRadioValue('nkCXK_class'),
    nk_neurological: document.getElementById('nkTK').value,
    nk_neurological_class: getSelectedRadioValue('nkTK_class'),
    nk_mental: document.getElementById('nkTThan').value,
    nk_mental_class: getSelectedRadioValue('nkTThan_class'),
    
    ng_surgical: document.getElementById('ngNgoai').value,
    ng_surgical_class: getSelectedRadioValue('ngNgoai_class'),
    ng_dermatology: document.getElementById('ngDa').value,
    ng_dermatology_class: getSelectedRadioValue('ngDa_class'),
    
    sp_content: document.getElementById('spContent')?.value,
    sp_class: getSelectedRadioValue('sp_class'),
    
    mt_vision_no_glass_r: document.getElementById('mtNoGlassR').value,
    mt_vision_no_glass_l: document.getElementById('mtNoGlassL').value,
    mt_vision_glass_r: document.getElementById('mtGlassR').value,
    mt_vision_glass_l: document.getElementById('mtGlassL').value,
    mt_diagnosis: document.getElementById('mtDiag').value,
    mt_class: getSelectedRadioValue('mt_class'),
    
    tmh_hearing_r_normal: parseFloat(document.getElementById('tmhRN').value),
    tmh_hearing_r_whisper: parseFloat(document.getElementById('tmhRW').value),
    tmh_hearing_l_normal: parseFloat(document.getElementById('tmhLN').value),
    tmh_hearing_l_whisper: parseFloat(document.getElementById('tmhLW').value),
    tmh_ent: document.getElementById('tmhNH').value,
    tmh_diagnosis: document.getElementById('tmhDiag').value,
    tmh_class: getSelectedRadioValue('tmh_class'),
    
    rhm_teeth: state.toothState,
    rhm_notes: document.getElementById('rhmNotes').value,
    rhm_class: getSelectedRadioValue('rhm_class'),
    
    health_class: state.selectedHealthClass,
    conclusion_diseases: document.getElementById('klDiseases').value,
    conclusion_fit: getSelectedRadioValue('klFit'),
    conclusion_resolution: document.getElementById('klResolution').value,
    doctor_name: document.getElementById('doctorName').value,
    sign_date: document.getElementById('signDate').value,
    clinic_name: document.getElementById('clinicName').value
  };
}

async function saveSectionAndNext(current, next) {
  const examData = collectExamData();
  
  try {
    showToast('Đang lưu...');
    const patientCode = sessionStorage.getItem('currentPatientCode');
    if (patientCode) {
      await API.saveExamination(patientCode, examData);
    }
    
    state.doneSections.add(current);
    updateProgress();
    showToast('✓ Đã lưu phần ' + sectionNames[current]);
    goToTab(next);
  } catch (error) {
    showToast('❌ Lỗi lưu: ' + error.message);
    state.doneSections.add(current);
    updateProgress();
    goToTab(next);
  }
}

async function finishExam() {
  const examData = collectExamData();
  const patientCode = sessionStorage.getItem('currentPatientCode');
  
  try {
    showToast('Đang lưu phiếu khám...');
    if (patientCode) {
      await API.saveExamination(patientCode, examData);
    }
    
    state.doneSections.add('kl');
    updateProgress();
    showToast('✅ Phiếu khám đã hoàn tất!');
    
    setTimeout(() => window.print(), 800);
  } catch (error) {
    showToast('❌ Lỗi lưu: ' + error.message);
  }
}

// ===== INITIALIZATION =====
document.addEventListener('DOMContentLoaded', () => {
  initTeeth();
  document.getElementById('signDate').value = new Date().toISOString().slice(0, 10);
  
  // Event listeners
  document.getElementById('patientDob').addEventListener('change', function() {
    const dob = new Date(this.value);
    const now = new Date();
    let age = now.getFullYear() - dob.getFullYear();
    const m = now.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) age--;
    document.getElementById('patientAge').value = age > 0 ? age + ' tuổi' : '';
  });
});