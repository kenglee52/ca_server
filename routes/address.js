const express = require('express');
const router = express.Router();

const { getDistrict, getProvince } = require('../controllers/address');

router.get('/province', getProvince);
router.get('/district', getDistrict);

module.exports = router;
