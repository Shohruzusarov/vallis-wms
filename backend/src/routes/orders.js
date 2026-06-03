const router = require('express').Router();
const { pool } = require('../db/database');

async function generateOrderNumber() {
  const now = new Date();
  const yymm = String(now.getFullYear()).slice(2) + String(now.getMonth()+1).padStart(2,'0');
  const prefix = 'ORD-' + yymm + '-';
  const { rows } = await pool.query(
    "SELECT order_number FROM orders WHERE order_number LIKE $1 ORDER BY order_number DESC LIMIT 1",
    [prefix + '%']
  );
  if (!rows.length) return prefix + '001';
  const last = rows[0].order_number;
  const num = parseInt(last.split('-')[2]) + 1;
  return prefix + String(num).padStart(3,'0');
}

router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT o.*, m.name as model_name, m.code as model_code FROM orders o JOIN models m ON o.model_id = m.id ORDER BY o.created_at DESC LIMIT 50'
    );
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/', async (req, res) => {
  try {
    const { model_id, total_kits } = req.body;
    const order_number = await generateOrderNumber();
    const { rows } = await pool.query(
      'INSERT INTO orders (order_number, model_id, total_kits) VALUES ($1,$2,$3) RETURNING *',
      [order_number, model_id, total_kits]
    );
    const order = rows[0];
    for (let i = 1; i <= total_kits; i++) {
      await pool.query('INSERT INTO order_kits (order_id, kit_number) VALUES ($1,$2)', [order.id, i]);
    }
    res.json(order);
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
    const { rows: scans } = await pool.query(
      'SELECT part_code FROM scan_logs WHERE kit_id=$1 AND result=$2', [kit.id, 'ok']
    );
    const scannedCodes = scans.map(s => s.part_code);
    const partsStatus = parts.map(p => ({ ...p, scanned: scannedCodes.includes(p.part_code) }));
    res.json({ kit, parts: partsStatus, progress: scannedCodes.length, total: parts.length });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
