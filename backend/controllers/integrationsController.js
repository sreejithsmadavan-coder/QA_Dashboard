const { IntegrationWebhook } = require('../models');
const https = require('https');
const http = require('http');
const { URL } = require('url');

// POST /api/integrations/webhook — create webhook
exports.createWebhook = async (req, res) => {
  try {
    const { platform, webhookUrl, events, isActive } = req.body;
    if (!platform || !webhookUrl) {
      return res.status(400).json({ error: 'platform and webhookUrl are required' });
    }
    if (!['slack', 'teams'].includes(platform)) {
      return res.status(400).json({ error: 'platform must be "slack" or "teams"' });
    }
    const webhook = await IntegrationWebhook.create({
      userId: req.user.id,
      platform,
      webhookUrl,
      events: events || [],
      isActive: isActive !== undefined ? isActive : true,
    });
    res.status(201).json(webhook);
  } catch (err) {
    console.error('Create webhook error:', err);
    res.status(500).json({ error: 'Failed to create webhook' });
  }
};

// GET /api/integrations/webhooks — list user's webhooks
exports.listWebhooks = async (req, res) => {
  try {
    const webhooks = await IntegrationWebhook.findAll({
      where: { userId: req.user.id },
      order: [['createdAt', 'DESC']],
    });
    res.json(webhooks);
  } catch (err) {
    console.error('List webhooks error:', err);
    res.status(500).json({ error: 'Failed to list webhooks' });
  }
};

// PUT /api/integrations/webhooks/:id — update
exports.updateWebhook = async (req, res) => {
  try {
    const webhook = await IntegrationWebhook.findOne({
      where: { id: req.params.id, userId: req.user.id },
    });
    if (!webhook) return res.status(404).json({ error: 'Webhook not found' });

    const { platform, webhookUrl, events, isActive } = req.body;
    if (platform) webhook.platform = platform;
    if (webhookUrl) webhook.webhookUrl = webhookUrl;
    if (events !== undefined) webhook.events = events;
    if (isActive !== undefined) webhook.isActive = isActive;

    await webhook.save();
    res.json(webhook);
  } catch (err) {
    console.error('Update webhook error:', err);
    res.status(500).json({ error: 'Failed to update webhook' });
  }
};

// DELETE /api/integrations/webhooks/:id — delete
exports.deleteWebhook = async (req, res) => {
  try {
    const webhook = await IntegrationWebhook.findOne({
      where: { id: req.params.id, userId: req.user.id },
    });
    if (!webhook) return res.status(404).json({ error: 'Webhook not found' });
    await webhook.destroy();
    res.json({ success: true });
  } catch (err) {
    console.error('Delete webhook error:', err);
    res.status(500).json({ error: 'Failed to delete webhook' });
  }
};

// POST /api/integrations/webhooks/:id/test — send test message
exports.testWebhook = async (req, res) => {
  try {
    const webhook = await IntegrationWebhook.findOne({
      where: { id: req.params.id, userId: req.user.id },
    });
    if (!webhook) return res.status(404).json({ error: 'Webhook not found' });

    const payload = webhook.platform === 'slack'
      ? JSON.stringify({ text: '🧪 QA Dashboard test notification — your webhook is working!' })
      : JSON.stringify({
          '@type': 'MessageCard',
          '@context': 'http://schema.org/extensions',
          summary: 'QA Dashboard Test',
          themeColor: '6366f1',
          title: 'QA Dashboard Test Notification',
          text: 'Your webhook integration is working correctly!',
        });

    const url = new URL(webhook.webhookUrl);
    const transport = url.protocol === 'https:' ? https : http;

    const result = await new Promise((resolve, reject) => {
      const reqObj = transport.request(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) },
        timeout: 10000,
      }, (response) => {
        let body = '';
        response.on('data', chunk => body += chunk);
        response.on('end', () => resolve({ statusCode: response.statusCode, body }));
      });
      reqObj.on('error', reject);
      reqObj.on('timeout', () => { reqObj.destroy(); reject(new Error('Request timed out')); });
      reqObj.write(payload);
      reqObj.end();
    });

    // Update lastTriggeredAt
    webhook.lastTriggeredAt = new Date();
    await webhook.save();

    if (result.statusCode >= 200 && result.statusCode < 300) {
      res.json({ success: true, message: 'Test notification sent successfully' });
    } else {
      res.status(400).json({ success: false, message: `Webhook returned status ${result.statusCode}`, body: result.body });
    }
  } catch (err) {
    console.error('Test webhook error:', err);
    res.status(500).json({ success: false, message: err.message || 'Failed to send test notification' });
  }
};
