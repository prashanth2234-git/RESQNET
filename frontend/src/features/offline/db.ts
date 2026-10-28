import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { OfflinePendingRequest } from '../../types';

interface ResqnetDB extends DBSchema {
  pending_requests: {
    key: string;
    value: OfflinePendingRequest;
    indexes: { 'by_status': string };
  };
}

const DB_NAME = 'resqnet_offline_v1';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<ResqnetDB>> | null = null;

export function getDatabase(): Promise<IDBPDatabase<ResqnetDB>> {
  if (!dbPromise) {
    dbPromise = openDB<ResqnetDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('pending_requests')) {
          const store = db.createObjectStore('pending_requests', { keyPath: 'client_local_id' });
          store.createIndex('by_status', 'sync_status');
        }
      },
    });
  }
  return dbPromise;
}

export async function savePendingRequest(request: OfflinePendingRequest): Promise<void> {
  const db = await getDatabase();
  await db.put('pending_requests', request);
}

export async function getAllPendingRequests(): Promise<OfflinePendingRequest[]> {
  const db = await getDatabase();
  return db.getAll('pending_requests');
}

export async function getPendingRequest(client_local_id: string): Promise<OfflinePendingRequest | undefined> {
  const db = await getDatabase();
  return db.get('pending_requests', client_local_id);
}

export async function updateRequestSyncStatus(
  client_local_id: string,
  status: 'PENDING' | 'SYNCING' | 'FAILED' | 'SYNCED',
  server_id?: number,
  tracking_code?: string,
  error_message?: string
): Promise<OfflinePendingRequest | null> {
  const db = await getDatabase();
  const existing = await db.get('pending_requests', client_local_id);
  if (existing) {
    existing.sync_status = status;
    if (server_id !== undefined && server_id !== null) existing.server_request_id = server_id;
    if (tracking_code !== undefined && tracking_code !== null) existing.tracking_code = tracking_code;
    if (error_message !== undefined) existing.error_message = error_message;
    await db.put('pending_requests', existing);
    return existing;
  }
  return null;
}

export async function removePendingRequest(client_local_id: string): Promise<void> {
  const db = await getDatabase();
  await db.delete('pending_requests', client_local_id);
}
