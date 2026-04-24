const express = require('express');
const axios = require('axios');
const pool = require('../db');
const auth = require('../middleware/auth');
const router = express.Router();

const aiCall = async (system, userMsg, temp = 0.7) => {
  const response = await axios.post(
    `${process.env.OPENROUTER_BASE_URL}/chat/completions`,
    {
      model: process.env.OPENROUTER_MODEL,
      messages: [{ role: 'system', content: system }, { role: 'user', content: userMsg }],
      temperature: temp, max_tokens: 4096,
    },
    {
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'http://localhost:3000',
        'X-Title': 'AI Slide Deck Generator',
      }
    }
  );
  return response.data;
};

// Chat
router.post('/chat', auth, async (req, res) => {
  try {
    const { message, conversation_id } = req.body;
    const data = await aiCall(
      'You are an expert presentation designer and slide deck consultant. Help users create stunning, professional presentations. Provide specific advice on slide design, content structure, visual hierarchy, storytelling, data visualization, and audience engagement. Give actionable, detailed guidance.',
      message
    );
    const reply = data.choices?.[0]?.message?.content || 'No response';
    let convId = conversation_id;
    if (!convId) {
      const r = await pool.query('INSERT INTO conversations (title, model, status) VALUES ($1,$2,$3) RETURNING id',
        [message.substring(0, 100), process.env.OPENROUTER_MODEL, 'active']);
      convId = r.rows[0].id;
    }
    await pool.query('INSERT INTO conversation_messages (conversation_id, role, content) VALUES ($1,$2,$3)', [convId, 'user', message]);
    await pool.query('INSERT INTO conversation_messages (conversation_id, role, content) VALUES ($1,$2,$3)', [convId, 'assistant', reply]);
    res.json({ conversation_id: convId, message: reply, model: data.model, usage: data.usage, raw_response: data });
  } catch (err) {
    console.error('AI Error:', err.response?.data || err.message);
    res.status(500).json({ error: err.response?.data?.error?.message || err.message });
  }
});

// Generate full presentation outline
router.post('/generate-deck', auth, async (req, res) => {
  try {
    const { topic, num_slides, audience, style, purpose } = req.body;
    const data = await aiCall(
      'You are a world-class presentation designer. Generate detailed slide deck outlines with specific content for each slide. Include title, bullet points, speaker notes, suggested visuals, and layout recommendations.',
      `Create a ${num_slides || 10}-slide presentation:\nTopic: ${topic}\nAudience: ${audience || 'business professionals'}\nStyle: ${style || 'professional'}\nPurpose: ${purpose || 'inform'}\n\nFor each slide provide:\n1. Slide number and title\n2. Layout type (title, content, two-column, image-focus, chart, quote, comparison)\n3. Main content (bullet points or text)\n4. Speaker notes\n5. Suggested visual/image description\n6. Design tips for this slide`,
      0.8
    );
    res.json({ result: data.choices?.[0]?.message?.content, model: data.model, usage: data.usage, raw_response: data });
  } catch (err) {
    res.status(500).json({ error: err.response?.data?.error?.message || err.message });
  }
});

// Generate slide content
router.post('/generate-slide', auth, async (req, res) => {
  try {
    const { slide_title, context, layout, tone } = req.body;
    const data = await aiCall(
      'You are an expert slide content writer. Create compelling, concise slide content optimized for visual presentations. Use clear hierarchy, short bullet points, and impactful language.',
      `Generate content for a slide:\nTitle: ${slide_title}\nContext: ${context || 'Business presentation'}\nLayout: ${layout || 'content with bullets'}\nTone: ${tone || 'professional'}\n\nProvide:\n1. Refined title (if needed)\n2. Subtitle/tagline\n3. Main content (3-5 bullet points, concise)\n4. Supporting data or statistics\n5. Call-to-action or key takeaway\n6. Speaker notes (what to say)\n7. Visual suggestion`,
      0.7
    );
    res.json({ result: data.choices?.[0]?.message?.content, model: data.model, usage: data.usage, raw_response: data });
  } catch (err) {
    res.status(500).json({ error: err.response?.data?.error?.message || err.message });
  }
});

