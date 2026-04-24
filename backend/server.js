require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const express = require('express');
const cors = require('cors');
const pool = require('./db');
const app = express();

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/ai', require('./routes/ai'));
app.use('/api/presentations', require('./routes/presentations'));
app.use('/api/slides', require('./routes/slides'));
app.use('/api/templates', require('./routes/templates'));
app.use('/api/themes', require('./routes/themes'));
app.use('/api/layouts', require('./routes/layouts'));
app.use('/api/charts', require('./routes/charts'));
app.use('/api/images', require('./routes/images'));
app.use('/api/icons', require('./routes/icons'));
app.use('/api/animations', require('./routes/animations'));
app.use('/api/speakers', require('./routes/speakers'));
app.use('/api/exports', require('./routes/exports'));
app.use('/api/brands', require('./routes/brands'));
app.use('/api/collaborators', require('./routes/collaborators'));
app.use('/api/analytics', require('./routes/analytics'));
app.use('/api/settings', require('./routes/settings'));

// Dashboard stats
app.use('/api/dashboard', require('./middleware/auth'), async (req, res) => {
  try {
    const tables = [
      { key: 'presentations', table: 'presentations' },
      { key: 'slides', table: 'slides' },
      { key: 'templates', table: 'slide_templates' },
      { key: 'themes', table: 'themes' },
      { key: 'layouts', table: 'slide_layouts' },
      { key: 'charts', table: 'chart_configs' },
      { key: 'images', table: 'image_library' },
      { key: 'icons', table: 'icon_sets' },
      { key: 'animations', table: 'animations' },
      { key: 'speakers', table: 'speaker_notes' },
      { key: 'exports', table: 'export_history' },
      { key: 'brands', table: 'brand_kits' },
      { key: 'collaborators', table: 'collaborators' },
      { key: 'analytics', table: 'presentation_analytics' },
    ];
    const stats = {};
    for (const t of tables) {
      const r = await pool.query(`SELECT COUNT(*) FROM ${t.table}`);
      stats[t.key] = parseInt(r.rows[0].count);
    }
    res.json(stats);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

const PORT = process.env.BACKEND_PORT || 3001;
app.listen(PORT, () => console.log(`Backend running on port ${PORT}`));
