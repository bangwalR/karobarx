const express = require('express');
const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const cors = require('cors');
const axios = require('axios');

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

let qrCodeData = null;
let isReady = false;
let isAuthenticated = false;
let clientInfo = null;
const activeCampaigns = {};

const waDataPath = process.env.WA_DATA_PATH || './.wwebjs_auth';
const NEXT_APP_URL = process.env.NEXT_APP_URL || 'http://localhost:3000';

// Resolve Chrome executable — prefer puppeteer's bundled Chromium, fall back to system Chrome
function resolveChromePath() {
  if (process.env.PUPPETEER_EXECUTABLE_PATH) return process.env.PUPPETEER_EXECUTABLE_PATH;
  try {
    const puppeteer = require('puppeteer');
    const path = puppeteer.executablePath();
    if (path) { console.log('[WA] Using bundled Chromium:', path); return path; }
  } catch (_) {}
  const fs = require('fs');
  const candidates = [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium-browser',
    '/usr/bin/chromium',
  ];
  for (const p of candidates) {
    try { if (fs.existsSync(p)) { console.log('[WA] Using Chrome:', p); return p; } } catch (_) {}
  }
  return undefined;
}

const chromePath = resolveChromePath();

const client = new Client({
  authStrategy: new LocalAuth({ clientId: 'mobilehub', dataPath: waDataPath }),
  puppeteer: {
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
    ],
    headless: true,
    executablePath: chromePath,
  },
});

client.on('qr', (qr) => {
  console.log('[WA] QR received');
  qrCodeData = qr; isAuthenticated = false; isReady = false;
});

client.on('ready', async () => {
  console.log('[WA] Client ready');
  isReady = true; isAuthenticated = true; qrCodeData = null;
  try { const info = client.info; clientInfo = { name: info.pushname, phone: info.wid.user }; } catch (_) {}
});

client.on('authenticated', () => { console.log('[WA] Authenticated'); isAuthenticated = true; });
client.on('auth_failure', (msg) => { console.error('[WA] Auth failure:', msg); isAuthenticated = false; isReady = false; });

client.on('disconnected', (reason) => {
  console.warn('[WA] Disconnected:', reason);
  isAuthenticated = false; isReady = false; qrCodeData = null; clientInfo = null;
  Object.keys(activeCampaigns).forEach((id) => {
    if (activeCampaigns[id]) activeCampaigns[id].paused = true;
  });
  setTimeout(() => client.initialize(), 3000);
});

// Forward ACK events -> Next.js (sent/delivered/read/failed)
client.on('message_ack', async (msg, ack) => {
  try {
    const statusMap = { 1: 'sent', 2: 'delivered', 3: 'read', '-1': 'failed' };
    const status = statusMap[String(ack)];
    if (!status) return;
    await axios.post(
      NEXT_APP_URL + '/api/webhook/whatsapp-ack',
      { wa_message_id: msg.id._serialized, status, timestamp: new Date().toISOString() },
      { timeout: 5000 }
    ).catch(() => {});
  } catch (_) {}
});

// Forward inbound messages -> Next.js
client.on('message', async (msg) => {
  try {
    if (msg.fromMe) return;
    await axios.post(
      NEXT_APP_URL + '/api/webhook/whatsapp',
      { from: msg.from, body: msg.body, type: msg.type, hasMedia: msg.hasMedia, timestamp: new Date().toISOString() },
      { timeout: 5000 }
    ).catch(() => {});
  } catch (_) {}
});

client.initialize();

