const express = require('express');
const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const cors = require('cors');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

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

// Create cache directory if it doesn't exist
const cacheDir = path.join(__dirname, '.wwebjs_cache');
if (!fs.existsSync(cacheDir)) {
  fs.mkdirSync(cacheDir, { recursive: true });
}

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
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
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
  authStrategy: new LocalAuth({ 
    clientId: 'mobilehub', 
    dataPath: waDataPath 
  }),
  puppeteer: {
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--disable-gpu',
      '--disable-software-rasterizer',
      '--disable-extensions',
      '--disable-background-networking',
      '--disable-sync',
      '--disable-translate',
      '--hide-scrollbars',
      '--metrics-recording-only',
      '--mute-audio',
      '--no-default-browser-check',
      '--disable-default-apps',
      '--disable-hang-monitor',
      '--disable-popup-blocking',
      '--disable-prompt-on-repost',
      '--disable-component-update',
      '--disable-domain-reliability',
      '--disable-features=TranslateUI',
      '--disable-ipc-flooding-protection',
      '--disable-renderer-backgrounding',
      '--disable-backgrounding-occluded-windows',
      '--disable-breakpad',
      '--enable-features=NetworkService,NetworkServiceInProcess',
      '--force-color-profile=srgb',
    ],
    headless: true,
    executablePath: chromePath,
    timeout: 60000, // 1 minute timeout
    protocolTimeout: 180000, // 3 minutes for protocol
  },
  authTimeoutMs: 60000, // 1 minute for auth
  qrMaxRetries: 3,
  restartOnAuthFail: false,
  takeoverOnConflict: true,
  takeoverTimeoutMs: 10000,
  // Use local cache for faster loading
  webVersionCache: {
    type: 'local',
    path: cacheDir,
  },
});

client.on('qr', (qr) => {
  console.log('[WA] QR received');
  qrCodeData = qr; isAuthenticated = false; isReady = false;
});

client.on('ready', async () => {
  console.log('[WA] Client ready');
  isReady = true; isAuthenticated = true; qrCodeData = null;
  try { 
    const info = client.info; 
    clientInfo = { name: info.pushname, phone: info.wid.user }; 
    console.log('[WA] Connected as:', clientInfo.name, clientInfo.phone);
  } catch (err) {
    console.error('[WA] Failed to get client info:', err.message);
  }
});

client.on('authenticated', () => { 
  console.log('[WA] Authenticated'); 
  isAuthenticated = true; 
});

client.on('auth_failure', (msg) => { 
  console.error('[WA] Auth failure:', msg); 
  isAuthenticated = false; 
  isReady = false; 
});

client.on('disconnected', (reason) => {
  console.warn('[WA] Disconnected:', reason);
  isAuthenticated = false; isReady = false; qrCodeData = null; clientInfo = null;
  Object.keys(activeCampaigns).forEach((id) => {
    if (activeCampaigns[id]) activeCampaigns[id].paused = true;
  });
  setTimeout(() => {
    console.log('[WA] Attempting to reconnect...');
    client.initialize().catch((err) => {
      console.error('[WA] Reconnection failed:', err.message);
    });
  }, 5000);
});

// Handle loading screen
client.on('loading_screen', (percent, message) => {
  console.log('[WA] Loading:', percent + '%', message);
});

// Handle remote session saved
client.on('remote_session_saved', () => {
  console.log('[WA] Remote session saved');
});

