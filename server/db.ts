import fs from 'fs';
import path from 'path';

export interface UserLoginRecord {
  name: string;
  timestamp: number;
  dateKey: string; // YYYY-MM-DD
}

export interface UserStats {
  todayCount: number;
  totalLogins: number;
  uniqueUsersToday: number;
  recentUsers: string[];
}

const DB_FILE = path.join(process.cwd(), 'data', 'user_logins.json');

function ensureDirectoryExists() {
  const dir = path.dirname(DB_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function getTodayDateKey(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function loadLogins(): UserLoginRecord[] {
  try {
    ensureDirectoryExists();
    if (!fs.existsSync(DB_FILE)) {
      return [];
    }
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch (error) {
    console.error('Error loading logins db:', error);
    return [];
  }
}

export function saveLogins(logins: UserLoginRecord[]): void {
  try {
    ensureDirectoryExists();
    fs.writeFileSync(DB_FILE, JSON.stringify(logins, null, 2), 'utf-8');
  } catch (error) {
    console.error('Error saving logins db:', error);
  }
}

export function recordUserLogin(userName: string): { success: boolean; stats: UserStats } {
  const trimmed = (userName || '').trim();
  const finalName = trimmed || 'Anonymous';
  const todayKey = getTodayDateKey();
  const logins = loadLogins();

  const newRecord: UserLoginRecord = {
    name: finalName,
    timestamp: Date.now(),
    dateKey: todayKey,
  };

  logins.push(newRecord);
  saveLogins(logins);

  return {
    success: true,
    stats: getLoginStats(),
  };
}

export function getLoginStats(): UserStats {
  const todayKey = getTodayDateKey();
  const logins = loadLogins();

  const todayLogins = logins.filter((item) => item.dateKey === todayKey);
  const uniqueNamesToday = new Set(todayLogins.map((item) => item.name.toLowerCase()));

  // Get most recent unique user names (up to 5)
  const recentNamesReversed = [...todayLogins].reverse().map((i) => i.name);
  const distinctRecent: string[] = [];
  for (const name of recentNamesReversed) {
    if (!distinctRecent.includes(name)) {
      distinctRecent.push(name);
    }
    if (distinctRecent.length >= 5) break;
  }

  return {
    todayCount: todayLogins.length,
    totalLogins: logins.length,
    uniqueUsersToday: uniqueNamesToday.size,
    recentUsers: distinctRecent,
  };
}
