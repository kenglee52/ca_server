const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

exports.createSector = async (req, res) => {
  const userId = req.user.id;

  try {
    let {
      number,
      sector,
      subSector,
      smfV1,
      smfV2,
      smfV3,
      bolEconomic,
      bolCode,
    } = req.body;

    // Convert strings to numbers
    number   = Number(number);
    smfV1    = Number(smfV1);
    smfV2    = Number(smfV2);
    smfV3    = Number(smfV3);

    // Required field validation
    if (isNaN(number) || number < 1) {
      return res.status(400).json({
        success: false,
        message: "Number must be a positive integer (≥ 1)",
      });
    }

    if (!sector?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Sector name is required",
      });
    }

    if (isNaN(smfV1) || smfV1 < 0) {
      return res.status(400).json({
        success: false,
        message: "SMF v1 must be a number ≥ 0",
      });
    }

    if (isNaN(smfV2) || smfV2 < 0) {
      return res.status(400).json({
        success: false,
        message: "SMF v2 must be a number ≥ 0",
      });
    }

    if (isNaN(smfV3) || smfV3 < 0) {
      return res.status(400).json({
        success: false,
        message: "SMF v3 must be a number ≥ 0",
      });
    }

    if (!bolCode?.trim()) {
      return res.status(400).json({
        success: false,
        message: "BOL Code is required",
      });
    }

    // Create new sector with converted values
    const newSector = await prisma.sector.create({
      data: {
        number,
        sector: sector.trim(),
        subSector: subSector ? subSector.trim() : null,
        smfV1,
        smfV2,
        smfV3,
        bolEconomic: bolEconomic ? bolEconomic.trim() : null,
        bolCode: bolCode.trim(),
      },
    });

    // Audit Log
    await prisma.auditLog.create({
      data: {
        userId,
        action: "CREATE",
        entityType: "Sector",
        entityId: newSector.id,
        newValue: newSector,
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
        description: `ADMIN created sector: ${sector}`,
      },
    });

    return res.status(201).json({
      success: true,
      data: newSector,
    });
  } catch (err) {
    console.error("CreateSector Error:", err);
    return res.status(500).json({
      success: false,
      message: "An error occurred on the server",
    });
  }
};

/**
 * UPDATE Sector
 * - Convert string numbers to actual numbers
 * - Validate required fields and number ranges
 */
exports.updateSector = async (req, res) => {
  const userId = req.user.id;
  const sectorId = Number(req.params.id);

  try {
    const oldSector = await prisma.sector.findUnique({
      where: { id: sectorId },
    });

    if (!oldSector) {
      return res.status(404).json({
        success: false,
        message: "Sector not found",
      });
    }

    let {
      number,
      sector,
      subSector,
      smfV1,
      smfV2,
      smfV3,
      bolEconomic,
      bolCode,
      ...rest // any other fields
    } = req.body;

    // Convert strings to numbers if provided
    if (number !== undefined)    number = Number(number);
    if (smfV1 !== undefined)     smfV1  = Number(smfV1);
    if (smfV2 !== undefined)     smfV2  = Number(smfV2);
    if (smfV3 !== undefined)     smfV3  = Number(smfV3);

    // Validation (only if the field is being updated)
    if (number !== undefined && (isNaN(number) || number < 1)) {
      return res.status(400).json({
        success: false,
        message: "Number must be a positive integer (≥ 1)",
      });
    }

    if (sector !== undefined && !sector?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Sector name cannot be empty",
      });
    }

    if (smfV1 !== undefined && (isNaN(smfV1) || smfV1 < 0)) {
      return res.status(400).json({
        success: false,
        message: "SMF v1 must be a number ≥ 0",
      });
    }

    if (smfV2 !== undefined && (isNaN(smfV2) || smfV2 < 0)) {
      return res.status(400).json({
        success: false,
        message: "SMF v2 must be a number ≥ 0",
      });
    }

    if (smfV3 !== undefined && (isNaN(smfV3) || smfV3 < 0)) {
      return res.status(400).json({
        success: false,
        message: "SMF v3 must be a number ≥ 0",
      });
    }

    if (bolCode !== undefined && !bolCode?.trim()) {
      return res.status(400).json({
        success: false,
        message: "BOL Code cannot be empty",
      });
    }

    // Update with new values (only update fields that are provided)
    const updatedSector = await prisma.sector.update({
      where: { id: sectorId },
      data: {
        ...(number !== undefined && { number }),
        ...(sector !== undefined && { sector: sector.trim() }),
        ...(subSector !== undefined && { subSector: subSector.trim() || null }),
        ...(smfV1 !== undefined && { smfV1 }),
        ...(smfV2 !== undefined && { smfV2 }),
        ...(smfV3 !== undefined && { smfV3 }),
        ...(bolEconomic !== undefined && { bolEconomic: bolEconomic.trim() || null }),
        ...(bolCode !== undefined && { bolCode: bolCode.trim() }),
        ...rest, // any other fields if needed
      },
    });

    // Audit Log
    await prisma.auditLog.create({
      data: {
        userId,
        action: "UPDATE",
        entityType: "Sector",
        entityId: sectorId,
        oldValue: oldSector,
        newValue: updatedSector,
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
        description: `ADMIN updated sector: ${oldSector.sector}`,
      },
    });

    return res.json({
      success: true,
      data: updatedSector,
    });
  } catch (err) {
    console.error("UpdateSector Error:", err);
    return res.status(500).json({
      success: false,
      message: "An error occurred on the server",
    });
  }
};

