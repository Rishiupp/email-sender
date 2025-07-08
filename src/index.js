import express from 'express';
import dotenv from 'dotenv';
import { saveGmailDraft } from './utils/gmail.js';

dotenv.config();
const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
const VALID_API_KEY = process.env.API_KEY;

const mime = [
  'From: me@example.com',
  'To: you@example.com',
  'Subject: Hello from Playground',
  '',
  'This is a test draft created via the API.'
].join('\r\n');
let raw = Buffer.from(mime).toString('base64')
  .replace(/\+/g,'-')
  .replace(/\//g,'_')
  .replace(/=+$/,'');
console.log(raw);


// POST /api/create-gmail-draft
app.post('/api/create-gmail-draft', async (req, res) => {
  try {
    // 1) API key check
    const apiKey = req.header('x-api-key');
    if (!apiKey || apiKey !== VALID_API_KEY) {
      return res.status(401).json({ success: false, error: 'Invalid API key' });
    }

    // 2) Validate payload
    const { to, result_message } = req.body;
    if (!to || !result_message) {
      return res.status(400).json({ success: false, error: 'Missing `to` or `result_message`' });
    }

    // 3) Build a simple HTML template
    const subject = 'Your EMI Calculation Result';
    const htmlBody = `
      <p>Hi there,</p>
      <p>${result_message.replace(/\n/g, '<br>')}</p>
      <p>Thanks,<br>Your Company</p>
    `;

    // 4) Save draft via Gmail API
    const draftId = await saveGmailDraft(to, subject, htmlBody);

    // 5) Respond JSON
    res.json({ success: true, draftId });
  }
  
  catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Gmail‐draft middleware listening on port ${PORT}`);
});
