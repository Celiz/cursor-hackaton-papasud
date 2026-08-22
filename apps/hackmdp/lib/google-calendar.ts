// Google Calendar API utilities
import { google, calendar_v3 } from 'googleapis';
import { query } from '@/lib/db';

export interface GoogleCalendarConfig {
  accessToken: string;
  refreshToken: string;
  clientId: string;
  clientSecret: string;
}

export interface CalendarEvent {
  id?: string;
  summary: string;
  description?: string;
  location?: string;
  start: string; // ISO datetime
  end: string; // ISO datetime
  attendees?: Array<{ email: string; displayName?: string }>;
  reminders?: {
    useDefault: boolean;
    overrides?: Array<{ method: 'email' | 'popup'; minutes: number }>;
  };
}

/**
 * Initialize Google Calendar API client
 */
export const getCalendarClient = (config: GoogleCalendarConfig): calendar_v3.Calendar => {
  const oauth2Client = new google.auth.OAuth2(
    config.clientId,
    config.clientSecret,
    process.env.GOOGLE_OAUTH_REDIRECT_URI || 'http://localhost:3000/api/auth/google/callback'
  );

  oauth2Client.setCredentials({
    access_token: config.accessToken,
    refresh_token: config.refreshToken,
  });

  return google.calendar({ version: 'v3', auth: oauth2Client });
};

/**
 * Create event in Google Calendar
 */
export const createCalendarEvent = async (
  config: GoogleCalendarConfig,
  calendarId: string,
  event: CalendarEvent
): Promise<{ success: boolean; eventId?: string; error?: string }> => {
  try {
    const calendar = getCalendarClient(config);

    const eventData: calendar_v3.Schema$Event = {
      summary: event.summary,
      description: event.description,
      location: event.location,
      start: {
        dateTime: event.start,
        timeZone: 'America/Argentina/Buenos_Aires',
      },
      end: {
        dateTime: event.end,
        timeZone: 'America/Argentina/Buenos_Aires',
      },
      attendees: event.attendees,
      reminders: event.reminders || {
        useDefault: false,
        overrides: [
          { method: 'email', minutes: 24 * 60 }, // 1 day before
          { method: 'popup', minutes: 30 }, // 30 min before
        ],
      },
    };

    const response = await calendar.events.insert({
      calendarId,
      requestBody: eventData,
    });

    return {
      success: true,
      eventId: response.data.id ?? undefined,
    };
  } catch (error: any) {
    console.error('Error creating calendar event:', error);
    return {
      success: false,
      error: error.message || 'Error al crear evento en Google Calendar',
    };
  }
};

/**
 * Update event in Google Calendar
 */
export const updateCalendarEvent = async (
  config: GoogleCalendarConfig,
  calendarId: string,
  eventId: string,
  event: Partial<CalendarEvent>
): Promise<{ success: boolean; error?: string }> => {
  try {
    const calendar = getCalendarClient(config);

    const eventData: calendar_v3.Schema$Event = {};

    if (event.summary) eventData.summary = event.summary;
    if (event.description) eventData.description = event.description;
    if (event.location) eventData.location = event.location;
    if (event.start) {
      eventData.start = {
        dateTime: event.start,
        timeZone: 'America/Argentina/Buenos_Aires',
      };
    }
    if (event.end) {
      eventData.end = {
        dateTime: event.end,
        timeZone: 'America/Argentina/Buenos_Aires',
      };
    }
    if (event.attendees) eventData.attendees = event.attendees;
    if (event.reminders) eventData.reminders = event.reminders;

    await calendar.events.patch({
      calendarId,
      eventId,
      requestBody: eventData,
    });

    return { success: true };
  } catch (error: any) {
    console.error('Error updating calendar event:', error);
    return {
      success: false,
      error: error.message || 'Error al actualizar evento en Google Calendar',
    };
  }
};

/**
 * Delete event from Google Calendar
 */
export const deleteCalendarEvent = async (
  config: GoogleCalendarConfig,
  calendarId: string,
  eventId: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const calendar = getCalendarClient(config);

    await calendar.events.delete({
      calendarId,
      eventId,
    });

    return { success: true };
  } catch (error: any) {
    console.error('Error deleting calendar event:', error);
    return {
      success: false,
      error: error.message || 'Error al eliminar evento de Google Calendar',
    };
  }
};

