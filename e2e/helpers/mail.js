const { ImapFlow } = require('imapflow');
const { simpleParser } = require('mailparser');

// Reads the run's Ethereal inboxes over IMAP. Each run gets two new ones (make-env.js), so both start
// empty: SMTP_* gets the e2e people's mail, DEMO_SMTP_* the demo accounts' (@demo.subpulse.test).

function inboxConfig(inbox) {
  return {
    host: 'imap.ethereal.email',
    port: 993,
    secure: true,
    auth: { user: process.env[`${inbox}_USER`], pass: process.env[`${inbox}_PASS`] },
    logger: false,
  };
}

/** Waits for the newest message to `to` whose subject matches, and returns it parsed. */
async function waitForMail({ to, subject, inbox = 'SMTP', timeoutMs = 30_000 }) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const found = await findMail({ to, subject, inbox });
    if (found) return found;
    await new Promise((resolve) => setTimeout(resolve, 1500));
  }
  throw new Error(`No mail to ${to} matching ${subject} within ${timeoutMs / 1000} s`);
}

async function findMail({ to, subject, inbox }) {
  const imap = new ImapFlow(inboxConfig(inbox));
  await imap.connect();
  try {
    const lock = await imap.getMailboxLock('INBOX');
    try {
      const uids = await imap.search({ to }, { uid: true });
      for (const uid of [...(uids || [])].reverse()) {
        const message = await imap.fetchOne(String(uid), { source: true }, { uid: true });
        // A message still being delivered can come back without its source; the next poll gets it.
        if (!message?.source) continue;
        const parsed = await simpleParser(message.source);
        if (subject.test(parsed.subject ?? '')) return parsed;
      }
      return null;
    } finally {
      lock.release();
    }
  } finally {
    await imap.logout();
  }
}

/** How many messages to `to` have a subject that matches (for "sent exactly once" checks). */
async function countMail({ to, subject, inbox = 'SMTP' }) {
  const imap = new ImapFlow(inboxConfig(inbox));
  await imap.connect();
  try {
    const lock = await imap.getMailboxLock('INBOX');
    try {
      const uids = (await imap.search({ to }, { uid: true })) || [];
      let count = 0;
      for (const uid of uids) {
        const message = await imap.fetchOne(String(uid), { envelope: true }, { uid: true });
        if (subject.test(message?.envelope?.subject ?? '')) count += 1;
      }
      return count;
    } finally {
      lock.release();
    }
  } finally {
    await imap.logout();
  }
}

module.exports = { waitForMail, countMail };
