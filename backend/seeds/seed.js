require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') });
const pool = require('../db');
const bcrypt = require('bcryptjs');

async function seed() {
  console.log('Seeding AI Slide Deck Generator...');

  // Drop tables
  await pool.query(`
    DROP TABLE IF EXISTS conversation_messages, conversations, presentation_analytics,
      collaborators, brand_kits, export_history, speaker_notes, animations,
      icon_sets, image_library, chart_configs, slide_layouts, themes,
      slide_templates, slides, presentations, settings, users CASCADE;
  `);

  // Create tables
  await pool.query(`
    CREATE TABLE users (
      id SERIAL PRIMARY KEY,
      email VARCHAR(255) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      name VARCHAR(255) DEFAULT 'Admin',
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE presentations (
      id SERIAL PRIMARY KEY,
      title VARCHAR(500) NOT NULL,
      description TEXT,
      theme VARCHAR(100) DEFAULT 'modern',
      slide_count INTEGER DEFAULT 0,
      status VARCHAR(50) DEFAULT 'draft',
      audience VARCHAR(200),
      purpose VARCHAR(200),
      tags TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE slides (
      id SERIAL PRIMARY KEY,
      presentation_id INTEGER,
      slide_number INTEGER DEFAULT 1,
      title VARCHAR(500),
      content TEXT,
      layout VARCHAR(100) DEFAULT 'content',
      speaker_notes TEXT,
      visual_suggestion TEXT,
      status VARCHAR(50) DEFAULT 'draft',
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE slide_templates (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      category VARCHAR(100),
      description TEXT,
      layout_type VARCHAR(100),
      structure JSONB DEFAULT '{}',
      thumbnail VARCHAR(500),
      popularity INTEGER DEFAULT 0,
      is_premium BOOLEAN DEFAULT false,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE themes (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      primary_color VARCHAR(20) DEFAULT '#6366f1',
      secondary_color VARCHAR(20) DEFAULT '#818cf8',
      accent_color VARCHAR(20) DEFAULT '#f59e0b',
      background_color VARCHAR(20) DEFAULT '#ffffff',
      text_color VARCHAR(20) DEFAULT '#1f2937',
      font_heading VARCHAR(100) DEFAULT 'Inter',
      font_body VARCHAR(100) DEFAULT 'Inter',
      style VARCHAR(50) DEFAULT 'modern',
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE slide_layouts (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      layout_type VARCHAR(100),
      description TEXT,
      grid_columns INTEGER DEFAULT 1,
      grid_rows INTEGER DEFAULT 1,
      supports_image BOOLEAN DEFAULT true,
      supports_chart BOOLEAN DEFAULT false,
      supports_video BOOLEAN DEFAULT false,
      placeholder_count INTEGER DEFAULT 3,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE chart_configs (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      chart_type VARCHAR(50),
      description TEXT,
      data_source TEXT,
      config JSONB DEFAULT '{}',
      color_scheme VARCHAR(100),
      presentation_id INTEGER,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE image_library (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      category VARCHAR(100),
      url VARCHAR(1000),
      alt_text VARCHAR(500),
      width INTEGER DEFAULT 1920,
      height INTEGER DEFAULT 1080,
      file_size VARCHAR(50),
      license VARCHAR(100) DEFAULT 'free',
      tags TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE icon_sets (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      icon_count INTEGER DEFAULT 0,
      style VARCHAR(50),
      category VARCHAR(100),
      source VARCHAR(200),
      license VARCHAR(100) DEFAULT 'free',
      format VARCHAR(50) DEFAULT 'svg',
      color_customizable BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE animations (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      type VARCHAR(50),
      description TEXT,
      duration_ms INTEGER DEFAULT 500,
      easing VARCHAR(50) DEFAULT 'ease-in-out',
      trigger_event VARCHAR(50) DEFAULT 'on-click',
      direction VARCHAR(50) DEFAULT 'left',
      intensity VARCHAR(50) DEFAULT 'medium',
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE speaker_notes (
      id SERIAL PRIMARY KEY,
      slide_id INTEGER,
      title VARCHAR(255),
      content TEXT,
      duration_minutes NUMERIC(4,1) DEFAULT 2.0,
      key_points TEXT,
      audience_cue TEXT,
      transition_note TEXT,
      status VARCHAR(50) DEFAULT 'draft',
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE export_history (
      id SERIAL PRIMARY KEY,
      presentation_id INTEGER,
      format VARCHAR(50) DEFAULT 'pptx',
      file_name VARCHAR(500),
      file_size VARCHAR(50),
      status VARCHAR(50) DEFAULT 'completed',
      settings JSONB DEFAULT '{}',
      download_count INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE brand_kits (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      company VARCHAR(255),
      colors JSONB DEFAULT '[]',
      fonts JSONB DEFAULT '[]',
      logos JSONB DEFAULT '[]',
      guidelines TEXT,
      status VARCHAR(50) DEFAULT 'active',
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE collaborators (
      id SERIAL PRIMARY KEY,
      presentation_id INTEGER,
      user_email VARCHAR(255),
      role VARCHAR(50) DEFAULT 'viewer',
      permissions VARCHAR(100) DEFAULT 'view',
      status VARCHAR(50) DEFAULT 'active',
      invited_by VARCHAR(255),
      joined_at TIMESTAMP DEFAULT NOW(),
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE presentation_analytics (
      id SERIAL PRIMARY KEY,
      presentation_id INTEGER,
      event_type VARCHAR(100),
      views INTEGER DEFAULT 0,
      unique_viewers INTEGER DEFAULT 0,
      avg_time_seconds INTEGER DEFAULT 0,
      completion_rate NUMERIC(5,2) DEFAULT 0,
      viewer_data JSONB DEFAULT '{}',
      date DATE DEFAULT CURRENT_DATE,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE settings (
      id SERIAL PRIMARY KEY,
      key VARCHAR(255) UNIQUE NOT NULL,
      value TEXT,
      category VARCHAR(100) DEFAULT 'general',
      description TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE conversations (
      id SERIAL PRIMARY KEY,
      title VARCHAR(500),
      model VARCHAR(200),
      status VARCHAR(50) DEFAULT 'active',
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE conversation_messages (
      id SERIAL PRIMARY KEY,
      conversation_id INTEGER REFERENCES conversations(id),
      role VARCHAR(50),
      content TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);

  // Seed user
  const hash = await bcrypt.hash(process.env.DEFAULT_PASSWORD || 'admin123', 10);
  await pool.query('INSERT INTO users (email, password, name) VALUES ($1, $2, $3)',
    [process.env.DEFAULT_EMAIL || 'admin@slidedeck.ai', hash, 'Admin User']);

  // Seed presentations
  const presentations = [
    ['Q4 2024 Business Review', 'Quarterly business performance review with key metrics and insights', 'corporate', 12, 'completed', 'executives', 'inform'],
    ['Product Launch: AI Assistant', 'New product launch presentation for stakeholders', 'modern', 15, 'completed', 'investors', 'persuade'],
    ['Marketing Strategy 2025', 'Annual marketing strategy and campaign planning', 'creative', 18, 'draft', 'marketing team', 'plan'],
    ['Team Onboarding Program', 'New employee orientation and onboarding slides', 'minimal', 20, 'completed', 'new hires', 'educate'],
    ['Sales Pipeline Review', 'Monthly sales pipeline and forecast analysis', 'data-driven', 10, 'active', 'sales managers', 'inform'],
    ['Investor Pitch Deck', 'Series B funding pitch deck', 'startup', 14, 'completed', 'venture capitalists', 'persuade'],
    ['Technology Roadmap', 'Engineering technology roadmap for 2025', 'tech', 16, 'draft', 'engineering team', 'plan'],
    ['Customer Success Stories', 'Case studies and customer testimonials', 'storytelling', 12, 'completed', 'prospects', 'persuade'],
    ['Annual Company Retreat', 'Company retreat agenda and team activities', 'fun', 8, 'active', 'all employees', 'engage'],
    ['Data Science Workshop', 'Introduction to ML and data science concepts', 'academic', 25, 'draft', 'developers', 'educate'],
    ['Brand Guidelines Presentation', 'Company brand identity and usage guidelines', 'brand', 15, 'completed', 'designers', 'inform'],
    ['Competitive Analysis', 'Market landscape and competitor benchmarking', 'analytical', 14, 'active', 'product team', 'analyze'],
    ['Sustainability Report', 'ESG metrics and sustainability initiatives', 'green', 18, 'draft', 'board members', 'report'],
    ['UX Research Findings', 'User research insights and recommendations', 'research', 16, 'completed', 'product team', 'inform'],
    ['Budget Proposal 2025', 'Annual departmental budget allocation proposal', 'financial', 10, 'draft', 'finance team', 'propose'],
  ];
  for (const p of presentations) {
    await pool.query('INSERT INTO presentations (title,description,theme,slide_count,status,audience,purpose) VALUES ($1,$2,$3,$4,$5,$6,$7)', p);
  }

  // Seed slides
  const slides = [
    [1, 1, 'Welcome & Agenda', 'Overview of today presentation topics and timeline', 'title', 'Welcome everyone to our Q4 review', 'Hero image with company logo'],
    [1, 2, 'Revenue Highlights', 'Total revenue: $4.2M (+18% YoY)\nNew customers: 142\nRetention rate: 94%', 'data', 'Focus on the 18% growth story', 'Bar chart comparing quarters'],
    [1, 3, 'Key Achievements', 'Launched 3 new products\nExpanded to 5 new markets\nReduced churn by 22%', 'content', 'Celebrate team wins', 'Achievement badges or icons'],
    [2, 1, 'AI Assistant Launch', 'Introducing our next-generation AI-powered assistant', 'title', 'Build excitement with a bold opening', 'Product screenshot on gradient background'],
    [2, 2, 'The Problem', '68% of users spend 3+ hours on repetitive tasks\nCurrent solutions are fragmented\nProductivity gap costs $2.4B annually', 'content', 'Use statistics to create urgency', 'Infographic showing pain points'],
    [2, 3, 'Our Solution', 'AI-powered task automation\nNatural language interface\nSeamless integrations with 50+ tools', 'two-column', 'Demo the product live if possible', 'Product demo screenshots'],
    [3, 1, 'Marketing Strategy 2025', 'Building brand awareness through multi-channel campaigns', 'title', 'Set the vision for the year ahead', 'Abstract brand visual'],
    [3, 2, 'Target Segments', 'Enterprise: Fortune 500 companies\nSMB: 10-200 employee companies\nStartups: Pre-series B', 'three-column', 'Explain segment prioritization', 'Segment icons'],
    [4, 1, 'Welcome to the Team', 'Your journey with us starts here', 'title', 'Be warm and welcoming', 'Team photo collage'],
    [4, 2, 'Company Culture', 'Our core values: Innovation, Integrity, Impact\nOpen communication\nGrowth mindset', 'content', 'Share personal stories', 'Culture photos'],
    [5, 1, 'Sales Pipeline Overview', 'Current pipeline value: $12.5M across 47 opportunities', 'data', 'Start with the big number', 'Funnel chart'],
    [6, 1, 'The Opportunity', 'A $50B market growing at 35% CAGR', 'title', 'Lead with market size', 'Market size visualization'],
    [6, 2, 'Traction', '10K+ users\n$2M ARR\n150% NRR\n3 enterprise clients', 'metrics', 'Let numbers speak', 'Metric cards with icons'],
    [7, 1, 'Tech Roadmap 2025', 'Building the infrastructure for the next decade', 'title', 'Inspire the engineering team', 'Timeline graphic'],
    [8, 1, 'Customer Success Stories', 'How our clients achieved 3x ROI with our platform', 'title', 'Use real customer quotes', 'Customer logos grid'],
  ];
  for (const s of slides) {
    await pool.query('INSERT INTO slides (presentation_id,slide_number,title,content,layout,speaker_notes,visual_suggestion) VALUES ($1,$2,$3,$4,$5,$6,$7)', s);
  }

  // Seed templates
  const templates = [
    ['Startup Pitch Deck', 'pitch', 'Classic pitch deck structure for startups', 'mixed', '{"slides":["title","problem","solution","market","traction","team","ask"]}', null, 892, false],
    ['Corporate Report', 'business', 'Formal quarterly/annual report template', 'data', '{"slides":["cover","agenda","summary","data","charts","conclusion"]}', null, 756, false],
    ['Product Launch', 'marketing', 'Product announcement and launch template', 'visual', '{"slides":["hero","problem","solution","features","pricing","cta"]}', null, 643, false],
    ['Academic Lecture', 'education', 'University lecture and teaching template', 'content', '{"slides":["title","objectives","content","examples","summary","qa"]}', null, 521, false],
    ['Sales Proposal', 'sales', 'Client proposal and pricing template', 'mixed', '{"slides":["cover","about","problem","solution","pricing","timeline"]}', null, 445, true],
    ['Workshop/Training', 'education', 'Interactive workshop and training template', 'interactive', '{"slides":["welcome","agenda","theory","exercise","discussion","recap"]}', null, 389, false],
    ['Creative Portfolio', 'creative', 'Designer and creative professional portfolio', 'visual', '{"slides":["intro","work1","work2","work3","process","contact"]}', null, 367, true],
    ['Data Dashboard', 'analytics', 'Data-heavy presentation with charts and metrics', 'data', '{"slides":["overview","kpi","trends","comparison","forecast","actions"]}', null, 334, false],
    ['Team Meeting', 'internal', 'Weekly/monthly team status update', 'simple', '{"slides":["agenda","updates","blockers","metrics","actions","next"]}', null, 298, false],
    ['Investor Update', 'business', 'Monthly/quarterly investor update letter', 'formal', '{"slides":["highlights","metrics","milestones","challenges","outlook"]}', null, 276, true],
    ['Event Presentation', 'events', 'Conference talk and keynote template', 'keynote', '{"slides":["hook","story","insight","evidence","application","close"]}', null, 254, false],
    ['Webinar', 'marketing', 'Online webinar and virtual event template', 'interactive', '{"slides":["welcome","speaker","topic","content","poll","qa","cta"]}', null, 231, false],
    ['Case Study', 'sales', 'Customer success and case study template', 'storytelling', '{"slides":["client","challenge","approach","solution","results","quotes"]}', null, 212, false],
    ['Project Proposal', 'business', 'New project kickoff and proposal', 'structured', '{"slides":["overview","goals","scope","timeline","budget","team"]}', null, 198, false],
    ['Social Media Report', 'marketing', 'Social media performance and analytics', 'visual', '{"slides":["overview","reach","engagement","content","growth","plan"]}', null, 187, false],
  ];
  for (const t of templates) {
    await pool.query('INSERT INTO slide_templates (name,category,description,layout_type,structure,thumbnail,popularity,is_premium) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)', t);
  }

  // Seed themes
  const themes = [
    ['Ocean Blue', 'Clean and professional blue theme', '#1e40af', '#3b82f6', '#f59e0b', '#ffffff', '#1f2937', 'Inter', 'Inter', 'professional'],
    ['Dark Elegance', 'Sophisticated dark theme for impactful presentations', '#818cf8', '#6366f1', '#f472b6', '#111827', '#f9fafb', 'Playfair Display', 'Roboto', 'elegant'],
    ['Forest Green', 'Nature-inspired theme with earthy tones', '#059669', '#10b981', '#d97706', '#ffffff', '#1f2937', 'Merriweather', 'Open Sans', 'natural'],
    ['Sunset Gradient', 'Warm gradient theme for creative presentations', '#ef4444', '#f97316', '#eab308', '#ffffff', '#1f2937', 'Poppins', 'Nunito', 'creative'],
    ['Minimal Gray', 'Ultra-clean minimalist theme', '#374151', '#6b7280', '#3b82f6', '#ffffff', '#111827', 'Helvetica', 'Helvetica', 'minimal'],
    ['Tech Neon', 'Bold neon accents on dark background', '#06b6d4', '#8b5cf6', '#22d3ee', '#0f172a', '#e2e8f0', 'JetBrains Mono', 'Inter', 'tech'],
    ['Coral Pink', 'Warm and approachable pink theme', '#ec4899', '#f472b6', '#8b5cf6', '#ffffff', '#1f2937', 'Lora', 'Nunito', 'friendly'],
    ['Corporate Navy', 'Traditional corporate presentation theme', '#1e3a5f', '#2563eb', '#d97706', '#ffffff', '#1e293b', 'Georgia', 'Arial', 'corporate'],
    ['Pastel Dream', 'Soft pastel colors for gentle presentations', '#a78bfa', '#93c5fd', '#fbbf24', '#fefce8', '#374151', 'Quicksand', 'Quicksand', 'playful'],
    ['Monochrome', 'Black and white for maximum clarity', '#000000', '#404040', '#ff6b6b', '#ffffff', '#000000', 'Montserrat', 'Montserrat', 'bold'],
    ['Emerald Pro', 'Professional green with gold accents', '#065f46', '#10b981', '#f59e0b', '#ffffff', '#1f2937', 'Source Serif Pro', 'Source Sans Pro', 'professional'],
    ['Vibrant Purple', 'Eye-catching purple for creative decks', '#7c3aed', '#a78bfa', '#fbbf24', '#ffffff', '#1f2937', 'Raleway', 'Open Sans', 'creative'],
    ['Arctic Blue', 'Cool tones for data-heavy presentations', '#0ea5e9', '#38bdf8', '#f43f5e', '#f0f9ff', '#0f172a', 'IBM Plex Sans', 'IBM Plex Sans', 'data'],
    ['Warm Earth', 'Earthy and organic color palette', '#92400e', '#d97706', '#059669', '#fffbeb', '#1c1917', 'Libre Baskerville', 'Karla', 'organic'],
    ['Gradient Flow', 'Modern gradient backgrounds', '#6366f1', '#ec4899', '#f59e0b', '#ffffff', '#1f2937', 'DM Sans', 'DM Sans', 'modern'],
  ];
  for (const t of themes) {
    await pool.query('INSERT INTO themes (name,description,primary_color,secondary_color,accent_color,background_color,text_color,font_heading,font_body,style) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)', t);
  }

  // Seed layouts
  const layouts = [
    ['Title Slide', 'title', 'Full-screen title with subtitle', 1, 1, true, false, false, 2],
    ['Content with Bullets', 'content', 'Title with bullet point content', 1, 2, true, false, false, 3],
    ['Two Column', 'two-column', 'Side-by-side content columns', 2, 1, true, false, false, 4],
    ['Image Focus', 'image-focus', 'Large image with minimal text', 1, 1, true, false, false, 2],
    ['Chart & Data', 'chart', 'Chart with data annotations', 1, 2, false, true, false, 3],
    ['Comparison', 'comparison', 'Side-by-side comparison layout', 2, 2, true, true, false, 6],
    ['Quote', 'quote', 'Featured quote with attribution', 1, 1, true, false, false, 2],
    ['Three Column', 'three-column', 'Three equal content columns', 3, 1, true, false, false, 6],
    ['Metrics Dashboard', 'metrics', 'Key numbers and KPI display', 4, 1, false, true, false, 4],
    ['Timeline', 'timeline', 'Horizontal or vertical timeline', 1, 1, true, false, false, 5],
    ['Team Grid', 'team', 'Team member photos and bios', 3, 2, true, false, false, 6],
    ['Video Embed', 'video', 'Full-screen video with caption', 1, 1, false, false, true, 2],
    ['Section Divider', 'divider', 'Bold section break slide', 1, 1, true, false, false, 1],
    ['Thank You / CTA', 'cta', 'Closing slide with call-to-action', 1, 1, true, false, false, 3],
    ['Blank Canvas', 'blank', 'Empty slide for custom layouts', 1, 1, true, true, true, 0],
  ];
  for (const l of layouts) {
    await pool.query('INSERT INTO slide_layouts (name,layout_type,description,grid_columns,grid_rows,supports_image,supports_chart,supports_video,placeholder_count) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)', l);
  }

  // Seed charts
  const charts = [
    ['Revenue Growth', 'bar', 'Quarterly revenue comparison', 'Q1-Q4 financial data', '{"labels":["Q1","Q2","Q3","Q4"],"data":[1200000,1450000,1680000,2100000]}', 'blue-gradient', 1],
    ['Market Share', 'pie', 'Competitor market share breakdown', 'Industry research data', '{"labels":["Us","CompA","CompB","Others"],"data":[35,25,20,20]}', 'rainbow', 1],
    ['User Growth', 'line', 'Monthly active user trend', 'Product analytics', '{"labels":["Jan","Feb","Mar","Apr","May","Jun"],"data":[1200,1800,2400,3100,4200,5600]}', 'green-gradient', 2],
    ['Feature Adoption', 'horizontal-bar', 'Feature usage by percentage', 'Product metrics', '{"labels":["Search","Chat","Export","Share","API"],"data":[89,76,65,54,42]}', 'purple-gradient', 2],
    ['Customer Satisfaction', 'radar', 'Multi-dimension satisfaction scores', 'NPS survey data', '{"labels":["Support","UX","Speed","Price","Features"],"data":[8.5,9.1,7.8,7.2,8.8]}', 'ocean', 3],
    ['Budget Allocation', 'donut', 'Department budget distribution', 'Finance data', '{"labels":["Engineering","Marketing","Sales","Operations","HR"],"data":[40,25,20,10,5]}', 'warm', 5],
    ['Conversion Funnel', 'funnel', 'Sales conversion stages', 'CRM data', '{"labels":["Visitors","Leads","Qualified","Proposal","Closed"],"data":[10000,2500,800,300,120]}', 'red-gradient', 5],
    ['Regional Sales', 'bar', 'Sales by geographic region', 'Sales database', '{"labels":["North America","Europe","Asia","LATAM"],"data":[4500000,3200000,2800000,1500000]}', 'earth-tones', 5],
    ['Employee Growth', 'area', 'Headcount growth over time', 'HR data', '{"labels":["2020","2021","2022","2023","2024"],"data":[45,78,120,185,250]}', 'teal', 7],
    ['Sprint Velocity', 'line', 'Team sprint velocity trends', 'Jira export', '{"labels":["S1","S2","S3","S4","S5","S6"],"data":[42,38,45,50,48,55]}', 'indigo', 7],
    ['NPS Score', 'gauge', 'Net Promoter Score display', 'Survey data', '{"value":72,"min":0,"max":100,"zones":[{"min":0,"max":30,"color":"red"},{"min":30,"max":70,"color":"yellow"},{"min":70,"max":100,"color":"green"}]}', 'traffic-light', 8],
    ['Website Traffic', 'area', 'Daily website visitor trends', 'Google Analytics', '{"labels":["Mon","Tue","Wed","Thu","Fri","Sat","Sun"],"data":[4500,5200,5800,6100,5400,3200,2800]}', 'blue', 12],
    ['Product Mix', 'treemap', 'Revenue by product category', 'ERP system', '{"labels":["SaaS","Services","Hardware","Training"],"data":[55,25,15,5]}', 'forest', 1],
    ['Customer Churn', 'line', 'Monthly churn rate tracking', 'Subscription data', '{"labels":["Jan","Feb","Mar","Apr","May","Jun"],"data":[4.2,3.8,3.5,3.1,2.8,2.4]}', 'red-to-green', 5],
    ['Response Times', 'bar', 'API response time percentiles', 'APM monitoring', '{"labels":["p50","p75","p90","p95","p99"],"data":[45,120,250,480,950]}', 'tech-blue', 7],
  ];
  for (const c of charts) {
    await pool.query('INSERT INTO chart_configs (name,chart_type,description,data_source,config,color_scheme,presentation_id) VALUES ($1,$2,$3,$4,$5,$6,$7)', c);
  }

  // Seed images
  const images = [
    ['Abstract Blue Waves', 'backgrounds', 'https://images.unsplash.com/photo-abstract-blue', 'Abstract blue wave pattern background', 1920, 1080, '2.4MB', 'unsplash', 'abstract,blue,waves,background'],
    ['Team Collaboration', 'people', 'https://images.unsplash.com/photo-team-collab', 'Diverse team working together in office', 1920, 1280, '3.1MB', 'unsplash', 'team,collaboration,office,diverse'],
    ['City Skyline Night', 'urban', 'https://images.unsplash.com/photo-city-night', 'Modern city skyline at night with lights', 1920, 1080, '2.8MB', 'unsplash', 'city,skyline,night,urban'],
    ['Data Visualization', 'tech', 'https://images.unsplash.com/photo-data-viz', 'Holographic data visualization display', 1920, 1080, '1.9MB', 'unsplash', 'data,visualization,tech,hologram'],
    ['Green Nature Forest', 'nature', 'https://images.unsplash.com/photo-forest', 'Lush green forest with sunlight filtering through', 1920, 1280, '3.5MB', 'unsplash', 'nature,forest,green,sunlight'],
    ['Rocket Launch', 'business', 'https://images.unsplash.com/photo-rocket', 'Rocket launching into space', 1920, 1080, '2.2MB', 'unsplash', 'rocket,launch,startup,growth'],
    ['Handshake Deal', 'business', 'https://images.unsplash.com/photo-handshake', 'Professional business handshake', 1920, 1280, '1.8MB', 'unsplash', 'handshake,business,deal,partnership'],
    ['AI Brain Network', 'tech', 'https://images.unsplash.com/photo-ai-brain', 'Neural network brain illustration', 1920, 1080, '2.0MB', 'unsplash', 'ai,brain,neural,network,tech'],
    ['Mountain Summit', 'nature', 'https://images.unsplash.com/photo-mountain', 'Mountain peak above clouds at sunrise', 1920, 1080, '2.7MB', 'unsplash', 'mountain,summit,sunrise,achievement'],
    ['Coffee Workspace', 'lifestyle', 'https://images.unsplash.com/photo-workspace', 'Laptop and coffee in modern workspace', 1920, 1280, '2.1MB', 'unsplash', 'workspace,coffee,laptop,productive'],
    ['Global Network', 'tech', 'https://images.unsplash.com/photo-global', 'Earth with connected network nodes', 1920, 1080, '1.6MB', 'unsplash', 'global,network,connected,earth'],
    ['Geometric Patterns', 'backgrounds', 'https://images.unsplash.com/photo-geometric', 'Colorful geometric pattern background', 1920, 1080, '1.4MB', 'unsplash', 'geometric,pattern,colorful,abstract'],
    ['Light Bulb Innovation', 'business', 'https://images.unsplash.com/photo-lightbulb', 'Glowing light bulb representing innovation', 1920, 1280, '1.7MB', 'unsplash', 'lightbulb,innovation,idea,creative'],
    ['Dashboard Analytics', 'tech', 'https://images.unsplash.com/photo-dashboard', 'Analytics dashboard on screen', 1920, 1080, '2.3MB', 'unsplash', 'dashboard,analytics,metrics,data'],
    ['Sunset Horizon', 'backgrounds', 'https://images.unsplash.com/photo-sunset', 'Beautiful sunset over ocean horizon', 1920, 1080, '2.6MB', 'unsplash', 'sunset,ocean,horizon,peaceful'],
  ];
  for (const img of images) {
    await pool.query('INSERT INTO image_library (name,category,url,alt_text,width,height,file_size,license,tags) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)', img);
  }

  // Seed icon sets
  const iconSets = [
    ['Business Icons', 250, 'outline', 'business', 'Heroicons', 'MIT', 'svg', true],
    ['Technology Icons', 180, 'filled', 'technology', 'Phosphor Icons', 'MIT', 'svg', true],
    ['Social Media', 85, 'colored', 'social', 'Simple Icons', 'CC0', 'svg', false],
    ['Finance & Charts', 120, 'outline', 'finance', 'Feather Icons', 'MIT', 'svg', true],
    ['Education', 95, 'filled', 'education', 'Tabler Icons', 'MIT', 'svg', true],
    ['Healthcare', 110, 'outline', 'medical', 'Remix Icons', 'Apache 2.0', 'svg', true],
    ['Food & Dining', 75, 'filled', 'food', 'Iconoir', 'MIT', 'svg', true],
    ['Travel & Maps', 130, 'outline', 'travel', 'Lucide Icons', 'ISC', 'svg', true],
    ['Weather', 60, 'animated', 'weather', 'Weather Icons', 'MIT', 'svg', false],
    ['Emoji Pack', 200, 'colored', 'emoji', 'Twemoji', 'CC-BY 4.0', 'svg', false],
    ['Arrow Collection', 45, 'outline', 'navigation', 'Heroicons', 'MIT', 'svg', true],
    ['Device Icons', 90, 'filled', 'devices', 'Material Icons', 'Apache 2.0', 'svg', true],
    ['Communication', 70, 'outline', 'communication', 'Ionicons', 'MIT', 'svg', true],
    ['Security Icons', 55, 'filled', 'security', 'Phosphor Icons', 'MIT', 'svg', true],
    ['Flags of World', 250, 'colored', 'flags', 'FlagKit', 'MIT', 'png', false],
  ];
  for (const ic of iconSets) {
    await pool.query('INSERT INTO icon_sets (name,icon_count,style,category,source,license,format,color_customizable) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)', ic);
  }

  // Seed animations
  const animations = [
    ['Fade In', 'entrance', 'Smooth opacity fade entrance', 500, 'ease-in', 'on-click', 'none', 'subtle'],
    ['Slide Left', 'entrance', 'Slide in from the left side', 600, 'ease-out', 'on-click', 'left', 'medium'],
    ['Slide Right', 'entrance', 'Slide in from the right side', 600, 'ease-out', 'on-click', 'right', 'medium'],
    ['Slide Up', 'entrance', 'Slide up from below', 500, 'ease-out', 'on-click', 'up', 'medium'],
    ['Zoom In', 'entrance', 'Scale from small to full size', 400, 'ease-in-out', 'on-click', 'center', 'dramatic'],
    ['Bounce', 'emphasis', 'Bouncing attention-grabbing effect', 800, 'cubic-bezier(0.68,-0.55,0.27,1.55)', 'on-hover', 'up', 'playful'],
    ['Pulse', 'emphasis', 'Gentle pulsating glow effect', 1000, 'ease-in-out', 'continuous', 'none', 'subtle'],
    ['Spin', 'emphasis', 'Full 360-degree rotation', 600, 'linear', 'on-click', 'clockwise', 'dramatic'],
    ['Fade Out', 'exit', 'Smooth opacity fade exit', 500, 'ease-out', 'on-click', 'none', 'subtle'],
    ['Slide Out Left', 'exit', 'Slide out to the left', 600, 'ease-in', 'on-click', 'left', 'medium'],
    ['Flip', 'entrance', 'Card flip reveal animation', 700, 'ease-in-out', 'on-click', 'horizontal', 'dramatic'],
    ['Typewriter', 'entrance', 'Character-by-character text reveal', 2000, 'linear', 'auto', 'left', 'medium'],
    ['Morph', 'transition', 'Shape morphing between elements', 800, 'ease-in-out', 'on-click', 'none', 'medium'],
    ['Parallax', 'scroll', 'Depth-based parallax movement', 0, 'linear', 'on-scroll', 'vertical', 'subtle'],
    ['Confetti', 'celebration', 'Festive confetti explosion', 3000, 'ease-out', 'on-click', 'all', 'playful'],
  ];
  for (const a of animations) {
    await pool.query('INSERT INTO animations (name,type,description,duration_ms,easing,trigger_event,direction,intensity) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)', a);
  }

  // Seed speaker notes
  const speakerNotes = [
    [1, 'Welcome Opening', 'Good morning everyone. Thank you for joining today quarterly review. We have exciting results to share.', 1.5, 'Set positive tone, make eye contact', 'Ask: How is everyone feeling about Q4?', 'Now lets look at the numbers...', 'ready'],
    [2, 'Revenue Deep Dive', 'Our revenue this quarter reached $2.1M, representing an 18% year-over-year growth. Let me break this down by segment.', 3.0, 'Revenue growth, segment breakdown, key drivers', 'Pause for effect after stating the 18% figure', 'Moving on to customer metrics...', 'ready'],
    [3, 'Achievements Highlight', 'I want to take a moment to celebrate what our team has accomplished. Three new products, five new markets.', 2.0, 'Product launches, market expansion, churn reduction', 'Ask team leads to stand and be recognized', 'Now lets look at challenges...', 'draft'],
    [4, 'Product Introduction', 'Today marks a milestone for our company. We are unveiling our AI Assistant - the result of 18 months of development.', 2.5, 'Product vision, team effort, market timing', 'Build suspense before the reveal', 'Let me show you how it works...', 'ready'],
    [5, 'Problem Statement', 'How many of you spent more than 3 hours yesterday on tasks that could be automated? You are not alone.', 2.0, 'Pain point statistics, relatable examples', 'Raise your hand to encourage audience participation', 'This is exactly what we built...', 'ready'],
    [6, 'Solution Demo', 'Let me walk you through a live demo. Watch how our AI handles this complex workflow in under 30 seconds.', 4.0, 'Live demo flow, feature highlights, integration points', 'Have backup video ready in case of demo issues', 'Lets talk about the market opportunity...', 'ready'],
    [7, 'Marketing Vision', 'Our 2025 marketing strategy centers on three pillars: brand awareness, demand generation, and customer advocacy.', 2.0, 'Three strategic pillars, budget allocation', 'Reference last years successes', 'Lets dive into each pillar...', 'draft'],
    [8, 'Target Audience', 'We have identified three key segments. Enterprise represents our largest revenue opportunity at 60% of TAM.', 3.0, 'Segment sizes, buyer personas, channel strategy', 'Use the polling feature for engagement', 'Now lets look at our campaign plan...', 'draft'],
    [9, 'Culture Introduction', 'At our core, we believe in three values. Innovation - we encourage bold thinking. Integrity - we do whats right.', 2.5, 'Core values, cultural examples', 'Share a personal story about each value', 'Let me introduce your team leads...', 'ready'],
    [10, 'Pipeline Overview', 'Our current pipeline stands at $12.5 million across 47 active opportunities. Let me highlight the key deals.', 3.0, 'Pipeline value, deal stages, win probability', 'Reference specific deal names if audience is internal', 'Lets look at the forecast...', 'ready'],
    [11, 'Market Opportunity', 'The market we are addressing is valued at $50 billion today and is projected to reach $135 billion by 2028.', 2.0, 'TAM/SAM/SOM, growth drivers, timing', 'Cite the research source for credibility', 'Heres our approach to capturing this market...', 'ready'],
    [12, 'Traction Metrics', 'In just 18 months since launch, we have achieved $2M in ARR with a 150% net revenue retention rate.', 2.0, 'ARR, NRR, user count, enterprise wins', 'Let each metric sink in before moving to next', 'This brings me to our ask...', 'ready'],
    [13, 'Tech Roadmap Overview', 'Our technical vision for 2025 is ambitious but achievable. We are investing in three key infrastructure areas.', 3.0, 'Infrastructure pillars, tech debt reduction, new capabilities', 'Acknowledge the engineering team effort', 'Lets look at the Q1 priorities...', 'draft'],
    [14, 'Customer Story Opening', 'I want to share the story of Acme Corp. When they came to us, they were spending 40 hours per week on manual processes.', 2.5, 'Customer pain point, transformation journey, results', 'Use the customers exact words when quoting', 'The results speak for themselves...', 'ready'],
    [15, 'Budget Summary', 'Our total proposed budget for 2025 is $4.8M, representing a 15% increase that we project will deliver 3x ROI.', 2.0, 'Total budget, allocation breakdown, ROI projection', 'Have detailed breakdown ready for questions', 'I am happy to take questions on specific line items...', 'draft'],
  ];
  for (const sn of speakerNotes) {
    await pool.query('INSERT INTO speaker_notes (slide_id,title,content,duration_minutes,key_points,audience_cue,transition_note,status) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)', sn);
  }

  // Seed exports
  const exports = [
    [1, 'pptx', 'Q4_2024_Business_Review.pptx', '4.2MB', 'completed', '{"includeNotes":true,"quality":"high"}', 12],
    [1, 'pdf', 'Q4_2024_Business_Review.pdf', '2.8MB', 'completed', '{"includeNotes":false,"quality":"high"}', 8],
    [2, 'pptx', 'AI_Assistant_Launch.pptx', '6.1MB', 'completed', '{"includeNotes":true,"quality":"high","includeAnimations":true}', 5],
    [3, 'pdf', 'Marketing_Strategy_2025.pdf', '3.5MB', 'completed', '{"includeNotes":true,"quality":"medium"}', 3],
    [4, 'pptx', 'Team_Onboarding.pptx', '8.2MB', 'completed', '{"includeNotes":true,"quality":"high","includeVideos":true}', 22],
    [5, 'pdf', 'Sales_Pipeline_Q4.pdf', '1.9MB', 'completed', '{"includeNotes":false,"quality":"high"}', 7],
    [6, 'pptx', 'Investor_Pitch_Deck.pptx', '5.5MB', 'completed', '{"includeNotes":true,"quality":"high"}', 15],
    [6, 'pdf', 'Investor_Pitch_Deck.pdf', '3.2MB', 'completed', '{"includeNotes":false,"quality":"high"}', 18],
    [7, 'html', 'Tech_Roadmap_2025.html', '1.2MB', 'completed', '{"responsive":true,"includeAnimations":true}', 4],
    [8, 'pptx', 'Customer_Success_Stories.pptx', '7.8MB', 'completed', '{"includeNotes":true,"includeVideos":true}', 9],
    [9, 'pdf', 'Company_Retreat_Agenda.pdf', '1.5MB', 'completed', '{"quality":"medium"}', 45],
    [10, 'pptx', 'Data_Science_Workshop.pptx', '12.4MB', 'completed', '{"includeNotes":true,"includeCode":true}', 31],
    [11, 'pdf', 'Brand_Guidelines.pdf', '5.1MB', 'completed', '{"quality":"high","includeSpecs":true}', 56],
    [12, 'png', 'Competitive_Analysis_Slides.png', '15.2MB', 'completed', '{"format":"individual","quality":"high"}', 2],
    [14, 'pptx', 'UX_Research_Findings.pptx', '4.8MB', 'completed', '{"includeNotes":true,"quality":"high"}', 6],
  ];
  for (const e of exports) {
    await pool.query('INSERT INTO export_history (presentation_id,format,file_name,file_size,status,settings,download_count) VALUES ($1,$2,$3,$4,$5,$6,$7)', e);
  }

  // Seed brand kits
  const brandKits = [
    ['Acme Corp', 'Acme Corporation', '["#1e40af","#3b82f6","#dbeafe","#1f2937","#ffffff"]', '["Inter:400,600,700","Roboto:400,500"]', '["acme-logo-dark.svg","acme-logo-light.svg","acme-icon.svg"]', 'Use primary blue for headings. Minimum logo clearance: 24px.', 'active'],
    ['TechStart', 'TechStart Inc', '["#7c3aed","#a78bfa","#ede9fe","#1f2937","#ffffff"]', '["Poppins:400,600,700","Open Sans:400"]', '["techstart-full.svg","techstart-mark.svg"]', 'Purple is our signature color. Never stretch the logo.', 'active'],
    ['GreenLeaf', 'GreenLeaf Bio', '["#059669","#10b981","#d1fae5","#064e3b","#ffffff"]', '["Merriweather:400,700","Nunito:400,600"]', '["greenleaf-logo.svg","greenleaf-icon.png"]', 'Use green sparingly. Pair with warm neutrals.', 'active'],
    ['FireBrand', 'FireBrand Media', '["#ef4444","#f97316","#fef2f2","#1f2937","#ffffff"]', '["Montserrat:400,700,900","DM Sans:400"]', '["firebrand-logo.svg"]', 'Bold and energetic. Use red for CTAs only.', 'active'],
    ['SkyBlue Health', 'SkyBlue Healthcare', '["#0ea5e9","#38bdf8","#e0f2fe","#0c4a6e","#ffffff"]', '["Source Serif Pro:400,600","Source Sans Pro:400"]', '["skyblue-logo.svg","skyblue-mark.svg"]', 'Professional healthcare feel. Avoid playful elements.', 'active'],
    ['NightOwl', 'NightOwl Studios', '["#818cf8","#6366f1","#312e81","#e0e7ff","#111827"]', '["JetBrains Mono:400,700","Inter:400"]', '["nightowl-logo-dark.svg","nightowl-logo-light.svg"]', 'Dark theme preferred. Neon accents for highlights.', 'active'],
    ['Golden Gate Finance', 'GGF Inc', '["#d97706","#f59e0b","#fef3c7","#1f2937","#ffffff"]', '["Georgia:400,700","Arial:400"]', '["ggf-logo.svg","ggf-seal.png"]', 'Conservative and trustworthy. Gold accents for premium feel.', 'active'],
    ['Coral Creative', 'Coral Creative Agency', '["#ec4899","#f472b6","#fce7f3","#1f2937","#ffffff"]', '["Playfair Display:400,700","Quicksand:400,500"]', '["coral-wordmark.svg"]', 'Creative and feminine. Use pink as primary accent.', 'active'],
    ['DataForge', 'DataForge Analytics', '["#06b6d4","#22d3ee","#cffafe","#164e63","#ffffff"]', '["IBM Plex Sans:400,600","IBM Plex Mono:400"]', '["dataforge-logo.svg"]', 'Technical and precise. Use monospace for data labels.', 'active'],
    ['Summit Consulting', 'Summit Group', '["#374151","#6b7280","#f3f4f6","#111827","#ffffff"]', '["Helvetica Neue:400,500,700"]', '["summit-logo.svg","summit-icon.svg"]', 'Minimal and authoritative. Grayscale with blue accent.', 'active'],
    ['Bloom Education', 'Bloom Learning', '["#8b5cf6","#c4b5fd","#ede9fe","#4c1d95","#ffffff"]', '["Quicksand:400,600,700","Nunito:400"]', '["bloom-logo.svg","bloom-mascot.png"]', 'Friendly and approachable. OK to use illustrations.', 'active'],
    ['Velocity Sports', 'Velocity Athletics', '["#ef4444","#1f2937","#fef2f2","#000000","#ffffff"]', '["Montserrat:700,900","DM Sans:400,500"]', '["velocity-logo.svg"]', 'Bold and dynamic. Use diagonal elements and motion.', 'active'],
    ['Harmony Foods', 'Harmony Organic Foods', '["#92400e","#d97706","#fffbeb","#451a03","#ffffff"]', '["Libre Baskerville:400,700","Karla:400"]', '["harmony-logo.svg","harmony-badge.png"]', 'Warm and organic. Earth tones only. No neon colors.', 'active'],
    ['CloudPeak', 'CloudPeak Technologies', '["#2563eb","#60a5fa","#dbeafe","#1e3a8a","#ffffff"]', '["DM Sans:400,500,700"]', '["cloudpeak-logo.svg","cloudpeak-icon.svg"]', 'Cloud-inspired. Use gradients for modern tech feel.', 'active'],
    ['Zen Wellness', 'Zen Wellness Co', '["#059669","#fbbf24","#f0fdf4","#064e3b","#ffffff"]', '["Lora:400,700","Open Sans:400,600"]', '["zen-logo.svg"]', 'Calm and serene. Lots of white space. No harsh colors.', 'active'],
  ];
  for (const b of brandKits) {
    await pool.query('INSERT INTO brand_kits (name,company,colors,fonts,logos,guidelines,status) VALUES ($1,$2,$3,$4,$5,$6,$7)', b);
  }

  // Seed collaborators
  const collaborators = [
    [1, 'sarah@company.com', 'editor', 'edit,comment', 'active', 'admin@slidedeck.ai'],
    [1, 'mike@company.com', 'viewer', 'view', 'active', 'admin@slidedeck.ai'],
    [2, 'product@company.com', 'editor', 'edit,comment,share', 'active', 'admin@slidedeck.ai'],
    [2, 'design@company.com', 'editor', 'edit,comment', 'active', 'admin@slidedeck.ai'],
    [2, 'ceo@company.com', 'reviewer', 'view,comment', 'active', 'admin@slidedeck.ai'],
    [3, 'marketing@company.com', 'owner', 'full', 'active', 'admin@slidedeck.ai'],
    [3, 'content@company.com', 'editor', 'edit,comment', 'active', 'admin@slidedeck.ai'],
    [4, 'hr@company.com', 'owner', 'full', 'active', 'admin@slidedeck.ai'],
    [5, 'sales-lead@company.com', 'editor', 'edit,comment', 'active', 'admin@slidedeck.ai'],
    [5, 'vp-sales@company.com', 'reviewer', 'view,comment', 'active', 'admin@slidedeck.ai'],
    [6, 'cfo@company.com', 'reviewer', 'view,comment', 'active', 'admin@slidedeck.ai'],
    [6, 'legal@company.com', 'viewer', 'view', 'active', 'admin@slidedeck.ai'],
    [7, 'tech-lead@company.com', 'editor', 'edit,comment', 'active', 'admin@slidedeck.ai'],
    [8, 'success@company.com', 'editor', 'edit,comment', 'active', 'admin@slidedeck.ai'],
    [10, 'data-team@company.com', 'editor', 'edit,comment,share', 'active', 'admin@slidedeck.ai'],
  ];
  for (const c of collaborators) {
    await pool.query('INSERT INTO collaborators (presentation_id,user_email,role,permissions,status,invited_by) VALUES ($1,$2,$3,$4,$5,$6)', c);
  }

  // Seed analytics
  const analytics = [
    [1, 'presentation_view', 245, 142, 320, 78.50, '{"desktop":180,"mobile":65,"tablet":0}'],
    [1, 'slide_interaction', 1840, 142, 45, 82.30, '{"most_viewed_slide":2,"avg_slides_viewed":9}'],
    [2, 'presentation_view', 892, 534, 480, 85.20, '{"desktop":650,"mobile":180,"tablet":62}'],
    [2, 'share_event', 56, 56, 0, 0, '{"email":32,"link":18,"embed":6}'],
    [3, 'presentation_view', 67, 45, 240, 62.10, '{"desktop":52,"mobile":15,"tablet":0}'],
    [4, 'presentation_view', 350, 89, 900, 91.40, '{"desktop":280,"mobile":70,"tablet":0}'],
    [5, 'presentation_view', 123, 34, 180, 71.80, '{"desktop":110,"mobile":13,"tablet":0}'],
    [6, 'presentation_view', 1245, 876, 360, 88.90, '{"desktop":900,"mobile":200,"tablet":145}'],
    [6, 'investor_engagement', 45, 45, 420, 92.30, '{"questions_asked":12,"follow_ups":8}'],
    [7, 'presentation_view', 89, 67, 300, 75.40, '{"desktop":78,"mobile":11,"tablet":0}'],
    [8, 'presentation_view', 456, 289, 280, 80.60, '{"desktop":350,"mobile":80,"tablet":26}'],
    [9, 'presentation_view', 534, 178, 120, 95.20, '{"desktop":300,"mobile":200,"tablet":34}'],
    [11, 'presentation_view', 234, 156, 200, 88.10, '{"desktop":180,"mobile":54,"tablet":0}'],
    [12, 'presentation_view', 178, 98, 350, 69.50, '{"desktop":150,"mobile":28,"tablet":0}'],
    [14, 'presentation_view', 312, 201, 260, 83.70, '{"desktop":250,"mobile":62,"tablet":0}'],
  ];
  for (const a of analytics) {
    await pool.query('INSERT INTO presentation_analytics (presentation_id,event_type,views,unique_viewers,avg_time_seconds,completion_rate,viewer_data) VALUES ($1,$2,$3,$4,$5,$6,$7)', a);
  }

  // Seed settings
  const settings = [
    ['default_theme', 'modern', 'appearance', 'Default theme for new presentations'],
    ['default_layout', 'content', 'appearance', 'Default layout for new slides'],
    ['auto_save', 'true', 'general', 'Enable auto-save every 30 seconds'],
    ['auto_save_interval', '30', 'general', 'Auto-save interval in seconds'],
    ['export_quality', 'high', 'export', 'Default export quality setting'],
    ['default_font', 'Inter', 'appearance', 'Default font family'],
    ['font_size_title', '36', 'appearance', 'Default title font size in px'],
    ['font_size_body', '18', 'appearance', 'Default body font size in px'],
    ['slide_ratio', '16:9', 'presentation', 'Default slide aspect ratio'],
    ['max_bullets', '5', 'content', 'Maximum recommended bullet points per slide'],
    ['enable_animations', 'true', 'presentation', 'Enable slide animations by default'],
    ['enable_speaker_view', 'true', 'presentation', 'Enable speaker notes view'],
    ['collaboration_mode', 'real-time', 'collaboration', 'Default collaboration mode'],
    ['ai_model', 'anthropic/claude-haiku-4.5', 'ai', 'AI model for content generation'],
    ['max_slides_per_deck', '50', 'limits', 'Maximum slides per presentation'],
  ];
  for (const s of settings) {
    await pool.query('INSERT INTO settings (key,value,category,description) VALUES ($1,$2,$3,$4)', s);
  }

  console.log('Seeding complete!');
  process.exit(0);
}

seed().catch(err => { console.error('Seed error:', err); process.exit(1); });
