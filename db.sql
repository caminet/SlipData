-- ============================================================
--  My Expense Data  -  Database schema  (db.sql)
-- ------------------------------------------------------------
--  Columns match db.js (COLUMNS) and export.xlsx header row
--  EXACTLY, so the three files can import / export and be used
--  together with index.html.
--
--  No sample data is included.
-- ============================================================

DROP TABLE IF EXISTS expense_data;

CREATE TABLE expense_data (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,   -- ลำดับรายการ
    date        TEXT,                                -- วันที่ทำรายการ (Date)        เช่น 29/06/2026
    time        TEXT,                                -- เวลา (Time)                 เช่น 14:35:22
    from_acc    TEXT,                                -- จาก (From)
    to_acc      TEXT,                                -- ไปยัง (To)
    amount      REAL,                                -- จำนวนเงิน (Total / Grand total / Amount)
    type        TEXT,                                -- รายรับ = income | รายจ่าย = expense
    note        TEXT,                                -- หมายเหตุ (Note)
    created_at  TEXT                                 -- วัน/เวลาที่บันทึกเข้าระบบ
);

-- แสดงโครงสร้างตาราง (อ้างอิง)
-- PRAGMA table_info(expense_data);
