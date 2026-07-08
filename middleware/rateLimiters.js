const rateLimit = require('express-rate-limit');

const WRITE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

function createIpLimiter({ windowMs, limit, message, skipSuccessfulRequests = false, skip }) {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests,
    skip,
    message: {
      message: message ?? 'Muitas tentativas. Tente novamente mais tarde.',
    },
  });
}

const loginLimiter = createIpLimiter({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  skipSuccessfulRequests: true,
});

const signupLimiter = createIpLimiter({
  windowMs: 60 * 60 * 1000,
  limit: 5,
});

const inviteResponseLimiter = createIpLimiter({
  windowMs: 15 * 60 * 1000,
  limit: 20,
});

const workspaceCreateLimiter = createIpLimiter({
  windowMs: 60 * 60 * 1000,
  limit: 10,
});

const workspaceWriteLimiter = createIpLimiter({
  windowMs: 60 * 1000,
  limit: 120,
  skip: (req) => !WRITE_METHODS.has(req.method),
});

module.exports = {
  loginLimiter,
  signupLimiter,
  inviteResponseLimiter,
  workspaceCreateLimiter,
  workspaceWriteLimiter,
};
