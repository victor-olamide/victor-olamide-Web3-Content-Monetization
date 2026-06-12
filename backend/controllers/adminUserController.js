const User = require('../models/User');
const AdminAuditLog = require('../models/AdminAuditLog');
const logger = require('../utils/logger');

/**
 * List users with pagination and optional filters
 */
const listUsers = async (req, res) => {
  try {
    const { page = 1, limit = 50, search, role, isSuspended } = req.query;
    const skip = (page - 1) * limit;

    const query = {};
    if (search) {
      const regex = new RegExp(search, 'i');
      query.$or = [{ name: regex }, { email: regex }];
    }
    if (role) query.role = role;
    if (typeof isSuspended !== 'undefined') query.isSuspended = isSuspended === 'true';

    const [users, total] = await Promise.all([
      User.find(query)
        .sort({ createdAt: -1 })
        .skip(parseInt(skip))
        .limit(parseInt(limit))
        .select('-password'),
      User.countDocuments(query),
    ]);

    res.json({ success: true, data: users, pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) } });
  } catch (error) {
    logger.error('Failed to list users', { err: error });
    res.status(500).json({ success: false, message: 'Failed to list users', error: error.message });
  }
};

const getUser = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id).select('-password');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, data: user });
  } catch (error) {
    logger.error('Failed to get user', { err: error });
    res.status(500).json({ success: false, message: 'Failed to get user', error: error.message });
  }
};

const banUser = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    user.isSuspended = true;
    await user.save();

    // Audit
    try { await AdminAuditLog.logAction(req.user._id, req.user.email, 'UPDATE', 'USER', id, { action: 'ban' }, req.ip, req.headers['user-agent']); } catch(_){}

    res.json({ success: true, message: 'User suspended' });
  } catch (error) {
    logger.error('Failed to ban user', { err: error });
    res.status(500).json({ success: false, message: 'Failed to ban user', error: error.message });
  }
};

const unbanUser = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    user.isSuspended = false;
    await user.save();

    try { await AdminAuditLog.logAction(req.user._id, req.user.email, 'UPDATE', 'USER', id, { action: 'unban' }, req.ip, req.headers['user-agent']); } catch(_){}

    res.json({ success: true, message: 'User unsuspended' });
  } catch (error) {
    logger.error('Failed to unban user', { err: error });
    res.status(500).json({ success: false, message: 'Failed to unban user', error: error.message });
  }
};

const changeUserRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;
    if (!['subscriber', 'creator', 'admin'].includes(role)) {
      return res.status(400).json({ success: false, message: 'Invalid role' });
    }
    const user = await User.findById(id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const prevRole = user.role;
    user.role = role;
    await user.save();

    try { await AdminAuditLog.logAction(req.user._id, req.user.email, 'UPDATE', 'USER_ROLE', id, { from: prevRole, to: role }, req.ip, req.headers['user-agent']); } catch(_){}

    res.json({ success: true, message: 'User role updated', data: { id, role } });
  } catch (error) {
    logger.error('Failed to change user role', { err: error });
    res.status(500).json({ success: false, message: 'Failed to change user role', error: error.message });
  }
};

module.exports = {
  listUsers,
  getUser,
  banUser,
  unbanUser,
  changeUserRole,
};
