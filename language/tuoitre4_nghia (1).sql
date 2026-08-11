-- phpMyAdmin SQL Dump
-- version 4.7.3
-- https://www.phpmyadmin.net/
--
-- Máy chủ: localhost:3306
-- Thời gian đã tạo: Th4 29, 2018 lúc 08:19 AM
-- Phiên bản máy phục vụ: 5.6.38-log
-- Phiên bản PHP: 5.6.30

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET AUTOCOMMIT = 0;
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Cơ sở dữ liệu: `tuoitre4_nghia`
--

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `choden`
--

CREATE TABLE `choden` (
  `id` int(11) NOT NULL,
  `uid` int(11) NOT NULL,
  `wild_id` int(11) NOT NULL,
  `nguhanh` tinyint(1) NOT NULL,
  `sao` int(11) NOT NULL,
  `hp` int(11) NOT NULL,
  `att` int(11) NOT NULL,
  `def` int(11) NOT NULL,
  `speed` int(11) NOT NULL,
  `bac` int(11) NOT NULL,
  `vang` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

--
-- Chỉ mục cho các bảng đã đổ
--

--
-- Chỉ mục cho bảng `choden`
--
ALTER TABLE `choden`
  ADD PRIMARY KEY (`id`);

--
-- AUTO_INCREMENT cho các bảng đã đổ
--

--
-- AUTO_INCREMENT cho bảng `choden`
--
ALTER TABLE `choden`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
