const router = require('express').Router();
const { pool } = require('../db/database');

router.get('/order/:orderId', async (req, res) => {
  try {
    const { rows: orderRows } = await pool.query(
      'SELECT o.*, m.name as model_name FROM orders o JOIN models m ON o.model_id=m.id WHERE o.id=$1',
      [req.params.orderId]
    );
    const { rows: kits } = await pool.query(
      'SELECT * FROM order_kits WHERE order_id=$1', [req.params.orderId]
    );
    const { rows: errors } = await pool.query(`
      SELECT sl.* FROM scan_logs sl
      JOIN order_kits ok ON sl.kit_id=ok.id
      WHERE ok.order_id=$1 AND sl.result IN ('wrong','duplicate')
      ORDER BY sl.scanned_at DESC
    `, [req.params.orderId]);

    res.json({
      order: orderRows[0],
      total_kits: kits.length,
      complete_kits: kits.filter(k => k.status === 'complete').length,
      errors_count: errors.length,
      errors
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
