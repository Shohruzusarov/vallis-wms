const router = require('express').Router();
const { pool } = require('../db/database');

router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM models ORDER BY id');
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/', async (req, res) => {
  try {
    const { code, name } = req.body;
    const { rows } = await pool.query(
      'INSERT INTO models (code, name) VALUES ($1,$2) RETURNING *', [code, name]
    );
    res.json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/:modelId/parts', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM parts WHERE model_id=$1 ORDER BY id',
      [req.params.modelId]
    );
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
