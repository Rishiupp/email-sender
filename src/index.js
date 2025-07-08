import express from 'express';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import PDFDocument from 'pdfkit';
import { saveGmailDraft } from './utils/gmail.js';

dotenv.config();

const app = express();
const __dirname = dirname(fileURLToPath(import.meta.url));
app.use(express.json());

const PORT = process.env.PORT || 3000;
const VALID_API_KEY = process.env.API_KEY;

function generatePdfBuffer(result_message) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    const doc = new PDFDocument({ margin: 40 });

    doc.on('data', chunk => chunks.push(chunk));
    doc.on('end', () => {
      const pdfBuffer = Buffer.concat(chunks);
      resolve(pdfBuffer);
    });
    doc.on('error', reject);

    doc.fontSize(12).text('EMI Calculation Result', { underline: true });
    doc.moveDown();

    result_message.split('\n').forEach(line => {
      doc.text(line);
    });

    doc.moveDown();
    doc.text('Thanks,');
    doc.text('Your Company');

    doc.end();
  });
}

app.post('/api/create-gmail-draft', async (req, res) => {
  try {
    const apiKey = req.header('x-api-key');
    if (!apiKey || apiKey !== VALID_API_KEY) {
      return res.status(401).json({ success: false, error: 'Invalid API key' });
    }

    const { to, result_message } = req.body;
    if (!to || !result_message) {
      return res.status(400).json({ success: false, error: 'Missing `to` or `result_message`' });
    }

    const subject = 'Your EMI Calculation Result';
    const htmlBody = `
      <p>Hi there,</p>
      <p>${result_message.replace(/\n/g, '<br>')}</p>
      <p>Thanks,<br>Your Company</p>
    `;

    const pdfBuffer = await generatePdfBuffer(result_message);

    const attachments = [{
      filename: 'EMI_Result.pdf',
      content: pdfBuffer,
      contentType: 'application/pdf'
    }];

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
