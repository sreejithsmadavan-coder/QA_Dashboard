const { Meeting, ActivityLog } = require('../models');
const { broadcast } = require('../socket/handlers');

exports.getAll = async (req, res) => {
  try {
    const { status } = req.query;
    const where = {};
    if (status) where.status = status;
    const meetings = await Meeting.findAll({ where, order: [['date','ASC'],['createdAt','DESC']] });
    res.json(meetings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getOne = async (req, res) => {
  try {
    const m = await Meeting.findByPk(req.params.id);
    if (!m) return res.status(404).json({ error: 'Meeting not found' });
    res.json(m);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.create = async (req, res) => {
  try {
    const { title, tag, tagColor, tagBg, date, time, attendees, meetingUrl, notes } = req.body;
    const today = new Date().toISOString().slice(0, 10);
    const status = date >= today ? 'upcoming' : 'past';
    const meeting = await Meeting.create({ title, tag, tagColor: tagColor || 'var(--pu)', tagBg: tagBg || 'rgba(167,139,250,.12)', date, time, attendees: attendees || 0, status, meetingUrl, notes });

    await ActivityLog.create({
      action: `Meeting scheduled: ${title}`,
      entityType: 'meeting', entityId: meeting.id,
      icon: '📅', iconColor: 'var(--pu)',
    });

    broadcast(req.io, 'meeting:created', meeting);
    res.status(201).json(meeting);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const meeting = await Meeting.findByPk(req.params.id);
    if (!meeting) return res.status(404).json({ error: 'Meeting not found' });

    const { title, tag, tagColor, tagBg, date, time, attendees, status, meetingUrl, notes } = req.body;
    await meeting.update({ title, tag, tagColor, tagBg, date, time, attendees, status, meetingUrl, notes });
    broadcast(req.io, 'meeting:updated', meeting);
    res.json(meeting);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.delete = async (req, res) => {
  try {
    const meeting = await Meeting.findByPk(req.params.id);
    if (!meeting) return res.status(404).json({ error: 'Meeting not found' });
    await meeting.destroy();
    broadcast(req.io, 'meeting:deleted', { id: req.params.id });
    res.json({ message: 'Meeting deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
