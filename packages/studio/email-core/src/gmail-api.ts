import { google } from 'googleapis';

const gmail = google.gmail('v1');

export interface GmailTokens {
  access_token: string;
  refresh_token?: string;
  expiry_date?: number;
}

export interface GmailMessage {
  id: string;
  threadId: string;
  from: string;
  fromName?: string;
  to: string[];
  cc?: string[];
  subject: string;
  bodyText?: string;
  bodyHtml?: string;
  date: Date;
  snippet: string;
  read: boolean;
  labels: string[];
  attachments?: Array<{
    filename: string;
    mimeType: string;
    size: number;
    attachmentId: string;
  }>;
}

/**
 * Crea un cliente OAuth2 configurado
 */
export function getOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GMAIL_OAUTH_REDIRECT_URI || process.env.GOOGLE_REDIRECT_URI
  );
}

/**
 * Genera URL de autorización para Gmail
 */
export function getAuthUrl(state?: string): string {
  const oauth2Client = getOAuth2Client();

  const scopes = [
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/gmail.send',
    'https://www.googleapis.com/auth/gmail.modify',
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/userinfo.profile',
  ];

  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    prompt: 'consent', // Forzar pantalla de consentimiento para obtener refresh_token
    state: state || '',
  });
}

/**
 * Intercambia código de autorización por tokens
 */
export async function getTokensFromCode(code: string): Promise<GmailTokens> {
  const oauth2Client = getOAuth2Client();
  const { tokens } = await oauth2Client.getToken(code);

  return {
    access_token: tokens.access_token!,
    refresh_token: tokens.refresh_token ?? undefined,
    expiry_date: tokens.expiry_date ?? undefined,
  };
}

/**
 * Refresca el access token usando refresh token
 */
export async function refreshAccessToken(refreshToken: string): Promise<GmailTokens> {
  const oauth2Client = getOAuth2Client();
  oauth2Client.setCredentials({
    refresh_token: refreshToken,
  });

  const { credentials } = await oauth2Client.refreshAccessToken();

  return {
    access_token: credentials.access_token!,
    refresh_token: credentials.refresh_token ?? undefined,
    expiry_date: credentials.expiry_date ?? undefined,
  };
}

/**
 * Configura el cliente con tokens
 */
function setAuthClient(tokens: GmailTokens) {
  const oauth2Client = getOAuth2Client();
  oauth2Client.setCredentials({
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expiry_date: tokens.expiry_date,
  });
  return oauth2Client;
}

/**
 * Obtiene información del usuario autenticado
 */
export async function getUserInfo(tokens: GmailTokens) {
  const oauth2Client = setAuthClient(tokens);

  const oauth2 = google.oauth2({
    auth: oauth2Client,
    version: 'v2',
  });

  const { data } = await oauth2.userinfo.get();

  return {
    email: data.email!,
    name: data.name,
    picture: data.picture,
  };
}

/**
 * Lista mensajes de Gmail
 */
export async function listMessages(
  tokens: GmailTokens,
  options: {
    maxResults?: number;
    pageToken?: string;
    query?: string; // Ej: 'is:unread', 'from:example@gmail.com'
  } = {}
): Promise<{
  messages: Array<{ id: string; threadId: string }>;
  nextPageToken?: string;
}> {
  const oauth2Client = setAuthClient(tokens);

  const response = await gmail.users.messages.list({
    auth: oauth2Client,
    userId: 'me',
    maxResults: options.maxResults || 20,
    pageToken: options.pageToken,
    q: options.query,
  });

  return {
    messages: (response.data.messages || []) as { id: string; threadId: string }[],
    nextPageToken: response.data.nextPageToken ?? undefined,
  };
}

/**
 * Obtiene un mensaje completo por ID
 */
