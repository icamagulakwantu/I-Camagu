import jwt from 'jsonwebtoken';

const ACCESS_TOKEN_SECRET = process.env.JWT_ACCESS_SECRET;

export function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No access token provided' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, ACCESS_TOKEN_SECRET);
    req.user = { id: decoded.userId };
    req.userId = decoded.userId;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired access token' });
  }
}

// For endpoints genuinely open to the public that still want to know who the
// user is when they happen to be signed in — e.g. an Ubuhlanti bakwa Xhosa
// donation, which anyone may make with or without an iCamagu account. Never
// rejects: a missing or bad token just means req.userId stays undefined.
export function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const decoded = jwt.verify(authHeader.split(' ')[1], ACCESS_TOKEN_SECRET);
      req.user = { id: decoded.userId };
      req.userId = decoded.userId;
    } catch {
      // Ignore — an expired token shouldn't block a public donation.
    }
  }
  next();
}