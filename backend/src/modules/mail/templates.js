const path = require('node:path');
const { DateTime } = require('luxon');
const { escapeHtml } = require('../../utils/html');
const { CONDITIONS, describeRule } = require('../rules/conditions');
const { formatTime, formatWindow } = require('../rules/timeFormat');

// Brand colours from UI-UX.md.
const INK = '#1d1a3a';
const SUN = '#ffd23f';
const CREAM = '#fff8ec';
const MUTED = '#5d5a7a';
const CORAL_INK = '#b42d1c';
const SKY_SOFT = '#d4efff';
const SUN_SOFT = '#fff1b8';
const CORAL_SOFT = '#ffd9d3';

const HEADING_FONT = "Fredoka,'Arial Rounded MT Bold',Arial,sans-serif";
const BODY_FONT = 'Nunito,Arial,Helvetica,sans-serif';

/**
 * The logo and the cloud are PNG attachments shown with "cid:" links. Most email clients
 * (Gmail among them) strip inline SVG and block data: images, but show attached images.
 * The PNGs are rendered at 4x from assets/*.svg, which are copied from design/ui-sample.html.
 */
const ASSETS_DIR = path.join(__dirname, 'assets');
const LOGO_CID = 'logo@weatherping';
const CLOUD_CID = 'cloud@weatherping';

function brandImages() {
  return [
    { filename: 'weatherping-logo.png', path: path.join(ASSETS_DIR, 'logo.png'), cid: LOGO_CID },
    { filename: 'weatherping-cloud.png', path: path.join(ASSETS_DIR, 'cloud.png'), cid: CLOUD_CID },
  ];
}

function button(label, url) {
  return `<a href="${escapeHtml(url)}" style="display:inline-block;background:${SUN};color:${INK};border:3px solid ${INK};border-radius:18px;box-shadow:3px 3px 0 ${INK};padding:12px 20px;font-family:${HEADING_FONT};font-weight:600;font-size:17px;text-decoration:none">${escapeHtml(label)}</a>`;
}

/**
 * Shared frame from the approved design: yellow header with the logo, the wordmark,
 * a headline and the rain cloud; white body below. bodyHtml must already be escaped.
 */
function layout(headline, bodyHtml) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<link href="https://fonts.googleapis.com/css2?family=Fredoka:wght@600;700&family=Nunito:wght@400;700;800&display=swap" rel="stylesheet">
<title>${escapeHtml(headline)}</title>
</head>
<body style="margin:0;background:${CREAM};font-family:${BODY_FONT};color:${INK}">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${CREAM};padding:24px 12px">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:3px solid ${INK};border-radius:22px;border-collapse:separate;overflow:hidden">
        <tr><td style="background:${SUN};border-bottom:3px solid ${INK};padding:24px 16px 0 24px">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
            <td valign="top" style="padding-bottom:24px">
              <table role="presentation" cellpadding="0" cellspacing="0"><tr>
                <td style="vertical-align:middle"><img src="cid:${LOGO_CID}" width="30" height="30" alt="" style="display:block;border:0"></td>
                <td style="vertical-align:middle;padding-left:8px;font-family:${HEADING_FONT};font-weight:600;font-size:16px;color:${INK}">WeatherPing</td>
              </tr></table>
              <div style="font-family:${HEADING_FONT};font-weight:700;font-size:30px;line-height:1.1;margin-top:12px;color:${INK}">${escapeHtml(headline)}</div>
            </td>
            <td valign="bottom" align="right" width="110" style="width:110px"><img src="cid:${CLOUD_CID}" width="110" height="94" alt="" style="display:block;border:0"></td>
          </tr></table>
        </td></tr>
        <tr><td style="padding:22px 24px;font-size:15px;line-height:1.6;font-family:${BODY_FONT};color:${INK}">${bodyHtml}</td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function factTile(value, label, background) {
  return `<td width="32%" style="background:${background};border:3px solid ${INK};border-radius:16px;padding:8px;text-align:center;font-size:12px;color:${INK}">
    <div style="font-family:${HEADING_FONT};font-weight:700;font-size:24px;line-height:1.2">${escapeHtml(value)}</div>${escapeHtml(label)}
  </td>`;
}

