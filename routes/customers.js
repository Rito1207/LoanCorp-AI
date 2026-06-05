// ═══════════════════════════════════════════════════
// 👥 CUSTOMERS ROUTES — Бүрэн гүйцэт CRUD
// ═══════════════════════════════════════════════════
// Endpoints:
//   GET    /api/customers/search?q=...           — Утас/регистрээр хайх
//   GET    /api/customers/list?branch=...        — Бүх хэрэглэгч (салбараар шүүх)
//   GET    /api/customers/stats                  — Хэрэглэгчдийн статистик
//   GET    /api/customers/:customerId            — Нэг хэрэглэгчийн дэлгэрэнгүй
//   PATCH  /api/customers/:customerId            — Ангилал/утас/хаяг өөрчлөх
// ═══════════════════════════════════════════════════

const express = require('express');
const router = express.Router();
const db = require('../database/db');

// ───────────────────────────────────────────────────
// Туслах: customer объектыг API-д тохирох форматаар буцаах
// ───────────────────────────────────────────────────
function formatCustomer(customer) {
  return {
    customer_id: customer.customer_id,
    name: customer.name,
    register_number: customer.register_number,
    phone: customer.phone,
    email: customer.email,
    classification: customer.classification || 'A',
    classification_updated_at: customer.classification_updated_at,
    branch_code: customer.branch_code,
    created_at: customer.created_at
  };
}

// ═══════════════════════════════════════════════════
// 1. ХЭРЭГЛЭГЧ ХАЙХ (утас эсвэл регистрээр)
// GET /api/customers/search?q=99112233
// GET /api/customers/search?q=УБ95011234
// ═══════════════════════════════════════════════════
router.get('/search', async (req, res) => {
  try {
    const query = req.query.q;

    if (!query) {
      return res.status(400).json({ error: 'q (хайлтын утга) хэрэгтэй' });
    }

    let customer = await db.findCustomerByPhone(query);
    if (!customer) {
      customer = await db.findCustomerByRegister(query);
    }

    if (!customer) {
      return res.status(404).json({
        error: 'Хэрэглэгч олдсонгүй',
        query: query
      });
    }

    res.json({
      success: true,
      customer: formatCustomer(customer)
    });
  } catch (err) {
    console.error('❌ Search алдаа:', err);
    res.status(500).json({ error: 'Серверийн алдаа' });
  }
});

// ═══════════════════════════════════════════════════
// 2. БҮХ ХЭРЭГЛЭГЧИЙГ ЖАГСААХ (Excel экспортод)
// GET /api/customers/list                        — Бүгд
// GET /api/customers/list?branch=BR001           — Тухайн салбараар шүүх
// GET /api/customers/list?classification=A       — Ангилалаар шүүх
// GET /api/customers/list?limit=100&offset=0     — Хуудаслалт
// ═══════════════════════════════════════════════════
router.get('/list', async (req, res) => {
  try {
    const branch = req.query.branch;
    const classification = req.query.classification;
    const limit = parseInt(req.query.limit) || 1000;
    const offset = parseInt(req.query.offset) || 0;

    // Хязгаар шалгах (DoS-аас сэргийлэх)
    if (limit > 5000) {
      return res.status(400).json({
        error: 'limit хэт их (max 5000)'
      });
    }

    const customers = await db.getAllCustomers({
      branch,
      classification,
      limit,
      offset
    });

    res.json({
      success: true,
      count: customers.length,
      filters: { branch, classification, limit, offset },
      customers: customers.map(formatCustomer)
    });
  } catch (err) {
    console.error('❌ List алдаа:', err);
    res.status(500).json({ error: 'Серверийн алдаа' });
  }
});

// ═══════════════════════════════════════════════════
// 3. ХЭРЭГЛЭГЧДИЙН СТАТИСТИК
// GET /api/customers/stats
// ═══════════════════════════════════════════════════
router.get('/stats', async (req, res) => {
  try {
    const stats = await db.getCustomerStats();
    res.json({
      success: true,
      stats
    });
  } catch (err) {
    console.error('❌ Stats алдаа:', err);
    res.status(500).json({ error: 'Серверийн алдаа' });
  }
});

