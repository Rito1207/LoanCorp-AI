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
    version: '1.0.0',
    status: 'running',
    documentation: 'GET /api/docs'
  });
});

app.get('/api/docs', (req, res) => {
  res.json({
    name: 'LoanCorp API Documentation',
    version: '1.0.0',
    authentication: 'Bearer token (Authorization header)',
    endpoints: {
      'GET /api/customers/search?q=PHONE_OR_REGISTER': 'Хэрэглэгч хайх',
      'GET /api/loans/customer/:customerId': 'Тухайн хэрэглэгчийн зээлүүд',
      'GET /api/loans/:loanNumber': 'Тодорхой зээлийн мэдээлэл',
      'POST /api/transactions/extension': 'Зээл сунгах',
      'POST /api/transactions/closure': 'Зээл хаах',
      'POST /api/transactions/application': 'Шинэ зээлийн хүсэлт',
      'GET /api/stats': 'Системийн статистик'
    }
  });
});

// ── Protected routes (token шаардана) ──────────────
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
  console.log('║      🏦 LoanCorp API Server               ║');
  console.log('╠═══════════════════════════════════════════╣');
  console.log(`║  📡 Port: ${PORT}                            ║`);
  console.log(`║  🔑 Token: ${process.env.API_TOKEN?.substring(0, 20)}...    ║`);
  console.log('║  📋 Docs: http://localhost:4000/api/docs  ║');
  console.log('╚═══════════════════════════════════════════╝\n');
});