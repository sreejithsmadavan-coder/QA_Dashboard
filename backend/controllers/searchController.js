const { Project, Bug, TestCase, Meeting } = require('../models');
const { Op } = require('sequelize');

exports.globalSearch = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.length < 2) return res.json({ projects: [], bugs: [], testCases: [], meetings: [] });

    const like = { [Op.like]: `%${q}%` };

    const [projects, bugs, testCases, meetings] = await Promise.all([
      Project.findAll({
        where: { [Op.or]: [{ name: like }, { description: like }] },
        attributes: ['id', 'name', 'status', 'health'],
        limit: 8,
      }),
      Bug.findAll({
        where: { [Op.or]: [{ title: like }, { description: like }, { assignee: like }] },
        attributes: ['id', 'projectId', 'title', 'severity', 'status', 'assignee'],
        limit: 8,
      }),
      TestCase.findAll({
        where: { [Op.or]: [{ name: like }, { category: like }, { module: like }, { testCaseRefId: like }] },
        attributes: ['id', 'projectId', 'name', 'category', 'status', 'testCaseRefId'],
        limit: 8,
      }),
      Meeting.findAll({
        where: { [Op.or]: [{ title: like }, { notes: like }, { tag: like }] },
        attributes: ['id', 'title', 'date', 'time', 'status', 'tag'],
        limit: 8,
      }),
    ]);

    res.json({ projects, bugs, testCases, meetings });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
