const webpush = require('web-push');
const fs = require('fs');
const path = require('path');

const SUBS_FILE = path.join(process.cwd(), 'subscriptions.json');

// Replace with your own VAPID keys
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.NEXT_PUBLIC_VAPID_PRIVATE_KEY;

webpush.setVapidDetails(
  'mailto:admin@yourdomain.com',
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY
);

async function sendPushNotification(title, body, url = '/') {
  let subs = [];
  try {
    subs = JSON.parse(fs.readFileSync(SUBS_FILE, 'utf8'));
  } catch (e) {}
  for (const sub of subs) {
    try {
      await webpush.sendNotification(sub, JSON.stringify({ title, body, url }));
    } catch (err) {
      // Handle errors (e.g., subscription expired)
    }
  }
}

module.exports = { sendPushNotification };