/**
 * Get events from Google Calendar
 */
export const getCalendarEvents = async (
  config: GoogleCalendarConfig,
  calendarId: string,
  options?: {
    timeMin?: string;
    timeMax?: string;
    maxResults?: number;
    syncToken?: string;
  }
): Promise<{ success: boolean; events?: calendar_v3.Schema$Event[]; syncToken?: string; error?: string }> => {
  try {
    const calendar = getCalendarClient(config);

    const response = await calendar.events.list({
      calendarId,
      timeMin: options?.timeMin || new Date().toISOString(),
      timeMax: options?.timeMax,
      maxResults: options?.maxResults || 250,
      singleEvents: true,
      orderBy: 'startTime',
      syncToken: options?.syncToken,
    });

    return {
      success: true,
      events: response.data.items || [],
      syncToken: response.data.nextSyncToken ?? undefined,
    };
  } catch (error: any) {
    console.error('Error getting calendar events:', error);
    return {
      success: false,
      error: error.message || 'Error al obtener eventos de Google Calendar',
    };
  }
};

// Entity types that can be synced to calendar
export type CalendarEntityType = 'servicio_tecnico' | 'alerta' | 'mantenimiento' | 'tarea' | 'reunion' | 'turno';

/**
 * Sync local entity to Google Calendar
 */
export const syncServiceToCalendar = async (
  userId: string,
  entityType: CalendarEntityType,
  entityId: number | string,
  event: CalendarEvent,
  orgId?: string
): Promise<{ success: boolean; eventId?: string; error?: string }> => {
  try {
    // Get user's Google integration
    const params: any[] = [userId];
    let integrationSql = `
      SELECT * FROM integraciones_google
      WHERE user_id = $1
        AND tipo IN ('calendar', 'both')
        AND estado = 'active'
    `;

    if (orgId) {
      params.push(orgId);
      integrationSql += ` AND org_id = $${params.length}`;
    }

    integrationSql += ' LIMIT 1';

    const integrationResult = await query(integrationSql, params);
    const integration = integrationResult.rows[0];

    if (!integration) {
      return {
        success: false,
        error: 'No se encontró integración activa con Google Calendar',
      };
    }

    // Check if already synced
    const existingSyncResult = await query(
      `SELECT google_event_id FROM calendar_events_sync
       WHERE entity_type = $1 AND entity_id = $2 AND integracion_id = $3
       LIMIT 1`,
      [entityType, entityId, integration.id]
    );
    const existingSync = existingSyncResult.rows[0];

    const config: GoogleCalendarConfig = {
      accessToken: integration.access_token,
      refreshToken: integration.refresh_token,
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    };

    let result;

    if (existingSync) {
      // Update existing event
      result = await updateCalendarEvent(
        config,
        integration.calendar_id,
        existingSync.google_event_id,
        event
      );

      if (result.success) {
        // Update sync record
        await query(
          `UPDATE calendar_events_sync
           SET sync_status = 'synced', last_synced = $1, event_data = $2
           WHERE entity_type = $3 AND entity_id = $4`,
          [new Date().toISOString(), JSON.stringify(event), entityType, entityId]
        );
      }

      return result;
    } else {
      // Create new event
      result = await createCalendarEvent(config, integration.calendar_id, event);

      if (result.success && result.eventId) {
        // Create sync record
        await query(
          `INSERT INTO calendar_events_sync
           (integracion_id, entity_type, entity_id, google_event_id, google_calendar_id, sync_status, event_data)
           VALUES ($1, $2, $3, $4, $5, 'synced', $6)`,
          [
            integration.id,
            entityType,
            entityId,
            result.eventId,
            integration.calendar_id,
            JSON.stringify(event),
          ]
        );
      }

      return result;
    }
  } catch (error: any) {
    console.error('Error syncing to calendar:', error);
    return {
      success: false,
      error: error.message || 'Error al sincronizar con Google Calendar',
    };
  }
};

/**
 * Remove sync from Google Calendar
 */
