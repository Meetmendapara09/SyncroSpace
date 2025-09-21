import type { NextApiRequest, NextApiResponse } from 'next';
import { promises as fs } from 'fs';
import path from 'path';

// Store subscriptions in a simple JSON file for demo purposes
const SUBS_FILE = path.join(process.cwd(), 'subscriptions.json');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    const subscription = req.body;
    let subs: any[] = [];
    try {
      const data = await fs.readFile(SUBS_FILE, 'utf8');
      subs = JSON.parse(data);
    } catch (e) {}
    subs.push(subscription);
    await fs.writeFile(SUBS_FILE, JSON.stringify(subs, null, 2));
    res.status(200).json({ success: true });
  } else {
    res.status(405).end();
  }
}
