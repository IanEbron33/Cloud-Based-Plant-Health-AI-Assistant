/**
 * Bugsok AI — Scan & Chat Synchronization Service
 *
 * This service handles all local SQLite operations and remote Supabase syncing
 * for plant diagnoses (scans) and follow-up chat sessions/messages.
 *
 * Mode: SQLite-First (Option C - Bidirectional Sync)
 */

import { Platform } from 'react-native';
import * as SQLite from 'expo-sqlite';
import { supabase } from '../lib/supabase';
import { DiagnosisResult } from '../types';
import { parseDiagnosis } from './diagnosis-parser';

// Local DB instance getter with self-healing connection retry proxy
let rawDbInstance: any = null;

const getRawDB = () => {
  if (!rawDbInstance) {
    rawDbInstance = SQLite.openDatabaseSync('bugsok_ai.db');
  }
  return rawDbInstance;
};

const dbProxy = {
  execSync(sql: string): any {
    try {
      return getRawDB().execSync(sql);
    } catch (err) {
      console.warn('[Scan Service] execSync failed, resetting connection and retrying...', err);
      rawDbInstance = null;
      return getRawDB().execSync(sql);
    }
  },
  runSync(sql: string, ...params: any[]): any {
    try {
      return getRawDB().runSync(sql, ...params);
    } catch (err) {
      console.warn('[Scan Service] runSync failed, resetting connection and retrying...', err);
      rawDbInstance = null;
      return getRawDB().runSync(sql, ...params);
    }
  },
  getFirstSync(sql: string, ...params: any[]): any {
    try {
      return getRawDB().getFirstSync(sql, ...params);
    } catch (err) {
      console.warn('[Scan Service] getFirstSync failed, resetting connection and retrying...', err);
      rawDbInstance = null;
      return getRawDB().getFirstSync(sql, ...params);
    }
  },
  getAllSync(sql: string, ...params: any[]): any {
    try {
      return getRawDB().getAllSync(sql, ...params);
    } catch (err) {
      console.warn('[Scan Service] getAllSync failed, resetting connection and retrying...', err);
      rawDbInstance = null;
      return getRawDB().getAllSync(sql, ...params);
    }
  }
};

const getDB = () => dbProxy;

// Pure JS UUID generator to avoid bundle resolution issues on expo-crypto
const generateUUID = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

/**
 * Initialize local SQLite database schema.
 * Must be called on app startup.
 */
export const initLocalDatabase = (): void => {
  try {
    const db = getDB();
    db.execSync(`
      PRAGMA foreign_keys = ON;
      
      CREATE TABLE IF NOT EXISTS scans (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          crop_name TEXT NOT NULL,
          condition_name TEXT,
          severity TEXT CHECK(severity IN ('None', 'Low', 'Moderate', 'High')),
          health_score INTEGER,
          confidence_score INTEGER,
          local_image_path TEXT,
          cloud_image_url TEXT,
          diagnosis_text TEXT,
          synced INTEGER DEFAULT 0,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS chat_sessions (
          id TEXT PRIMARY KEY,
          scan_id TEXT NOT NULL,
          user_id TEXT NOT NULL,
          title TEXT,
          synced INTEGER DEFAULT 0,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (scan_id) REFERENCES scans (id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS chat_messages (
          id TEXT PRIMARY KEY,
          session_id TEXT NOT NULL,
          sender TEXT CHECK(sender IN ('user', 'ai')),
          model_used TEXT,
          message TEXT NOT NULL,
          synced INTEGER DEFAULT 0,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (session_id) REFERENCES chat_sessions (id) ON DELETE CASCADE
      );
    `);
    console.log('[Scan Service] SQLite Database initialized successfully.');
  } catch (error) {
    console.error('[Scan Service] SQLite DDL error:', error);
  }
};

/**
 * Upload local scan image to Supabase Storage.
 */
