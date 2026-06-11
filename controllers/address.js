const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

exports.getProvince = async (req, res) => {
  try {
    const provinces = await prisma.province.findMany({
      orderBy: { name: 'asc' },
      include: {
        districts: { orderBy: { name: 'asc' } }, // ให้เมืองเรียงด้วย
      },
    });

    return res.status(200).json({
      success: true,
      message: 'ດຶງຂໍ້ມູນແຂວງສຳເລັດ',
      data: provinces,
    });
  } catch (err) {
    console.error('GetProvinces Error:', err);
    return res.status(500).json({
      success: false,
      message: 'ເກີດຂໍ້ຜິດພາດໃນລະບົບ',
    });
  }
};

exports.getDistrict = async (req, res) => {
  try {
    const { provinceId } = req.query;

    const where =
      provinceId !== undefined
        ? { provinceId: Number(provinceId) }
        : undefined;

    if (provinceId !== undefined && Number.isNaN(where.provinceId)) {
      return res.status(400).json({
        success: false,
        message: 'provinceId ບໍ່ຖືກຕ້ອງ (must be number)',
      });
    }

    const districts = await prisma.district.findMany({
      where,
      orderBy: { name: 'asc' },
    });

    return res.status(200).json({
      success: true,
      message: 'ດຶງຂໍ້ມູນເມືອງສຳເລັດ',
      data: districts,
    });
  } catch (err) {
    console.error('GetDistricts Error:', err);
    return res.status(500).json({
      success: false,
      message: 'ເກີດຂໍ້ຜິດພາດໃນລະບົບ',
    });
  }
};
