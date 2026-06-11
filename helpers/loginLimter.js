const loginAttempts = new Map();

function getLockTime(level) {
  switch (level) {
    case 1:
      return 1 * 60 * 1000; // 1 ນາທີ
    case 2:
      return 3 * 60 * 1000; // 3 ນາທີ
    case 3:
      return 10 * 60 * 1000; // 10 ນາທີ
    default:
      return 30 * 60 * 1000; // 30 ນາທີ
  }
}

function checkLoginLock(username) {
  const userData = loginAttempts.get(username);

  if (!userData) return null;

  if (
    userData.lockUntil &&
    userData.lockUntil > Date.now()
  ) {
    return {
      locked: true,
      remainingSeconds: Math.ceil(
        (userData.lockUntil - Date.now()) / 1000
      ),
    };
  }

  return null;
}

function recordFailedLogin(username) {
  let userData = loginAttempts.get(username);

  if (!userData) {
    userData = {
      failedCount: 0,
      lockLevel: 0,
      lockUntil: null,
    };
  }

  userData.failedCount++;

  if (userData.failedCount >= 5) {
    userData.lockLevel++;

    const lockTime = getLockTime(userData.lockLevel);

    userData.lockUntil = Date.now() + lockTime;
    userData.failedCount = 0;
  }

  loginAttempts.set(username, userData);
}

function clearLoginAttempts(username) {
  loginAttempts.delete(username);
}

module.exports = {
  checkLoginLock,
  recordFailedLogin,
  clearLoginAttempts,
};