const express = require('express');
const router = express.Router();
const db = require('../database/db');

// ═══════════════════════════════════════════════════
// ХҮСЭЛТ ХАДГАЛАХ (chatbot-аас ирнэ)
// ═══════════════════════════════════════════════════

router.post('/extension', async (req, res) => {
  try {
    const { loan_number, extension_months, fee, source } = req.body;
    if (!loan_number || !extension_months || !fee) {
      return res.status(400).json({
        error: 'Шаардлагатай талбар дутуу',
        required: ['loan_number', 'extension_months', 'fee']
      });
    }
    const result = await db.saveExtension({ loan_number, extension_months, fee, source });
    res.json({
      success: true,
      message: 'Сунгалтын хүсэлт амжилттай бүртгэгдлээ',
      transaction_id: result.lastID,
      status: 'pending'
    });
  } catch (err) {
    console.error('Алдаа:', err);
    res.status(500).json({ error: 'Серверийн алдаа' });
  }
});

router.post('/closure', async (req, res) => {
  try {
    const { loan_number, closure_amount, source } = req.body;
    if (!loan_number || !closure_amount) {
      return res.status(400).json({
        error: 'Шаардлагатай талбар дутуу',
        required: ['loan_number', 'closure_amount']
      });
    }
    const result = await db.saveClosure({ loan_number, closure_amount, source });
    res.json({
      success: true,
      message: 'Хаах хүсэлт амжилттай бүртгэгдлээ',
      transaction_id: result.lastID,
      status: 'pending'
    });
  } catch (err) {
    console.error('Алдаа:', err);
    res.status(500).json({ error: 'Серверийн алдаа' });
  }
});

router.post('/application', async (req, res) => {
  try {
    const { name, register_number, phone, amount, purpose, source } = req.body;
    if (!name || !phone || !amount) {
      return res.status(400).json({
        error: 'Шаардлагатай талбар дутуу',
        required: ['name', 'phone', 'amount']
      });
    }
    const result = await db.saveNewApplication({ name, register_number, phone, amount, purpose, source });
    res.json({
      success: true,
      message: 'Шинэ хүсэлт амжилттай бүртгэгдлээ',
      application_id: result.lastID,
      status: 'pending'
    });
  } catch (err) {
    console.error('Алдаа:', err);
    res.status(500).json({ error: 'Серверийн алдаа' });
  }
});

// ═══════════════════════════════════════════════════
// 🔄 НЯГТЛАН: ХҮЛЭЭГДЭЖ БУЙ БҮХ ТРАНЗАКЦ ХАРАХ
// ⚠️ Энэ нь /:type-аас ӨМНӨ байх ёстой (Express дараалал)
// ═══════════════════════════════════════════════════
router.get('/pending/all', async (req, res) => {
  try {
    const pending = await db.getPendingTransactions();
    res.json({ success: true, pending });
  } catch (err) {
    console.error('Алдаа:', err);
    res.status(500).json({ error: 'Серверийн алдаа' });
  }
});

// ═══════════════════════════════════════════════════
// 🔄 SYNC: ТРАНЗАКЦ ЖАГСААХ (chatbot татна)
// ═══════════════════════════════════════════════════
// GET /api/transactions/:type?status=approved&since=2026-06-01
//   type: extension | closure | application
router.get('/:type', async (req, res) => {
  try {
    const { type } = req.params;
    const status = req.query.status || 'approved';
    const since = req.query.since || null;

    if (!['extension', 'closure', 'application'].includes(type)) {
      return res.status(400).json({ error: 'Буруу төрөл (extension/closure/application)' });
    }

    const transactions = await db.getTransactionsByStatus(type, status, since);
    res.json({ success: true, type, status, count: transactions.length, transactions });
  } catch (err) {
    console.error('Алдаа:', err);
    res.status(500).json({ error: 'Серверийн алдаа' });
  }
});

// ═══════════════════════════════════════════════════
// 🔄 SYNC: НЯГТЛАН БАТАЛГААЖУУЛАХ (туршилт/бодит)
// ═══════════════════════════════════════════════════
// PATCH /api/transactions/:type/:id/approve
//   Нягтлан зээлийг баталгаажуулахад дуудна.
//   extension → зээлийн due_date сунгана
//   closure   → зээлийг хаана
router.patch('/:type/:id/approve', async (req, res) => {
  try {
    const { type, id } = req.params;
    if (!['extension', 'closure', 'application'].includes(type)) {
      return res.status(400).json({ error: 'Буруу төрөл' });
    }

    const tx = await db.getTransactionById(type, id);
    if (!tx) {
      return res.status(404).json({ error: 'Транзакц олдсонгүй' });
    }

    // 1. Транзакцийн статусыг 'approved' болгох
    await db.updateTransactionStatus(type, id, 'approved');

    // 2. Зээлийн жинхэнэ мэдээллийг шинэчлэх
    if (type === 'extension') {
      await db.applyExtensionToLoan(tx.loan_number, tx.extension_months);
    } else if (type === 'closure') {
      await db.applyClosureToLoan(tx.loan_number);
    }

    res.json({
      success: true,
      message: `Транзакц #${id} (${type}) баталгаажлаа`,
      type,
      transaction_id: Number(id),
      status: 'approved'
    });
  } catch (err) {
    console.error('Алдаа:', err);
    res.status(500).json({ error: 'Серверийн алдаа' });
  }
});

module.exports = router;
