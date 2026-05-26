const express = require('express');
const router = express.Router();
const db = require('../database/db');

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
      customer: {
        customer_id: customer.customer_id,
        name: customer.name,
        register_number: customer.register_number,
        phone: customer.phone,
        email: customer.email
      }
    });
  } catch (err) {
    console.error('Алдаа:', err);
    res.status(500).json({ error: 'Серверийн алдаа' });
  }
});

module.exports = router;