/** "today", "tomorrow" or "on Wed 22 Oct", seen from the user's time zone. */
function dayPhrase(day, now, timeZone) {
  const today = DateTime.fromJSDate(now, { zone: timeZone }).startOf('day');
  const daysAhead = Math.round(day.diff(today, 'days').days);
  if (daysAhead === 0) return 'today';
  if (daysAhead === 1) return 'tomorrow';
  return `on ${day.toFormat('ccc d LLL')}`;
}

// "Asia/Kolkata" -> "Kolkata time"
function zoneLabel(timeZone) {
  const city = timeZone.split('/').pop().replace(/_/g, ' ');
  return `${city} time`;
}

function capitalise(text) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** Returns { subject, text, html, attachments }. */
function passwordResetEmail(name, resetLink) {
  const subject = 'Reset your WeatherPing password';
  const text = [
    `Hi ${name},`,
    '',
    'Someone asked to reset the password for your WeatherPing account.',
    `Set a new password here (the link works once and expires in 30 minutes): ${resetLink}`,
    '',
    "If it wasn't you, ignore this email. Your password stays the same.",
  ].join('\n');

  const html = layout(
    'Reset your password',
    `<p style="margin:0 0 12px">Hi ${escapeHtml(name)},</p>
     <p style="margin:0 0 12px">Someone asked to reset the password for your WeatherPing account.</p>
     <p style="margin:20px 0">${button('Set a new password →', resetLink)}</p>
     <p style="font-size:13px;color:${MUTED};margin:18px 0 0;border-top:2px dashed ${INK};padding-top:12px">The link works once and expires in 30 minutes. If it wasn't you, ignore this email: your password stays the same.</p>`,
  );

  return { subject, text, html, attachments: brandImages() };
}

/**
 * One weather alert, laid out like the "Alert email" in design/ui-sample.html.
 * alert: the alert event { locationName, condition, threshold, windowStart, windowEnd,
 * eventKey, forecastValue, forecastTime }. Times are shown in the user's time zone.
 * Returns { subject, text, html, attachments }.
 */
function weatherAlertEmail({ name, timeZone, alert, appLink, unsubscribeLink, now = new Date() }) {
  const condition = CONDITIONS[alert.condition];
  const day = DateTime.fromISO(alert.eventKey, { zone: timeZone });
  const when = dayPhrase(day, now, timeZone);
  const window = formatWindow(alert.windowStart, alert.windowEnd);
  const peakTime = formatTime(DateTime.fromJSDate(alert.forecastTime, { zone: timeZone }).toFormat('HH:mm'));
  const ruleSummary = capitalise(describeRule(alert));
  const fact = condition.fact(alert.forecastValue);

  const headline = `${condition.headline} in ${alert.locationName} ${when}`;
  const subject = `${headline}, ${window}`;

  const text = [
    `Hi ${name},`,
    '',
    `Your rule "${ruleSummary}" just matched the forecast for ${alert.locationName}.`,
    `Forecast: ${condition.formatValue(alert.forecastValue)} around ${peakTime}`,
    `When: ${day.toFormat('cccc d LLLL')}, ${window} (${timeZone})`,
    '',
    `Open WeatherPing: ${appLink}`,
    '',
    'One email per event, because you set this rule.',
    `Unsubscribe from this rule: ${unsubscribeLink}`,
  ].join('\n');

  const html = layout(
    headline,
    `<p style="margin:0">Hi ${escapeHtml(name)},</p>
     <p style="margin:6px 0 0">Your rule <b>${escapeHtml(ruleSummary)}</b> just matched the forecast for ${escapeHtml(alert.locationName)}.</p>
     <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:14px 0 18px;border-collapse:separate"><tr>
       ${factTile(fact.value, fact.label, SKY_SOFT)}
       <td width="2%"></td>
       ${factTile(window, zoneLabel(timeZone), SUN_SOFT)}
       <td width="2%"></td>
       ${factTile(day.toFormat('ccc'), day.toFormat('d LLL'), CORAL_SOFT)}
     </tr></table>
     <p style="margin:0">${button('Open WeatherPing →', appLink)}</p>
     <p style="font-size:13px;color:${MUTED};margin:18px 0 0;border-top:2px dashed ${INK};padding-top:12px">One email per event, because you set this rule.
       <a href="${escapeHtml(unsubscribeLink)}" style="color:${CORAL_INK};font-weight:800">Unsubscribe from this rule</a></p>`,
  );

  return { subject, text, html, attachments: brandImages() };
}

module.exports = { passwordResetEmail, weatherAlertEmail };
