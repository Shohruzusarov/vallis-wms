const router = require('express').Router();
const { pool } = require('../db/database');

async function generateShipmentNumber() {
  const now = new Date();
  const yymm = String(now.getFullYear()).slice(2) + String(now.getMonth()+1).padStart(2,'0');
  const prefix = 'P-' + yymm + '-';
  const { rows } = await pool.query(
    "SELECT shipment_number FROM shipments WHERE shipment_number LIKE $1 ORDER BY shipment_number DESC LIMIT 1",
    [prefix + '%']
  );
  if (!rows.length) return prefix + '001';
  const last = rows[0].shipment_number;
  const num = parseInt(last.split('-')[2]) + 1;
  return prefix + String(num).padStart(3,'0');
}

router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT s.*, COUNT(o.id) as order_count FROM shipments s LEFT JOIN orders o ON o.shipment_id=s.id GROUP BY s.id ORDER BY s.created_at DESC'
    );
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/', async (req, res) => {
  try {
    const { client_name, notes } = req.body;
    const shipment_number = await generateShipmentNumber();
    const { rows } = await pool.query(
      'INSERT INTO shipments (shipment_number, client_name, notes) VALUES ($1,$2,$3) RETURNING *',
      [shipment_number, client_name, notes||'']
    );
    res.json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/:id', async (req, res) => {
  try {
    const { rows: ship } = await pool.query('SELECT * FROM shipments WHERE id=$1', [req.params.id]);
    const { rows: orders } = await pool.query(
      'SELECT o.*, m.name as model_name, m.code as model_code FROM orders o JOIN models m ON o.model_id=m.id WHERE o.shipment_id=$1 ORDER BY o.id',
      [req.params.id]
    );
    res.json({ shipment: ship[0], orders });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/:id/orders', async (req, res) => {
  try {
    const { model_id, total_kits } = req.body;
    const shipment_id = req.params.id;
    const { rows: ship } = await pool.query('SELECT * FROM shipments WHERE id=$1', [shipment_id]);
    const { rows: existing } = await pool.query('SELECT COUNT(*) FROM orders WHERE shipment_id=$1', [shipment_id]);
    const idx = parseInt(existing[0].count) + 1;
    const order_number = ship[0].shipment_number + '-' + String(idx).padStart(2,'0');
    const { rows } = await pool.query(
      'INSERT INTO orders (shipment_id, order_number, model_id, total_kits) VALUES ($1,$2,$3,$4) RETURNING *',
      [shipment_id, order_number, model_id, total_kits]
    );
    const order = rows[0];
    for (let i = 1; i <= total_kits; i++) {
      await pool.query('INSERT INTO order_kits (order_id, kit_number) VALUES ($1,$2)', [order.id, i]);
    }
    res.json(order);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.patch('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const { rows } = await pool.query(
      'UPDATE shipments SET status=$1 WHERE id=$2 RETURNING *', [status, req.params.id]
    );
    res.json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
