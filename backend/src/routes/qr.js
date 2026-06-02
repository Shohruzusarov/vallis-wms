const router = require('express').Router();
const QRCode = require('qrcode');
const { pool } = require('../db/database');

router.get('/part/:partCode', async (req, res) => {
  try {
    const { partCode } = req.params;
    const png = await QRCode.toBuffer(partCode, {
      errorCorrectionLevel: 'H',
      width: 200,
      margin: 1
    });
    res.set('Content-Type', 'image/png');
    res.send(png);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/model/:modelId/sheet', async (req, res) => {
  try {
    const { rows: parts } = await pool.query(
      'SELECT * FROM parts WHERE model_id=$1', [req.params.modelId]
    );
    const { rows: model } = await pool.query(
      'SELECT * FROM models WHERE id=$1', [req.params.modelId]
    );

    const qrPromises = parts.map(async (p) => {
      const dataUrl = await QRCode.toDataURL(p.part_code, { width: 150, margin: 1 });
      return { ...p, qr: dataUrl };
    });
    const partsWithQR = await Promise.all(qrPromises);

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
<title>QR этикетки — ${model[0].name}</title>
<style>
body{font-family:Arial,sans-serif;padding:20px}
h1{font-size:16px;margin-bottom:20px}
.grid{display:flex;flex-wrap:wrap;gap:16px}
.label{border:1px solid #ccc;border-radius:6px;padding:10px;width:180px;text-align:center;page-break-inside:avoid}
.label img{width:120px;height:120px}
.label .code{font-size:9px;font-family:monospace;color:#666;margin-top:4px;word-break:break-all}
.label .name{font-size:11px;font-weight:bold;margin-top:4px}
.label .model{font-size:10px;color:#999}
@media print{body{padding:0}.no-print{display:none}}
</style></head><body>
<div class="no-print" style="margin-bottom:16px">
  <button onclick="window.print()" style="padding:8px 16px;font-size:14px">🖨️ Печать этикеток</button>
  <span style="margin-left:12px;font-size:13px;color:#666">Модель: ${model[0].name}</span>
</div>
<h1>QR-этикетки для модели: ${model[0].name} (${model[0].code})</h1>
<div class="grid">
${partsWithQR.map(p => `
  <div class="label">
    <img src="${p.qr}" alt="${p.part_name}">
    <div class="name">${p.part_name}</div>
    <div class="code">${p.part_code}</div>
    <div class="model">${model[0].code}</div>
  </div>`).join('')}
</div>
</body></html>`;

    res.set('Content-Type', 'text/html');
    res.send(html);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
