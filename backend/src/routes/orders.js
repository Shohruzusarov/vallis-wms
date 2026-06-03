const router = require('express').Router();
const { pool } = require('../db/database');

router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT o.*, m.name as model_name, m.code as model_code, s.client_name FROM orders o JOIN models m ON o.model_id=m.id LEFT JOIN shipments s ON o.shipment_id=s.id ORDER BY o.created_at DESC LIMIT 50'
    );
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/:orderId/kits/:kitNumber', async (req, res) => {
  try {
    const { rows: kitRows } = await pool.query(
      'SELECT ok.*, o.model_id FROM order_kits ok JOIN orders o ON ok.order_id=o.id WHERE ok.order_id=$1 AND ok.kit_number=$2',
      [req.params.orderId, req.params.kitNumber]
    );
    if (!kitRows.length) return res.status(404).json({ error: 'Kit not found' });
    const kit = kitRows[0];
    const { rows: parts } = await pool.query('SELECT * FROM parts WHERE model_id=$1', [kit.model_id]);
    const { rows: scans } = await pool.query('SELECT part_code FROM scan_logs WHERE kit_id=$1 AND result=$2', [kit.id, 'ok']);
    const scannedCodes = scans.map(s => s.part_code);
    res.json({ kit, parts: parts.map(p => ({ ...p, scanned: scannedCodes.includes(p.part_code) })), progress: scannedCodes.length, total: parts.length });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/:orderId/complete', async (req, res) => {
  try {
    const { rows } = await pool.query(
      "UPDATE orders SET status='complete' WHERE id=$1 RETURNING *",
      [req.params.orderId]
    );
    await pool.query(
      "UPDATE shipments SET status='complete' WHERE id=(SELECT shipment_id FROM orders WHERE id=$1) AND NOT EXISTS (SELECT 1 FROM orders WHERE shipment_id=(SELECT shipment_id FROM orders WHERE id=$1) AND status!='complete')",
      [req.params.orderId]
    );
    res.json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
