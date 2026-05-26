const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'loancorp.db');
const db = new sqlite3.Database(DB_PATH);

const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
db.exec(schema);

function dbGet(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err); else resolve(row);
    });
  });
}

function dbAll(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err); else resolve(rows);
    });
  });
}

function dbRun(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) reject(err); 
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

module.exports = {
  async findCustomerByPhone(phone) {
    return await dbGet('SELECT * FROM customers WHERE phone = ?', [phone]);
  },
  
  async findCustomerByRegister(register) {
    return await dbGet('SELECT * FROM customers WHERE register_number = ?', [register.toUpperCase()]);
  },
  
  async getLoansByCustomer(customerId) {
    return await dbAll('SELECT * FROM loans WHERE customer_id = ? ORDER BY status DESC, due_date ASC', [customerId]);
  },
  
  async getLoanByNumber(loanNumber) {
    return await dbGet('SELECT * FROM loans WHERE loan_number = ?', [loanNumber]);
  },
  
  async getPaymentHistory(loanNumber) {
    return await dbAll('SELECT * FROM payments WHERE loan_number = ? ORDER BY payment_date DESC LIMIT 6', [loanNumber]);
  },
  
  async saveExtension(data) {
    return await dbRun(
      `INSERT INTO extension_history (loan_number, extension_months, fee, source) VALUES (?, ?, ?, ?)`,
      [data.loan_number, data.extension_months, data.fee, data.source || 'chatbot']
    );
  },
  
  async saveClosure(data) {
    return await dbRun(
      `INSERT INTO closure_history (loan_number, closure_amount, closed_early, source) VALUES (?, ?, ?, ?)`,
      [data.loan_number, data.closure_amount, data.closed_early ? 1 : 0, data.source || 'chatbot']
    );
  },
  
  async saveNewApplication(data) {
    return await dbRun(
      `INSERT INTO new_applications (name, register_number, phone, amount, purpose, source) VALUES (?, ?, ?, ?, ?, ?)`,
      [data.name, data.register_number, data.phone, data.amount, data.purpose, data.source || 'chatbot']
    );
  },
  
  async getStats() {
    const stats = await Promise.all([
      dbGet('SELECT COUNT(*) as c FROM customers'),
      dbGet('SELECT COUNT(*) as c FROM loans'),
      dbGet("SELECT COUNT(*) as c FROM loans WHERE status = 'active'"),
      dbGet('SELECT COUNT(*) as c FROM loans WHERE overdue_days > 0'),
      dbGet("SELECT COUNT(*) as c FROM new_applications WHERE status = 'pending'"),
      dbGet("SELECT COUNT(*) as c FROM extension_history"),
      dbGet("SELECT COUNT(*) as c FROM closure_history")
    ]);
    
    return {
      totalCustomers: stats[0].c,
      totalLoans: stats[1].c,
      activeLoans: stats[2].c,
      overdueLoans: stats[3].c,
      newApplications: stats[4].c,
      extensions: stats[5].c,
      closures: stats[6].c
    };
  }
};