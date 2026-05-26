const express = require('express');
const router = express.Router();
const db = require('../database/db');

router.get('/customer/:customerId', async (req, res) => {
  try {
    const loans = await db.getLoansByCustomer(req.params.customerId);
    
    if (!loans || loans.length === 0) {
      return res.json({ success: true, loans: [], count: 0 });
    }
    
    const enriched = loans.map(loan => {
      const currentMonthInterest = Math.round(loan.remaining_balance * loan.monthly_rate);
      const totalToClose = loan.remaining_balance + currentMonthInterest;
      const totalPaid = loan.amount - loan.remaining_balance;
      
      return {
        ...loan,
        currentMonthInterest,
        totalToClose,
        totalPaid,
        remainingMonths: loan.total_months - loan.paid_months
      };
    });
    
    res.json({
      success: true,
      count: loans.length,
      loans: enriched
    });
  } catch (err) {
    console.error('Алдаа:', err);
    res.status(500).json({ error: 'Серверийн алдаа' });
  }
});

router.get('/:loanNumber', async (req, res) => {
  try {
    const loan = await db.getLoanByNumber(req.params.loanNumber);
    if (!loan) {
      return res.status(404).json({ error: 'Зээл олдсонгүй' });
    }
    
    const currentMonthInterest = Math.round(loan.remaining_balance * loan.monthly_rate);
    const totalToClose = loan.remaining_balance + currentMonthInterest;
    const payments = await db.getPaymentHistory(req.params.loanNumber);
    
    res.json({
      success: true,
      loan: {
        ...loan,
        currentMonthInterest,
        totalToClose,
        totalPaid: loan.amount - loan.remaining_balance,
        remainingMonths: loan.total_months - loan.paid_months,
        recentPayments: payments
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'Серверийн алдаа' });
  }
});

module.exports = router;