// ═══════════════════════════════════════════════════
// 4. НЭГ ХЭРЭГЛЭГЧИЙН ДЭЛГЭРЭНГҮЙ
// GET /api/customers/CUS001
// ═══════════════════════════════════════════════════
// ⚠️ Энэ route-г :customerId параметртэй static route-уудаас ХОЙНО зарлах ёстой
//    (search, list, stats — эдгээрийг "customer_id" гэж андуурахгүйн тулд)
router.get('/:customerId', async (req, res) => {
  try {
    const { customerId } = req.params;

    if (!customerId) {
      return res.status(400).json({ error: 'customer_id хэрэгтэй' });
    }

    const customer = await db.findCustomerById(customerId);

    if (!customer) {
      return res.status(404).json({
        error: 'Хэрэглэгч олдсонгүй',
        customer_id: customerId
      });
    }

    // Нэмэлт: зээлийн товч мэдээллийг ч хамт буцаах
    const loans = await db.getLoansByCustomer(customerId);

    res.json({
      success: true,
      customer: formatCustomer(customer),
      loans_summary: {
        total: loans.length,
        active: loans.filter(l => l.status === 'active').length,
        overdue: loans.filter(l => l.overdue_days > 0).length,
        total_remaining: loans.reduce((sum, l) => sum + (l.remaining_balance || 0), 0)
      }
    });
  } catch (err) {
    console.error('❌ Detail алдаа:', err);
    res.status(500).json({ error: 'Серверийн алдаа' });
  }
});

// ═══════════════════════════════════════════════════
// 5. ХЭРЭГЛЭГЧИЙН МЭДЭЭЛЭЛ ӨӨРЧЛӨХ
// PATCH /api/customers/CUS001
// Body: { classification?, phone?, email?, branch_code? }
// ═══════════════════════════════════════════════════
router.patch('/:customerId', async (req, res) => {
  try {
    const { customerId } = req.params;
    const { classification, phone, email, branch_code } = req.body;

    // Ядаж 1 талбар шинэчлэх ёстой
    if (!classification && !phone && !email && !branch_code) {
      return res.status(400).json({
        error: 'Ядаж 1 талбар шинэчлэх ёстой',
        allowed: ['classification', 'phone', 'email', 'branch_code']
      });
    }

    // Ангиллын утга шалгах
    if (classification && !['A', 'B', 'C', 'D', 'E'].includes(classification)) {
      return res.status(400).json({
        error: 'classification зөвхөн A/B/C/D/E утгатай байж болно',
        received: classification
      });
    }

    // Утасны дугаар шалгах
    if (phone && !/^\d{8}$/.test(phone)) {
      return res.status(400).json({
        error: 'phone 8 оронтой тоо байх ёстой',
        received: phone
      });
    }

    // Email шалгах (хэрэв байгаа бол)
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({
        error: 'email формат буруу',
        received: email
      });
    }

    // Хэрэглэгч байгаа эсэхийг шалгах
    const existing = await db.findCustomerById(customerId);
    if (!existing) {
      return res.status(404).json({
        error: 'Хэрэглэгч олдсонгүй',
        customer_id: customerId
      });
    }

    // Шинэчлэх
    const updates = {};
    if (classification) updates.classification = classification;
    if (phone) updates.phone = phone;
    if (email) updates.email = email;
    if (branch_code) updates.branch_code = branch_code;

    const updated = await db.updateCustomer(customerId, updates);

    console.log(`✏️  Customer ${customerId} шинэчлэв:`, updates);

    res.json({
      success: true,
      message: 'Хэрэглэгчийн мэдээлэл шинэчлэгдлээ',
      customer: formatCustomer(updated),
      changes: updates
    });
  } catch (err) {
    console.error('❌ Update алдаа:', err);
    res.status(500).json({ error: 'Серверийн алдаа' });
  }
});

module.exports = router;
