// ═══════════════════════════════════════════════════
// LoanCorp API — Жишээ өгөгдөл оруулах
// ═══════════════════════════════════════════════════
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' 
    ? { rejectUnauthorized: false } 
    : false
});

// Өнөөдрөөс N хоногийн өмнө/хойш огноо
function addDays(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

// ═══════════════════════════════════════════════════
// Жишээ харилцагчид
// ═══════════════════════════════════════════════════
const customers = [
  { customer_id: 'C001', name: 'Болд', register_number: 'УБ95011234', phone: '99001122', email: 'bold@email.mn', classification: 'A', branch_code: 'BR01' },
  { customer_id: 'C002', name: 'Сараа', register_number: 'РД88123456', phone: '88334455', email: 'saraa@email.mn', classification: 'C', branch_code: 'BR01' },
  { customer_id: 'C003', name: 'Энхээ Цэцэг', register_number: 'ОЕ92087654', phone: '95667788', email: 'enkhe@email.mn', classification: 'B', branch_code: 'BR02' },
  { customer_id: 'C004', name: 'Тэмүүлэн', register_number: 'УБ90112233', phone: '94556677', email: 'temuulen@email.mn', classification: 'D', branch_code: 'BR03' }
];

// ═══════════════════════════════════════════════════
// Жишээ зээлүүд
// ═══════════════════════════════════════════════════
const loans = [
  { loan_number: 'LC001', customer_id: 'C001', loan_type: 'consumer', amount: 2000000, remaining_balance: 1500000, monthly_payment: 195000, total_months: 12, paid_months: 3, consecutive_ontime_months: 3, start_date: addDays(-90), due_date: addDays(20), next_payment_date: addDays(7), payment_account: '5012345678', payment_bank: 'Хаан банк', status: 'active', overdue_days: 0, branch_code: 'BR01' },
  { loan_number: 'LC007', customer_id: 'C001', loan_type: 'salary', amount: 1000000, remaining_balance: 500000, monthly_payment: 95000, total_months: 12, paid_months: 6, consecutive_ontime_months: 2, start_date: addDays(-180), due_date: addDays(180), next_payment_date: addDays(15), payment_account: '4001234567', payment_bank: 'Голомт банк', status: 'active', overdue_days: 0, branch_code: 'BR01' },
  { loan_number: 'LC002', customer_id: 'C002', loan_type: 'business', amount: 5000000, remaining_balance: 4200000, monthly_payment: 480000, total_months: 12, paid_months: 2, consecutive_ontime_months: 0, start_date: addDays(-60), due_date: addDays(-16), next_payment_date: addDays(-16), payment_account: '5012345678', payment_bank: 'Хаан банк', status: 'overdue', overdue_days: 16, branch_code: 'BR01' },
  { loan_number: 'LC003', customer_id: 'C003', loan_type: 'consumer', amount: 1000000, remaining_balance: 850000, monthly_payment: 105000, total_months: 12, paid_months: 2, consecutive_ontime_months: 2, start_date: addDays(-60), due_date: addDays(3), next_payment_date: addDays(3), payment_account: '4001234567', payment_bank: 'Голомт банк', status: 'active', overdue_days: 0, branch_code: 'BR02' },
  { loan_number: 'LC004', customer_id: 'C004', loan_type: 'consumer', amount: 3000000, remaining_balance: 2700000, monthly_payment: 280000, total_months: 12, paid_months: 1, consecutive_ontime_months: 0, start_date: addDays(-90), due_date: addDays(-35), next_payment_date: addDays(-35), payment_account: '5012345678', payment_bank: 'Хаан банк', status: 'overdue', overdue_days: 35, branch_code: 'BR03' }
];

// ═══════════════════════════════════════════════════
// Жишээ төлбөрийн түүх
// ═══════════════════════════════════════════════════
const payments = [
  { loan_number: 'LC001', payment_date: addDays(-83), expected_amount: 195000, paid_amount: 195000, shortage: 0, is_late: false, days_late: 0 },
  { loan_number: 'LC001', payment_date: addDays(-53), expected_amount: 195000, paid_amount: 195000, shortage: 0, is_late: false, days_late: 0 },
  { loan_number: 'LC001', payment_date: addDays(-23), expected_amount: 195000, paid_amount: 195000, shortage: 0, is_late: false, days_late: 0 },
  { loan_number: 'LC002', payment_date: addDays(-53), expected_amount: 480000, paid_amount: 480000, shortage: 0, is_late: false, days_late: 0 },
  { loan_number: 'LC002', payment_date: addDays(-23), expected_amount: 480000, paid_amount: 300000, shortage: 180000, is_late: false, days_late: 0 }
];

// ═══════════════════════════════════════════════════
// Үндсэн функц
// ═══════════════════════════════════════════════════
async function main() {
  try {
    console.log('🚀 Database seed эхэллээ...\n');

    // 1. schema.sql ажиллуулах (хүснэгт үүсгэх)
    const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
    await pool.query(schema);
    console.log('📋 Хүснэгтүүд үүсгэгдлээ\n');

    // 2. Харилцагчид нэмэх
    for (const c of customers) {
      try {
        await pool.query(
          `INSERT INTO customers 
           (customer_id, name, register_number, phone, email, classification, branch_code) 
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [c.customer_id, c.name, c.register_number, c.phone, c.email, c.classification, c.branch_code]
        );
        console.log(`✅ ${c.customer_id} | ${c.name.padEnd(15)} | ${c.phone} | Ангилал: ${c.classification}`);
      } catch (err) {
        console.error(`❌ ${c.customer_id} (${c.name}) ОРОХГҮЙ: ${err.message}`);
      }
    }

    // 3. Зээлүүд нэмэх
    console.log('\n💰 Зээлүүд нэмэх...');
    for (const l of loans) {
      try {
        await pool.query(
          `INSERT INTO loans 
           (loan_number, customer_id, loan_type, amount, remaining_balance, monthly_payment, 
            total_months, paid_months, consecutive_ontime_months, start_date, due_date, 
            next_payment_date, payment_account, payment_bank, status, overdue_days, branch_code)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)`,
          [l.loan_number, l.customer_id, l.loan_type, l.amount, l.remaining_balance, l.monthly_payment,
           l.total_months, l.paid_months, l.consecutive_ontime_months, l.start_date, l.due_date,
           l.next_payment_date, l.payment_account, l.payment_bank, l.status, l.overdue_days, l.branch_code]
        );
        console.log(`✅ ${l.loan_number} | ${l.payment_bank.padEnd(12)} | ${l.amount.toLocaleString()}₮`);
      } catch (err) {
        console.error(`❌ ${l.loan_number} ОРОХГҮЙ: ${err.message}`);
      }
    }

    // 4. Төлбөрийн түүх нэмэх
    console.log('\n💳 Төлбөрийн түүх нэмэх...');
    for (const p of payments) {
      try {
        await pool.query(
          `INSERT INTO payments 
           (loan_number, payment_date, expected_amount, paid_amount, shortage, is_late, days_late) 
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [p.loan_number, p.payment_date, p.expected_amount, p.paid_amount, p.shortage, p.is_late, p.days_late]
        );
      } catch (err) {
        console.error(`❌ Payment ОРОХГҮЙ: ${err.message}`);
      }
    }
    console.log(`✅ ${payments.length} төлбөр нэмэгдлээ`);

    // 5. Шалгалт
    const result = await pool.query('SELECT customer_id, name, phone FROM customers ORDER BY customer_id');
    console.log('\n🔍 Database-д орсон харилцагчид:');
    result.rows.forEach(r => {
      console.log(`   ${r.customer_id} | ${r.name.padEnd(15)} | ${r.phone}`);
    });
    console.log(`\n📊 Нийт ${result.rows.length} харилцагч\n`);

  } catch (err) {
    console.error('❌ Гол алдаа:', err);
  } finally {
    await pool.end();
  }
}

main();