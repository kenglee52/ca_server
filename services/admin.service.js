const bcrypt = require("bcrypt");
const prisma = require("../config/prisma");

const registerAdmin = async (data) => {
  const { username, password, fullName, email } = data;

  const existingUser = await prisma.user.findFirst({
    where: {
      OR: [
        { username },
        { email }
      ]
    }
  });

  if (existingUser) {
    throw new Error("Username or Email already exists");
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: {
      username,
      fullName,
      email,
      passwordHash,
      role: "ADMIN"
    },
    select: {
      id: true,
      username: true,
      fullName: true,
      email: true,
      role: true,
      createdAt: true
    }
  });

  return user;
};

module.exports = {
  registerAdmin
};