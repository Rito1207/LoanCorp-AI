-- ═══════════════════════════════════════════════════
-- LoanCorp API — PostgreSQL Schema
-- ═══════════════════════════════════════════════════

-- Хуучин хүснэгт байвал устгах (цэвэр эхлэл хийхэд хэрэгтэй)
DROP TABLE IF EXISTS new_applications CASCADE;
DROP TABLE IF EXISTS closure_history CASCADE;
DROP TABLE IF EXISTS extension_history CASCADE;
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS loans CASCADE;
DROP TABLE IF EXISTS customers CASCADE;

-- ═══════════════════════════════════════════════════
-- Харилцагчид (customers)
-- ═══════════════════════════════════════════════════
CREATE TABLE customers (
  id SERIAL PRIMARY KEY,
  customer_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  register_number TEXT UNIQUE NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  classification TEXT DEFAULT 'A',
  classification_updated_at TIMESTAMP,
  branch_code TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ═══════════════════════════════════════════════════
-- Зээлүүд (loans)
-- ═══════════════════════════════════════════════════
CREATE TABLE loans (
  id SERIAL PRIMARY KEY,
  loan_number TEXT UNIQUE NOT NULL,
  customer_id TEXT NOT NULL,
  loan_type TEXT,
  amount INTEGER NOT NULL,
  remaining_balance INTEGER NOT NULL,
  monthly_payment INTEGER NOT NULL,
  monthly_rate REAL DEFAULT 0.025,
  total_months INTEGER NOT NULL,
  paid_months INTEGER DEFAULT 0,
  start_date DATE NOT NULL,
  due_date DATE NOT NULL,
  next_payment_date DATE,
  payment_account TEXT NOT NULL,
  payment_bank TEXT NOT NULL,
  status TEXT DEFAULT 'active',
  overdue_days INTEGER DEFAULT 0,
  consecutive_ontime_months INTEGER DEFAULT 0,
  branch_code TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES customers(customer_id)
);

-- ═══════════════════════════════════════════════════
-- Төлбөрийн түүх (payments)
-- ═══════════════════════════════════════════════════
CREATE TABLE payments (
  id SERIAL PRIMARY KEY,
  loan_number TEXT NOT NULL,
  payment_date DATE NOT NULL,
  expected_amount INTEGER NOT NULL,
  paid_amount INTEGER NOT NULL,
  shortage INTEGER DEFAULT 0,
  is_late BOOLEAN DEFAULT FALSE,
  days_late INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ═══════════════════════════════════════════════════
-- Сунгалтын түүх (extension_history)
-- ═══════════════════════════════════════════════════
CREATE TABLE extension_history (
  id SERIAL PRIMARY KEY,
  loan_number TEXT NOT NULL,
  extension_months INTEGER,
  fee INTEGER,
  status TEXT DEFAULT 'pending',
  source TEXT DEFAULT 'manual',
  request_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ═══════════════════════════════════════════════════
-- Хаалтын түүх (closure_history)
-- ═══════════════════════════════════════════════════
CREATE TABLE closure_history (
  id SERIAL PRIMARY KEY,
  loan_number TEXT NOT NULL,
  closure_amount INTEGER,
  closed_early BOOLEAN DEFAULT FALSE,
  status TEXT DEFAULT 'pending',
  source TEXT DEFAULT 'manual',
  request_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ═══════════════════════════════════════════════════
-- Шинэ хүсэлтүүд (new_applications)
-- ═══════════════════════════════════════════════════
CREATE TABLE new_applications (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  register_number TEXT,
  phone TEXT NOT NULL,
  amount INTEGER,
  purpose TEXT,
  source TEXT DEFAULT 'manual',
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ═══════════════════════════════════════════════════
-- Хайлтыг хурдасгах индексүүд
-- ═══════════════════════════════════════════════════
CREATE INDEX idx_customers_phone ON customers(phone);
CREATE INDEX idx_customers_register ON customers(register_number);
CREATE INDEX idx_loans_customer ON loans(customer_id);
CREATE INDEX idx_loans_status ON loans(status);
CREATE INDEX idx_payments_loan ON payments(loan_number);