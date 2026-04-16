const { TestCase } = require('../models');
let Tag, TestCaseTag;
function getModels() {
  if (!Tag) Tag = require('../models').Tag;
  if (!TestCaseTag) TestCaseTag = require('../models').TestCaseTag;
  return { Tag, TestCaseTag };
}

// ── GET /api/tags ────────────────────────────────────────────────────────────
exports.listTags = async (req, res) => {
  try {
    const { Tag } = getModels();
    const tags = await Tag.findAll({ order: [['name', 'ASC']] });
    res.json(tags);
  } catch (err) {
    console.error('listTags error:', err);
    res.status(500).json({ error: err.message });
  }
};

// ── POST /api/tags ───────────────────────────────────────────────────────────
exports.createTag = async (req, res) => {
  try {
    const { Tag } = getModels();
    const { name, color } = req.body;
    if (!name) return res.status(400).json({ error: 'name is required' });

    const existing = await Tag.findOne({ where: { name } });
    if (existing) return res.status(409).json({ error: 'Tag already exists' });

    const tag = await Tag.create({ name, color: color || '#6366f1' });
    res.status(201).json(tag);
  } catch (err) {
    console.error('createTag error:', err);
    res.status(500).json({ error: err.message });
  }
};

// ── DELETE /api/tags/:id ─────────────────────────────────────────────────────
exports.deleteTag = async (req, res) => {
  try {
    const { Tag, TestCaseTag } = getModels();
    const tag = await Tag.findByPk(req.params.id);
    if (!tag) return res.status(404).json({ error: 'Tag not found' });

    // Remove junction records first
    await TestCaseTag.destroy({ where: { tagId: tag.id } });
    await tag.destroy();
    res.json({ message: 'Tag deleted' });
  } catch (err) {
    console.error('deleteTag error:', err);
    res.status(500).json({ error: err.message });
  }
};

// ── PUT /api/test-cases/:id/tags ─────────────────────────────────────────────
exports.setTestCaseTags = async (req, res) => {
  try {
    const { Tag, TestCaseTag } = getModels();
    const testCaseId = req.params.id;
    const { tagIds } = req.body; // array of tag IDs

    if (!Array.isArray(tagIds)) {
      return res.status(400).json({ error: 'tagIds array is required' });
    }

    const testCase = await TestCase.findByPk(testCaseId);
    if (!testCase) return res.status(404).json({ error: 'Test case not found' });

    // Clear existing tags for this test case
    await TestCaseTag.destroy({ where: { testCaseId } });

    // Insert new tag associations
    const records = [];
    for (const tagId of tagIds) {
      const tag = await Tag.findByPk(tagId);
      if (tag) {
        records.push(await TestCaseTag.create({ testCaseId, tagId }));
      }
    }

    // Return test case with its tags
    const tags = await Tag.findAll({
      include: [{
        model: TestCaseTag,
        as: 'testCaseTags',
        where: { testCaseId },
        attributes: [],
      }],
    });

    res.json({ testCaseId: Number(testCaseId), tags });
  } catch (err) {
    console.error('setTestCaseTags error:', err);
    res.status(500).json({ error: err.message });
  }
};

// ── GET /api/test-cases/by-tag/:tagId ────────────────────────────────────────
exports.getTestCasesByTag = async (req, res) => {
  try {
    const { Tag, TestCaseTag } = getModels();
    const { tagId } = req.params;

    const tag = await Tag.findByPk(tagId);
    if (!tag) return res.status(404).json({ error: 'Tag not found' });

    const junctions = await TestCaseTag.findAll({ where: { tagId }, attributes: ['testCaseId'] });
    const testCaseIds = junctions.map(j => j.testCaseId);

    if (testCaseIds.length === 0) return res.json({ tag, testCases: [] });

    const { Op } = require('sequelize');
    const testCases = await TestCase.findAll({
      where: { id: { [Op.in]: testCaseIds } },
      order: [['createdAt', 'DESC']],
    });

    res.json({ tag, testCases });
  } catch (err) {
    console.error('getTestCasesByTag error:', err);
    res.status(500).json({ error: err.message });
  }
};
