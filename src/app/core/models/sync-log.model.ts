export interface SyncLogRecord {
  id: string;
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  inserted: number;
  updated: number;
  removed: number;
  totalApi: number;
  totalBefore: number;
  success: boolean;
  error: string | null;
  createdAt: string | null;
}
