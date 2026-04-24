module.exports = require('./crud')('slides', { orderBy: 'slide_order, created_at DESC', jsonFields: ['content', 'layout_config'] });
