const router = require('express').Router();
const { pool } = require('../db/database');

router.post('/', async (req, res) => {
  try {
    const { model_id, part_code, part_name } = req.body;
    const { rows } = await pool.query(
      'INSERT INTO parts (model_id, part_code, part_name) VALUES ($1,$2,$3) RETURNING *',
      [model_id, part_code, part_name]
    );
    res.json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
