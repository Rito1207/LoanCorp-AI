// ═══════════════════════════════════════════════════
// 🗄️  LoanCorp API — Database Layer (PostgreSQL)
// ═══════════════════════════════════════════════════
// Шинэ функцууд:
//   - findCustomerById       (customer_id-ээр хайх)
//   - getAllCustomers        (бүх хэрэглэгч + шүүлт)
//   - getCustomerStats       (хэрэглэгчдийн статистик)
//   - updateCustomer         (мэдээлэл шинэчлэх)
// ═══════════════════════════════════════════════════

const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production'
    ? { rejectUnauthorized: false }
    : false
});

pool.on('connect', () => {
  console.log('✅ PostgreSQL-тэй холбогдлоо (loanCorpAPI)');
});

pool.on('error', (err) => {
  console.error('❌ PostgreSQL алдаа:', err);
});

// ───────────────────────────────────────────────────
// Туслах функцууд
// ───────────────────────────────────────────────────
async function dbGet(sql, params = []) {
  const result = await pool.query(sql, params);
  return result.rows[0] || null;
}

async function dbAll(sql, params = []) {
  const result = await pool.query(sql, params);
  return result.rows;
}

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
  // ═════════════════════════════════════════════════
  // 🤝 ПАРТНЕР (API KEY) ФУНКЦУУД
  // ═════════════════════════════════════════════════

  // API key hash-аар партнер хайх (authentication-д)
  async findPartnerByKeyHash(keyHash) {
    return await dbGet(
      'SELECT * FROM partners WHERE api_key_hash = $1',
      [keyHash]
    );
  },

  // Шинэ партнер бүртгэх
  async createPartner(data) {
    return await dbRun(
      `INSERT INTO partners
       (partner_id, name, contact_email, contact_phone,
        api_key_hash, api_key_prefix, rate_limit_per_min, allowed_scopes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id`,
      [
        data.partner_id, data.name, data.contact_email || null,
        data.contact_phone || null, data.api_key_hash, data.api_key_prefix,
        data.rate_limit_per_min || 60, data.allowed_scopes || 'read,write'
      ]
    );
  },

  // Партнерын статистик шинэчлэх (хүсэлт болгонд)
  async touchPartner(partnerId) {
    return await dbRun(
      `UPDATE partners
       SET total_requests = total_requests + 1,
           last_request_at = CURRENT_TIMESTAMP
       WHERE partner_id = $1`,
      [partnerId]
    );
  },

  // Партнерыг идэвхгүй/идэвхтэй болгох
  async setPartnerActive(partnerId, isActive) {
    return await dbRun(
      'UPDATE partners SET is_active = $1 WHERE partner_id = $2',
      [isActive, partnerId]
    );
  },

  // Бүх партнерын жагсаалт (admin-д)
  async getAllPartners() {
    return await dbAll(
      `SELECT partner_id, name, contact_email, api_key_prefix,
              is_active, rate_limit_per_min, allowed_scopes,
              total_requests, last_request_at, created_at
       FROM partners ORDER BY created_at DESC`
    );
  },

  // API хүсэлт бүртгэх (audit log)
  async logApiRequest(data) {
    return await dbRun(
      `INSERT INTO api_request_logs
       (partner_id, method, path, status_code, ip_address)
       VALUES ($1, $2, $3, $4, $5)`,
      [data.partner_id, data.method, data.path, data.status_code, data.ip_address]
    );
  },

  // Партнерын хүсэлтийн түүх (admin-д)
  async getPartnerLogs(partnerId, limit = 50) {
    return await dbAll(
      `SELECT method, path, status_code, ip_address, created_at
       FROM api_request_logs
       WHERE partner_id = $1
       ORDER BY created_at DESC LIMIT $2`,
      [partnerId, limit]
    );
  },

  // ─────────────────────────────────────────────────
  // ХЭРЭГЛЭГЧТЭЙ ХОЛБООТОЙ
  // ─────────────────────────────────────────────────

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

  // 🆕 customer_id-ээр хэрэглэгч хайх
  async findCustomerById(customerId) {
    return await dbGet(
      'SELECT * FROM customers WHERE customer_id = $1',
      [customerId]
    );
  },

  // 🆕 Бүх хэрэглэгчийг жагсаах (шүүлттэй)
  async getAllCustomers({ branch, classification, limit = 1000, offset = 0 } = {}) {
    let sql = 'SELECT * FROM customers WHERE 1=1';
    const params = [];
    let paramIndex = 1;

    if (branch) {
      sql += ` AND branch_code = $${paramIndex}`;
      params.push(branch);
      paramIndex++;
    }

    if (classification) {
      sql += ` AND classification = $${paramIndex}`;
      params.push(classification);
      paramIndex++;
    }

    sql += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    return await dbAll(sql, params);
  },

  // 🆕 Хэрэглэгчдийн статистик
  async getCustomerStats() {
    const [total, byClass, byBranch] = await Promise.all([
      dbGet('SELECT COUNT(*)::int as count FROM customers'),
      dbAll(`
        SELECT classification, COUNT(*)::int as count
        FROM customers
        GROUP BY classification
        ORDER BY classification
      `),
      dbAll(`
        SELECT branch_code, COUNT(*)::int as count
        FROM customers
        WHERE branch_code IS NOT NULL
        GROUP BY branch_code
        ORDER BY count DESC
      `)
    ]);

    // Ангиллыг объект болгож хувиргах
    const classificationMap = { A: 0, B: 0, C: 0, D: 0, E: 0 };
    for (const row of byClass) {
      if (row.classification && classificationMap[row.classification] !== undefined) {
        classificationMap[row.classification] = row.count;
      }
    }

    return {
      total: total.count,
      byClassification: classificationMap,
      byBranch: byBranch
    };
  },

  // 🆕 Хэрэглэгчийн мэдээлэл шинэчлэх
  async updateCustomer(customerId, updates) {
    const fields = [];
    const params = [];
    let paramIndex = 1;

    if (updates.classification !== undefined) {
      fields.push(`classification = $${paramIndex}`);
      params.push(updates.classification);
      paramIndex++;

      // Ангилал өөрчлөгдсөн үед огноог ч мөн бичих
      fields.push(`classification_updated_at = CURRENT_TIMESTAMP`);
    }

    if (updates.phone !== undefined) {
      fields.push(`phone = $${paramIndex}`);
      params.push(updates.phone);
      paramIndex++;
    }

    if (updates.email !== undefined) {
      fields.push(`email = $${paramIndex}`);
      params.push(updates.email);
      paramIndex++;
    }

    if (updates.branch_code !== undefined) {
      fields.push(`branch_code = $${paramIndex}`);
      params.push(updates.branch_code);
      paramIndex++;
    }

    if (fields.length === 0) {
      throw new Error('Шинэчлэх талбар байхгүй');
    }

    params.push(customerId);

    const sql = `
      UPDATE customers
      SET ${fields.join(', ')}
      WHERE customer_id = $${paramIndex}
      RETURNING *
    `;

    const result = await pool.query(sql, params);
    return result.rows[0] || null;
  },

  // ─────────────────────────────────────────────────
  // ЗЭЭЛТЭЙ ХОЛБООТОЙ
  // ─────────────────────────────────────────────────

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

  // ─────────────────────────────────────────────────
  // ХҮСЭЛТ ХАДГАЛАХ
  // ─────────────────────────────────────────────────

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

  // ─────────────────────────────────────────────────
  // СТАТИСТИК
  // ─────────────────────────────────────────────────
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
  },

  // ═════════════════════════════════════════════════
  // 🔄 SYNC ФУНКЦУУД (нягтлан баталгаажуулах + татах)
  // ═════════════════════════════════════════════════

  // Тодорхой статустай транзакцуудыг жагсаах (chatbot sync-д татна)
  async getTransactionsByStatus(type, status = 'approved', since = null) {
    let table, dateCol;
    if (type === 'extension') { table = 'extension_history'; dateCol = 'request_date'; }
    else if (type === 'closure') { table = 'closure_history'; dateCol = 'request_date'; }
    else if (type === 'application') { table = 'new_applications'; dateCol = 'created_at'; }
    else return [];

    let sql = `SELECT * FROM ${table} WHERE status = $1`;
    const params = [status];
    if (since) {
      sql += ` AND ${dateCol} >= $2`;
      params.push(since);
    }
    sql += ` ORDER BY ${dateCol} DESC`;
    return await dbAll(sql, params);
  },

  // Транзакцийн статус шинэчлэх (нягтлан баталгаажуулах)
  async updateTransactionStatus(type, id, status) {
    let table;
    if (type === 'extension') table = 'extension_history';
    else if (type === 'closure') table = 'closure_history';
    else if (type === 'application') table = 'new_applications';
    else throw new Error('Буруу транзакцийн төрөл');
    return await dbRun(
      `UPDATE ${table} SET status = $1 WHERE id = $2 RETURNING id`,
      [status, id]
    );
  },

  // Нэг транзакц авах (баталгаажуулахад дэлгэрэнгүй хэрэгтэй)
  async getTransactionById(type, id) {
    let table;
    if (type === 'extension') table = 'extension_history';
    else if (type === 'closure') table = 'closure_history';
    else if (type === 'application') table = 'new_applications';
    else return null;
    return await dbGet(`SELECT * FROM ${table} WHERE id = $1`, [id]);
  },

  // Зээл сунгагдахад due_date болон хугацааг шинэчлэх
  async applyExtensionToLoan(loanNumber, months) {
    return await dbRun(
      `UPDATE loans
       SET due_date = (due_date::date + make_interval(months => $2::int)),
           total_months = total_months + $2::int,
           overdue_days = 0, status = 'active'
       WHERE loan_number = $1 RETURNING id`,
      [loanNumber, months]
    );
  },

  // Зээл хаагдахад статусыг 'closed' болгох
  async applyClosureToLoan(loanNumber) {
    return await dbRun(
      `UPDATE loans SET status = 'closed', remaining_balance = 0
       WHERE loan_number = $1 RETURNING id`,
      [loanNumber]
    );
  },

  // Бүх хүлээгдэж буй транзакцууд (нягтлан харах)
  async getPendingTransactions() {
    const [extensions, closures, applications] = await Promise.all([
      dbAll("SELECT * FROM extension_history WHERE status = 'pending' ORDER BY request_date DESC"),
      dbAll("SELECT * FROM closure_history WHERE status = 'pending' ORDER BY request_date DESC"),
      dbAll("SELECT * FROM new_applications WHERE status = 'pending' ORDER BY created_at DESC")
    ]);
    return { extensions, closures, applications };
  }
};
