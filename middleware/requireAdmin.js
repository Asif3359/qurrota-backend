module.exports = function requireAdmin(req, res, next) {
  try {
    // Token payload structure set in authController: { user: { id, role, email } }
    const role = req.user && (req.user.role || (req.user.user && req.user.user.role));
    if (role === 'admin') return next();
    return res.status(403).json({ message: 'Admin access required' });
  } catch (err) {
    return res.status(403).json({ message: 'Admin access required' });
  }
};