// ─── Helpers ─────────────────────────────────────────────────────────────────
function toChatId(phone) {
  // If already a full WA chat ID (contains @), return as-is
  if (phone && phone.includes('@')) return phone;
  const digits = phone.replace(/[^0-9]/g, '');
  const withCountry = digits.length === 10 ? '91' + digits : digits;
  return withCountry + '@c.us';
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
function randomDelay(base, jitter) {
  return base * 1000 + Math.floor(Math.random() * (jitter || 5000));
}

// ─── Routes ──────────────────────────────────────────────────────────────────

app.get('/status', (req, res) => {
  res.json({
    isReady, isAuthenticated, hasQr: !!qrCodeData, clientInfo,
    activeCampaigns: Object.entries(activeCampaigns).map(([id, s]) => ({
      id, running: s.running, paused: s.paused,
    })),
  });
});

app.get('/qr', async (req, res) => {
  if (!qrCodeData) return res.json({ qr: null });
  try { const dataUrl = await qrcode.toDataURL(qrCodeData); res.json({ qr: dataUrl }); }
  catch (err) { res.status(500).json({ error: 'QR generation failed' }); }
});

app.post('/disconnect', async (req, res) => {
  try {
    await client.logout();
    isReady = false; isAuthenticated = false; qrCodeData = null; clientInfo = null;
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Single text message
app.post('/send', async (req, res) => {
  if (!isReady) return res.status(503).json({ error: 'WhatsApp not connected' });
  const { phone, message } = req.body;
  if (!phone || !message) return res.status(400).json({ error: 'phone and message required' });
  try {
    const msg = await client.sendMessage(toChatId(phone), message);
    res.json({ success: true, messageId: msg.id._serialized });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Single media message
app.post('/send-media', async (req, res) => {
  if (!isReady) return res.status(503).json({ error: 'WhatsApp not connected' });
  const { phone, mediaUrl, mediaBase64, mimeType, filename, caption, message } = req.body;
  if (!phone) return res.status(400).json({ error: 'phone required' });
  if (!mediaUrl && !mediaBase64) return res.status(400).json({ error: 'mediaUrl or mediaBase64 required' });
  try {
    const chatId = toChatId(phone);
    let media;
    if (mediaUrl) { media = await MessageMedia.fromUrl(mediaUrl, { unsafeMime: true }); }
    else { media = new MessageMedia(mimeType || 'image/jpeg', mediaBase64, filename || 'media'); }
    const options = caption ? { caption } : {};
    const mediaMsg = await client.sendMessage(chatId, media, options);
    let textMsgId = null;
    if (message) { await sleep(1000); const t = await client.sendMessage(chatId, message); textMsgId = t.id._serialized; }
    res.json({ success: true, mediaMessageId: mediaMsg.id._serialized, textMessageId: textMsgId });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Start bulk campaign
app.post('/campaign/start', async (req, res) => {
  if (!isReady) return res.status(503).json({ error: 'WhatsApp not connected' });
  const { campaignId, recipients, delaySeconds } = req.body;
  const delay = delaySeconds || 20;
  if (!campaignId || !recipients || !recipients.length)
    return res.status(400).json({ error: 'campaignId and recipients required' });
  if (activeCampaigns[campaignId] && activeCampaigns[campaignId].running)
    return res.status(409).json({ error: 'Campaign already running' });

  activeCampaigns[campaignId] = { running: true, paused: false };
  res.json({ success: true, message: 'Started for ' + recipients.length + ' recipients' });

  (async () => {
    for (let i = 0; i < recipients.length; i++) {
      if (!activeCampaigns[campaignId]) break;
      // Pause loop
      while (activeCampaigns[campaignId] && activeCampaigns[campaignId].paused) { await sleep(2000); }
      if (!activeCampaigns[campaignId]) break;
      // Wait for WA reconnect if needed
      while (!isReady) { await sleep(5000); }

      const r = recipients[i];
      try {
        let msgId;
        if (r.mediaUrl || r.mediaBase64) {
          let media;
          if (r.mediaUrl) { media = await MessageMedia.fromUrl(r.mediaUrl, { unsafeMime: true }); }
          else { media = new MessageMedia(r.mimeType || 'image/jpeg', r.mediaBase64, r.filename || 'media'); }
          const opts = r.caption ? { caption: r.caption } : (r.message ? { caption: r.message } : {});
          const sent = await client.sendMessage(toChatId(r.phone), media, opts);
          msgId = sent.id._serialized;
        } else {
          const sent = await client.sendMessage(toChatId(r.phone), r.message);
          msgId = sent.id._serialized;
        }
        await axios.post(
          NEXT_APP_URL + '/api/marketing/campaigns/' + campaignId + '/recipient-sent',
          { phone: r.phone, wa_message_id: msgId, status: 'sent' },
          { timeout: 5000 }
        ).catch(() => {});
        console.log('[Campaign ' + campaignId + '] [' + (i + 1) + '/' + recipients.length + '] OK ' + r.phone);
      } catch (err) {
        console.error('[Campaign ' + campaignId + '] FAIL ' + r.phone + ':', err.message);
        await axios.post(
          NEXT_APP_URL + '/api/marketing/campaigns/' + campaignId + '/recipient-sent',
          { phone: r.phone, wa_message_id: null, status: 'failed', error: err.message },
          { timeout: 5000 }
        ).catch(() => {});
      }
      if (i < recipients.length - 1) {
        const d = randomDelay(delay);
        console.log('[Campaign ' + campaignId + '] Waiting ' + Math.round(d / 1000) + 's...');
        await sleep(d);
      }
    }
    if (activeCampaigns[campaignId]) activeCampaigns[campaignId].running = false;
    delete activeCampaigns[campaignId];
    await axios.post(NEXT_APP_URL + '/api/marketing/campaigns/' + campaignId + '/complete', {}, { timeout: 5000 }).catch(() => {});
    console.log('[Campaign ' + campaignId + '] Completed');
  })();
});

app.post('/campaign/pause', (req, res) => {
  const { campaignId } = req.body;
  if (!activeCampaigns[campaignId]) return res.status(404).json({ error: 'Campaign not found' });
  activeCampaigns[campaignId].paused = true;
  res.json({ success: true });
});

app.post('/campaign/resume', (req, res) => {
  const { campaignId } = req.body;
  if (!activeCampaigns[campaignId]) return res.status(404).json({ error: 'Campaign not found' });
  activeCampaigns[campaignId].paused = false;
  res.json({ success: true });
});

app.post('/campaign/stop', (req, res) => {
  const { campaignId } = req.body;
  if (activeCampaigns[campaignId]) delete activeCampaigns[campaignId];
  res.json({ success: true });
});

app.get('/contacts', async (req, res) => {
  if (!isReady) return res.status(503).json({ error: 'WhatsApp not connected' });
  try {
    const contacts = await client.getContacts();
    const filtered = contacts
      .filter((c) => !c.isGroup && c.isMyContact && c.number)
      .map((c) => ({ name: c.name || c.pushname || c.number, number: c.number, id: c.id._serialized }));
    res.json({ contacts: filtered });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /chats — all recent chats (like WA inbox)
app.get('/chats', async (req, res) => {
  if (!isReady) return res.status(503).json({ error: 'WhatsApp not connected', chats: [] });
  try {
    const chats = await client.getChats();
    const result = [];
    // Limit to first 30 for faster response
    for (const chat of chats.slice(0, 30)) {
      try {
        result.push({
          id: chat.id._serialized,
          name: chat.name || chat.id.user,
          phone: chat.id.user,
          lastMessage: chat.lastMessage ? chat.lastMessage.body : '',
          lastMessageTime: chat.lastMessage ? new Date(chat.lastMessage.timestamp * 1000).toISOString() : null,
          lastMessageFromMe: chat.lastMessage ? chat.lastMessage.fromMe : false,
          unreadCount: chat.unreadCount,
          isGroup: chat.isGroup,
        });
      } catch (_) {}
    }
    res.json({ chats: result });
  } catch (err) { 
    console.error('[/chats] Error:', err.message);
    res.status(500).json({ error: err.message, chats: [] }); 
  }
});

// GET /messages/:chatId — fetch messages for a chat
app.get('/messages/:chatId', async (req, res) => {
  if (!isReady) return res.status(503).json({ error: 'WhatsApp not connected' });
  const { chatId } = req.params;
  const limit = parseInt(req.query.limit) || 50;
  try {
    const chat = await client.getChatById(chatId);
    const messages = await chat.fetchMessages({ limit });
    const result = messages.map((msg) => ({
      id: msg.id._serialized,
      body: msg.body,
      fromMe: msg.fromMe,
      type: msg.type,
      hasMedia: msg.hasMedia,
      timestamp: new Date(msg.timestamp * 1000).toISOString(),
      ack: msg.ack, // 0=pending,1=sent,2=delivered,3=read,-1=error
      author: msg.author || null,
    }));
    // Mark as read
    await chat.sendSeen().catch(() => {});
    res.json({ messages: result });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.listen(port, () => {
  console.log('[WA Backend] Running on port ' + port);
  console.log('[WA Backend] Reporting to Next.js at ' + NEXT_APP_URL);
});
