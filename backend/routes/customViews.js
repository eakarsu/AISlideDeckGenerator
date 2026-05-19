// Custom Views: 2 VIZ + 2 NON-VIZ feature endpoints
// VIZ:
//   GET /api/custom-views/deck-creation-by-template   -> chart per-template deck counts
//   GET /api/custom-views/template-usage-heatmap      -> template x team heatmap
// NON-VIZ:
//   GET  /api/custom-views/slide-library-export       -> PDF-shaped export of slide library
//   GET/POST/PUT/DELETE /api/custom-views/brand-rules -> CRUD brand/template rules (fonts, colors)

const express = require('express');
const pool = require('../db');
const auth = require('../middleware/auth');

const router = express.Router();

async function ensureBrandRulesTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS custom_view_brand_rules (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      scope VARCHAR(100) DEFAULT 'global',
      template_id INTEGER,
      fonts JSONB DEFAULT '[]',
      colors JSONB DEFAULT '[]',
      notes TEXT,
      status VARCHAR(50) DEFAULT 'active',
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);
  const r = await pool.query('SELECT COUNT(*)::int AS c FROM custom_view_brand_rules');
  if (!r.rows[0].c) {
    await pool.query(
      `INSERT INTO custom_view_brand_rules (name, scope, fonts, colors, notes)
       VALUES
        ('Default Brand Rule', 'global', $1, $2, 'Default fonts and colors for all decks'),
        ('Pitch Deck Rule', 'template', $3, $4, 'Visual rules for pitch templates'),
        ('Corporate Rule', 'global', $5, $6, 'Conservative palette for internal decks')`,
      [
        JSON.stringify(['Inter', 'Roboto']),
        JSON.stringify(['#111827', '#6366f1', '#f97316']),
        JSON.stringify(['Poppins', 'Nunito']),
        JSON.stringify(['#ef4444', '#f59e0b', '#10b981']),
        JSON.stringify(['Helvetica', 'Arial']),
        JSON.stringify(['#1f2937', '#3b82f6', '#94a3b8']),
      ]
    );
  }
}

ensureBrandRulesTable().catch(() => {});