export const uploadScanImage = async (
  imageUri: string,
  userId: string
): Promise<string | null> => {
  try {
    const fileExt = imageUri.split('.').pop() || 'jpg';
    const fileName = `${userId}/${Date.now()}.${fileExt}`;

    let fileBody: any;
    let uploadOptions: any = { upsert: true };

    if (Platform.OS === 'web') {
      const response = await fetch(imageUri);
      fileBody = await response.blob();
      uploadOptions.contentType = `image/${fileExt === 'png' ? 'png' : 'jpeg'}`;
    } else {
      const formData = new FormData();
      formData.append('file', {
        uri: imageUri,
        name: `scan.${fileExt}`,
        type: `image/${fileExt === 'png' ? 'png' : 'jpeg'}`,
      } as any);
      fileBody = formData;
    }

    const { error: uploadError } = await supabase.storage
      .from('plant-images')
      .upload(fileName, fileBody, uploadOptions);

    if (uploadError) {
      console.warn('[Scan Service] Storage upload failed:', uploadError.message);
      return null;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('plant-images')
      .getPublicUrl(fileName);

    return publicUrl;
  } catch (err: any) {
    console.warn('[Scan Service] Image upload error:', err.message || err);
    return null;
  }
};

/**
 * Local scan SQLite row representation.
 */
export interface LocalScanRow {
  id: string;
  user_id: string;
  crop_name: string;
  condition_name: string;
  severity: 'None' | 'Low' | 'Moderate' | 'High';
  health_score: number;
  confidence_score: number;
  local_image_path: string | null;
  cloud_image_url: string | null;
  diagnosis_text: string;
  synced: number;
  created_at: string;
}

/**
 * Local chat session SQLite representation.
 */
export interface LocalChatSessionRow {
  id: string;
  scan_id: string;
  user_id: string;
  title: string;
  synced: number;
  created_at: string;
}

/**
 * Local chat message SQLite representation.
 */
export interface LocalChatMessageRow {
  id: string;
  session_id: string;
  sender: 'user' | 'ai';
  model_used: string | null;
  message: string;
  synced: number;
  created_at: string;
}

/**
 * Save a new scan locally to SQLite and attempt background upload to Supabase.
 */
export const saveScan = async (
  userId: string,
  cropName: string,
  conditionName: string,
  severity: 'None' | 'Low' | 'Moderate' | 'High',
  healthScore: number,
  confidenceScore: number,
  localImagePath: string,
  diagnosisText: string
): Promise<LocalScanRow> => {
  const db = getDB();
  const scanId = generateUUID();
  const createdAt = new Date().toISOString();

  // 1. Write scan locally as unsynced
  db.runSync(
    `INSERT INTO scans (id, user_id, crop_name, condition_name, severity, health_score, confidence_score, local_image_path, cloud_image_url, diagnosis_text, synced, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [scanId, userId, cropName, conditionName, severity, healthScore, confidenceScore, localImagePath, null, diagnosisText, 0, createdAt]
  );

  const localRow: LocalScanRow = {
    id: scanId,
    user_id: userId,
    crop_name: cropName,
    condition_name: conditionName,
    severity,
    health_score: healthScore,
    confidence_score: confidenceScore,
    local_image_path: localImagePath,
    cloud_image_url: null,
    diagnosis_text: diagnosisText,
    synced: 0,
    created_at: createdAt
  };

  // 2. Fire-and-forget sync to Supabase in background
  syncSingleScan(scanId, userId).catch((err) => {
    console.log('[Scan Service] Background upload queued:', err);
  });

  return localRow;
};

/**
 * Helper to upload a single scan row to Supabase.
 */
const syncSingleScan = async (scanId: string, userId: string): Promise<boolean> => {
  const db = getDB();
  const row = db.getFirstSync('SELECT * FROM scans WHERE id = ?', [scanId]) as LocalScanRow | null;
  if (!row || row.synced === 1) return true;

  // Upload image first
  let cloudUrl = row.cloud_image_url;
  if (!cloudUrl && row.local_image_path) {
    cloudUrl = await uploadScanImage(row.local_image_path, userId);
  }

  if (!cloudUrl) {
    console.warn(`[Scan Service] Sync skipped for scan ${scanId}: Image upload failed.`);
    return false;
  }

  // Save scan to Supabase database
  const { error } = await supabase.from('scans').upsert({
    id: row.id,
    user_id: row.user_id,
    crop_name: row.crop_name,
    condition_name: row.condition_name,
    severity: row.severity,
    health_score: row.health_score,
    confidence_score: row.confidence_score,
    cloud_image_url: cloudUrl,
    diagnosis_text: row.diagnosis_text,
    synced: true,
    created_at: row.created_at,
  });

  if (error) {
    console.warn('[Scan Service] Sync database insert failed:', error.message);
    return false;
  }

  // Update local SQLite as synced
  db.runSync(
    'UPDATE scans SET synced = 1, cloud_image_url = ? WHERE id = ?',
    [cloudUrl, scanId]
  );
  console.log(`[Scan Service] Scan ${scanId} synced to cloud.`);
  return true;
};

/**
 * Fetch all scans for the active user sorted by date descending.
 */
export const fetchUserScans = (userId: string): LocalScanRow[] => {
  try {
    const db = getDB();
    return db.getAllSync(
      'SELECT * FROM scans WHERE user_id = ? ORDER BY created_at DESC',
      [userId]
    ) as LocalScanRow[];
  } catch (err) {
    console.error('[Scan Service] fetchUserScans error:', err);
    return [];
  }
};

/**
 * Fetch a single scan by ID.
 */
export const fetchScanById = (scanId: string, userId: string): LocalScanRow | null => {
  try {
    const db = getDB();
    return (db.getFirstSync(
      'SELECT * FROM scans WHERE id = ? AND user_id = ?',
      [scanId, userId]
    ) as LocalScanRow | null) || null;
  } catch (err) {
    console.error('[Scan Service] fetchScanById error:', err);
    return null;
  }
};

/**
 * Fetch scan statistics from local DB.
 */
export const fetchScanStats = (userId: string) => {
  try {
    const db = getDB();
    const result = db.getFirstSync(
      `SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN condition_name NOT LIKE '%Healthy%' AND condition_name IS NOT NULL THEN 1 ELSE 0 END) as infected,
        SUM(CASE WHEN synced = 1 THEN 1 ELSE 0 END) as synced
       FROM scans WHERE user_id = ?`,
      [userId]
    ) as { total: number; infected: number; synced: number } | null;
    return {
      total: result?.total || 0,
      infected: result?.infected || 0,
      synced: result?.synced || 0,
    };
  } catch (err) {
    console.error('[Scan Service] fetchScanStats error:', err);
    return { total: 0, infected: 0, synced: 0 };
  }
};

/**
 * Fetch or create follow-up chat session for a scan.
 * Automatically loads the latest session if available.
 */
export const getOrCreateChatSession = async (
  scanId: string,
  userId: string,
  cropName: string
): Promise<string> => {
  const db = getDB();
  
  // Try local first
  const existing = db.getFirstSync(
    'SELECT * FROM chat_sessions WHERE scan_id = ? AND user_id = ? ORDER BY created_at DESC LIMIT 1',
    [scanId, userId]
  ) as LocalChatSessionRow | null;
  if (existing) {
    return existing.id;
  }

  // Create new session ID
  const sessionId = generateUUID();
  const title = `${cropName} Diagnosis Follow-up`;
  const createdAt = new Date().toISOString();

  // Save locally
  db.runSync(
    'INSERT INTO chat_sessions (id, scan_id, user_id, title, synced, created_at) VALUES (?, ?, ?, ?, ?, ?)',
    [sessionId, scanId, userId, title, 0, createdAt]
  );

  // Sync to Supabase in background
  supabase.from('chat_sessions').insert({
    id: sessionId,
    scan_id: scanId,
    user_id: userId,
    title,
    synced: true,
    created_at: createdAt
  }).then(({ error }) => {
    if (!error) {
      db.runSync('UPDATE chat_sessions SET synced = 1 WHERE id = ?', [sessionId]);
    }
  });

  return sessionId;
};

/**
 * Save chat message to local SQLite and sync to Supabase.
 */
export const saveChatMessage = async (
  sessionId: string,
  sender: 'user' | 'ai',
  message: string,
  modelUsed?: string
): Promise<string> => {
  const db = getDB();
  const messageId = generateUUID();
  const createdAt = new Date().toISOString();

  // Save local SQLite
  db.runSync(
    'INSERT INTO chat_messages (id, session_id, sender, model_used, message, synced, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [messageId, sessionId, sender, modelUsed || null, message, 0, createdAt]
  );

  // Sync to Supabase in background
  supabase.from('chat_messages').insert({
    id: messageId,
    session_id: sessionId,
    sender,
    model_used: modelUsed || null,
    message,
    synced: true,
    created_at: createdAt
  }).then(({ error }) => {
    if (!error) {
      db.runSync('UPDATE chat_messages SET synced = 1 WHERE id = ?', [messageId]);
    }
  });

  return messageId;
};

/**
 * Fetch historical messages for a chat session.
 */
export const fetchChatMessages = (sessionId: string): LocalChatMessageRow[] => {
  try {
    const db = getDB();
    return db.getAllSync(
      'SELECT * FROM chat_messages WHERE session_id = ? ORDER BY created_at ASC',
      [sessionId]
    ) as LocalChatMessageRow[];
  } catch (err) {
    console.error('[Scan Service] fetchChatMessages error:', err);
    return [];
  }
};

/**
 * Sync offline scans and chats to Supabase and pull missing records.
 */
export const syncData = async (userId: string): Promise<boolean> => {
  try {
    const db = getDB();
    console.log('[Scan Service] Starting bidirectional synchronization...');

    // 1. Upload unsynced scans
    const unsyncedScans = db.getAllSync(
      'SELECT * FROM scans WHERE user_id = ? AND synced = 0',
      [userId]
    ) as LocalScanRow[];
    for (const scan of unsyncedScans) {
      await syncSingleScan(scan.id, userId);
    }

    // 2. Upload unsynced chat sessions
    const unsyncedSessions = db.getAllSync(
      'SELECT * FROM chat_sessions WHERE user_id = ? AND synced = 0',
      [userId]
    ) as LocalChatSessionRow[];
    for (const session of unsyncedSessions) {
      const { error } = await supabase.from('chat_sessions').upsert({
        id: session.id,
        scan_id: session.scan_id,
        user_id: session.user_id,
        title: session.title,
        synced: true,
        created_at: session.created_at
      });
      if (!error) {
        db.runSync('UPDATE chat_sessions SET synced = 1 WHERE id = ?', [session.id]);
      }
    }

    // 3. Upload unsynced chat messages
    const unsyncedMessages = db.getAllSync(
      `SELECT m.* FROM chat_messages m 
       JOIN chat_sessions s ON m.session_id = s.id 
       WHERE s.user_id = ? AND m.synced = 0`,
      [userId]
    ) as LocalChatMessageRow[];
    for (const msg of unsyncedMessages) {
      const { error } = await supabase.from('chat_messages').upsert({
        id: msg.id,
        session_id: msg.session_id,
        sender: msg.sender,
        model_used: msg.model_used,
        message: msg.message,
        synced: true,
        created_at: msg.created_at
      });
      if (!error) {
        db.runSync('UPDATE chat_messages SET synced = 1 WHERE id = ?', [msg.id]);
      }
    }

    // 4. Download updates from Supabase
    // Pull scans
    const { data: cloudScans, error: scansError } = await supabase
      .from('scans')
      .select('*')
      .eq('user_id', userId);

    if (!scansError && cloudScans) {
      for (const cs of cloudScans) {
        db.runSync(
          `INSERT INTO scans (id, user_id, crop_name, condition_name, severity, health_score, confidence_score, local_image_path, cloud_image_url, diagnosis_text, synced, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
           ON CONFLICT(id) DO UPDATE SET cloud_image_url=excluded.cloud_image_url, synced=1`,
          [cs.id, cs.user_id, cs.crop_name, cs.condition_name, cs.severity, cs.health_score, cs.confidence_score, null, cs.cloud_image_url, cs.diagnosis_text, cs.created_at]
        );
      }
    }

    // Pull chat sessions
    const { data: cloudSessions, error: sessionsError } = await supabase
      .from('chat_sessions')
      .select('*')
      .eq('user_id', userId);

    if (!sessionsError && cloudSessions) {
      for (const cs of cloudSessions) {
        db.runSync(
          `INSERT INTO chat_sessions (id, scan_id, user_id, title, synced, created_at)
           VALUES (?, ?, ?, ?, 1, ?)
           ON CONFLICT(id) DO UPDATE SET synced=1`,
          [cs.id, cs.scan_id, cs.user_id, cs.title, cs.created_at]
        );
      }
    }

    // Pull chat messages
    if (cloudSessions && cloudSessions.length > 0) {
      const sessionIds = cloudSessions.map((s) => s.id);
      const { data: cloudMessages, error: msgsError } = await supabase
        .from('chat_messages')
        .select('*')
        .in('session_id', sessionIds);

      if (!msgsError && cloudMessages) {
        for (const cm of cloudMessages) {
          db.runSync(
            `INSERT INTO chat_messages (id, session_id, sender, model_used, message, synced, created_at)
             VALUES (?, ?, ?, ?, ?, 1, ?)
             ON CONFLICT(id) DO UPDATE SET synced=1`,
            [cm.id, cm.session_id, cm.sender, cm.model_used, cm.message, cm.created_at]
          );
        }
      }
    }

    console.log('[Scan Service] Bidirectional synchronization completed.');
    return true;
  } catch (err) {
    console.error('[Scan Service] syncData error:', err);
    return false;
  }
};

/**
 * Clear all chat messages for a session locally.
 */
export const clearChatMessages = (sessionId: string): void => {
  try {
    const db = getDB();
    db.runSync('DELETE FROM chat_messages WHERE session_id = ?', [sessionId]);
  } catch (err) {
    console.error('[Scan Service] clearChatMessages error:', err);
  }
};
