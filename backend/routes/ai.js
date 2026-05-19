const express = require('express');
const axios = require('axios');
const pool = require('../db');
const auth = require('../middleware/auth');
const { aiRateLimiter } = require('../middleware/rateLimiter');
const { body, validationResult } = require('express-validator');
const router = express.Router();

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  next();
};

const aiCall = async (system, userMsg, temp = 0.7) => {
  const response = await axios.post(
    `${process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1'}/chat/completions`,
    {
      model: 'anthropic/claude-3-5-sonnet-20241022',
      messages: [{ role: 'system', content: system }, { role: 'user', content: userMsg }],
      temperature: temp, max_tokens: 4096,
    },
    {
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.CLIENT_URL || 'http://localhost:3000',
        'X-Title': 'AI Slide Deck Generator',
      }
    }
  );
  return response.data;
};

/**
 * 3-strategy JSON parser
 */
function parseAIJson(raw) {
  try { return JSON.parse(raw); } catch (_) {}
  const mdMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (mdMatch) { try { return JSON.parse(mdMatch[1].trim()); } catch (_) {} }
  const start = raw.search(/[{\[]/);
  if (start !== -1) {
    const opener = raw[start];
    const closer = opener === '{' ? '}' : ']';
    let depth = 0;
    for (let i = start; i < raw.length; i++) {
      if (raw[i] === opener) depth++;
      if (raw[i] === closer) depth--;
      if (depth === 0) { try { return JSON.parse(raw.slice(start, i + 1)); } catch (_) { break; } }
    }
  }
  return null;
}

// Chat
router.post('/chat', auth, aiRateLimiter,
  body('message').notEmpty().withMessage('message is required'),
  validate,
  async (req, res) => {
    try {
      const { message, conversation_id } = req.body;
      const data = await aiCall(
        'You are an expert presentation designer and slide deck consultant. Help users create stunning, professional presentations.',
        message
      );
      const reply = data.choices?.[0]?.message?.content || 'No response';
      let convId = conversation_id;
      if (!convId) {
        const r = await pool.query('INSERT INTO conversations (title, model, status) VALUES ($1,$2,$3) RETURNING id',
          [message.substring(0, 100), 'anthropic/claude-3-5-sonnet-20241022', 'active']);
        convId = r.rows[0].id;
      }
      await pool.query('INSERT INTO conversation_messages (conversation_id, role, content) VALUES ($1,$2,$3)', [convId, 'user', message]);
      await pool.query('INSERT INTO conversation_messages (conversation_id, role, content) VALUES ($1,$2,$3)', [convId, 'assistant', reply]);
      res.json({ conversation_id: convId, message: reply, model: data.model, usage: data.usage });
    } catch (err) {
      console.error('Chat AI Error:', err.response?.data || err.message);
      res.status(500).json({ error: err.response?.data?.error?.message || err.message });
    }
  }
);

// Generate full presentation outline (returns text)
router.post('/generate-deck', auth, aiRateLimiter,
  body('topic').notEmpty().withMessage('topic is required'),
  validate,
  async (req, res) => {
    try {
      const { topic, num_slides, audience, style, purpose } = req.body;
      const data = await aiCall(
        'You are a world-class presentation designer. Generate detailed slide deck outlines.',
        `Create a ${num_slides || 10}-slide presentation:\nTopic: ${topic}\nAudience: ${audience || 'business professionals'}\nStyle: ${style || 'professional'}\nPurpose: ${purpose || 'inform'}`,
        0.8
      );
      res.json({ result: data.choices?.[0]?.message?.content, model: data.model, usage: data.usage });
    } catch (err) {
      res.status(500).json({ error: err.response?.data?.error?.message || err.message });
    }
  }
);

// Multi-step deck generation pipeline - creates outline + content + speaker notes and saves to DB
router.post('/generate-deck-pipeline', auth, aiRateLimiter,
  body('topic').notEmpty().withMessage('topic is required'),
  body('presentation_id').optional().isInt(),
  validate,
  async (req, res) => {
    try {
      const { topic, num_slides = 8, audience, style, purpose, presentation_id } = req.body;
      const userId = req.user.id;

      // Step A: Generate slide outline as JSON
      const outlineData = await aiCall(
        `You are a world-class presentation designer. Respond ONLY with valid JSON.`,
        `Create a ${num_slides}-slide presentation outline as JSON:
Topic: ${topic}
Audience: ${audience || 'business professionals'}
Style: ${style || 'professional'}
Purpose: ${purpose || 'inform'}

Return JSON: { "slides": [ { "slide_number": number, "title": string, "key_points": string[], "type": "title|content|two-column|image-focus|chart|quote|comparison" } ] }`,
        0.7
      );

      const outlineRaw = outlineData.choices?.[0]?.message?.content || '';
      const outline = parseAIJson(outlineRaw);

      if (!outline || !outline.slides) {
        console.error('Outline AI returned invalid JSON:', outlineRaw);
        return res.status(422).json({ error: 'AI returned invalid outline JSON' });
      }

      // Create or find presentation
      let presId = presentation_id;
      if (!presId) {
        const presResult = await pool.query(
          `INSERT INTO presentations (title, description, audience, purpose, status, user_id)
           VALUES ($1, $2, $3, $4, 'draft', $5) RETURNING id`,
          [topic, `AI-generated deck: ${topic}`, audience, purpose, userId]
        ).catch(async () => {
          // Try without user_id if column doesn't exist yet
          return pool.query(
            `INSERT INTO presentations (title, description, audience, purpose, status)
             VALUES ($1, $2, $3, $4, 'draft') RETURNING id`,
            [topic, `AI-generated deck: ${topic}`, audience, purpose]
          );
        });
        presId = presResult.rows[0].id;
      }

      const completedSlides = [];

      // Step B: For each slide, generate full content
      for (const slideOutline of outline.slides) {
        const contentData = await aiCall(
          'You are an expert slide content writer. Respond ONLY with valid JSON.',
          `Generate content for slide:
Title: ${slideOutline.title}
Type: ${slideOutline.type}
Key Points: ${slideOutline.key_points.join(', ')}

Return JSON: { "title": string, "subtitle": string, "content": string, "key_bullets": string[], "speaker_notes": string, "visual_suggestion": string }`,
          0.7
        );

        const contentRaw = contentData.choices?.[0]?.message?.content || '';
        const slideContent = parseAIJson(contentRaw) || { title: slideOutline.title, content: slideOutline.key_points.join('\n'), speaker_notes: '', visual_suggestion: '' };

        // Save slide to DB
        const slideResult = await pool.query(
          `INSERT INTO slides (presentation_id, slide_number, title, content, layout, speaker_notes, visual_suggestion, status)
           VALUES ($1, $2, $3, $4, $5, $6, $7, 'draft') RETURNING *`,
          [presId, slideOutline.slide_number, slideContent.title, JSON.stringify(slideContent), slideOutline.type, slideContent.speaker_notes, slideContent.visual_suggestion]
        );

        completedSlides.push(slideResult.rows[0]);
      }

      // Update slide count
      await pool.query('UPDATE presentations SET slide_count = $1 WHERE id = $2', [completedSlides.length, presId]);

      res.json({
        presentation_id: presId,
        topic,
        outline: outline.slides,
        slides: completedSlides,
        total_slides: completedSlides.length,
        message: `Generated ${completedSlides.length} slides for "${topic}"`,
      });
    } catch (err) {
      console.error('Pipeline error:', err.response?.data || err.message);
      res.status(500).json({ error: err.response?.data?.error?.message || err.message });
    }
  }
);

// Generate slide content and persist to slides table
router.post('/generate-slide', auth, aiRateLimiter,
  body('slide_title').notEmpty().withMessage('slide_title is required'),
  validate,
  async (req, res) => {
    try {
      const { slide_title, context, layout, tone, presentation_id, slide_number } = req.body;
      const data = await aiCall(
        'You are an expert slide content writer. Create compelling, concise slide content. Respond ONLY with valid JSON.',
        `Generate content for slide:
Title: ${slide_title}
Context: ${context || 'Business presentation'}
Layout: ${layout || 'content with bullets'}
Tone: ${tone || 'professional'}

Return JSON: { "title": string, "subtitle": string, "content": string, "key_bullets": string[], "speaker_notes": string, "visual_suggestion": string, "data_points": string[] }`,
        0.7
      );

      const raw = data.choices?.[0]?.message?.content || '';
      const slideContent = parseAIJson(raw);

      if (!slideContent) {
        console.error('Generate slide returned invalid JSON:', raw);
        return res.status(422).json({ error: 'AI returned invalid JSON response' });
      }

      // Persist to slides table if presentation_id provided
      if (presentation_id) {
        await pool.query(
          `INSERT INTO slides (presentation_id, slide_number, title, content, layout, speaker_notes, visual_suggestion, status)
           VALUES ($1, $2, $3, $4, $5, $6, $7, 'draft')`,
          [presentation_id, slide_number || 1, slideContent.title, JSON.stringify(slideContent), layout || 'content', slideContent.speaker_notes, slideContent.visual_suggestion]
        );
      }

      res.json({ result: slideContent, raw_content: raw, model: data.model, usage: data.usage });
    } catch (err) {
      res.status(500).json({ error: err.response?.data?.error?.message || err.message });
    }
  }
);

// Generate speaker notes
router.post('/generate-notes', auth, aiRateLimiter,
  body('slide_content').notEmpty().withMessage('slide_content required'),
  validate,
  async (req, res) => {
    try {
      const { slide_content, duration_minutes, style } = req.body;
      const data = await aiCall(
        'You are a professional speech writer. Write engaging speaker notes. Respond ONLY with valid JSON.',
        `Write speaker notes:
Slide Content: ${slide_content}
Duration: ${duration_minutes || 2} minutes
Style: ${style || 'professional and confident'}

Return JSON: { "opening_line": string, "talking_points": string[], "emphasis_phrases": string[], "engagement_moment": string, "transition_to_next": string, "timing_breakdown": string }`,
        0.7
      );

      const raw = data.choices?.[0]?.message?.content || '';
      const notes = parseAIJson(raw);

      if (!notes) {
        console.error('Generate notes returned invalid JSON:', raw);
        return res.status(422).json({ error: 'AI returned invalid JSON response' });
      }

      res.json({ result: notes, model: data.model, usage: data.usage });
    } catch (err) {
      res.status(500).json({ error: err.response?.data?.error?.message || err.message });
    }
  }
);

// Improve/rewrite content
router.post('/improve-content', auth, aiRateLimiter,
  body('content').notEmpty().withMessage('content required'),
  validate,
  async (req, res) => {
    try {
      const { content, improvement_type } = req.body;
      const data = await aiCall(
        'You are a presentation content optimizer. Respond ONLY with valid JSON.',
        `Improve this slide content (type: ${improvement_type || 'concise'}):
${content}

Return JSON: { "improved_content": string, "changes_made": string[], "additional_suggestions": string[] }`,
        0.6
      );
      const raw = data.choices?.[0]?.message?.content || '';
      const result = parseAIJson(raw);
      if (!result) return res.status(422).json({ error: 'AI returned invalid JSON response' });
      res.json({ result, model: data.model, usage: data.usage });
    } catch (err) {
      res.status(500).json({ error: err.response?.data?.error?.message || err.message });
    }
  }
);

// Generate chart description
router.post('/generate-chart', auth, aiRateLimiter,
  body('data_description').notEmpty().withMessage('data_description required'),
  validate,
  async (req, res) => {
    try {
      const { data_description, chart_purpose, audience } = req.body;
      const data = await aiCall(
        'You are a data visualization expert. Respond ONLY with valid JSON.',
        `Create chart recommendation:
Data: ${data_description}
Purpose: ${chart_purpose || 'show trends'}
Audience: ${audience || 'business professionals'}

Return JSON: { "chart_type": string, "rationale": string, "title": string, "axis_labels": { "x": string, "y": string }, "color_scheme": string[], "key_highlights": string[], "narrative": string, "sample_data": object }`,
        0.6
      );
      const raw = data.choices?.[0]?.message?.content || '';
      const result = parseAIJson(raw);
      if (!result) return res.status(422).json({ error: 'AI returned invalid JSON response' });
      res.json({ result, model: data.model, usage: data.usage });
    } catch (err) {
      res.status(500).json({ error: err.response?.data?.error?.message || err.message });
    }
  }
);

// Design feedback - persist to presentations.design_feedback
router.post('/design-feedback', auth, aiRateLimiter,
  body('description').notEmpty().withMessage('description required'),
  validate,
  async (req, res) => {
    try {
      const { description, presentation_id } = req.body;
      const data = await aiCall(
        'You are a professional presentation design critic. Respond ONLY with valid JSON.',
        `Provide design feedback:
${description}

Return JSON: {
  "visual_hierarchy_score": number,
  "color_usage_score": number,
  "typography_score": number,
  "white_space_score": number,
  "content_clarity_score": number,
  "overall_score": number,
  "top_improvements": string[],
  "best_practices_followed": string[],
  "actionable_changes": string[]
}`,
        0.5
      );
      const raw = data.choices?.[0]?.message?.content || '';
      const result = parseAIJson(raw);
      if (!result) return res.status(422).json({ error: 'AI returned invalid JSON response' });

      // Persist to presentations.design_feedback
      if (presentation_id) {
        await pool.query(
          'UPDATE presentations SET design_feedback = $1 WHERE id = $2',
          [JSON.stringify(result), presentation_id]
        ).catch(err => console.warn('design_feedback column may not exist:', err.message));
      }

      res.json({ result, model: data.model, usage: data.usage });
    } catch (err) {
      res.status(500).json({ error: err.response?.data?.error?.message || err.message });
    }
  }
);

// Conversations
router.get('/conversations', auth, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, parseInt(req.query.limit) || 20);
    const offset = (page - 1) * limit;
    const countQ = await pool.query('SELECT COUNT(*) FROM conversations');
    const total = parseInt(countQ.rows[0].count);
    const dataQ = await pool.query('SELECT * FROM conversations ORDER BY created_at DESC LIMIT $1 OFFSET $2', [limit, offset]);
    res.json({ data: dataQ.rows, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/conversations/:id', auth, async (req, res) => {
  try {
    const conv = await pool.query('SELECT * FROM conversations WHERE id = $1', [req.params.id]);
    if (conv.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    const msgs = await pool.query('SELECT * FROM conversation_messages WHERE conversation_id = $1 ORDER BY created_at ASC', [req.params.id]);
    res.json({ ...conv.rows[0], messages: msgs.rows });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/conversations/:id', auth, async (req, res) => {
  try {
    await pool.query('DELETE FROM conversation_messages WHERE conversation_id = $1', [req.params.id]);
    await pool.query('DELETE FROM conversations WHERE id = $1', [req.params.id]);
    res.json({ message: 'Deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// AI Template Recommend
router.post('/template-recommend', auth, aiRateLimiter, async (req, res) => {
  try {
    const { topic, audience, tone, slide_count } = req.body || {};
    if (!topic) return res.status(400).json({ error: 'topic is required' });
    let templates = [];
    try {
      const t = await pool.query('SELECT id, name, category, description FROM templates ORDER BY id LIMIT 50');
      templates = t.rows;
    } catch (_) {}
    const sys = 'You are a slide-deck template recommender. Recommend the best templates and layout patterns for the topic and audience. Respond ONLY in JSON.';
    const user = `Topic: ${topic}\nAudience: ${audience || 'general business'}\nTone: ${tone || 'professional'}\nApprox slide count: ${slide_count || 12}\nAvailable templates: ${JSON.stringify(templates)}\n\nReturn JSON: {recommended_templates:[{template_id,name,fit_score:0-100,why}], slide_pattern:[{position,layout:"title|section|bullets|two_column|chart|image_full|quote|comparison|cta",content_hint}], color_palette_suggestion:{primary,accent,neutral}, font_pairing_suggestion, summary}.`;
    const ai = await aiCall(sys, user, 0.5);
    const parsed = parseAIJson(ai.choices?.[0]?.message?.content || '') || { raw: ai.choices?.[0]?.message?.content };
    res.json({ recommendation: parsed });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// AI Speaker Notes Expand
router.post('/speaker-notes-expand', auth, aiRateLimiter, async (req, res) => {
  try {
    const { slide_outline, slide_title, target_minutes_per_slide, audience } = req.body || {};
    if (!slide_outline && !slide_title) return res.status(400).json({ error: 'slide_outline or slide_title required' });
    const sys = 'You are an expert presentation coach. Expand a slide outline into rich speaker notes with timing cues, transitions, and audience engagement prompts. Respond ONLY in JSON.';
    const user = `Slide title: ${slide_title || ''}\nOutline: ${slide_outline || ''}\nTarget time: ${target_minutes_per_slide || 1.5} minutes\nAudience: ${audience || 'general'}\n\nReturn JSON: {speaker_notes, timing_breakdown:[{section,seconds}], transition_in, transition_out, audience_engagement_prompts:[], anticipated_questions:[{question,answer}], pacing_tips, summary}.`;
    const ai = await aiCall(sys, user);
    const parsed = parseAIJson(ai.choices?.[0]?.message?.content || '') || { raw: ai.choices?.[0]?.message?.content };
    res.json({ notes: parsed });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// AI Design Consistency Check
router.post('/design-consistency-check', auth, aiRateLimiter, async (req, res) => {
  try {
    const { slides, brand } = req.body || {};
    if (!Array.isArray(slides) || slides.length === 0) return res.status(400).json({ error: 'slides array required' });
    const sys = 'You are a design-consistency AI for slide decks. Audit fonts, colors, spacing, alignment, and brand fidelity across slides. Respond ONLY in JSON.';
    const user = `Brand: ${JSON.stringify(brand || {})}\nSlides:\n${JSON.stringify(slides).slice(0, 12000)}\n\nReturn JSON: {consistency_score:0-100, issues:[{slide_index,type:"font|color|spacing|alignment|hierarchy|brand|imagery",severity:"low|medium|high",description,fix}], typography_audit:{fonts_used:[],recommendation}, color_audit:{palette_used:[],recommendation}, brand_compliance_score:0-100, prioritized_fixes:[{slide_index,fix,impact}], summary}.`;
    const ai = await aiCall(sys, user, 0.3);
    const parsed = parseAIJson(ai.choices?.[0]?.message?.content || '') || { raw: ai.choices?.[0]?.message?.content };
    res.json({ audit: parsed });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// AI Content Quality Feedback (audit backlog #1, mechanical)
router.post('/content-quality-feedback', auth, aiRateLimiter, async (req, res) => {
  try {
    if (!process.env.OPENROUTER_API_KEY) {
      return res.status(503).json({ error: 'AI provider not configured (OPENROUTER_API_KEY missing).' });
    }
    const { slides, audience, goal, tone } = req.body || {};
    if (!Array.isArray(slides) || slides.length === 0) {
      return res.status(400).json({ error: 'slides array required' });
    }
    const sys = 'You are a presentation content reviewer. Score readability, clarity, persuasion, structure, and audience-fit for a slide deck and return prioritized fixes. Respond ONLY in JSON.';
    const user = `Audience: ${audience || 'general business'}\nGoal: ${goal || 'inform and persuade'}\nTone: ${tone || 'professional'}\nSlides:\n${JSON.stringify(slides).slice(0, 12000)}\n\nReturn JSON: {overall_quality_score:0-100, readability_score:0-100, clarity_score:0-100, persuasion_score:0-100, structure_score:0-100, audience_fit_score:0-100, slide_feedback:[{slide_index,strengths:[],weaknesses:[],suggested_rewrite}], top_issues:[{slide_index,issue,severity:"low|medium|high",fix}], message_arc_assessment, summary}.`;
    const ai = await aiCall(sys, user, 0.4);
    const parsed = parseAIJson(ai.choices?.[0]?.message?.content || '') || { raw: ai.choices?.[0]?.message?.content };
    res.json({ feedback: parsed });
  } catch (err) {
    res.status(500).json({ error: err.response?.data?.error?.message || err.message });
  }
});

module.exports = router;
