CREATE TABLE IF NOT EXISTS customers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  register_number TEXT UNIQUE NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  classification TEXT DEFAULT 'A',
  classification_updated_at DATETIME,
  branch_code TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS loans (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
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
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES customers(customer_id)
);

CREATE TABLE IF NOT EXISTS payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  loan_number TEXT NOT NULL,
  payment_date DATE NOT NULL,
  expected_amount INTEGER NOT NULL,
  paid_amount INTEGER NOT NULL,
  shortage INTEGER DEFAULT 0,
  is_late INTEGER DEFAULT 0,
  days_late INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS extension_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  loan_number TEXT NOT NULL,
  extension_months INTEGER,
  fee INTEGER,
  status TEXT DEFAULT 'pending',
  source TEXT DEFAULT 'manual',
  request_date DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS closure_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  loan_number TEXT NOT NULL,
  closure_amount INTEGER,
  closed_early INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending',
  source TEXT DEFAULT 'manual',
  request_date DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS new_applications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  register_number TEXT,
  phone TEXT NOT NULL,
  amount INTEGER,
  purpose TEXT,
  source TEXT DEFAULT 'manual',
  status TEXT DEFAULT 'pending',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
CREATE INDEX IF NOT EXISTS idx_customers_register ON customers(register_number);
CREATE INDEX IF NOT EXISTS idx_loans_customer ON loans(customer_id);
CREATE INDEX IF NOT EXISTS idx_loans_status ON loans(status);
CREATE INDEX IF NOT EXISTS idx_payments_loan ON payments(loan_number);