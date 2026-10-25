export type Row = { _row: number; id: string; [field: string]: string | number };

export type Entity =
  | 'tasks' | 'milestones' | 'risks' | 'weekly' | 'weeklyQ'
  | 'settings' | 'team' | 'resources' | 'users';

export interface Me {
  email: string;
  name: string;
  nameAr?: string;
  teamRole: string;
  taskRoles: string[];
  lang: string;
  photo?: string;
  isAdmin?: boolean;
}

export interface LogEntry {
  timestamp: string; name: string; email: string; entity: string;
  id: string; field: string; oldValue: string; newValue: string;
}

export interface UploadEntry {
  timestamp: string; name: string; email: string; fileName: string;
  url: string; folder: string; taskId: string; note: string; size: string;
}

export interface AllData {
  rev: number;
  me: Me;
  data: Record<Entity, Row[]>;
  dropdowns: Record<string, string[]>;
  activity: LogEntry[];
  uploads: UploadEntry[];
  guide: [string, string][];
  folderUrl: string;
}

export interface Change { field: string; value: string; expected?: string }

export type ApiResult<T = unknown> = ({ ok: true } & T) | { ok: false; error: string; [k: string]: unknown };
