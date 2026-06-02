const router = require('express').Router();
const { pool } = require('../db/database');

router.post('/', async (req, res) => {
  try {
    const { kit_id, part_code } = req.body;

    const { rows: kitRows } = await pool.query(
      `SELECT ok.*, o.model_id FROM order_kits ok
       JOIN orders o ON ok.order_id=o.id WHERE ok.id=$1`,
      [kit_id]
    );
    if (!kitRows.length) return res.status(404).json({ error: 'Kit not found' });
    const kit = kitRows[0];

    const { rows: correctPart } = await pool.query(
      'SELECT * FROM parts WHERE model_id=$1 AND part_code=$2',
      [kit.model_id, part_code]
    );

    if (correctPart.length > 0) {
      const { rows: dupCheck } = await pool.query(
        'SELECT id FROM scan_logs WHERE kit_id=$1 AND part_code=$2 AND result=$3',
        [kit_id, part_code, 'ok']
      );
      if (dupCheck.length > 0) {
        await pool.query(
          'INSERT INTO scan_logs (kit_id, part_code, scanned_part_name, result, message) VALUES ($1,$2,$3,$4,$5)',
          [kit_id, part_code, correctPart[0].part_name, 'duplicate', 'Дубликат']
        );
        return res.json({
          result: 'duplicate',
          message: `⚠️ Дубликат! "${correctPart[0].part_name}" уже добавлена. Это деталь от другого комплекта?`
        });
      }

      await pool.query(
        'INSERT INTO scan_logs (kit_id, part_code, scanned_part_name, result, message) VALUES ($1,$2,$3,$4,$5)',
        [kit_id, part_code, correctPart[0].part_name, 'ok', 'Правильная деталь']
      );

      const { rows: allParts } = await pool.query(
        'SELECT COUNT(*) FROM parts WHERE model_id=$1', [kit.model_id]
      );
      const { rows: doneParts } = await pool.query(
        'SELECT COUNT(*) FROM scan_logs WHERE kit_id=$1 AND result=$2', [kit_id, 'ok']
      );
      const total = parseInt(allParts[0].count);
      const done = parseInt(doneParts[0].count);

      if (done >= total) {
        await pool.query(
          'UPDATE order_kits SET status=$1, completed_at=NOW() WHERE id=$2',
          ['complete', kit_id]
        );
      }

      return res.json({
        result: 'ok',
        part_name: correctPart[0].part_name,
        progress: done,
        total,
        kit_complete: done >= total
      });
    }

    const { rows: wrongModel } = await pool.query(
      `SELECT p.*, m.name as model_name, m.code as model_code
       FROM parts p JOIN models m ON p.model_id=m.id WHERE p.part_code=$1`,
      [part_code]
    );
    const msg = wrongModel.length > 0
      ? `❌ ЧУЖАЯ ДЕТАЛЬ! "${wrongModel[0].part_name}" принадлежит модели ${wrongModel[0].model_name}. Отложите в сторону!`
      : `❓ Код "${part_code}" не найден ни в одной модели. Проверьте этикетку.`;

    await pool.query(
      'INSERT INTO scan_logs (kit_id, part_code, result, message) VALUES ($1,$2,$3,$4)',
      [kit_id, part_code, 'wrong', msg]
    );

    res.json({ result: 'wrong', message: msg });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
