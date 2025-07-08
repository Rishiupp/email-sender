import express from 'express';
import dotenv from 'dotenv';
import fetch from 'node-fetch';
import { saveGmailDraft } from './utils/gmail.js';

dotenv.config();
const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
const VALID_API_KEY = process.env.API_KEY;

app.post('/api/create-gmail-draft', async (req, res) => {
  try {
    // 1) API key check
    const apiKey = req.header('x-api-key');
    if (!apiKey || apiKey !== VALID_API_KEY) {
      return res.status(401).json({ success: false, error: 'Invalid API key' });
    }

    // 2) Payload validation
    const { to, result_message, pdf_url } = req.body;
    if (!to || !result_message) {
      return res.status(400).json({ success: false, error: 'Missing `to` or `result_message`' });
    }

    // 3) HTML body
    const subject = 'Your EMI Calculation Result';
    const htmlBody = `
      <p>Hi there,</p>
      <p>${result_message.replace(/\n/g, '<br>')}</p>
      <p>Thanks,<br>Your Company</p>
    `;

    // 4) Fetch & base64‑encode PDF if provided
    let attachments = [];
    if (pdf_url) {
      const fetchRes = await fetch(pdf_url);
      if (!fetchRes.ok) throw new Error(`Could not fetch PDF: ${fetchRes.statusText}`);
      const pdfBuffer = await fetchRes.buffer();
      attachments.push({
        filename: 'attachment.pdf',
        content: pdfBuffer.toString('base64'),
        encoding: 'base64',
        contentType: 'application/pdf'
      });
    }

    // 5) Save draft
    const draftId = await saveGmailDraft(to, subject, htmlBody, attachments);
    return res.json({ success: true, draftId });
  }
  catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Gmail‑draft middleware listening on port ${PORT}`);
});