export const unsyncServiceFromCalendar = async (
  userId: string,
  entityType: CalendarEntityType,
  entityId: number | string,
  orgId?: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    // Get sync record with integration data via JOIN
    const syncResult = await query(
      `SELECT
         ces.*,
         ig.access_token AS ig_access_token,
         ig.refresh_token AS ig_refresh_token,
         ig.calendar_id AS ig_calendar_id,
         ig.org_id AS ig_org_id
       FROM calendar_events_sync ces
       JOIN integraciones_google ig ON ig.id = ces.integracion_id
       WHERE ces.entity_type = $1 AND ces.entity_id = $2
       LIMIT 1`,
      [entityType, entityId]
    );
    const sync = syncResult.rows[0];

    if (!sync) {
      return { success: true }; // Already unsynced
    }

    // Verify org_id scoping
    if (orgId && sync.ig_org_id && sync.ig_org_id !== orgId) {
      return { success: false, error: 'No autorizado para esta organización' };
    }

    const config: GoogleCalendarConfig = {
      accessToken: sync.ig_access_token,
      refreshToken: sync.ig_refresh_token,
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    };

    // Delete from Google Calendar
    const result = await deleteCalendarEvent(
      config,
      sync.google_calendar_id,
      sync.google_event_id
    );

    if (result.success) {
      // Delete sync record
      await query(
        'DELETE FROM calendar_events_sync WHERE entity_type = $1 AND entity_id = $2',
        [entityType, entityId]
      );
    }

    return result;
  } catch (error: any) {
    console.error('Error unsyncing from calendar:', error);
    return {
      success: false,
      error: error.message || 'Error al eliminar sincronización de Google Calendar',
    };
  }
};

/**
 * Check if user has active Google Calendar integration
 */
