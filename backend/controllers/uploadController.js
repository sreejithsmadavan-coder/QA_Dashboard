const XLSX    = require('xlsx');
const path    = require('path');
const { TestCase, TestExecution, Bug, ActivityLog, Project } = require('../models');
const { broadcast, emitToProject } = require('../socket/handlers');
const { recalcProject } = require('../utils/projectUtils');

// ── helpers ────────────────────────────────────────────────────────────────────
const KNOWN_HEADERS = ['test case id', 'module', 'sub-module', 'test case', 'description', 'preconditions',
  'test steps', 'test data', 'expected result', 'actual result', 'status', 'test type', 'type',
  'severity', 'priority', 'remarks', 'category', 'name', 'title', 'bug', 'sprint', 'execution'];

function detectHeaderRow(json) {
  for (let i = 0; i < Math.min(json.length, 15); i++) {
    const row = (json[i] || []).map(c => String(c || '').toLowerCase().trim());
    const matches = row.filter(c => KNOWN_HEADERS.some(h => c.includes(h)));
    if (matches.length >= 3) return i;
  }
  return 0;
}

function parseFile(filePath) {
  const wb   = XLSX.readFile(filePath);
  const ws   = wb.Sheets[wb.SheetNames[0]];
  const json = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
  if (json.length === 0) return { headers: [], rows: [], meta: {} };
  const headerIdx = detectHeaderRow(json);
  const meta = {};
  for (let i = 0; i < headerIdx; i++) {
    const key = String(json[i][0] || '').trim();
    const val = String(json[i][1] || '').trim();
    if (key && val) meta[key] = val;
  }
  const headers = json[headerIdx].map(String);
  const rows    = json.slice(headerIdx + 1).map(row => {
    const obj = {};
    headers.forEach((h, i) => { obj[h] = String(row[i] || ''); });
    return obj;
  });
  return { headers, rows, meta };
}

function detectType(headers) {
  const h = headers.map(s => s.toLowerCase());
  if (h.some(x => x.includes('bug') && !x.includes('debug')))                                    return 'bugs';
  if (h.some(x => x.includes('test case') || x.includes('testcase') || x.includes('test type')
    || x.includes('category') || x.includes('test case id') || x.includes('expected result')))    return 'testcases';
  if (h.some(x => x.includes('severity') || x.includes('bug')))                                  return 'bugs';
  if (h.some(x => x.includes('sprint')   || x.includes('execution')))                            return 'executions';
  return 'unknown';
}

function mapRow(row, mapping) {
  const result = {};
  for (const [key, aliases] of Object.entries(mapping)) {
    for (const alias of aliases) {
      const found = Object.keys(row).find(k => k.toLowerCase().includes(alias.toLowerCase()));
      if (found) { result[key] = row[found]; break; }
    }
  }
  return result;
}

