require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { authenticate } = require('./routes/auth');
const customersRouter = require('./routes/customers');
const loansRouter = require('./routes/loans');
const transactionsRouter = require('./routes/transactions');
const db = require('./database/db');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// ── Лог хийх middleware ────────────────────────────
app.use((req, res, next) => {
  const time = new Date().toLocaleTimeString('mn-MN');
  console.log(`[${time}] ${req.method} ${req.path}`);
  next();
});

// ── Public routes (token хэрэггүй) ─────────────────
app.get('/', (req, res) => {
  res.json({
    name: 'LoanCorp API',
    version: '2.0.0',
    status: 'running',
    documentation: 'GET /api/docs'
  });
});

app.get('/api/docs', (req, res) => {
  res.json({
    name: 'LoanCorp API Documentation',
    version: '2.0.0',
    authentication: 'Bearer API key (партнер тус бүрд тусдаа key)',
    endpoints: {
      'GET /api/customers/search?q=PHONE_OR_REGISTER': 'Хэрэглэгч хайх',
      'GET /api/customers/list': 'Бүх харилцагч (шүүлттэй)',
      'GET /api/customers/stats': 'Харилцагчдын статистик',
      'GET /api/customers/:customerId': 'Нэг харилцагчийн дэлгэрэнгүй',
      'PATCH /api/customers/:customerId': 'Харилцагчийн мэдээлэл засах',
      'GET /api/loans/customer/:customerId': 'Тухайн хэрэглэгчийн зээлүүд',
      'GET /api/loans/:loanNumber': 'Тодорхой зээлийн мэдээлэл',
      'POST /api/transactions/extension': 'Зээл сунгах',
      'POST /api/transactions/closure': 'Зээл хаах',
      'POST /api/transactions/application': 'Шинэ зээлийн хүсэлт',
      'GET /api/stats': 'Системийн статистик',
      'GET /api/partners': 'Бүх партнерын жагсаалт',
      'GET /api/partners/:id/logs': 'Партнерын хүсэлтийн түүх',
      'PATCH /api/partners/:id/status': 'Партнер идэвхжүүлэх/хаах'
    }
  });
});

// ── Protected routes (API key шаардана) ────────────
app.use('/api/customers', authenticate, customersRouter);
app.use('/api/loans', authenticate, loansRouter);
app.use('/api/transactions', authenticate, transactionsRouter);

// ── Статистик ──────────────────────────────────────
app.get('/api/stats', authenticate, async (req, res) => {
  try {
    const stats = await db.getStats();
    res.json({ success: true, stats });
  } catch (err) {
    console.error('❌ Stats алдаа:', err);
    res.status(500).json({ error: 'Серверийн алдаа' });
  }
});

// ═══════════════════════════════════════════════════
// 🤝 ПАРТНЕР УДИРДЛАГЫН ENDPOINT-УУД
// ═══════════════════════════════════════════════════

// Бүх партнерын жагсаалт (admin зориулалттай)
app.get('/api/partners', authenticate, async (req, res) => {
  try {
    const partners = await db.getAllPartners();
    res.json({ success: true, count: partners.length, partners });
  } catch (err) {
    console.error('❌ Partners алдаа:', err);
    res.status(500).json({ error: 'Серверийн алдаа' });
  }
});

// Тодорхой партнерын хүсэлтийн түүх (audit log)
app.get('/api/partners/:partnerId/logs', authenticate, async (req, res) => {
  try {
    const logs = await db.getPartnerLogs(req.params.partnerId, 50);
    res.json({ success: true, partner_id: req.params.partnerId, logs });
  } catch (err) {
    console.error('❌ Partner logs алдаа:', err);
    res.status(500).json({ error: 'Серверийн алдаа' });
  }
});

// Партнерыг идэвхгүй/идэвхтэй болгох
app.patch('/api/partners/:partnerId/status', authenticate, async (req, res) => {
  try {
    const { is_active } = req.body;
    if (typeof is_active !== 'boolean') {
      return res.status(400).json({ error: 'is_active (true/false) шаардлагатай' });
    }
    await db.setPartnerActive(req.params.partnerId, is_active);
    res.json({
      success: true,
      partner_id: req.params.partnerId,
      is_active,
      message: is_active ? 'Партнер идэвхжлээ' : 'Партнер хаагдлаа'
    });
  } catch (err) {
    console.error('❌ Partner status алдаа:', err);
    res.status(500).json({ error: 'Серверийн алдаа' });
  }
});

// ── Алдаа барих ────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('❌ Алдаа:', err.message);
  res.status(500).json({ error: 'Серверийн алдаа' });
});

// 404
app.use((req, res) => {
  res.status(404).json({ error: 'Route олдсонгүй', path: req.path });
});

app.listen(PORT, () => {
  console.log('\n╔═══════════════════════════════════════════╗');
  console.log('║      🏦 LoanCorp API Server v2.0          ║');
  console.log('╠═══════════════════════════════════════════╣');
  console.log(`║  📡 Port: ${PORT}`);
  console.log(`║  🤝 Партнер API key систем идэвхтэй`);
  console.log(`║  📋 Docs: http://localhost:${PORT}/api/docs`);
  console.log('╚═══════════════════════════════════════════╝\n');
});
