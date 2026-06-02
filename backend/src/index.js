require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { initDB } = require('./db/database');

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/models',  require('./routes/models'));
app.use('/api/orders',  require('./routes/orders'));
app.use('/api/scan',    require('./routes/scan'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/qr',      require('./routes/qr'));

app.get('/health', (req, res) => res.json({ status: 'ok', project: 'Vallis WMS' }));

const PORT = process.env.PORT || 3001;
initDB().then(() => {
  app.listen(PORT, () => console.log(`Vallis WMS running on port ${PORT}`));
}).catch(err => {
  console.error('DB init failed:', err);
  process.exit(1);
});
