// Google Drive API utilities
import { google, drive_v3 } from 'googleapis';
import { Readable } from 'stream';
import { query } from '@/lib/db';

export interface GoogleDriveConfig {
  accessToken: string;
  refreshToken: string;
  clientId: string;
  clientSecret: string;
}

export interface DriveFile {
  name: string;
  mimeType: string;
  description?: string;
  folderId?: string;
}

export interface DriveUploadResult {
  success: boolean;
  fileId?: string;
  webViewLink?: string;
  webContentLink?: string;
  error?: string;
}

/**
 * Initialize Google Drive API client
 */
export const getDriveClient = (config: GoogleDriveConfig): drive_v3.Drive => {
  const oauth2Client = new google.auth.OAuth2(
    config.clientId,
    config.clientSecret,
    process.env.GOOGLE_OAUTH_REDIRECT_URI || 'http://localhost:3000/api/auth/google/callback'
  );

  oauth2Client.setCredentials({
    access_token: config.accessToken,
    refresh_token: config.refreshToken,
  });

  return google.drive({ version: 'v3', auth: oauth2Client });
};

/**
 * Create folder in Google Drive
 */
export const createDriveFolder = async (
  config: GoogleDriveConfig,
  folderName: string,
  parentFolderId?: string
): Promise<{ success: boolean; folderId?: string; error?: string }> => {
  try {
    const drive = getDriveClient(config);

    const fileMetadata: drive_v3.Schema$File = {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
      parents: parentFolderId ? [parentFolderId] : undefined,
    };

    const response = await drive.files.create({
      requestBody: fileMetadata,
      fields: 'id',
    });

    return {
      success: true,
      folderId: response.data.id ?? undefined,
    };
  } catch (error: any) {
    console.error('Error creating Drive folder:', error);
    return {
      success: false,
      error: error.message || 'Error al crear carpeta en Google Drive',
    };
  }
};

/**
 * Upload file to Google Drive
 */
export const uploadFileToDrive = async (
  config: GoogleDriveConfig,
  file: DriveFile,
  fileBuffer: Buffer
): Promise<DriveUploadResult> => {
  try {
    const drive = getDriveClient(config);

    const fileMetadata: drive_v3.Schema$File = {
      name: file.name,
      description: file.description,
      parents: file.folderId ? [file.folderId] : undefined,
    };

    const media = {
      mimeType: file.mimeType,
      body: Readable.from(fileBuffer),
    };

    const response = await drive.files.create({
      requestBody: fileMetadata,
      media: media,
      fields: 'id, webViewLink, webContentLink',
    });

    return {
      success: true,
      fileId: response.data.id ?? undefined,
      webViewLink: response.data.webViewLink || undefined,
      webContentLink: response.data.webContentLink || undefined,
    };
  } catch (error: any) {
    console.error('Error uploading file to Drive:', error);
    return {
      success: false,
      error: error.message || 'Error al subir archivo a Google Drive',
    };
  }
};

/**
 * Delete file from Google Drive
 */
export const deleteFileFromDrive = async (
  config: GoogleDriveConfig,
  fileId: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const drive = getDriveClient(config);

    await drive.files.delete({
      fileId: fileId,
    });

    return { success: true };
  } catch (error: any) {
    console.error('Error deleting file from Drive:', error);
    return {
      success: false,
      error: error.message || 'Error al eliminar archivo de Google Drive',
    };
  }
};

/**
 * Get file metadata from Google Drive
 */
export const getDriveFileMetadata = async (
  config: GoogleDriveConfig,
  fileId: string
): Promise<{ success: boolean; file?: drive_v3.Schema$File; error?: string }> => {
  try {
    const drive = getDriveClient(config);

    const response = await drive.files.get({
      fileId: fileId,
      fields: 'id, name, mimeType, size, webViewLink, webContentLink, createdTime, modifiedTime',
    });

    return {
      success: true,
      file: response.data,
    };
  } catch (error: any) {
    console.error('Error getting file metadata:', error);
    return {
      success: false,
      error: error.message || 'Error al obtener metadata del archivo',
    };
  }
};

