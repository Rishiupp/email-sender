import { google } from 'googleapis';
import MailComposer from 'nodemailer/lib/mail-composer/index.js';
import dotenv from 'dotenv';
dotenv.config();

const {
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URI,
  REFRESH_TOKEN
} = process.env;

function getOauth2Client() {
  const oauth2Client = new google.auth.OAuth2(
    CLIENT_ID, CLIENT_SECRET, REDIRECT_URI
  );
  oauth2Client.setCredentials({ refresh_token: REFRESH_TOKEN });
  return oauth2Client;
}

/**
 * Creates a Gmail draft, optionally with attachments.
 *
 * @param {string}    to
 * @param {string}    subject
 * @param {string}    htmlBody
 * @param {{filename:string, content:Buffer, contentType:string}[]} [attachments]
 * @returns {Promise<string>} draft ID
 */
export async function saveGmailDraft(to, subject, htmlBody, attachments = []) {
  const oauth2Client = getOauth2Client();
  const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

  const mail = new MailComposer({
    from: 'me',
    to,
    subject,
    html: htmlBody,
    attachments: attachments.map(att => ({
      filename: att.filename,
      content: att.content,
      contentType: att.contentType
    }))
  });

  const messageBuffer = await mail.compile().build();
  const raw = messageBuffer
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  const res = await gmail.users.drafts.create({
    userId: 'me',
    requestBody: { message: { raw } }
  });
  return res.data.id;
}
