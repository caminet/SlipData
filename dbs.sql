-- ============================================================
-- MySlipData - Database Schema
-- ============================================================

CREATE DATABASE IF NOT EXISTS myslipdata CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE myslipdata;

-- Expense Records Table
CREATE TABLE IF NOT EXISTS expense_records (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    record_date   DATE          NOT NULL COMMENT 'วันที่ทำรายการ',
    record_time   TIME          NOT NULL COMMENT 'เวลาทำรายการ',
    from_party    VARCHAR(255)  DEFAULT NULL COMMENT 'จาก',
    to_party      VARCHAR(255)  DEFAULT NULL COMMENT 'ไปยัง',
    amount        DECIMAL(15,2) NOT NULL DEFAULT 0.00 COMMENT 'จำนวนเงิน',
    slip_type     ENUM('bank_slip','receipt') NOT NULL DEFAULT 'bank_slip',
    image_path    VARCHAR(500)  DEFAULT NULL,
    image_data    LONGBLOB      DEFAULT NULL,
    raw_text      TEXT          DEFAULT NULL,
    note          TEXT          DEFAULT NULL,
    created_at    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_date     (record_date),
    INDEX idx_datetime (record_date, record_time),
    INDEX idx_type     (slip_type),
    INDEX idx_amount   (amount)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS export_logs (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    export_date   DATE         NOT NULL,
    date_from     DATE         NOT NULL,
    date_to       DATE         NOT NULL,
    record_count  INT          NOT NULL DEFAULT 0,
    total_amount  DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    file_name     VARCHAR(255) DEFAULT 'Export.xlsx',
    created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_export_date (export_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
