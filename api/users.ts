import { getLoginStats, recordUserLogin } from '../server/db.ts';

export default async function handler(req: any, res: any) {
  // Setup CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
      const { name } = body;
      const result = recordUserLogin(name);
      return res.status(200).json(result);
    }

    if (req.method === 'GET') {
      const stats = getLoginStats();
      return res.status(200).json({ success: true, stats });
    }

    return res.status(405).json({ error: 'Method Not Allowed' });
  } catch (error: any) {
    console.error('Error in /api/users:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Database operation failed',
      stats: { todayCount: 1, totalLogins: 1, uniqueUsersToday: 1, recentUsers: [] },
    });
  }
}
