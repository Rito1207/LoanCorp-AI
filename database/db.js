// ═══════════════════════════════════════════════════
// LoanCorp API — PostgreSQL Database Connection
// ═══════════════════════════════════════════════════
const { Pool } = require('pg');

// PostgreSQL холболтын тохиргоо
// DATABASE_URL нь .env файлд бичигдсэн байх ёстой
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Production-д SSL хэрэгтэй (Render.com шаардана)
  ssl: process.env.NODE_ENV === 'production' 
    ? { rejectUnauthorized: false } 
    : false
});

// Холболт амжилттай болсон эсэхийг шалгах
pool.on('connect', () => {
  console.log('✅ PostgreSQL-тэй холбогдлоо');
});

pool.on('error', (err) => {
  console.error('❌ PostgreSQL алдаа:', err);
});

// ═══════════════════════════════════════════════════
// Туслах функцууд (SQL гүйцэтгэх)
// ═══════════════════════════════════════════════════

// Нэг мөр буцаах (SELECT ... LIMIT 1)
async function dbGet(sql, params = []) {
  const result = await pool.query(sql, params);
  return result.rows[0] || null;
}

// Бүх мөрийг буцаах (SELECT ...)
async function dbAll(sql, params = []) {
  const result = await pool.query(sql, params);
  return result.rows;
}

// INSERT/UPDATE/DELETE — id болон changes тоо буцаах
async function dbRun(sql, params = []) {
  const result = await pool.query(sql, params);
  return {
    lastID: result.rows[0]?.id || null,
    changes: result.rowCount
  };
}

// ═══════════════════════════════════════════════════
// Үндсэн функцууд (бизнес логик)
// ═══════════════════════════════════════════════════

module.exports = {
  // Утсаар хэрэглэгч хайх
  async findCustomerByPhone(phone) {
    return await dbGet(
      'SELECT * FROM customers WHERE phone = $1', 
      [phone]
    );
  },

  // Регистрийн дугаараар хэрэглэгч хайх
  async findCustomerByRegister(register) {
    return await dbGet(
      'SELECT * FROM customers WHERE register_number = $1', 
      [register.toUpperCase()]
    );
  },

  // Тухайн хэрэглэгчийн зээлүүд
  async getLoansByCustomer(customerId) {
    return await dbAll(
      `SELECT * FROM loans 
       WHERE customer_id = $1 
       ORDER BY status DESC, due_date ASC`, 
      [customerId]
    );
  },

  // Зээлийн дугаараар хайх
  async getLoanByNumber(loanNumber) {
    return await dbGet(
      'SELECT * FROM loans WHERE loan_number = $1', 
      [loanNumber]
    );
  },

  // Төлбөрийн түүх
  async getPaymentHistory(loanNumber) {
    return await dbAll(
      `SELECT * FROM payments 
       WHERE loan_number = $1 
       ORDER BY payment_date DESC 
       LIMIT 6`, 
      [loanNumber]
    );
  },

  // Сунгалтын хүсэлт хадгалах
  async saveExtension(data) {
    return await dbRun(
      `INSERT INTO extension_history 
       (loan_number, extension_months, fee, source) 
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [data.loan_number, data.extension_months, data.fee, data.source || 'chatbot']
    );
  },

  // Хаах хүсэлт хадгалах
  async saveClosure(data) {
    return await dbRun(
      `INSERT INTO closure_history 
       (loan_number, closure_amount, closed_early, source) 
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [data.loan_number, data.closure_amount, data.closed_early || false, data.source || 'chatbot']
    );
  },

  // Шинэ хүсэлт хадгалах
  async saveNewApplication(data) {
    return await dbRun(
      `INSERT INTO new_applications 
       (name, register_number, phone, amount, purpose, source) 
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id`,
      [data.name, data.register_number, data.phone, data.amount, data.purpose, data.source || 'chatbot']
    );
  },

  // Статистик
  async getStats() {
    const stats = await Promise.all([
      dbGet('SELECT COUNT(*)::int as c FROM customers'),
      dbGet('SELECT COUNT(*)::int as c FROM loans'),
      dbGet("SELECT COUNT(*)::int as c FROM loans WHERE status = 'active'"),
      dbGet('SELECT COUNT(*)::int as c FROM loans WHERE overdue_days > 0'),
      dbGet("SELECT COUNT(*)::int as c FROM new_applications WHERE status = 'pending'"),
      dbGet('SELECT COUNT(*)::int as c FROM extension_history'),
      dbGet('SELECT COUNT(*)::int as c FROM closure_history')
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