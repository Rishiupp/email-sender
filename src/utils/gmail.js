import { google } from 'googleapis';
// import MailComposer from 'nodemailer/lib/mail-composer';
import MailComposer from 'nodemailer/lib/mail-composer/index.js';
import dotenv from 'dotenv';
dotenv.config();

const {
  CLIENT_ID, CLIENT_SECRET, REDIRECT_URI, REFRESH_TOKEN
} = process.env;

// Initialize a reusable OAuth2 client
function getOauth2Client() {
  const oauth2Client = new google.auth.OAuth2(
    CLIENT_ID, CLIENT_SECRET, REDIRECT_URI
  );
  oauth2Client.setCredentials({ refresh_token: REFRESH_TOKEN });
  return oauth2Client;
}

/**
 * Creates a Gmail draft.
 * @param {string} to       – recipient email
 * @param {string} subject
 * @param {string} htmlBody – HTML content of the email
 * @returns {Promise<string>} – the draft ID
 */
export async function saveGmailDraft(to, subject, htmlBody) {
  const oauth2Client = getOauth2Client();
  const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

  // Build MIME message
  const mail = new MailComposer({
    from: 'me',
    to,
    subject,
    html: htmlBody
  });
  const messageBuffer = await mail.compile().build();
  const raw = messageBuffer
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  // Save draft
  const res = await gmail.users.drafts.create({
    userId: 'me',
    requestBody: { message: { raw } }
  });

  return res.data.id;
}
