/**
 * Role-Based Access Control middleware.
 *
 * Roles (highest → lowest):
 *   Admin    – full access
 *   QA Lead  – CRUD everything
 *   Tester   – create/update bugs & test cases, no delete projects
 *   Viewer   – read-only
 *
 * Usage:
 *   router.get('/users', auth, requireRole('Admin'), handler);
 *   router.put('/bug/:id', auth, requireRole('Admin', 'QA Lead', 'Tester'), handler);
 */

const VALID_ROLES = ['Admin', 'QA Lead', 'Tester', 'Viewer'];

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const userRole = req.user.role;

    if (!userRole || !VALID_ROLES.includes(userRole)) {
      return res.status(403).json({ error: 'Invalid or missing role' });
    }

    if (!roles.includes(userRole)) {
      return res.status(403).json({
        error: `Access denied. Required role(s): ${roles.join(', ')}. Your role: ${userRole}`,
      });
    }

    next();
  };
}

module.exports = { requireRole, VALID_ROLES };
