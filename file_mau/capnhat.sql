ALTER TABLE `examinations` 
ADD COLUMN `signatures` JSON DEFAULT NULL COMMENT 'Lưu danh sách chữ ký bác sĩ: [{doctor_name, signed_at, specialty}]';