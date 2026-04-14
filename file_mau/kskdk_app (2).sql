-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Máy chủ: 127.0.0.1
-- Thời gian đã tạo: Th4 14, 2026 lúc 02:10 AM
-- Phiên bản máy phục vụ: 10.4.32-MariaDB
-- Phiên bản PHP: 8.0.30

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Cơ sở dữ liệu: `kskdk_app`
--

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `employees`
--

CREATE TABLE `employees` (
  `patient_code` varchar(50) NOT NULL,
  `name` varchar(255) NOT NULL,
  `gender` varchar(10) DEFAULT NULL,
  `dob` date DEFAULT NULL,
  `dept` varchar(255) DEFAULT NULL,
  `position` varchar(255) DEFAULT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `note` text DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Đang đổ dữ liệu cho bảng `employees`
--

INSERT INTO `employees` (`patient_code`, `name`, `gender`, `dob`, `dept`, `position`, `phone`, `email`, `note`, `created_at`, `updated_at`) VALUES
('19192020', 'NGUYỄN VĂN HIÊP', 'Nam', '0000-00-00', '', '', '', '', '', '2026-04-02 15:58:43', '2026-04-07 07:30:51'),
('20000001', 'NGUYỄN VĂN HÙNG', 'Nam', '1995-03-10', 'Chuyền May 1', 'Thợ may', '0902000001', 'nguyenvanhung@tkg.com', NULL, '2026-03-31 19:42:18', '2026-03-31 19:42:18'),
('20000002', 'TRẦN THỊ LAN', 'Nữ', '1992-07-15', 'Chuyền May 1', 'Thợ may', '0902000002', 'tranthilan@tkg.com', NULL, '2026-03-31 19:42:18', '2026-03-31 19:42:18'),
('20000003', 'LÊ VĂN THÀNH', 'Nam', '1988-11-22', 'Chuyền May 2', 'Chuyền trưởng', '0902000003', 'levanthanh@tkg.com', NULL, '2026-03-31 19:42:18', '2026-03-31 19:42:18'),
('20000004', 'PHẠM THỊ HOA', 'Nữ', '1993-05-05', 'Chuyền May 2', 'Thợ may', '0902000004', 'phamthihoa@tkg.com', NULL, '2026-03-31 19:42:18', '2026-03-31 19:42:18'),
('20000100', 'NGUYỄN VĂN MẪU', 'Nam', '1990-01-01', 'Chuyền May 1', 'Thợ may', '0900000000', 'mau@tkg.com', '', '2026-04-02 07:13:38', '2026-04-02 07:13:38'),
('20000101', 'TRẦN THỊ MẪU', 'Nữ', '1995-02-02', 'Chuyền May 2', 'Thợ may', '0900000001', 'thimau@tkg.com', '', '2026-04-02 07:13:38', '2026-04-02 07:13:38');

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `examinations`
--

CREATE TABLE `examinations` (
  `id` int(11) NOT NULL,
  `emp_id` varchar(50) NOT NULL,
  `exam_date` datetime DEFAULT current_timestamp(),
  `data` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT 'Chứa toàn bộ examData (tq, nk, ng, mt, tmh, rhm, sp, kl)' CHECK (json_valid(`data`)),
  `completed_sections` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Mảng các khoa đã hoàn thành (tq, nk, ng, mt, tmh, rhm, sp, kl)' CHECK (json_valid(`completed_sections`)),
  `doctor_name` varchar(255) DEFAULT NULL,
  `clinic_name` varchar(255) DEFAULT NULL,
  `sign_date` date DEFAULT NULL,
  `status` varchar(20) DEFAULT 'pending' COMMENT 'pending, completed, concluded',
  `signed_data` text DEFAULT NULL,
  `signatures` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Lưu danh sách chữ ký bác sĩ: [{doctor_name, signed_at, specialty}]' CHECK (json_valid(`signatures`))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Đang đổ dữ liệu cho bảng `examinations`
--

INSERT INTO `examinations` (`id`, `emp_id`, `exam_date`, `data`, `completed_sections`, `doctor_name`, `clinic_name`, `sign_date`, `status`, `signed_data`, `signatures`) VALUES
(1, '20000001', '2026-04-01 08:13:01', '{\"tq\":{\"height\":\"170\",\"weight\":\"65\",\"bmi\":\"22.5\",\"pulse\":\"72\",\"bpDisplay\":\"120/80 mmHg\",\"physicalClass\":\"Loại I – Rất tốt\"},\"nk\":{\"nkTH\":\"binh thuong\",\"nkHH\":\"binh thuong\",\"nkTHoa\":\"binh thuong\",\"nkTTN\":\"binh thuong\",\"nkNT\":\"binh thuong\",\"nkCXK\":\"binh thuong\",\"nkTK\":\"binh thuong\",\"nkTThan\":\"binh thuong\",\"class\":\"1\"},\"completed_sections\":[\"tq\",\"nk\",\"ng\",\"mt\",\"tmh\",\"rhm\",\"kl\"],\"ng\":{\"ngNgoai\":\"\",\"ngDa\":\"\",\"class\":\"Bình thường\"},\"mt\":{\"mtNoGlassR\":\"10/10\",\"mtNoGlassL\":\"10/10\",\"mtGlassR\":\"10/10\",\"mtGlassL\":\"10/10\",\"mtDiag\":\"\",\"class\":\"Bình thường\"},\"tmh\":{\"tmhRN\":\"7\",\"tmhRW\":\"2\",\"tmhLN\":\"7\",\"tmhLW\":\"2\",\"tmhNH\":\"\",\"tmhDiag\":\"\",\"class\":\"Bình thường\"},\"rhm\":{\"rhmNotes\":\"bình thường\",\"class\":\"Bình thường\"},\"kl\":{\"healthClass\":1,\"diseases\":\"okle\",\"fit\":\"✅ Đủ sức khỏe\",\"resolution\":\"okle\",\"doctor\":\"Nguyễn Văn A\",\"signDate\":\"2026-04-01\",\"clinic\":\"bệnh viên quân y\"}}', '[\"tq\",\"nk\",\"ng\",\"mt\",\"tmh\",\"rhm\",\"kl\"]', 'BS. Nguyễn Văn A', 'Trung tâm y tế TKG', NULL, 'pending', NULL, NULL),
(2, '20000002', '2026-03-31 19:42:18', '{\"tq\":{\"height\":\"165\",\"weight\":\"55\",\"bmi\":\"20.2\",\"pulse\":\"78\",\"bpDisplay\":\"110/70\",\"physicalClass\":\"Loại I\"}}', '[\"tq\"]', 'BS. Nguyễn Văn A', 'Trung tâm y tế TKG', '2026-03-31', 'pending', NULL, NULL),
(3, '20000003', '2026-04-01 02:27:17', '{\"tq\":{\"height\":\"174\",\"weight\":\"65\",\"bmi\":\"—\",\"pulse\":\"72\",\"bpDisplay\":\"120/80\",\"physicalClass\":\"Loại I – Rất tốt\"},\"completed_sections\":[\"tq\"],\"nk\":{\"nkTH\":\"Bình thường\",\"nkHH\":\"Bình thường\",\"nkTHoa\":\"Bình thường\",\"nkTTN\":\"Bình thường\",\"nkNT\":\"Bình thường\",\"nkCXK\":\"Bình thường\",\"nkTK\":\"Bình thường\",\"nkTThan\":\"Bình thường\",\"class\":\"2\"}}', '[\"tq\",\"nk\"]', 'BS. Nguyễn Văn A', NULL, NULL, 'pending', NULL, NULL),
(4, '20000004', '2026-04-01 02:27:33', '{\"tq\":{\"height\":\"178\",\"weight\":\"78\",\"bmi\":\"—\",\"pulse\":\"74\",\"bpDisplay\":\"120/80\",\"physicalClass\":\"Loại I – Rất tốt\"},\"completed_sections\":[\"tq\"]}', '[\"tq\"]', NULL, NULL, NULL, 'pending', NULL, NULL),
(5, '20000001', '2026-04-09 08:00:43', '{}', '[]', NULL, NULL, NULL, 'pending', NULL, NULL),
(6, '20000100', '2026-04-09 09:42:23', '{\"nk\":{\"nkTH\":\"bình thường\",\"nkHH\":\"bình thường\",\"nkTHoa\":\"bình thường\",\"nkTTN\":\"bình thường\",\"nkNT\":\"bình thường\",\"nkCXK\":\"bình thường\",\"nkTK\":\"bình thường\",\"nkTThan\":\"bình thường\",\"class\":\"1\"}}', '[\"nk\"]', 'BS. Nguyễn Văn A', NULL, NULL, 'pending', NULL, NULL),
(7, '19192020', '2026-04-09 09:45:37', '{\"nk\":{\"nkTH\":\"dfsfsdsdf\",\"nkHH\":\"dfssdf\",\"nkTHoa\":\"sdfs\",\"nkTTN\":\"sdfsd\",\"nkNT\":\"sdf\",\"nkCXK\":\"sfss\",\"nkTK\":\"fs\",\"nkTThan\":\"sfs\",\"class\":\"1\"},\"tq\":{\"height\":\"170\",\"weight\":\"56\",\"bmi\":\"19.4\",\"pulse\":\"78\",\"bpDisplay\":\"120/80 mmHg\",\"physicalClass\":\"Loại I – Rất tốt\"},\"ng\":{\"ngNgoai\":\"BÌNH THƯỜNG\",\"ngDa\":\"BÌNH THƯỜNG\",\"class\":\"1\"}}', '[\"nk\",\"tq\",\"ng\"]', 'BS. Trần Văn B', NULL, NULL, 'pending', NULL, NULL),
(8, '20000101', '2026-04-09 09:54:45', '{\"nk\":{\"nkTH\":\"jf\",\"nkHH\":\"dsf\",\"nkTHoa\":\"sdf\",\"nkTTN\":\"df\",\"nkNT\":\"df\",\"nkCXK\":\"df\",\"nkTK\":\"df\",\"nkTThan\":\"df\",\"class\":\"1\"}}', '[\"nk\"]', 'BS. Nguyễn Văn A', NULL, NULL, 'pending', NULL, NULL);

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `registrations`
--

CREATE TABLE `registrations` (
  `id` int(11) NOT NULL,
  `emp_id` varchar(50) NOT NULL,
  `name` varchar(255) NOT NULL,
  `gender` varchar(10) DEFAULT NULL,
  `dob` date DEFAULT NULL,
  `age` varchar(10) DEFAULT NULL,
  `job` varchar(255) DEFAULT NULL,
  `history` text DEFAULT NULL,
  `hazard` text DEFAULT NULL,
  `dept` varchar(255) DEFAULT NULL,
  `register_date` date NOT NULL,
  `register_time` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Đang đổ dữ liệu cho bảng `registrations`
--

INSERT INTO `registrations` (`id`, `emp_id`, `name`, `gender`, `dob`, `age`, `job`, `history`, `hazard`, `dept`, `register_date`, `register_time`) VALUES
(1, '20000001', 'NGUYỄN VĂN HÙNG', 'Nam', '1995-03-10', '31 tuổi', 'Thợ may', '', '', 'Chuyền May 1', '2026-03-31', '2026-03-31 19:42:18'),
(2, '20000002', 'TRẦN THỊ LAN', 'Nữ', '1992-07-15', '34 tuổi', 'Thợ may', '', '', 'Chuyền May 1', '2026-03-31', '2026-03-31 19:42:18'),
(3, '20000001', 'NGUYỄN VĂN HÙNG', '', '0000-00-00', '', '', '', '', 'Chuyền May 1', '2026-03-31', '2026-04-01 02:40:15'),
(4, '20000001', 'NGUYỄN VĂN HÙNG', '', '0000-00-00', '', '', '', '', 'Chuyền May 1', '2026-03-31', '2026-04-01 02:40:28'),
(5, '20000001', 'NGUYỄN VĂN HÙNG', '', '0000-00-00', '', '', '', '', 'Chuyền May 1', '2026-03-31', '2026-04-01 02:40:39'),
(6, '19192020', 'NGUYỄN VĂN HIÊPJ', '', '0000-00-00', '', '', '', '', '', '2026-04-02', '2026-04-02 15:58:45');

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `users`
--

CREATE TABLE `users` (
  `id` int(11) NOT NULL,
  `username` varchar(100) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `name` varchar(255) NOT NULL,
  `role` varchar(50) NOT NULL COMMENT 'nurse, specialist, conclusion',
  `specialty` varchar(100) DEFAULT NULL COMMENT 'Chuyên khoa: Nội khoa, Ngoại khoa, Mắt...',
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `mysign_user_id` varchar(100) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Đang đổ dữ liệu cho bảng `users`
--

INSERT INTO `users` (`id`, `username`, `password_hash`, `name`, `role`, `specialty`, `created_at`, `updated_at`, `mysign_user_id`) VALUES
(1, 'nurse', '$2a$08$HHSXXXnGwwUaJ4GmSy6oxuiV7H/Yii5YNbqnA/gZO3SaEYtZzFSmu', 'Điều dưỡng', 'nurse', NULL, '2026-03-31 19:42:18', '2026-04-01 02:16:57', NULL),
(2, 'nk', '$2a$08$HHSXXXnGwwUaJ4GmSy6oxuiV7H/Yii5YNbqnA/gZO3SaEYtZzFSmu', 'BS. Nguyễn Văn A', 'specialist', 'Nội khoa', '2026-03-31 19:42:18', '2026-04-01 02:16:57', NULL),
(3, 'ng', '$2a$08$HHSXXXnGwwUaJ4GmSy6oxuiV7H/Yii5YNbqnA/gZO3SaEYtZzFSmu', 'BS. Trần Văn B', 'specialist', 'Ngoại khoa', '2026-03-31 19:42:18', '2026-04-01 02:16:57', NULL),
(4, 'mt', '$2a$08$HHSXXXnGwwUaJ4GmSy6oxuiV7H/Yii5YNbqnA/gZO3SaEYtZzFSmu', 'BS. Lê Thị C', 'specialist', 'Mắt', '2026-03-31 19:42:18', '2026-04-01 02:16:57', NULL),
(5, 'tmh', '$2a$08$HHSXXXnGwwUaJ4GmSy6oxuiV7H/Yii5YNbqnA/gZO3SaEYtZzFSmu', 'BS. Phạm Văn D', 'specialist', 'Tai Mũi Họng', '2026-03-31 19:42:18', '2026-04-01 02:16:57', NULL),
(6, 'rhm', '$2a$08$HHSXXXnGwwUaJ4GmSy6oxuiV7H/Yii5YNbqnA/gZO3SaEYtZzFSmu', 'BS. Hoàng Văn E', 'specialist', 'Răng Hàm Mặt', '2026-03-31 19:42:18', '2026-04-01 02:16:57', NULL),
(7, 'sp', '$2a$08$HHSXXXnGwwUaJ4GmSy6oxuiV7H/Yii5YNbqnA/gZO3SaEYtZzFSmu', 'BS. Nguyễn Thị F', 'specialist', 'Sản phụ khoa', '2026-03-31 19:42:18', '2026-04-01 02:16:57', NULL),
(8, 'conclusion', '$2a$08$HHSXXXnGwwUaJ4GmSy6oxuiV7H/Yii5YNbqnA/gZO3SaEYtZzFSmu', 'BS. Kết luận', 'conclusion', NULL, '2026-03-31 19:42:18', '2026-04-01 02:16:57', NULL);

--
-- Chỉ mục cho các bảng đã đổ
--

--
-- Chỉ mục cho bảng `employees`
--
ALTER TABLE `employees`
  ADD PRIMARY KEY (`patient_code`);

--
-- Chỉ mục cho bảng `examinations`
--
ALTER TABLE `examinations`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_emp_id` (`emp_id`),
  ADD KEY `idx_exam_date` (`exam_date`);

--
-- Chỉ mục cho bảng `registrations`
--
ALTER TABLE `registrations`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_register_date` (`register_date`),
  ADD KEY `idx_emp_id` (`emp_id`);

--
-- Chỉ mục cho bảng `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `username` (`username`);

--
-- AUTO_INCREMENT cho các bảng đã đổ
--

--
-- AUTO_INCREMENT cho bảng `examinations`
--
ALTER TABLE `examinations`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT cho bảng `registrations`
--
ALTER TABLE `registrations`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT cho bảng `users`
--
ALTER TABLE `users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=18;

--
-- Các ràng buộc cho các bảng đã đổ
--

--
-- Các ràng buộc cho bảng `examinations`
--
ALTER TABLE `examinations`
  ADD CONSTRAINT `examinations_ibfk_1` FOREIGN KEY (`emp_id`) REFERENCES `employees` (`patient_code`) ON DELETE CASCADE;

--
-- Các ràng buộc cho bảng `registrations`
--
ALTER TABLE `registrations`
  ADD CONSTRAINT `registrations_ibfk_1` FOREIGN KEY (`emp_id`) REFERENCES `employees` (`patient_code`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
