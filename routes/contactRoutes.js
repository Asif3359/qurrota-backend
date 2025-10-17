var express = require('express');
var router = express.Router();
const { sendContactMessage } = require('../controllers/contactController');

// POST /api/contact
router.post('/', sendContactMessage);

module.exports = router;


