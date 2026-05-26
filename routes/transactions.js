const express = require('express');
const router = express.Router();
const db = require('../database/db');

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

module.exports = router;