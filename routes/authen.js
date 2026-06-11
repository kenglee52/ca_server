// routes/authen.js
const express = require('express');
const router = express.Router();

const {login,currentUser } = require('../controllers/authen');
const { authCheck ,verifyToken ,} = require('../middlewares/authCheck');

router.post('/login', login);
router.post('/current-user', authCheck, currentUser);
router.get('/verify-token', authCheck, verifyToken);
module.exports = router;
