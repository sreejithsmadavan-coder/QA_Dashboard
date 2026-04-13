const sequelize = require('../config/database');
const { DataTypes } = require('sequelize');

// ── User ──────────────────────────────────────────────────────────────────────
const User = sequelize.define('User', {
  id:         { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  firstName:  { type: DataTypes.STRING, allowNull: false, defaultValue: 'Muhammed' },
  lastName:   { type: DataTypes.STRING, allowNull: false, defaultValue: 'Shahin' },
  email:      { type: DataTypes.STRING, allowNull: false, unique: true },
  password:   { type: DataTypes.STRING, allowNull: false },
  role:       { type: DataTypes.STRING, defaultValue: 'QA Lead' },
  department: { type: DataTypes.STRING, defaultValue: 'Engineering' },
  location:   { type: DataTypes.STRING, defaultValue: 'Kerala, India' },
  timezone:   { type: DataTypes.STRING, defaultValue: 'Asia/Kolkata' },
  bio:        { type: DataTypes.TEXT },
  github:     { type: DataTypes.STRING },
  linkedin:   { type: DataTypes.STRING },
  avatar:     { type: DataTypes.TEXT },
  isActive:   { type: DataTypes.BOOLEAN, defaultValue: true },
}, { tableName: 'users', timestamps: true });

// ── Project ───────────────────────────────────────────────────────────────────
const Project = sequelize.define('Project', {
  id:          { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name:        { type: DataTypes.STRING, allowNull: false },
  status:      { type: DataTypes.ENUM('Active','Pending','Completed','Hold'), defaultValue: 'Active' },
  health:      { type: DataTypes.ENUM('Excellent','Good','Average','Poor'), defaultValue: 'Good' },
  description: { type: DataTypes.TEXT },
  passRate:    { type: DataTypes.FLOAT, defaultValue: 0 },
  testCasesCount: { type: DataTypes.INTEGER, defaultValue: 0 },
}, { tableName: 'projects', timestamps: true });

// ── Bug ───────────────────────────────────────────────────────────────────────
const Bug = sequelize.define('Bug', {
  id:          { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  projectId:   { type: DataTypes.INTEGER, allowNull: false, references: { model: 'projects', key: 'id' } },
  title:       { type: DataTypes.STRING, allowNull: false },
  description: { type: DataTypes.TEXT },
  severity:    { type: DataTypes.ENUM('Critical','High','Medium','Low'), defaultValue: 'Medium' },
  status:      { type: DataTypes.ENUM('Open','In Progress','Resolved','Closed'), defaultValue: 'Open' },
  reporter:    { type: DataTypes.STRING },
  assignee:    { type: DataTypes.STRING },
}, { tableName: 'bugs', timestamps: true });

// ── TestCase ──────────────────────────────────────────────────────────────────
const TestCase = sequelize.define('TestCase', {
  id:             { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  projectId:      { type: DataTypes.INTEGER, allowNull: false, references: { model: 'projects', key: 'id' } },
  testCaseRefId:  { type: DataTypes.STRING },
  name:           { type: DataTypes.STRING, allowNull: false },
  category:       { type: DataTypes.STRING, defaultValue: 'Functional' },
  module:         { type: DataTypes.STRING },
  subModule:      { type: DataTypes.STRING },
  testType:       { type: DataTypes.STRING, defaultValue: 'Functional' },
  description:    { type: DataTypes.TEXT },
  preconditions:  { type: DataTypes.TEXT },
  testSteps:      { type: DataTypes.TEXT },
  testData:       { type: DataTypes.TEXT },
  expectedResult: { type: DataTypes.TEXT },
  actualResult:   { type: DataTypes.TEXT },
  testResult:     { type: DataTypes.STRING },
  severity:       { type: DataTypes.STRING },
  priority:       { type: DataTypes.STRING },
  remarks:        { type: DataTypes.TEXT },
  status:         { type: DataTypes.STRING, defaultValue: 'Active' },
}, { tableName: 'test_cases', timestamps: true });

// ── TestExecution ─────────────────────────────────────────────────────────────
const TestExecution = sequelize.define('TestExecution', {
  id:         { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  testCaseId: { type: DataTypes.INTEGER, references: { model: 'test_cases', key: 'id' } },
  projectId:  { type: DataTypes.INTEGER, allowNull: false, references: { model: 'projects', key: 'id' } },
  sprint:     { type: DataTypes.STRING, defaultValue: 'Sprint 1' },
  status:     { type: DataTypes.ENUM('Passed','Failed','Skipped'), defaultValue: 'Passed' },
  duration:   { type: DataTypes.STRING },
  executedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  executedBy: { type: DataTypes.STRING },
}, { tableName: 'test_executions', timestamps: true });

// ── Meeting ───────────────────────────────────────────────────────────────────
const Meeting = sequelize.define('Meeting', {
  id:        { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  title:     { type: DataTypes.STRING, allowNull: false },
  tag:       { type: DataTypes.STRING },
  tagColor:  { type: DataTypes.STRING, defaultValue: 'var(--pu)' },
  tagBg:     { type: DataTypes.STRING, defaultValue: 'rgba(167,139,250,.12)' },
  date:      { type: DataTypes.DATEONLY, allowNull: false },
  time:      { type: DataTypes.STRING },
  attendees: { type: DataTypes.INTEGER, defaultValue: 0 },
  status:    { type: DataTypes.ENUM('upcoming','past'), defaultValue: 'upcoming' },
  notes:     { type: DataTypes.TEXT },
  meetingUrl: { type: DataTypes.STRING },
}, { tableName: 'meetings', timestamps: true });

// ── ActivityLog ───────────────────────────────────────────────────────────────
const ActivityLog = sequelize.define('ActivityLog', {
  id:         { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  action:     { type: DataTypes.STRING, allowNull: false },
  entityType: { type: DataTypes.STRING },
  entityId:   { type: DataTypes.INTEGER },
  icon:       { type: DataTypes.STRING, defaultValue: '●' },
  iconColor:  { type: DataTypes.STRING, defaultValue: 'var(--lime)' },
  userId:     { type: DataTypes.INTEGER },
  metadata:   { type: DataTypes.JSON },
}, { tableName: 'activity_logs', timestamps: true });

// ── SprintData ────────────────────────────────────────────────────────────────
const SprintData = sequelize.define('SprintData', {
  id:        { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  projectId: { type: DataTypes.INTEGER, references: { model: 'projects', key: 'id' } },
  sprint:    { type: DataTypes.STRING, allowNull: false },
  totalExec: { type: DataTypes.INTEGER, defaultValue: 0 },
  passed:    { type: DataTypes.INTEGER, defaultValue: 0 },
  failed:    { type: DataTypes.INTEGER, defaultValue: 0 },
  skipped:   { type: DataTypes.INTEGER, defaultValue: 0 },
  passRate:  { type: DataTypes.FLOAT, defaultValue: 0 },
  trend:     { type: DataTypes.JSON, defaultValue: [] },
}, { tableName: 'sprint_data', timestamps: true });

// ── QAAgentConfig (per-user current state for the QA Agent module) ───────────
const QAAgentConfig = sequelize.define('QAAgentConfig', {
  id:        { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  userId:    { type: DataTypes.INTEGER, allowNull: false, unique: true, references: { model: 'users', key: 'id' } },
  provider:  { type: DataTypes.STRING, defaultValue: 'groq' },
  model:     { type: DataTypes.STRING },
  apiKey:    { type: DataTypes.TEXT },
  url:       { type: DataTypes.STRING },
  siteType:  { type: DataTypes.STRING },
  categories:{ type: DataTypes.JSON },
  notes:     { type: DataTypes.TEXT },
  emailAddr: { type: DataTypes.STRING },
  state:     { type: DataTypes.JSON },
}, { tableName: 'qa_agent_configs', timestamps: true });

// ── QAAgentRun (one row per executed run) ────────────────────────────────────
const QAAgentRun = sequelize.define('QAAgentRun', {
  id:        { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  userId:    { type: DataTypes.INTEGER, allowNull: false, references: { model: 'users', key: 'id' } },
  projectId: { type: DataTypes.INTEGER, references: { model: 'projects', key: 'id' } },
  url:       { type: DataTypes.STRING },
  provider:  { type: DataTypes.STRING },
  model:     { type: DataTypes.STRING },
  categories:{ type: DataTypes.JSON },
  status:    { type: DataTypes.STRING, defaultValue: 'completed' },
  totalTests:{ type: DataTypes.INTEGER, defaultValue: 0 },
  passCount: { type: DataTypes.INTEGER, defaultValue: 0 },
  failCount: { type: DataTypes.INTEGER, defaultValue: 0 },
  blockedCount: { type: DataTypes.INTEGER, defaultValue: 0 },
  passRate:  { type: DataTypes.FLOAT, defaultValue: 0 },
  durationMs:{ type: DataTypes.INTEGER },
  results:   { type: DataTypes.JSON },
  bugs:      { type: DataTypes.JSON },
  testCases: { type: DataTypes.JSON },
  reportHtml:{ type: DataTypes.TEXT },
}, { tableName: 'qa_agent_runs', timestamps: true });

// ── Associations ──────────────────────────────────────────────────────────────
Project.hasMany(Bug, { foreignKey: 'projectId', as: 'bugs', onDelete: 'CASCADE' });
Bug.belongsTo(Project, { foreignKey: 'projectId', as: 'project' });

Project.hasMany(TestCase, { foreignKey: 'projectId', as: 'testCases', onDelete: 'CASCADE' });
TestCase.belongsTo(Project, { foreignKey: 'projectId', as: 'project' });

Project.hasMany(TestExecution, { foreignKey: 'projectId', as: 'executions', onDelete: 'CASCADE' });
TestExecution.belongsTo(Project, { foreignKey: 'projectId', as: 'project' });

TestCase.hasMany(TestExecution, { foreignKey: 'testCaseId', as: 'executions', onDelete: 'SET NULL' });
TestExecution.belongsTo(TestCase, { foreignKey: 'testCaseId', as: 'testCase' });

Project.hasMany(SprintData, { foreignKey: 'projectId', as: 'sprints', onDelete: 'CASCADE' });
SprintData.belongsTo(Project, { foreignKey: 'projectId', as: 'project' });

User.hasOne(QAAgentConfig, { foreignKey: 'userId', as: 'qaAgentConfig', onDelete: 'CASCADE' });
QAAgentConfig.belongsTo(User, { foreignKey: 'userId', as: 'user' });

User.hasMany(QAAgentRun, { foreignKey: 'userId', as: 'qaAgentRuns', onDelete: 'CASCADE' });
QAAgentRun.belongsTo(User, { foreignKey: 'userId', as: 'user' });
Project.hasMany(QAAgentRun, { foreignKey: 'projectId', as: 'qaAgentRuns', onDelete: 'SET NULL' });
QAAgentRun.belongsTo(Project, { foreignKey: 'projectId', as: 'project' });

module.exports = {
  sequelize,
  User,
  Project,
  Bug,
  TestCase,
  TestExecution,
  Meeting,
  ActivityLog,
  SprintData,
  QAAgentConfig,
  QAAgentRun,
};
