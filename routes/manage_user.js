// routes/manage_user.js
const express = require('express');
const router = express.Router();

const {  createUser,
  updateUser,
  deleteUser,
  getAllUsers,
  getUserById, } = require('../controllers/manage_user');
const { authCheck ,adminCheck } = require('../middlewares/authCheck');
const { uploadSignature } = require('../middlewares/upload_signature');

router.post('/manage_user',authCheck, adminCheck, uploadSignature, createUser);
router.get('/manage_user',authCheck, adminCheck, getAllUsers);
router.get('/manage_user/:id', authCheck, adminCheck, getUserById);
router.put('/manage_user/:id', authCheck, adminCheck, uploadSignature, updateUser);
router.delete('/manage_user/:id', authCheck, adminCheck, deleteUser);      

module.exports = router;