export async function getMessage(tokens: GmailTokens, messageId: string): Promise<GmailMessage> {
  const oauth2Client = setAuthClient(tokens);

  const response = await gmail.users.messages.get({
    auth: oauth2Client,
    userId: 'me',
    id: messageId,
    format: 'full',
  });

  const message = response.data;
  const headers = message.payload?.headers || [];

  // Extraer headers importantes
  const getHeader = (name: string) => headers.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value || '';

  const from = getHeader('from');
  const fromMatch = from.match(/^(.+?)\s*<(.+?)>$/);
  const fromName = fromMatch ? fromMatch[1].replace(/"/g, '') : '';
  const fromEmail = fromMatch ? fromMatch[2] : from;

  const to = getHeader('to').split(',').map((t) => t.trim());
  const cc = getHeader('cc') ? getHeader('cc').split(',').map((c) => c.trim()) : undefined;
  const subject = getHeader('subject');
  const dateStr = getHeader('date');

  // Extraer el cuerpo
  let bodyText = '';
  let bodyHtml = '';

  const getBody = (part: any): void => {
    if (part.mimeType === 'text/plain' && part.body?.data) {
      bodyText += Buffer.from(part.body.data, 'base64').toString('utf-8');
    } else if (part.mimeType === 'text/html' && part.body?.data) {
      bodyHtml += Buffer.from(part.body.data, 'base64').toString('utf-8');
    }

    if (part.parts) {
      part.parts.forEach(getBody);
    }
  };

  if (message.payload) {
    getBody(message.payload);
  }

  // Extraer adjuntos
  const attachments: GmailMessage['attachments'] = [];
  const extractAttachments = (part: any): void => {
    if (part.filename && part.body?.attachmentId) {
      attachments.push({
        filename: part.filename,
        mimeType: part.mimeType || 'application/octet-stream',
        size: part.body.size || 0,
        attachmentId: part.body.attachmentId,
      });
    }
    if (part.parts) {
      part.parts.forEach(extractAttachments);
    }
  };

  if (message.payload) {
    extractAttachments(message.payload);
  }

  // Verificar si está leído
  const isRead = !message.labelIds?.includes('UNREAD');

  return {
    id: message.id!,
    threadId: message.threadId!,
    from: fromEmail,
    fromName,
    to,
    cc,
    subject,
    bodyText,
    bodyHtml,
    date: new Date(dateStr),
    snippet: message.snippet || '',
    read: isRead,
    labels: message.labelIds || [],
    attachments: attachments.length > 0 ? attachments : undefined,
  };
}

/**
 * Envía un email usando Gmail API
 */
export async function sendEmail(
  tokens: GmailTokens,
  options: {
    to: string[];
    cc?: string[];
    bcc?: string[];
    subject: string;
    text?: string;
    html?: string;
  }
): Promise<{ id: string; threadId: string }> {
  const oauth2Client = setAuthClient(tokens);

  // Determinar el tipo de contenido y el cuerpo
  const isHtml = !!options.html;
  const contentType = isHtml ? 'text/html; charset=utf-8' : 'text/plain; charset=utf-8';
  const body = options.html || options.text || '';

  // Crear el mensaje en formato RFC 2822
  const headers = [
    `To: ${options.to.join(', ')}`,
    options.cc ? `Cc: ${options.cc.join(', ')}` : '',
    options.bcc ? `Bcc: ${options.bcc.join(', ')}` : '',
    `Subject: ${options.subject}`,
    'MIME-Version: 1.0',
    `Content-Type: ${contentType}`,
  ].filter(Boolean);

  const messageParts = [...headers, '', body];

  const message = messageParts.join('\r\n');
  const encodedMessage = Buffer.from(message).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

  const response = await gmail.users.messages.send({
    auth: oauth2Client,
    userId: 'me',
    requestBody: {
      raw: encodedMessage,
    },
  });

  return {
    id: response.data.id!,
    threadId: response.data.threadId!,
  };
}

/**
 * Marca un mensaje como leído
 */
export async function markAsRead(tokens: GmailTokens, messageId: string): Promise<void> {
  const oauth2Client = setAuthClient(tokens);

  await gmail.users.messages.modify({
    auth: oauth2Client,
    userId: 'me',
    id: messageId,
    requestBody: {
      removeLabelIds: ['UNREAD'],
    },
  });
}

/**
 * Marca un mensaje como no leído
 */
export async function markAsUnread(tokens: GmailTokens, messageId: string): Promise<void> {
  const oauth2Client = setAuthClient(tokens);

  await gmail.users.messages.modify({
    auth: oauth2Client,
    userId: 'me',
    id: messageId,
    requestBody: {
      addLabelIds: ['UNREAD'],
    },
  });
}

/**
 * Descarga un adjunto
 */
export async function getAttachment(
  tokens: GmailTokens,
  messageId: string,
  attachmentId: string
): Promise<Buffer> {
  const oauth2Client = setAuthClient(tokens);

  const response = await gmail.users.messages.attachments.get({
    auth: oauth2Client,
    userId: 'me',
    messageId,
    id: attachmentId,
  });

  const data = response.data.data!;
  return Buffer.from(data, 'base64');
}

/**
 * Lista threads (conversaciones) de Gmail
 */
export async function listThreads(
  tokens: GmailTokens,
  options: {
    maxResults?: number;
    pageToken?: string;
    query?: string;
    labelIds?: string[];
  } = {}
): Promise<{
  threads: Array<{ id: string; snippet: string; historyId: string }>;
  nextPageToken?: string;
  resultSizeEstimate?: number;
}> {
  const oauth2Client = setAuthClient(tokens);

  const response = await gmail.users.threads.list({
    auth: oauth2Client,
    userId: 'me',
    maxResults: options.maxResults || 20,
    pageToken: options.pageToken,
    q: options.query,
    labelIds: options.labelIds,
  });

  return {
    threads: (response.data.threads || []).map((t) => ({
      id: t.id!,
      snippet: t.snippet || '',
      historyId: t.historyId || '',
    })),
    nextPageToken: response.data.nextPageToken || undefined,
    resultSizeEstimate: response.data.resultSizeEstimate ?? undefined,
  };
}

export interface GmailThread {
  id: string;
  historyId: string;
  messages: GmailMessage[];
}

/**
 * Obtiene un thread completo con todos sus mensajes
 */
export async function getThread(tokens: GmailTokens, threadId: string): Promise<GmailThread> {
  const oauth2Client = setAuthClient(tokens);

  const response = await gmail.users.threads.get({
    auth: oauth2Client,
    userId: 'me',
    id: threadId,
    format: 'full',
  });

  const thread = response.data;
  const messages: GmailMessage[] = [];

  for (const msg of thread.messages || []) {
    const headers = msg.payload?.headers || [];
    const getHeader = (name: string) =>
      headers.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value || '';

    const from = getHeader('from');
    const fromMatch = from.match(/^(.+?)\s*<(.+?)>$/) || from.match(/<(.+?)>/);
    const fromName = fromMatch && fromMatch[1] ? fromMatch[1].replace(/"/g, '').trim() : '';
    const fromEmail = fromMatch ? (fromMatch[2] || fromMatch[1]) : from;

    const to = getHeader('to').split(',').map((t) => t.trim()).filter(Boolean);
    const cc = getHeader('cc') ? getHeader('cc').split(',').map((c) => c.trim()).filter(Boolean) : undefined;
    const subject = getHeader('subject');
    const dateStr = getHeader('date');

    let bodyText = '';
    let bodyHtml = '';

    const getBody = (part: any): void => {
      if (part.mimeType === 'text/plain' && part.body?.data) {
        bodyText += Buffer.from(part.body.data, 'base64').toString('utf-8');
      } else if (part.mimeType === 'text/html' && part.body?.data) {
        bodyHtml += Buffer.from(part.body.data, 'base64').toString('utf-8');
      }
      if (part.parts) {
        part.parts.forEach(getBody);
      }
    };

    if (msg.payload) {
      getBody(msg.payload);
    }

    const attachments: GmailMessage['attachments'] = [];
    const extractAttachments = (part: any): void => {
      if (part.filename && part.body?.attachmentId) {
        attachments.push({
          filename: part.filename,
          mimeType: part.mimeType || 'application/octet-stream',
          size: part.body.size || 0,
          attachmentId: part.body.attachmentId,
        });
      }
      if (part.parts) {
        part.parts.forEach(extractAttachments);
      }
    };

    if (msg.payload) {
      extractAttachments(msg.payload);
    }

    const isRead = !msg.labelIds?.includes('UNREAD');

    messages.push({
      id: msg.id!,
      threadId: msg.threadId!,
      from: fromEmail,
      fromName,
      to,
      cc,
      subject,
      bodyText,
      bodyHtml,
      date: dateStr ? new Date(dateStr) : new Date(parseInt(msg.internalDate || '0')),
      snippet: msg.snippet || '',
      read: isRead,
      labels: msg.labelIds || [],
      attachments: attachments.length > 0 ? attachments : undefined,
    });
  }

  // Ordenar mensajes por fecha
  messages.sort((a, b) => a.date.getTime() - b.date.getTime());

  return {
    id: thread.id!,
    historyId: thread.historyId || '',
    messages,
  };
}

/**
 * Obtiene cambios desde un historyId (para sync incremental)
 */
export async function getHistory(
  tokens: GmailTokens,
  startHistoryId: string,
  options: {
    maxResults?: number;
    pageToken?: string;
    labelId?: string;
  } = {}
): Promise<{
  history: Array<{
    id: string;
    messagesAdded?: Array<{ message: { id: string; threadId: string } }>;
    messagesDeleted?: Array<{ message: { id: string; threadId: string } }>;
    labelsAdded?: Array<{ message: { id: string }; labelIds: string[] }>;
    labelsRemoved?: Array<{ message: { id: string }; labelIds: string[] }>;
  }>;
  historyId: string;
  nextPageToken?: string;
}> {
  const oauth2Client = setAuthClient(tokens);

  try {
    const response = await gmail.users.history.list({
      auth: oauth2Client,
      userId: 'me',
      startHistoryId,
      maxResults: options.maxResults || 100,
      pageToken: options.pageToken,
      labelId: options.labelId,
    });

    return {
      history: (response.data.history || []) as any,
      historyId: response.data.historyId || startHistoryId,
      nextPageToken: response.data.nextPageToken || undefined,
    };
  } catch (error: any) {
    // Si el historyId es muy viejo, Gmail devuelve error 404
    if (error.code === 404) {
      return {
        history: [],
        historyId: startHistoryId,
      };
    }
    throw error;
  }
}
