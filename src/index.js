import express from 'express';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import PDFDocument from 'pdfkit';
import getStream from 'get-stream';       // to collect the PDF into a buffer
import { saveGmailDraft } from './utils/gmail.js';

dotenv.config();

const app = express();
const __dirname = dirname(fileURLToPath(import.meta.url));
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
    const { to, result_message } = req.body;
    if (!to || !result_message) {
      return res.status(400).json({ success: false, error: 'Missing `to` or `result_message`' });
    }

    // 3) Build HTML body for the email
    const subject = 'Your EMI Calculation Result';
    const htmlBody = `
      <p>Hi there,</p>
      <p>${result_message.replace(/\n/g, '<br>')}</p>
      <p>Thanks,<br>Your Company</p>
    `;

    // 4) Generate a PDF on the fly containing the same text
    const doc = new PDFDocument({ margin: 40 });
    doc.fontSize(12).text('EMI Calculation Result', { underline: true });
    doc.moveDown();

    // Split lines and write them
    result_message.split('\n').forEach(line => {
      doc.text(line);
    });

    doc.moveDown();
    doc.text('Thanks,');
    doc.text('Your Company');

    doc.end();
    // Collect the PDF into a Buffer
    const pdfBuffer = await getStream.buffer(doc);

    // 5) Prepare the attachment (base64-encoded)
    const attachments = [{
      filename: 'EMI_Result.pdf',
      content: pdfBuffer.toString('base64'),
      encoding: 'base64',
      contentType: 'application/pdf'
    }];

    // 6) Create the Gmail draft with PDF attached
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