// Catch unhandled errors
process.on('unhandledRejection', (reason, promise) => {
  console.error('[WA] Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't crash the process
});

process.on('uncaughtException', (error) => {
  console.error('[WA] Uncaught Exception:', error);
  // Don't crash the process for WhatsApp Web.js errors
  if (error.message && error.message.includes('Execution context was destroyed')) {
    console.log('[WA] Ignoring execution context error - this is normal after authentication');
    return;
  }
  if (error.message && error.message.includes('Session closed')) {
    console.log('[WA] Session closed - will reconnect');
    isReady = false;
    isAuthenticated = false;
    return;
  }
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

// ─── Community Routes ────────────────────────────────────────────────────────

// GET /communities — list all communities
app.get('/communities', async (req, res) => {
  if (!isReady) return res.status(503).json({ error: 'WhatsApp not connected', communities: [] });
  try {
    const chats = await client.getChats();
    const communities = [];
    
    for (const chat of chats) {
      try {
        // Check if it's a community (has isCommunity property or specific structure)
        if (chat.id && chat.id._serialized && chat.id._serialized.includes('@newsletter')) {
          communities.push({
            id: chat.id._serialized,
            name: chat.name || 'Unnamed Community',
            description: chat.description || '',
            memberCount: chat.participants ? chat.participants.length : 0,
            groupCount: 0, // WhatsApp Web.js doesn't expose this directly
            timestamp: chat.timestamp || Date.now(),
          });
        }
      } catch (_) {}
    }
    
    res.json({ communities });
  } catch (err) {
    console.error('[/communities] Error:', err.message);
    res.status(500).json({ error: err.message, communities: [] });
  }
});

// GET /communities/:communityId — get community details
app.get('/communities/:communityId', async (req, res) => {
  if (!isReady) return res.status(503).json({ error: 'WhatsApp not connected' });
  const { communityId } = req.params;
  try {
    const chat = await client.getChatById(communityId);
    const participants = chat.participants || [];
    
    res.json({
      community: {
        id: chat.id._serialized,
        name: chat.name || 'Unnamed Community',
        description: chat.description || '',
        memberCount: participants.length,
        participants: participants.map((p) => ({
          id: p.id._serialized,
          phone: p.id.user,
          isAdmin: p.isAdmin || false,
        })),
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /communities/:communityId/announce — send announcement to community
app.post('/communities/:communityId/announce', async (req, res) => {
  if (!isReady) return res.status(503).json({ error: 'WhatsApp not connected' });
  const { communityId } = req.params;
  const { message, mediaUrl, mediaBase64, mimeType, filename } = req.body;
  
  if (!message && !mediaUrl && !mediaBase64) {
    return res.status(400).json({ error: 'message or media required' });
  }
  
  try {
    let msgId;
    
    if (mediaUrl || mediaBase64) {
      let media;
      if (mediaUrl) {
        media = await MessageMedia.fromUrl(mediaUrl, { unsafeMime: true });
      } else {
        media = new MessageMedia(mimeType || 'image/jpeg', mediaBase64, filename || 'media');
      }
      const opts = message ? { caption: message } : {};
      const sent = await client.sendMessage(communityId, media, opts);
      msgId = sent.id._serialized;
    } else {
      const sent = await client.sendMessage(communityId, message);
      msgId = sent.id._serialized;
    }
    
    res.json({ success: true, messageId: msgId });
  } catch (err) {
    console.error('[/communities/announce] Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /groups — list all groups (including community groups)
app.get('/groups', async (req, res) => {
  if (!isReady) return res.status(503).json({ error: 'WhatsApp not connected', groups: [] });
  try {
    const chats = await client.getChats();
    const groups = [];
    
    for (const chat of chats) {
      try {
        if (chat.isGroup) {
          groups.push({
            id: chat.id._serialized,
            name: chat.name || 'Unnamed Group',
            description: chat.description || '',
            memberCount: chat.participants ? chat.participants.length : 0,
            timestamp: chat.timestamp || Date.now(),
            isGroup: true,
          });
        }
      } catch (_) {}
    }
    
    res.json({ groups });
  } catch (err) {
    console.error('[/groups] Error:', err.message);
    res.status(500).json({ error: err.message, groups: [] });
  }
});

// GET /groups/:groupId — get group details
app.get('/groups/:groupId', async (req, res) => {
  if (!isReady) return res.status(503).json({ error: 'WhatsApp not connected' });
  const { groupId } = req.params;
  try {
    const chat = await client.getChatById(groupId);
    const participants = chat.participants || [];
    
    res.json({
      group: {
        id: chat.id._serialized,
        name: chat.name || 'Unnamed Group',
        description: chat.description || '',
        memberCount: participants.length,
        participants: participants.map((p) => ({
          id: p.id._serialized,
          phone: p.id.user,
          isAdmin: p.isAdmin || false,
        })),
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /groups/create — create a new WhatsApp group
app.post('/groups/create', async (req, res) => {
  if (!isReady) return res.status(503).json({ error: 'WhatsApp not connected' });
  const { name, participants } = req.body;
  
  if (!name || !participants || !Array.isArray(participants) || participants.length === 0) {
    return res.status(400).json({ error: 'name and participants array required' });
  }
  
  try {
    // Convert phone numbers to WhatsApp IDs
    const participantIds = participants.map((phone) => toChatId(phone));
    
    // Create group
    const group = await client.createGroup(name, participantIds);
    
    res.json({
      success: true,
      group: {
        id: group.gid._serialized,
        name: name,
        participants: participantIds,
      },
    });
  } catch (err) {
    console.error('[/groups/create] Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /groups/:groupId/add-participants — add members to group
app.post('/groups/:groupId/add-participants', async (req, res) => {
  if (!isReady) return res.status(503).json({ error: 'WhatsApp not connected' });
  const { groupId } = req.params;
  const { participants } = req.body;
  
  if (!participants || !Array.isArray(participants) || participants.length === 0) {
    return res.status(400).json({ error: 'participants array required' });
  }
  
  try {
    const chat = await client.getChatById(groupId);
    const participantIds = participants.map((phone) => toChatId(phone));
    
    await chat.addParticipants(participantIds);
    
    res.json({ success: true });
  } catch (err) {
    console.error('[/groups/add-participants] Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /groups/:groupId/remove-participant — remove member from group
app.post('/groups/:groupId/remove-participant', async (req, res) => {
  if (!isReady) return res.status(503).json({ error: 'WhatsApp not connected' });
  const { groupId } = req.params;
  const { participant } = req.body;
  
  if (!participant) {
    return res.status(400).json({ error: 'participant phone required' });
  }
  
  try {
    const chat = await client.getChatById(groupId);
    const participantId = toChatId(participant);
    
    await chat.removeParticipants([participantId]);
    
    res.json({ success: true });
  } catch (err) {
    console.error('[/groups/remove-participant] Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// PUT /groups/:groupId — update group details
app.put('/groups/:groupId', async (req, res) => {
  if (!isReady) return res.status(503).json({ error: 'WhatsApp not connected' });
  const { groupId } = req.params;
  const { name, description } = req.body;
  
  try {
    const chat = await client.getChatById(groupId);
    
    if (name) {
      await chat.setSubject(name);
    }
    
    if (description !== undefined) {
      await chat.setDescription(description);
    }
    
    res.json({ success: true });
  } catch (err) {
    console.error('[/groups/update] Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /groups/:groupId/leave — leave a group
app.delete('/groups/:groupId/leave', async (req, res) => {
  if (!isReady) return res.status(503).json({ error: 'WhatsApp not connected' });
  const { groupId } = req.params;
  
  try {
    const chat = await client.getChatById(groupId);
    await chat.leave();
    
    res.json({ success: true });
  } catch (err) {
    console.error('[/groups/leave] Error:', err.message);
    res.status(500).json({ error: err.message });
  }
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