// ── main upload handler ────────────────────────────────────────────────────────
exports.uploadFile = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const ext        = path.extname(req.file.originalname).toLowerCase();
    const projectId  = req.body.projectId;
    const uploadType = req.body.type || 'auto';

    const result = {
      imported: 0, skipped: 0, errors: [],
      fileInfo: { name: req.file.originalname, size: req.file.size, path: req.file.path },
    };

    if (['.xlsx', '.xls', '.csv'].includes(ext)) {
      const { headers, rows } = parseFile(req.file.path);
      result.headers   = headers;
      result.totalRows = rows.length;

      const detectedType      = uploadType === 'auto' ? detectType(headers) : uploadType;
      result.detectedType     = detectedType;

      // ── import test cases ──────────────────────────────────────────────────
      if (detectedType === 'testcases' && projectId) {
        const mapping = {
          testCaseRefId:  ['test case id', 'tc id', 'case id'],
          name:           ['test case description', 'test case name', 'test name', 'testcase', 'test case', 'title'],
          module:         ['module name', 'module'],
          subModule:      ['sub-module', 'submodule', 'sub module'],
          testType:       ['test type', 'testing type'],
          category:       ['category'],
          description:    ['description', 'details'],
          preconditions:  ['preconditions', 'precondition', 'pre-conditions'],
          testSteps:      ['test steps', 'steps', 'procedure'],
          testData:       ['test data'],
          expectedResult: ['expected result'],
          actualResult:   ['actual result'],
          testResult:     ['status', 'result', 'outcome'],
          severity:       ['severity'],
          priority:       ['priority'],
          remarks:        ['remarks', 'notes', 'comments'],
        };
        for (const row of rows) {
          const mapped = mapRow(row, mapping);
          if (!mapped.name) { result.skipped++; continue; }
          const testType = mapped.testType || mapped.category || 'Functional';
          try {
            await TestCase.create({
              projectId,
              testCaseRefId:  mapped.testCaseRefId || '',
              name:           mapped.name,
              module:         mapped.module || '',
              subModule:      mapped.subModule || '',
              testType,
              category:       testType,
              description:    mapped.description || '',
              preconditions:  mapped.preconditions || '',
              testSteps:      mapped.testSteps || '',
              testData:       mapped.testData || '',
              expectedResult: mapped.expectedResult || '',
              actualResult:   mapped.actualResult || '',
              testResult:     mapped.testResult || '',
              severity:       mapped.severity || '',
              priority:       mapped.priority || '',
              remarks:        mapped.remarks || '',
              status: 'Active',
            });
            result.imported++;
          } catch { result.skipped++; }
        }

        if (result.imported > 0) {
          // Recalculate project stats and notify all clients
          const stats = await recalcProject(projectId);
          const project = await Project.findByPk(projectId);
          broadcast(req.io, 'project:updated', project);
          emitToProject(req.io, projectId, 'testcases:bulk_imported', {
            count: result.imported, ...stats,
          });
        }

      // ── import bugs ────────────────────────────────────────────────────────
      } else if (detectedType === 'bugs' && projectId) {
        const mapping = {
          title:       ['title', 'bug', 'name', 'summary'],
          severity:    ['severity', 'priority', 'level'],
          description: ['description', 'desc', 'details'],
          status:      ['status', 'state'],
          reporter:    ['reporter', 'reported by', 'author'],
        };
        for (const row of rows) {
          const mapped = mapRow(row, mapping);
          if (!mapped.title) { result.skipped++; continue; }
          try {
            const sev = ['Critical','High','Medium','Low']
              .find(s => (mapped.severity || '').toLowerCase().includes(s.toLowerCase())) || 'Medium';
            await Bug.create({
              projectId,
              title:       mapped.title,
              severity:    sev,
              description: mapped.description || '',
              status:      mapped.status      || 'Open',
              reporter:    mapped.reporter    || 'Imported',
            });
            result.imported++;
          } catch { result.skipped++; }
        }

        if (result.imported > 0) {
          const stats   = await recalcProject(projectId);
          const project = await Project.findByPk(projectId);
          broadcast(req.io, 'project:updated', project);
          emitToProject(req.io, projectId, 'bugs:bulk_imported', {
            count: result.imported, ...stats,
          });
        }

      // ── import executions ──────────────────────────────────────────────────
      } else if (detectedType === 'executions' && projectId) {
        const mapping = {
          name:     ['name', 'test case', 'testcase', 'title'],
          status:   ['status', 'result', 'outcome'],
          sprint:   ['sprint', 'iteration', 'cycle'],
          duration: ['duration', 'time', 'elapsed'],
        };
        for (const row of rows) {
          const mapped = mapRow(row, mapping);
          const st = ['Passed','Failed','Skipped']
            .find(s => (mapped.status || '').toLowerCase().includes(s.toLowerCase())) || 'Passed';
          try {
            await TestExecution.create({
              projectId,
              sprint:      mapped.sprint   || 'Sprint 1',
              status:      st,
              duration:    mapped.duration || '',
              executedBy:  'Import',
            });
            result.imported++;
          } catch { result.skipped++; }
        }

        if (result.imported > 0) {
          const stats   = await recalcProject(projectId);
          const project = await Project.findByPk(projectId);
          broadcast(req.io, 'project:updated', project);
          emitToProject(req.io, projectId, 'executions:bulk_imported', {
            count: result.imported, ...stats,
          });
        }
      }

      result.preview = { headers, rows: rows.slice(0, 10) };
    }

    // Activity log + global notification
    await ActivityLog.create({
      action:     `File uploaded: ${req.file.originalname} (${result.imported} records imported)`,
      entityType: 'upload',
      icon:       '↑',
      iconColor:  'var(--am)',
    });

    broadcast(req.io, 'activity:new', {
      action:    `New upload: ${req.file.originalname} — ${result.imported} records imported`,
      icon:      '↑',
      iconColor: 'var(--am)',
      time:      'just now',
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ── preview only ───────────────────────────────────────────────────────────────
exports.parsePreview = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const ext = path.extname(req.file.originalname).toLowerCase();
    if (!['.xlsx', '.xls', '.csv'].includes(ext)) {
      return res.json({ headers: [], rows: [], message: 'Preview not available for this file type' });
    }
    const { headers, rows } = parseFile(req.file.path);
    res.json({ headers, rows: rows.slice(0, 50), total: rows.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
