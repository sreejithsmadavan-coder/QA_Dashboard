const { User, Project, Bug, TestCase } = require('../models');
const { VALID_ROLES } = require('../middleware/rbac');

// ── GET /api/admin/users ─────────────────────────────────────────────────────
exports.listUsers = async (req, res) => {
  try {
    const users = await User.findAll({
      attributes: { exclude: ['password', 'resetOtp', 'resetOtpExpiry'] },
      order: [['createdAt', 'DESC']],
    });
    res.json(users);
  } catch (err) {
    console.error('listUsers error:', err);
    res.status(500).json({ error: err.message });
  }
};

// ── PUT /api/admin/users/:id/role ────────────────────────────────────────────
exports.updateRole = async (req, res) => {
  try {
    const { role } = req.body;
    if (!role || !VALID_ROLES.includes(role)) {
      return res.status(400).json({ error: `Invalid role. Allowed: ${VALID_ROLES.join(', ')}` });
    }

    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    await user.update({ role });
    res.json({ message: 'Role updated', id: user.id, role });
  } catch (err) {
    console.error('updateRole error:', err);
    res.status(500).json({ error: err.message });
  }
};

// ── PUT /api/admin/users/:id/status ──────────────────────────────────────────
exports.updateStatus = async (req, res) => {
  try {
    const { isActive } = req.body;
    if (typeof isActive !== 'boolean') {
      return res.status(400).json({ error: 'isActive (boolean) is required' });
    }

    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    await user.update({ isActive });
    res.json({ message: `User ${isActive ? 'activated' : 'deactivated'}`, id: user.id, isActive });
  } catch (err) {
    console.error('updateStatus error:', err);
    res.status(500).json({ error: err.message });
  }
};

// ── GET /api/admin/stats ─────────────────────────────────────────────────────
exports.systemStats = async (req, res) => {
  try {
    const [totalUsers, totalProjects, totalBugs, totalTestCases] = await Promise.all([
      User.count(),
      Project.count(),
      Bug.count(),
      TestCase.count(),
    ]);

    const activeUsers = await User.count({ where: { isActive: true } });

    res.json({ totalUsers, activeUsers, totalProjects, totalBugs, totalTestCases });
  } catch (err) {
    console.error('systemStats error:', err);
    res.status(500).json({ error: err.message });
  }
};
