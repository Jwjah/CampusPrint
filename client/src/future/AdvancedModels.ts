export interface CommentModel {
  id: string;
  documentId: string;
  pageId?: string;
  objectId?: string; // If attached to a specific drawn object
  authorId: string;
  authorName: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  resolved: boolean;
  replies: CommentModel[];
}

export interface VersionHistoryModel {
  id: string;
  documentId: string;
  versionNumber: number;
  authorId: string;
  authorName: string;
  commitMessage: string;
  timestamp: string;
  snapshotUrl?: string; // S3 URL to the saved snapshot
}

export interface AuditLogModel {
  id: string;
  documentId: string;
  action: 'PRINT' | 'EXPORT' | 'SHARE' | 'DELETE' | 'RESTORE';
  userId: string;
  userName: string;
  timestamp: string;
  details: Record<string, any>;
}
