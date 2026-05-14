const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');
const { body, validationResult } = require('express-validator');

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  next();
};

// GET /api/presentations - filter by user, allow collaborators
router.get('/', auth, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, parseInt(req.query.limit) || 20);
    const offset = (page - 1) * limit;
    const userId = req.user.id;

    // Include presentations where user is owner or collaborator
    const countQ = await pool.query(
      `SELECT COUNT(*) FROM presentations p
       LEFT JOIN collaborators c ON c.presentation_id = p.id AND c.user_id = $1
       WHERE p.user_id = $1 OR c.user_id = $1`,
      [userId]
    ).catch(() => pool.query('SELECT COUNT(*) FROM presentations'));

    const total = parseInt(countQ.rows[0].count);

    const dataQ = await pool.query(
      `SELECT p.* FROM presentations p
       LEFT JOIN collaborators c ON c.presentation_id = p.id AND c.user_id = $1
       WHERE p.user_id = $1 OR c.user_id = $1
       ORDER BY p.created_at DESC LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    ).catch(() => pool.query('SELECT * FROM presentations ORDER BY created_at DESC LIMIT $1 OFFSET $2', [limit, offset]));

    res.json({ data: dataQ.rows, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const r = await pool.query(`SELECT * FROM presentations WHERE id = $1`, [req.params.id]);
    if (r.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    // Check access: owner or collaborator
    const pres = r.rows[0];
    if (pres.user_id && pres.user_id !== userId) {
      const collab = await pool.query('SELECT id FROM collaborators WHERE presentation_id=$1 AND user_id=$2', [req.params.id, userId]).catch(() => ({ rows: [] }));
      if (collab.rows.length === 0) return res.status(403).json({ error: 'Access denied' });
    }
    res.json(pres);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', auth,
  body('title').notEmpty().withMessage('title required'),
  validate,
  async (req, res) => {
    try {
      const { title, description, theme, audience, purpose, tags, status } = req.body;
      const userId = req.user.id;
      const r = await pool.query(
        `INSERT INTO presentations (title, description, theme, audience, purpose, tags, status, user_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
        [title, description, theme || 'modern', audience, purpose, tags, status || 'draft', userId]
      ).catch(() => pool.query(
        `INSERT INTO presentations (title, description, theme, audience, purpose, tags, status)
         VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
        [title, description, theme || 'modern', audience, purpose, tags, status || 'draft']
      ));
      res.status(201).json(r.rows[0]);
    } catch (err) { res.status(500).json({ error: err.message }); }
  }
);

router.put('/:id', auth, async (req, res) => {
  try {
    const data = req.body;
    const keys = Object.keys(data).filter(k => !['id', 'created_at'].includes(k));
    const sets = keys.map((k, i) => `${k}=$${i + 1}`);
    const values = keys.map(k => ['settings', 'metadata', 'design_feedback'].includes(k) ? JSON.stringify(data[k]) : data[k]);
    values.push(req.params.id);
    const r = await pool.query(
      `UPDATE presentations SET ${sets.join(',')}, updated_at=NOW() WHERE id=$${values.length} RETURNING *`, values
    );
    if (r.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const r = await pool.query(`DELETE FROM presentations WHERE id=$1 RETURNING *`, [req.params.id]);
    if (r.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted successfully' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/presentations/:id/share - add collaborator
router.post('/:id/share', auth,
  body('user_id').isInt().withMessage('user_id required'),
  body('role').optional().isIn(['viewer', 'editor', 'owner']),
  validate,
  async (req, res) => {
    try {
      const { user_id, role = 'editor' } = req.body;
      const presResult = await pool.query('SELECT * FROM presentations WHERE id=$1', [req.params.id]);
      if (presResult.rows.length === 0) return res.status(404).json({ error: 'Presentation not found' });

      const r = await pool.query(
        `INSERT INTO collaborators (presentation_id, user_id, role, invited_by, created_at)
         VALUES ($1,$2,$3,$4,NOW())
         ON CONFLICT (presentation_id, user_id) DO UPDATE SET role=$3
         RETURNING *`,
        [req.params.id, user_id, role, req.user.id]
      );
      res.json({ message: 'Collaborator added', collaborator: r.rows[0] });
    } catch (err) { res.status(500).json({ error: err.message }); }
  }
);

// GET /api/presentations/:id/collaborators
router.get('/:id/collaborators', auth, async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT c.*, u.email, u.name FROM collaborators c
       LEFT JOIN users u ON u.id = c.user_id
       WHERE c.presentation_id = $1`,
      [req.params.id]
    );
    res.json({ data: r.rows });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/presentations/:id/export-pptx - real PPTX export
router.get('/:id/export-pptx', auth, async (req, res) => {
  try {
    const PptxGenJS = require('pptxgenjs');

    const presResult = await pool.query('SELECT * FROM presentations WHERE id=$1', [req.params.id]);
    if (presResult.rows.length === 0) return res.status(404).json({ error: 'Presentation not found' });
    const pres = presResult.rows[0];

    const slidesResult = await pool.query('SELECT * FROM slides WHERE presentation_id=$1 ORDER BY slide_number ASC, created_at ASC', [req.params.id]);
    const slides = slidesResult.rows;

    // Create PPTX
    const pptx = new PptxGenJS();
    pptx.title = pres.title;
    pptx.subject = pres.description || pres.title;
    pptx.author = 'AI Slide Deck Generator';

    // Title slide
    const titleSlide = pptx.addSlide();
    titleSlide.background = { color: '1e1b4b' };
    titleSlide.addText(pres.title, { x: 0.5, y: 1.5, w: '90%', h: 1.5, fontSize: 36, bold: true, color: 'FFFFFF', align: 'center' });
    if (pres.description) {
      titleSlide.addText(pres.description, { x: 0.5, y: 3.2, w: '90%', h: 0.8, fontSize: 18, color: 'A5B4FC', align: 'center' });
    }
    titleSlide.addText('Generated by AI Slide Deck Generator', { x: 0.5, y: 6.5, w: '90%', h: 0.4, fontSize: 12, color: '6366f1', align: 'center' });

    // Content slides
    for (const slide of slides) {
      const pptxSlide = pptx.addSlide();
      pptxSlide.background = { color: '0f172a' };

      // Title
      pptxSlide.addText(slide.title || `Slide ${slide.slide_number}`, {
        x: 0.5, y: 0.3, w: '90%', h: 0.7, fontSize: 24, bold: true, color: '6366f1',
      });

      // Content
      let contentText = slide.content;
      if (contentText) {
        try {
          const parsed = JSON.parse(contentText);
          contentText = parsed.content || parsed.key_bullets?.join('\n') || JSON.stringify(parsed);
        } catch (_) {}
      }

      if (contentText) {
        pptxSlide.addText(String(contentText).substring(0, 500), {
          x: 0.5, y: 1.2, w: '90%', h: 4.5, fontSize: 16, color: 'E2E8F0',
          valign: 'top', wrap: true,
        });
      }

      // Speaker notes
      if (slide.speaker_notes) {
        pptxSlide.addNotes(String(slide.speaker_notes).substring(0, 1000));
      }

      // Slide number
      pptxSlide.addText(`${slide.slide_number}`, {
        x: 9, y: 6.8, w: 0.5, h: 0.3, fontSize: 12, color: '475569', align: 'right',
      });
    }

    // Log export
    await pool.query(
      `INSERT INTO export_history (presentation_id, format, file_name, status, created_at)
       VALUES ($1, 'pptx', $2, 'completed', NOW())`,
      [req.params.id, `${pres.title.replace(/[^a-z0-9]/gi, '_')}.pptx`]
    ).catch(() => {});

    // Stream PPTX to response
    const fileName = `${pres.title.replace(/[^a-z0-9]/gi, '_')}_${Date.now()}.pptx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.presentationml.presentation');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

    const buffer = await pptx.write({ outputType: 'nodebuffer' });
    res.end(buffer);
  } catch (err) {
    console.error('PPTX export error:', err);
    res.status(500).json({ error: 'PPTX export failed', details: err.message });
  }
});

module.exports = router;
