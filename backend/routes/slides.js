module.exports = require('./crud')('slides', { orderBy: 'slide_number, created_at DESC', jsonFields: ['content'] });