/**
 * List files in folder
 */
export const listFilesInFolder = async (
  config: GoogleDriveConfig,
  folderId: string,
  options?: {
    pageSize?: number;
    orderBy?: string;
  }
): Promise<{ success: boolean; files?: drive_v3.Schema$File[]; error?: string }> => {
  try {
    const drive = getDriveClient(config);

    const response = await drive.files.list({
      q: `'${folderId}' in parents and trashed=false`,
      pageSize: options?.pageSize || 100,
      orderBy: options?.orderBy || 'createdTime desc',
      fields: 'files(id, name, mimeType, size, webViewLink, webContentLink, createdTime)',
    });

    return {
      success: true,
      files: response.data.files || [],
    };
  } catch (error: any) {
    console.error('Error listing files in folder:', error);
    return {
      success: false,
      error: error.message || 'Error al listar archivos de la carpeta',
    };
  }
};

/**
 * Upload file and track in database
 */
export const uploadAndTrackFile = async (
  userId: string,
  entityType: 'servicio_tecnico' | 'equipo' | 'contrato' | 'cliente',
  entityId: number,
  file: {
    name: string;
    mimeType: string;
    description?: string;
    buffer: Buffer;
    size: number;
    metadata?: Record<string, any>;
  },
  orgId?: string
): Promise<DriveUploadResult> => {
  try {
    // Get user's Google integration
    const integrationParams: any[] = [userId];
    let integrationSql = `
      SELECT * FROM integraciones_google
      WHERE user_id = $1
        AND tipo IN ('drive', 'both')
        AND estado = 'active'
    `;

    if (orgId) {
      integrationParams.push(orgId);
      integrationSql += ` AND org_id = $${integrationParams.length}`;
    }

    integrationSql += ' LIMIT 1';

    const integrationResult = await query(integrationSql, integrationParams);
    const integration = integrationResult.rows[0];

    if (!integration) {
      return {
        success: false,
        error: 'No se encontró integración activa con Google Drive',
      };
    }

    const config: GoogleDriveConfig = {
      accessToken: integration.access_token,
      refreshToken: integration.refresh_token,
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    };

    // Get or create entity folder
    const folderName = `${entityType}_${entityId}`;
    let folderId = integration.drive_folder_id;

    // Check if entity folder exists
    const existingFolderResult = await query(
      'SELECT google_folder_id FROM drive_files_sync WHERE entity_type = $1 AND entity_id = $2 LIMIT 1',
      [entityType, entityId]
    );
    const existingFolder = existingFolderResult.rows[0];

    if (existingFolder?.google_folder_id) {
      folderId = existingFolder.google_folder_id;
    } else if (integration.drive_folder_id) {
      // Create entity folder
      const folderResult = await createDriveFolder(
        config,
        folderName,
        integration.drive_folder_id
      );

      if (folderResult.success && folderResult.folderId) {
        folderId = folderResult.folderId;
      }
    }

    // Upload file
    const uploadResult = await uploadFileToDrive(
      config,
      {
        name: file.name,
        mimeType: file.mimeType,
        description: file.description,
        folderId,
      },
      file.buffer
    );

    if (uploadResult.success && uploadResult.fileId) {
      // Track in database
      await query(
        `INSERT INTO drive_files_sync
          (integracion_id, entity_type, entity_id, file_name, file_type, file_size,
           file_description, google_file_id, google_folder_id, google_web_view_link,
           google_web_content_link, sync_status, metadata)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
        [
          integration.id,
          entityType,
          entityId,
          file.name,
          file.mimeType,
          file.size,
          file.description || null,
          uploadResult.fileId,
          folderId || '',
          uploadResult.webViewLink || null,
          uploadResult.webContentLink || null,
          'synced',
          file.metadata ? JSON.stringify(file.metadata) : null,
        ]
      );
    }

    return uploadResult;
  } catch (error: any) {
    console.error('Error uploading and tracking file:', error);
    return {
      success: false,
      error: error.message || 'Error al subir archivo a Google Drive',
    };
  }
};

/**
 * Delete file and remove tracking
 */
export const deleteAndUntrackFile = async (
  userId: string,
  syncId: number,
  orgId?: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    // Get sync record with integration data via JOIN
    const syncResult = await query(
      `SELECT dfs.*, ig.access_token, ig.refresh_token, ig.org_id
       FROM drive_files_sync dfs
       JOIN integraciones_google ig ON dfs.integracion_id = ig.id
       WHERE dfs.id = $1
       LIMIT 1`,
      [syncId]
    );
    const sync = syncResult.rows[0];

    if (!sync) {
      return {
        success: false,
        error: 'No se encontró el archivo sincronizado',
      };
    }

    // Verify org_id scoping
    if (orgId && sync.org_id && sync.org_id !== orgId) {
      return { success: false, error: 'No autorizado para esta organización' };
    }

    const config: GoogleDriveConfig = {
      accessToken: sync.access_token,
      refreshToken: sync.refresh_token,
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    };

    // Delete from Google Drive
    const result = await deleteFileFromDrive(config, sync.google_file_id);

    if (result.success) {
      // Delete sync record
      await query('DELETE FROM drive_files_sync WHERE id = $1', [syncId]);
    }

    return result;
  } catch (error: any) {
    console.error('Error deleting and untracking file:', error);
    return {
      success: false,
      error: error.message || 'Error al eliminar archivo de Google Drive',
    };
  }
};

/**
 * Get files for entity
 */
export const getEntityFiles = async (
  userId: string,
  entityType: 'servicio_tecnico' | 'equipo' | 'contrato' | 'cliente',
  entityId: number,
  orgId?: string
): Promise<{ success: boolean; files?: any[]; error?: string }> => {
  try {
    const params: any[] = [entityType, entityId];
    let sql = `
      SELECT dfs.*, ig.org_id
      FROM drive_files_sync dfs
      JOIN integraciones_google ig ON dfs.integracion_id = ig.id
      WHERE dfs.entity_type = $1
        AND dfs.entity_id = $2
        AND dfs.sync_status = 'synced'
    `;

    if (orgId) {
      params.push(orgId);
      sql += ` AND ig.org_id = $${params.length}`;
    }

    sql += ' ORDER BY dfs.created_at DESC';

    const result = await query(sql, params);

    return {
      success: true,
      files: result.rows,
    };
  } catch (error: any) {
    console.error('Error getting entity files:', error);
    return {
      success: false,
      error: error.message || 'Error al obtener archivos de la entidad',
    };
  }
};

/**
 * Check if user has active Google Drive integration
 */
export const hasDriveIntegration = async (userId: string): Promise<boolean> => {
  try {
    const result = await query(
      `SELECT id FROM integraciones_google
       WHERE user_id = $1
         AND tipo IN ('drive', 'both')
         AND estado = 'active'
       LIMIT 1`,
      [userId]
    );

    return result.rows.length > 0;
  } catch {
    return false;
  }
};

/**
 * Convert base64 to buffer
 */
export const base64ToBuffer = (base64: string): Buffer => {
  const base64Data = base64.replace(/^data:([a-z]+\/[a-z0-9-+.]+(;[a-z-]+=[a-z0-9-]+)?)?;base64,/i, '');
  return Buffer.from(base64Data, 'base64');
};

/**
 * Get MIME type from file extension
 */
export const getMimeType = (filename: string): string => {
  const ext = filename.split('.').pop()?.toLowerCase();
  const mimeTypes: Record<string, string> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    pdf: 'application/pdf',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xls: 'application/vnd.ms-excel',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    txt: 'text/plain',
    csv: 'text/csv',
  };
  return mimeTypes[ext || ''] || 'application/octet-stream';
};
