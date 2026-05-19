require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const pool = require('./db');
const app = express();

const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:3000';

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ origin: CLIENT_URL, credentials: true }));
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

// AI feature mount: agentic-deck
app.use('/api/ai/agentic-deck', require('./routes/ai-agentic-deck'));
// === Batch 07 Gaps & Frontend Mounts ===
app.use('/api/gap-no-templaterecommend-for-topic', require('./routes/gap-no-templaterecommend-for-topic'));
app.use('/api/gap-no-speakernotesexpand-from-outline', require('./routes/gap-no-speakernotesexpand-from-outline'));
app.use('/api/gap-no-designconsistencycheck-fonts-colors', require('./routes/gap-no-designconsistencycheck-fonts-colors'));
app.use('/api/gap-no-contentqualityfeedback-readability', require('./routes/gap-no-contentqualityfeedback-readability'));
app.use('/api/gap-no-audienceaware-adaptation-ai', require('./routes/gap-no-audienceaware-adaptation-ai'));
app.use('/api/gap-no-realtime-multiuser-collaboration-crdtpres', require('./routes/gap-no-realtime-multiuser-collaboration-crdtpres'));
app.use('/api/gap-no-version-history-undo-store', require('./routes/gap-no-version-history-undo-store'));
app.use('/api/gap-no-presenter-mode-timer-notes-view', require('./routes/gap-no-presenter-mode-timer-notes-view'));
app.use('/api/gap-limited-export-depth-pdfvideo-pipeline-shall', require('./routes/gap-limited-export-depth-pdfvideo-pipeline-shall'));
app.use('/api/gap-no-presentation-analytics-viewer-engagement', require('./routes/gap-no-presentation-analytics-viewer-engagement'));
app.use('/api/gap-no-template-marketplace', require('./routes/gap-no-template-marketplace'));
app.use('/api/gap-no-notifications', require('./routes/gap-no-notifications'));
// === End Batch 07 ===

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

// Health endpoint
app.get('/api/health', (req, res) => res.json({ ok: true, service: 'AISlideDeckGenerator', time: new Date().toISOString() }));

// Custom Views (4 features: 2 VIZ + 2 NON-VIZ) - mounted BEFORE 404/error handlers
app.use('/api/custom-views', require('./routes/customViews'));

// 404 handler (after all routes, before error handler)
app.use('/api', (req, res, next) => {
  if (res.headersSent) return next();
  res.status(404).json({ error: 'Not Found', path: req.originalUrl });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.stack);
  res.status(err.status || 500).json({ error: err.message || 'Internal Server Error' });
});

const PORT = process.env.BACKEND_PORT || 3001;
app.listen(PORT, () => console.log(`Backend running on port ${PORT}`));