exports.getSectorById = async (req, res) => {
  try {
    const sectorId = Number(req.params.id);
    const role = req.user?.role?.toUpperCase();

    const sector = await prisma.sector.findFirst({
      where: {
        id: sectorId,
        ...(role !== "ADMIN" && { isDeleted: false }),
      },
    });

    if (!sector) {
      return res.status(404).json({
        success: false,
        message: "ບໍ່ພົບ Sector",
      });
    }

    return res.json({ success: true, data: sector });
  } catch (err) {
    console.error("GetSectorById Error:", err);
    return res.status(500).json({
      success: false,
      message: "ເກີດຂໍ້ຜິດພາດໃນລະບົບ",
    });
  }
};



exports.getAllSectors = async (req, res) => {
  try {
    const role = req.user?.role;

    const where = role === "ADMIN"
      ? {} // เอาหมด
      : { isDeleted: false };

    const sectors = await prisma.sector.findMany({
      where,
      orderBy: [{ number: "asc" }, { sector: "asc" }],
    });

    return res.json({ success: true, data: sectors });
  } catch (err) {
    console.error("GetAllSectors Error:", err);
    return res.status(500).json({
      success: false,
      message: "ເກີດຂໍ້ຜິດພາດໃນລະບົບ",
    });
  }
};


exports.deleteSector = async (req, res) => {
  const userId = req.user.id;
  const sectorId = Number(req.params.id);

  try {
    const oldSector = await prisma.sector.findUnique({
      where: { id: sectorId },
    });

    if (!oldSector) {
      return res.status(404).json({
        success: false,
        message: "ບໍ່ພົບ Sector",
      });
    }

    // ✅ ถ้าลบไปแล้ว
    if (oldSector.isDeleted) {
      return res.status(400).json({
        success: false,
        message: "Sector ຖືກລຶບແລ້ວ",
      });
    }

    // ✅ Soft delete
    const deletedSector = await prisma.sector.update({
      where: { id: sectorId },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
      },
    });

    // ✅ Audit Log
    await prisma.auditLog.create({
      data: {
        userId,
        action: "DELETE",
        entityType: "Sector",
        entityId: sectorId,
        oldValue: oldSector,
        newValue: deletedSector,
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
        description: `ADMIN deleted sector ${oldSector.sector}`,
      },
    });

    return res.json({
      success: true,
      message: "Deleted sector successfully",
      data: deletedSector,
    });
  } catch (err) {
    console.error("DeleteSector Error:", err);
    return res.status(500).json({
      success: false,
      message: "ເກີດຂໍ້ຜິດພາດໃນລະບົບ",
    });
  }
};
