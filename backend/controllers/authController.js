const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User } = require('../models');
const { sendOTPEmail } = require('../utils/mailer');

const SECRET = process.env.JWT_SECRET || 'qa_nexus_secret';

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ where: { email } });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, SECRET, { expiresIn: '7d' });
    const { password: _, ...userData } = user.toJSON();
    res.json({ token, user: userData });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.register = async (req, res) => {
  try {
    const { firstName, lastName, email, password, role } = req.body;
    const exists = await User.findOne({ where: { email } });
    if (exists) return res.status(409).json({ error: 'Email already registered' });

    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({ firstName, lastName, email, password: hashed, role: role || 'QA Engineer' });
    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, SECRET, { expiresIn: '7d' });
    const { password: _, ...userData } = user.toJSON();
    res.status(201).json({ token, user: userData });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.me = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, { attributes: { exclude: ['password'] } });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const { firstName, lastName, phone, role, department, location, timezone, bio, github, linkedin, avatar } = req.body;
    const user = await User.findByPk(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    await user.update({ firstName, lastName, phone, role, department, location, timezone, bio, github, linkedin, avatar });
    req.io.emit('user:updated', { userId: user.id });
    const { password: _, ...userData } = user.toJSON();
    res.json(userData);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ── Forgot Password — send OTP ───────────────────────────────────────────────
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });

    const user = await User.findOne({ where: { email } });
    if (!user) return res.status(404).json({ error: 'No account found with this email' });

    // Generate 6-digit OTP
    const otp = String(Math.floor(100000 + Math.random() * 900000));
    const expiry = Date.now() + 10 * 60 * 1000; // 10 minutes from now (epoch ms)

    await user.update({ resetOtp: otp, resetOtpExpiry: expiry });

    // Send OTP email
    const result = await sendOTPEmail(email, otp, user.firstName);

    res.json({
      message: 'OTP sent to your email',
      previewUrl: result.previewUrl || null, // Ethereal preview URL for local dev
    });
  } catch (err) {
    console.error('Forgot password error:', err.message);
    res.status(500).json({ error: 'Failed to send OTP. Please try again.' });
  }
};

// ── Verify OTP ───────────────────────────────────────────────────────────────
exports.verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ error: 'Email and OTP are required' });

    const user = await User.findOne({ where: { email } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (!user.resetOtp || user.resetOtp !== otp) {
      return res.status(400).json({ error: 'Invalid OTP' });
    }

    if (Date.now() > Number(user.resetOtpExpiry)) {
      await user.update({ resetOtp: null, resetOtpExpiry: null });
      return res.status(400).json({ error: 'OTP has expired. Please request a new one.' });
    }

    res.json({ message: 'OTP verified', valid: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ── Reset Password (with OTP) ───────────────────────────────────────────────
exports.resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    if (!email || !otp || !newPassword) return res.status(400).json({ error: 'Email, OTP, and new password are required' });

    const user = await User.findOne({ where: { email } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (!user.resetOtp || user.resetOtp !== otp) {
      return res.status(400).json({ error: 'Invalid OTP' });
    }

    if (Date.now() > Number(user.resetOtpExpiry)) {
      await user.update({ resetOtp: null, resetOtpExpiry: null });
      return res.status(400).json({ error: 'OTP has expired. Please request a new one.' });
    }

    const hashed = await bcrypt.hash(newPassword, 10);
    await user.update({ password: hashed, resetOtp: null, resetOtpExpiry: null });

    res.json({ message: 'Password reset successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findByPk(req.user.id);
    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) return res.status(400).json({ error: 'Current password is incorrect' });

    await user.update({ password: await bcrypt.hash(newPassword, 10) });
    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