// Generate speaker notes
router.post('/generate-notes', auth, async (req, res) => {
  try {
    const { slide_content, duration_minutes, style } = req.body;
    const data = await aiCall(
      'You are a professional speech writer and presentation coach. Write engaging, natural-sounding speaker notes that complement slide content. Include timing cues, emphasis markers, and audience engagement tips.',
      `Write speaker notes for this slide:\n\nSlide Content:\n${slide_content}\n\nTarget Duration: ${duration_minutes || 2} minutes\nSpeaking Style: ${style || 'professional and confident'}\n\nProvide:\n1. Opening line (attention grabber)\n2. Main talking points with transitions\n3. Key phrases to emphasize\n4. Audience engagement moment (question/poll/pause)\n5. Transition to next slide\n6. Timing breakdown`,
      0.7
    );
    res.json({ result: data.choices?.[0]?.message?.content, model: data.model, usage: data.usage, raw_response: data });
  } catch (err) {
    res.status(500).json({ error: err.response?.data?.error?.message || err.message });
  }
});

// Improve/rewrite slide content
router.post('/improve-content', auth, async (req, res) => {
  try {
    const { content, improvement_type } = req.body;
    const types = {
      'concise': 'Make this slide content more concise and impactful. Remove filler words, tighten bullet points.',
      'persuasive': 'Rewrite to be more persuasive and compelling. Add emotional hooks and strong calls-to-action.',
      'data-driven': 'Enhance with data points, statistics, and evidence-based arguments.',
      'storytelling': 'Rewrite using storytelling techniques. Add narrative flow and relatable examples.',
      'executive': 'Rewrite for C-suite executives. Focus on business impact, ROI, and strategic implications.',
      'creative': 'Make it more creative and engaging. Use metaphors, analogies, and unexpected angles.',
    };
    const data = await aiCall(
      'You are a presentation content optimizer. Improve slide content while maintaining clarity and visual impact.',
      `${types[improvement_type] || types['concise']}\n\nOriginal Content:\n${content}\n\nProvide:\n1. Improved version\n2. What changed and why\n3. Additional suggestions`,
      0.6
    );
    res.json({ result: data.choices?.[0]?.message?.content, model: data.model, usage: data.usage, raw_response: data });
  } catch (err) {
    res.status(500).json({ error: err.response?.data?.error?.message || err.message });
  }
});

// Generate chart description
router.post('/generate-chart', auth, async (req, res) => {
  try {
    const { data_description, chart_purpose, audience } = req.body;
    const data = await aiCall(
      'You are a data visualization expert. Recommend the best chart type and create compelling data narratives for presentations.',
      `Create a chart recommendation:\nData: ${data_description}\nPurpose: ${chart_purpose || 'show trends'}\nAudience: ${audience || 'business professionals'}\n\nProvide:\n1. Recommended chart type and why\n2. Chart title\n3. Axis labels and legend\n4. Key data points to highlight\n5. Color scheme recommendation\n6. Insight callout text\n7. Sample data structure (JSON)\n8. Storytelling narrative for presenting this chart`,
      0.6
    );
    res.json({ result: data.choices?.[0]?.message?.content, model: data.model, usage: data.usage, raw_response: data });
  } catch (err) {
    res.status(500).json({ error: err.response?.data?.error?.message || err.message });
  }
});

// Design feedback
router.post('/design-feedback', auth, async (req, res) => {
  try {
    const { description } = req.body;
    const data = await aiCall(
      'You are a professional presentation design critic. Provide constructive feedback on slide design, layout, typography, color usage, and visual hierarchy.',
      `Provide design feedback for this presentation/slide:\n\n${description}\n\nAnalyze:\n1. Visual hierarchy (score 1-10)\n2. Color usage (score 1-10)\n3. Typography (score 1-10)\n4. White space & layout (score 1-10)\n5. Content clarity (score 1-10)\n6. Overall score\n7. Top 3 improvements\n8. Design best practices being followed\n9. Specific actionable changes`,
      0.5
    );
    res.json({ result: data.choices?.[0]?.message?.content, model: data.model, usage: data.usage, raw_response: data });
  } catch (err) {
    res.status(500).json({ error: err.response?.data?.error?.message || err.message });
  }
});

// Conversations
router.get('/conversations', auth, async (req, res) => {
  try { res.json((await pool.query('SELECT * FROM conversations ORDER BY created_at DESC')).rows); }
  catch (err) { res.status(500).json({ error: err.message }); }
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

module.exports = router;