export const hasCalendarIntegration = async (userId: string): Promise<boolean> => {
  try {
    const result = await query(
      `SELECT id FROM integraciones_google
       WHERE user_id = $1
         AND tipo IN ('calendar', 'both')
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
 * Sync a task to Google Calendar
 */
export const syncTareaToCalendar = async (
  userId: string,
  tarea: {
    id: number;
    titulo: string;
    descripcion?: string;
    fecha_requerida?: string;
    cliente_nombre?: string;
    ubicacion?: string;
    prioridad?: string;
  }
): Promise<{ success: boolean; eventId?: string; error?: string }> => {
  // Build event data from tarea
  const startDate = tarea.fecha_requerida
    ? new Date(tarea.fecha_requerida)
    : new Date();

  // Set default time to 9:00 AM if no time specified
  startDate.setHours(9, 0, 0, 0);

  const endDate = new Date(startDate);
  endDate.setHours(10, 0, 0, 0); // 1 hour duration by default

  const prioridadEmoji =
    tarea.prioridad === 'urgente' ? '🔴' :
    tarea.prioridad === 'alta' ? '🟠' :
    tarea.prioridad === 'media' ? '🟡' : '🟢';

  const event: CalendarEvent = {
    summary: `${prioridadEmoji} ${tarea.titulo}`,
    description: [
      tarea.descripcion,
      tarea.cliente_nombre ? `Cliente: ${tarea.cliente_nombre}` : null,
      `Prioridad: ${tarea.prioridad || 'media'}`,
      `ID: TAR-${String(tarea.id).padStart(6, '0')}`,
    ].filter(Boolean).join('\n\n'),
    location: tarea.ubicacion,
    start: startDate.toISOString(),
    end: endDate.toISOString(),
    reminders: {
      useDefault: false,
      overrides: [
        { method: 'popup', minutes: 60 }, // 1 hour before
        { method: 'popup', minutes: 15 }, // 15 min before
      ],
    },
  };

  return syncServiceToCalendar(userId, 'tarea', tarea.id, event);
};

/**
 * Sync a reunion/meeting to Google Calendar
 */
export const syncReunionToCalendar = async (
  userId: string,
  reunion: {
    id: number;
    titulo: string;
    descripcion?: string;
    fecha_inicio: string;
    fecha_fin?: string;
    ubicacion?: string;
    asistentes?: Array<{ email: string; nombre?: string }>;
  }
): Promise<{ success: boolean; eventId?: string; error?: string }> => {
  const startDate = new Date(reunion.fecha_inicio);
  const endDate = reunion.fecha_fin
    ? new Date(reunion.fecha_fin)
    : new Date(startDate.getTime() + 60 * 60 * 1000); // 1 hour by default

  const event: CalendarEvent = {
    summary: `📅 ${reunion.titulo}`,
    description: reunion.descripcion,
    location: reunion.ubicacion,
    start: startDate.toISOString(),
    end: endDate.toISOString(),
    attendees: reunion.asistentes?.map(a => ({
      email: a.email,
      displayName: a.nombre,
    })),
    reminders: {
      useDefault: false,
      overrides: [
        { method: 'email', minutes: 24 * 60 }, // 1 day before
        { method: 'popup', minutes: 30 }, // 30 min before
      ],
    },
  };

  return syncServiceToCalendar(userId, 'reunion', reunion.id, event);
};

/**
 * Sync a turno to Google Calendar
 */
export const syncTurnoToCalendar = async (
  userId: string,
  turno: {
    id: string;
    tipo: string;
    fecha: string;
    hora_inicio: string;
    duracion_minutos: number;
    contacto_nombre?: string;
    motivo?: string;
    notas?: string;
  },
  orgId?: string
): Promise<{ success: boolean; eventId?: string; error?: string }> => {
  const startDate = new Date(`${turno.fecha}T${turno.hora_inicio}`);
  const endDate = new Date(startDate.getTime() + turno.duracion_minutos * 60000);

  const descriptionParts = [
    turno.motivo ? `Motivo: ${turno.motivo}` : null,
    turno.notas ? `Notas: ${turno.notas}` : null,
  ].filter(Boolean);

  const clienteName = turno.contacto_nombre || '';
  const summary = clienteName
    ? `Turno: ${turno.tipo} - ${clienteName}`
    : `Turno: ${turno.tipo}`;

  const event: CalendarEvent = {
    summary,
    description: descriptionParts.join('\n\n') || undefined,
    start: startDate.toISOString(),
    end: endDate.toISOString(),
    reminders: {
      useDefault: false,
      overrides: [
        { method: 'popup', minutes: 30 },
        { method: 'popup', minutes: 15 },
      ],
    },
  };

  return syncServiceToCalendar(userId, 'turno', turno.id as any, event, orgId);
};

/**
 * Get user's Google integration status
 */
export const getGoogleIntegrationStatus = async (
  userId: string
): Promise<{
  connected: boolean;
  type?: 'calendar' | 'drive' | 'both';
  calendarId?: string;
  email?: string;
  lastSync?: string;
  error?: string;
}> => {
  try {
    const result = await query(
      `SELECT * FROM integraciones_google
       WHERE user_id = $1 AND estado = 'active'
       LIMIT 1`,
      [userId]
    );
    const data = result.rows[0];

    if (!data) {
      return { connected: false };
    }

    return {
      connected: true,
      type: data.tipo,
      calendarId: data.calendar_id,
      lastSync: data.last_sync,
    };
  } catch {
    return { connected: false };
  }
};

/**
 * Disconnect Google integration for a user
 */
export const disconnectGoogleIntegration = async (
  userId: string,
  orgId?: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const params: any[] = ['revoked', new Date().toISOString(), userId];
    let sql = `
      UPDATE integraciones_google
      SET estado = $1,
          access_token = NULL,
          refresh_token = NULL,
          updated_at = $2
      WHERE user_id = $3
    `;

    if (orgId) {
      params.push(orgId);
      sql += ` AND org_id = $${params.length}`;
    }

    await query(sql, params);

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

/**
 * Get OAuth2 authorization URL
 */
export const getGoogleAuthUrl = (state?: string): string => {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_OAUTH_REDIRECT_URI || 'http://localhost:3000/api/auth/google/callback'
  );

  const scopes = [
    'https://www.googleapis.com/auth/calendar',
    'https://www.googleapis.com/auth/calendar.events',
    'https://www.googleapis.com/auth/drive.file',
  ];

  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    state: state || '',
    prompt: 'consent', // Force to get refresh token
  });
};
