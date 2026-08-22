import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { query } from '@/lib/db';

// Parse state format: "statePart|origin|persona_id"
function parseOAuthState(rawState: string) {
  const parts = rawState.split('|');
  return {
    state: parts[0] || '',
    origin: parts[1] || '',
    personaId: parts[2] || '',
  };
}

export async function GET(request: NextRequest) {
  // Use forwarded host/proto for correct redirects behind reverse proxy
  const proto = request.headers.get('x-forwarded-proto') || 'http';
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || 'localhost:3000';
  const baseUrl = `${proto}://${host}`;

  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const error = searchParams.get('error');
    const rawState = searchParams.get('state') || '';
    const { state, origin, personaId } = parseOAuthState(rawState);

    // Use origin from state if available (preserves custom domain)
    const redirectBase = origin || baseUrl;

    if (error) {
      return NextResponse.redirect(
        new URL(`/dashboard/configuracion/integraciones?error=${encodeURIComponent(error)}`, redirectBase)
      );
    }

    if (!code) {
      return NextResponse.redirect(
        new URL('/dashboard/configuracion/integraciones?error=no_code', redirectBase)
      );
    }

    // Get user ID from state (set by /api/auth/google which verified the session)
    if (!personaId) {
      return NextResponse.redirect(
        new URL('/dashboard/configuracion/integraciones?error=not_authenticated', redirectBase)
      );
    }

    const userId = personaId;

    // Initialize OAuth2 client
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_OAUTH_REDIRECT_URI || `${request.nextUrl.origin}/api/auth/google/callback`
    );

    // Exchange code for tokens
    const { tokens } = await oauth2Client.getToken(code);

    if (!tokens.access_token || !tokens.refresh_token) {
      return NextResponse.redirect(
        new URL('/dashboard/configuracion/integraciones?error=invalid_tokens', redirectBase)
      );
    }

    oauth2Client.setCredentials(tokens);

    // Determine integration type based on scopes
    const scopes = tokens.scope?.split(' ') || [];
    const hasCalendar = scopes.some(s => s.includes('calendar'));
    const hasDrive = scopes.some(s => s.includes('drive'));

    let tipo: 'calendar' | 'drive' | 'both' = 'both';
    if (hasCalendar && !hasDrive) tipo = 'calendar';
    if (hasDrive && !hasCalendar) tipo = 'drive';

    // Get primary calendar ID if calendar scope granted
    let calendarId = 'primary';
    if (hasCalendar) {
      try {
        const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
        const calendarList = await calendar.calendarList.list();
        const primaryCal = calendarList.data.items?.find(cal => cal.primary);
        if (primaryCal?.id) {
          calendarId = primaryCal.id;
        }
      } catch (err) {
        console.error('Error getting calendar ID:', err);
      }
    }

    // Create root folder in Drive if drive scope granted
    let driveFolderId: string | null = null;
    if (hasDrive) {
      try {
        const drive = google.drive({ version: 'v3', auth: oauth2Client });
        const folderMetadata = {
          name: 'Gestie - Documentos',
          mimeType: 'application/vnd.google-apps.folder',
        };
        const folder = await drive.files.create({
          requestBody: folderMetadata,
          fields: 'id',
        });
        driveFolderId = folder.data.id ?? null;
      } catch (err) {
        console.error('Error creating Drive folder:', err);
      }
    }

    // Calculate token expiry
    const tokenExpiry = tokens.expiry_date
      ? new Date(tokens.expiry_date).toISOString()
      : new Date(Date.now() + 3600 * 1000).toISOString(); // Default 1 hour

    // Store integration in database (upsert)
    await query(
      `INSERT INTO integraciones_google (
        user_id, tipo, access_token, refresh_token, token_expiry, scope,
        calendar_id, sync_enabled, drive_folder_id, estado, error_message, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
      ON CONFLICT (user_id, tipo) DO UPDATE SET
        access_token = EXCLUDED.access_token,
        refresh_token = EXCLUDED.refresh_token,
        token_expiry = EXCLUDED.token_expiry,
        scope = EXCLUDED.scope,
        calendar_id = EXCLUDED.calendar_id,
        sync_enabled = EXCLUDED.sync_enabled,
        drive_folder_id = EXCLUDED.drive_folder_id,
        estado = EXCLUDED.estado,
        error_message = EXCLUDED.error_message,
        updated_at = NOW()`,
      [
        userId,
        tipo,
        tokens.access_token,
        tokens.refresh_token,
        tokenExpiry,
        scopes,
        hasCalendar ? calendarId : null,
        hasCalendar,
        driveFolderId,
        'active',
        null
      ]
    );

    const redirectPath = state === 'calendar-sidebar'
      ? '/dashboard?gcal=connected'
      : '/dashboard/configuracion/integraciones?success=google_connected';

    return NextResponse.redirect(new URL(redirectPath, redirectBase));
  } catch (error: any) {
    console.error('OAuth callback error:', error);
    const rawState = request.nextUrl.searchParams.get('state') || '';
    const { state: errState, origin: errOrigin } = parseOAuthState(rawState);
    const errRedirectBase = errOrigin || baseUrl;
    const errorRedirect = errState === 'calendar-sidebar'
      ? `/dashboard?gcal_error=${encodeURIComponent(error.message || 'unknown_error')}`
      : `/dashboard/configuracion/integraciones?error=${encodeURIComponent(error.message || 'unknown_error')}`;
    return NextResponse.redirect(new URL(errorRedirect, errRedirectBase));
  }
}
