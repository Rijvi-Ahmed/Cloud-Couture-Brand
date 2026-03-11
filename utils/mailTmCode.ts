/**
 * Mail.tm API – fetch the latest 6-digit verification code from your inbox.
 *
 * Flow:
 *   Step 1 – Resolve API path (GET /)
 *   Step 2 – Get Bearer token (POST /token)
 *   Step 3 – Wait a bit so the new verification email can arrive (initialDelayMs)
 *   Step 4 – Poll: GET /messages → pick latest message → GET /messages/{id} → extract code
 *
 * Docs: https://api.mail.tm/#/ and https://docs.mail.tm/api/messages
 */

const MAILTM_BASE = 'https://api.mail.tm';
const SIX_DIGIT_REGEX = /\d{6}/;

// ---------------------------------------------------------------------------
// Types (match Mail.tm API responses)
// ---------------------------------------------------------------------------

interface TokenResponse {
  token?: string;
  access_token?: string;
  [key: string]: unknown;
}

/** One message in the list from GET /messages (has id, subject, from, createdAt, etc.) */
interface MessageListItem {
  id: string;
  subject?: string;
  from?: { name?: string; address?: string };
  createdAt?: string;
  intro?: string;
}

/** Full message from GET /messages/{id} (includes text and html body) */
interface MessageDetail {
  id: string;
  text?: string;
  html?: string | string[];
  subject?: string;
  from?: { name?: string; address?: string };
  createdAt?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Step 1 – Resolve the messages API path from the entrypoint.
 * GET / returns JSON with a "message" field (e.g. "/messages"); we need the full URL for later calls.
 */
async function getMessagesPath(): Promise<string> {
  try {
    const res = await fetch(MAILTM_BASE + '/', {
      headers: { Accept: 'application/ld+json' },
    });
    if (!res.ok) return MAILTM_BASE + '/messages';
    const data = (await res.json()) as { message?: string };
    const path = data.message ?? '/messages';
    return path.startsWith('http') ? path : MAILTM_BASE + path;
  } catch {
    return MAILTM_BASE + '/messages';
  }
}

/**
 * Step 2 – Get a Bearer token so we can call GET /messages and GET /messages/{id}.
 * POST /token with address and password; response may use "token" or "access_token".
 */
async function getMailTmToken(address: string, password: string): Promise<string> {
  const res = await fetch(MAILTM_BASE + '/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ address, password }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Mail.tm token failed: ${res.status} ${err}`);
  }
  const data = (await res.json()) as TokenResponse;
  const token = data.token ?? data.access_token;
  if (!token || typeof token !== 'string') {
    throw new Error('Mail.tm token missing in response: ' + JSON.stringify(data));
  }
  return token;
}

/**
 * Step 4a – List messages (GET /messages).
 * Returns up to 30 messages per page; API uses "hydra:member" (or "member") for the list.
 */
async function fetchMessageList(
  token: string,
  messagesPath: string,
  page = 1
): Promise<MessageListItem[]> {
  const separator = messagesPath.includes('?') ? '&' : '?';
  const url = `${messagesPath}${separator}page=${page}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Mail.tm messages failed: ${res.status} ${await res.text()}`);
  const data = (await res.json()) as { 'hydra:member'?: MessageListItem[]; member?: MessageListItem[] };
  const list = data['hydra:member'] ?? data.member ?? [];
  return Array.isArray(list) ? list : [];
}

/**
 * Step 4b – Fetch one full message by id (GET /messages/{id}).
 * Only the full message has "text" and "html" where the 6-digit code lives.
 */
async function fetchMessageById(
  token: string,
  messagesPath: string,
  messageId: string
): Promise<MessageDetail> {
  const base = messagesPath.split('?')[0]!.replace(/\/messages\/?$/, '') || MAILTM_BASE;
  const url = `${base}/messages/${messageId}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    throw new Error(`Mail.tm message ${messageId} failed: ${res.status} ${await res.text()}`);
  }
  return (await res.json()) as MessageDetail;
}

/** Find first 6-digit sequence in a string. */
function extractCodeFromText(text: string): string | null {
  const match = text.match(SIX_DIGIT_REGEX);
  return match ? match[0]! : null;
}

/** Get 6-digit code from full message: check plain text first, then html. */
function getCodeFromMessage(message: MessageDetail): string | null {
  const text = message.text ?? '';
  const html = Array.isArray(message.html)
    ? message.html.join(' ')
    : typeof message.html === 'string'
      ? message.html
      : '';
  return extractCodeFromText(text) ?? extractCodeFromText(html);
}

/** Sort messages newest first (by createdAt). */
function sortByNewestFirst(messages: MessageListItem[]): MessageListItem[] {
  return [...messages].sort((a, b) => {
    const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return timeB - timeA;
  });
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface MailTmOptions {
  /** Max time to keep polling for the new email (default 60s). */
  timeoutMs?: number;
  /** Delay between each poll (default 4s). */
  pollIntervalMs?: number;
  /** Wait this long before first poll so the new verification email can arrive (default 5s). */
  initialDelayMs?: number;
  /** Only use a message if its createdAt >= this time (avoids old codes). */
  receivedAfter?: Date;
}

/**
 * Get the 6-digit verification code from the Mail.tm inbox.
 *
 * - we use the Mail.tm API and return the code from the latest message only.
 */
export async function getVerificationCodeFromMailTm(
  address: string,
  password: string,
  options?: MailTmOptions
): Promise<string> {
  // Optional: use code from .env so you can run without Mail.tm (e.g. paste code once)
  const envCode = process.env.VERIFICATION_CODE?.trim();
  if (envCode && SIX_DIGIT_REGEX.test(envCode)) return envCode;

  const timeoutMs = options?.timeoutMs ?? 60000;
  const pollIntervalMs = options?.pollIntervalMs ?? 4000;
  const initialDelayMs = options?.initialDelayMs ?? 5000;
  const receivedAfter = options?.receivedAfter ?? new Date(Date.now() - 60000);
  const deadline = Date.now() + timeoutMs;

  // Step 1 – Resolve messages path
  const messagesPath = await getMessagesPath();

  // Step 2 – Get Bearer token
  const token = await getMailTmToken(address, password);

  // Step 3 – Give the new verification email time to arrive
  await sleep(initialDelayMs);

  // Step 4 – Poll: get list → latest message → full body → extract code
  while (Date.now() < deadline) {
    const list = await fetchMessageList(token, messagesPath);
    const byNewest = sortByNewestFirst(list);
    const latest = byNewest[0];

    if (latest) {
      const createdAt = latest.createdAt ? new Date(latest.createdAt).getTime() : 0;
      const isRecentEnough = createdAt >= receivedAfter.getTime();

      if (isRecentEnough) {
        try {
          const fullMessage = await fetchMessageById(token, messagesPath, latest.id);
          const code = getCodeFromMessage(fullMessage);
          if (code) return code;
        } catch {
          // e.g. message deleted or API error; retry next poll
        }
      }
    }

    await sleep(pollIntervalMs);
  }

  throw new Error(
    `No 6-digit code found in Mail.tm (${address}) within ${timeoutMs}ms.`
  );
}
