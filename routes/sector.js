const express = require("express");
const router = express.Router();

const {
  createSector,
  updateSector,
  getSectorById,
  getAllSectors,
  deleteSector
} = require("../controllers/sector");

const { authCheck, adminCheck } = require("../middlewares/authCheck");


router.post("/sector", authCheck, adminCheck, createSector);
router.put("/sector/:id", authCheck, adminCheck, updateSector);
router.get("/sector/:id", authCheck, getSectorById);
router.get("/sectors", authCheck, getAllSectors);

router.delete("/sector/:id", authCheck, adminCheck, deleteSector);
module.exports = router;
