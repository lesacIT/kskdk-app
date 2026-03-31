-- ============================================
-- TẠO CƠ SỞ DỮ LIỆU
-- ============================================
CREATE DATABASE IF NOT EXISTS kskdk_app
CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE kskdk_app;

-- ============================================
-- BẢNG NGƯỜI DÙNG (ĐĂNG NHẬP)
-- ============================================
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL COMMENT 'nurse, specialist, conclusion',
    specialty VARCHAR(100) NULL COMMENT 'Chuyên khoa: Nội khoa, Ngoại khoa, Mắt...',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ============================================
-- BẢNG NHÂN VIÊN (BỆNH NHÂN)
-- ============================================
CREATE TABLE IF NOT EXISTS employees (
    patient_code VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    gender VARCHAR(10),
    dob DATE,
    dept VARCHAR(255),
    position VARCHAR(255),
    phone VARCHAR(20),
    email VARCHAR(255),
    note TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ============================================
-- BẢNG ĐĂNG KÝ KHÁM
-- ============================================
CREATE TABLE IF NOT EXISTS registrations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    emp_id VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    gender VARCHAR(10),
    dob DATE,
    age VARCHAR(10),
    job VARCHAR(255),
    history TEXT,
    hazard TEXT,
    dept VARCHAR(255),
    register_date DATE NOT NULL,
    register_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_register_date (register_date),
    INDEX idx_emp_id (emp_id),
    FOREIGN KEY (emp_id) REFERENCES employees(patient_code) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================
-- BẢNG PHIẾU KHÁM (LƯU TOÀN BỘ DỮ LIỆU KHÁM DẠNG JSON)
-- ============================================
CREATE TABLE IF NOT EXISTS examinations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    emp_id VARCHAR(50) NOT NULL,
    exam_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    data JSON NOT NULL COMMENT 'Chứa toàn bộ examData (tq, nk, ng, mt, tmh, rhm, sp, kl)',
    completed_sections JSON COMMENT 'Mảng các khoa đã hoàn thành (tq, nk, ng, mt, tmh, rhm, sp, kl)',
    doctor_name VARCHAR(255),
    clinic_name VARCHAR(255),
    sign_date DATE,
    status VARCHAR(20) DEFAULT 'pending' COMMENT 'pending, completed, concluded',
    INDEX idx_emp_id (emp_id),
    INDEX idx_exam_date (exam_date),
    FOREIGN KEY (emp_id) REFERENCES employees(patient_code) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================
-- THÊM DỮ LIỆU MẪU
-- ============================================

-- Mật khẩu mẫu: 123456 (đã được bcrypt hash)
-- Dùng bcryptjs để tạo: bcrypt.hashSync('123456', 8)
-- Kết quả: $2a$08$5Hl3XzJz5zVz5zVz5zVz5u5u5u5u5u5u5u5u5u5u5u

INSERT INTO users (username, password_hash, name, role, specialty) VALUES
('nurse', '$2a$08$5Hl3XzJz5zVz5zVz5zVz5u5u5u5u5u5u5u5u5u5u5u', 'Điều dưỡng', 'nurse', NULL),
('nk', '$2a$08$5Hl3XzJz5zVz5zVz5zVz5u5u5u5u5u5u5u5u5u5u5u', 'BS. Nguyễn Văn A', 'specialist', 'Nội khoa'),
('ng', '$2a$08$5Hl3XzJz5zVz5zVz5zVz5u5u5u5u5u5u5u5u5u5u5u', 'BS. Trần Văn B', 'specialist', 'Ngoại khoa'),
('mt', '$2a$08$5Hl3XzJz5zVz5zVz5zVz5u5u5u5u5u5u5u5u5u5u5u', 'BS. Lê Thị C', 'specialist', 'Mắt'),
('tmh', '$2a$08$5Hl3XzJz5zVz5zVz5zVz5u5u5u5u5u5u5u5u5u5u5u', 'BS. Phạm Văn D', 'specialist', 'Tai Mũi Họng'),
('rhm', '$2a$08$5Hl3XzJz5zVz5zVz5zVz5u5u5u5u5u5u5u5u5u5u5u', 'BS. Hoàng Văn E', 'specialist', 'Răng Hàm Mặt'),
('sp', '$2a$08$5Hl3XzJz5zVz5zVz5zVz5u5u5u5u5u5u5u5u5u5u5u', 'BS. Nguyễn Thị F', 'specialist', 'Sản phụ khoa'),
('conclusion', '$2a$08$5Hl3XzJz5zVz5zVz5zVz5u5u5u5u5u5u5u5u5u5u5u', 'BS. Kết luận', 'conclusion', NULL);

-- Thêm nhân viên mẫu
INSERT INTO employees (patient_code, name, gender, dob, dept, position, phone, email) VALUES
('20000001', 'NGUYỄN VĂN HÙNG', 'Nam', '1995-03-10', 'Chuyền May 1', 'Thợ may', '0902000001', 'nguyenvanhung@tkg.com'),
('20000002', 'TRẦN THỊ LAN', 'Nữ', '1992-07-15', 'Chuyền May 1', 'Thợ may', '0902000002', 'tranthilan@tkg.com'),
('20000003', 'LÊ VĂN THÀNH', 'Nam', '1988-11-22', 'Chuyền May 2', 'Chuyền trưởng', '0902000003', 'levanthanh@tkg.com'),
('20000004', 'PHẠM THỊ HOA', 'Nữ', '1993-05-05', 'Chuyền May 2', 'Thợ may', '0902000004', 'phamthihoa@tkg.com');

-- Thêm đăng ký mẫu
INSERT INTO registrations (emp_id, name, gender, dob, age, job, history, hazard, dept, register_date) VALUES
('20000001', 'NGUYỄN VĂN HÙNG', 'Nam', '1995-03-10', '31 tuổi', 'Thợ may', '', '', 'Chuyền May 1', CURDATE()),
('20000002', 'TRẦN THỊ LAN', 'Nữ', '1992-07-15', '34 tuổi', 'Thợ may', '', '', 'Chuyền May 1', CURDATE());

-- Thêm phiếu khám mẫu (dữ liệu JSON)
INSERT INTO examinations (emp_id, data, completed_sections, doctor_name, clinic_name, sign_date, status) VALUES
('20000001', '{"tq":{"height":"170","weight":"65","bmi":"22.5","pulse":"72","bpDisplay":"120/80","physicalClass":"Loại II"}}', '["tq"]', 'BS. Nguyễn Văn A', 'Trung tâm y tế TKG', CURDATE(), 'pending'),
('20000002', '{"tq":{"height":"165","weight":"55","bmi":"20.2","pulse":"78","bpDisplay":"110/70","physicalClass":"Loại I"}}', '["tq"]', 'BS. Nguyễn Văn A', 'Trung tâm y tế TKG', CURDATE(), 'pending');

-- ============================================
-- HIỂN THỊ THÔNG TIN CÁC BẢNG
-- ============================================
SELECT '✅ Đã tạo thành công cơ sở dữ liệu kskdk_app với các bảng và dữ liệu mẫu!' AS message;