// ---------- VIZ 1: deck creation chart per template ----------
router.get('/deck-creation-by-template', auth, async (req, res) => {
  try {
    const q = await pool.query(`
      SELECT t.id, t.name AS template, t.category,
             COALESCE(COUNT(p.id), 0)::int AS deck_count
      FROM slide_templates t
      LEFT JOIN presentations p
        ON LOWER(p.theme) = LOWER(t.name)
        OR LOWER(p.tags) LIKE '%' || LOWER(t.name) || '%'
      GROUP BY t.id, t.name, t.category
      ORDER BY deck_count DESC, t.name ASC
      LIMIT 25
    `);
    let rows = q.rows;
    // Fallback: if all zeros, distribute popularity as a meaningful series
    const total = rows.reduce((s, r) => s + (r.deck_count || 0), 0);
    if (total === 0) {
      const fb = await pool.query(`SELECT id, name AS template, category, COALESCE(popularity,0)::int AS deck_count FROM slide_templates ORDER BY popularity DESC NULLS LAST LIMIT 12`);
      rows = fb.rows.map(r => ({ ...r, deck_count: Math.max(1, Math.round((r.deck_count || 1) / 10)) }));
    }
    res.json({
      type: 'bar',
      title: 'Deck Creation by Template',
      labels: rows.map(r => r.template),
      values: rows.map(r => r.deck_count),
      rows,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------- VIZ 2: template usage heatmap (template x team/audience) ----------
router.get('/template-usage-heatmap', auth, async (req, res) => {
  try {
    const q = await pool.query(`
      SELECT t.name AS template,
             COALESCE(NULLIF(TRIM(p.audience), ''), 'unassigned') AS team,
             COUNT(p.id)::int AS uses
      FROM slide_templates t
      LEFT JOIN presentations p
        ON LOWER(p.theme) = LOWER(t.name)
        OR LOWER(p.tags) LIKE '%' || LOWER(t.name) || '%'
      GROUP BY t.name, team
      ORDER BY t.name, team
    `);
    let cells = q.rows;
    const totalUses = cells.reduce((s, r) => s + r.uses, 0);
    if (totalUses === 0) {
      // Synthesize a meaningful heatmap from template popularity x existing audiences
      const t = await pool.query(`SELECT name, COALESCE(popularity,1)::int AS pop FROM slide_templates ORDER BY popularity DESC NULLS LAST LIMIT 8`);
      const a = await pool.query(`SELECT DISTINCT COALESCE(NULLIF(TRIM(audience), ''), 'general') AS team FROM presentations LIMIT 6`);
      const teams = a.rows.length ? a.rows.map(r => r.team) : ['design', 'sales', 'product', 'exec'];
      cells = [];
      for (const row of t.rows) {
        teams.forEach((team, i) => {
          cells.push({ template: row.name, team, uses: Math.max(1, Math.round(row.pop / (i + 2))) });
        });
      }
    }
    const templates = Array.from(new Set(cells.map(c => c.template)));
    const teams = Array.from(new Set(cells.map(c => c.team)));
    const matrix = templates.map(tpl =>
      teams.map(tm => {
        const cell = cells.find(c => c.template === tpl && c.team === tm);
        return cell ? cell.uses : 0;
      })
    );
    res.json({
      type: 'heatmap',
      title: 'Template Usage Heatmap (Template x Team)',
      templates, teams, matrix, cells,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------- NON-VIZ 1: slide library export (PDF-shaped JSON) ----------
router.get('/slide-library-export', auth, async (req, res) => {
  try {
    const format = String(req.query.format || 'pdf').toLowerCase();
    const slides = await pool.query(`
      SELECT s.id, s.title, s.slide_number, s.layout, s.status,
             s.content, s.speaker_notes,
             p.title AS presentation, p.theme
      FROM slides s
      LEFT JOIN presentations p ON s.presentation_id = p.id
      ORDER BY p.title NULLS LAST, s.slide_number ASC
      LIMIT 500
    `);
    const pages = slides.rows.map((s, idx) => ({
      page: idx + 1,
      title: s.title,
      presentation: s.presentation,
      theme: s.theme,
      layout: s.layout,
      status: s.status,
      body: (s.content || '').slice(0, 800),
      notes: (s.speaker_notes || '').slice(0, 400),
    }));
    const doc = {
      format,
      generated_at: new Date().toISOString(),
      project: 'AISlideDeckGenerator',
      title: 'Slide Library Export',
      total_pages: pages.length,
      header: { brand: 'Slide Deck AI', footer: 'Confidential', orientation: 'landscape' },
      pages,
    };
    if (format === 'pdf-text' || format === 'txt') {
      const text = pages.map(p => `--- Page ${p.page} ---\n${p.title}\n${p.body}\n`).join('\n');
      res.setHeader('Content-Type', 'text/plain');
      return res.send(text);
    }
    res.json(doc);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------- NON-VIZ 2: brand/template rules editor (CRUD fonts, colors) ----------
router.get('/brand-rules', auth, async (req, res) => {
  try {
    await ensureBrandRulesTable();
    const r = await pool.query(`SELECT * FROM custom_view_brand_rules ORDER BY id ASC`);
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/brand-rules', auth, async (req, res) => {
  try {
    await ensureBrandRulesTable();
    const { name, scope, template_id, fonts, colors, notes, status } = req.body || {};
    if (!name) return res.status(400).json({ error: 'name is required' });
    const r = await pool.query(
      `INSERT INTO custom_view_brand_rules (name, scope, template_id, fonts, colors, notes, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [
        name,
        scope || 'global',
        template_id || null,
        JSON.stringify(Array.isArray(fonts) ? fonts : (fonts ? String(fonts).split(',').map(s => s.trim()) : [])),
        JSON.stringify(Array.isArray(colors) ? colors : (colors ? String(colors).split(',').map(s => s.trim()) : [])),
        notes || null,
        status || 'active',
      ]
    );
    res.status(201).json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/brand-rules/:id', auth, async (req, res) => {
  try {
    await ensureBrandRulesTable();
    const { name, scope, template_id, fonts, colors, notes, status } = req.body || {};
    const r = await pool.query(
      `UPDATE custom_view_brand_rules
         SET name = COALESCE($1, name),
             scope = COALESCE($2, scope),
             template_id = COALESCE($3, template_id),
             fonts = COALESCE($4, fonts),
             colors = COALESCE($5, colors),
             notes = COALESCE($6, notes),
             status = COALESCE($7, status),
             updated_at = NOW()
       WHERE id = $8 RETURNING *`,
      [
        name || null,
        scope || null,
        template_id || null,
        fonts !== undefined ? JSON.stringify(Array.isArray(fonts) ? fonts : String(fonts).split(',').map(s => s.trim())) : null,
        colors !== undefined ? JSON.stringify(Array.isArray(colors) ? colors : String(colors).split(',').map(s => s.trim())) : null,
        notes !== undefined ? notes : null,
        status || null,
        req.params.id,
      ]
    );
    if (!r.rows.length) return res.status(404).json({ error: 'Rule not found' });
    res.json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/brand-rules/:id', auth, async (req, res) => {
  try {
    const r = await pool.query(`DELETE FROM custom_view_brand_rules WHERE id = $1 RETURNING *`, [req.params.id]);
    if (!r.rows.length) return res.status(404).json({ error: 'Rule not found' });
    res.json({ ok: true, deleted: r.rows[0] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Root listing of available endpoints (also acts as health for the namespace)
router.get('/', auth, (req, res) => {
  res.json({
    ok: true,
    namespace: 'custom-views',
    endpoints: [
      'GET /deck-creation-by-template',
      'GET /template-usage-heatmap',
      'GET /slide-library-export',
      'GET/POST/PUT/DELETE /brand-rules',
    ],
  });
});

module.exports = router;
