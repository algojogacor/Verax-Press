// HTTP helpers for the regression test suite — handles cookie-based staff auth.
import { BASE, CHIEF_PW, EDITOR_PW, AUTHOR_PW, API_SECRET, TEST_AGENT_CLIENT_ID } from './test-db'

export interface TestClient {
  cookies: string
}

function cookieHeader(cookies: string[]): string {
  return cookies.map((c) => c.split(';')[0]).join('; ')
}

export async function loginAs(
  role: 'chief' | 'editor' | 'author' | 'editor-nogrant' | 'editor-inactive'
): Promise<TestClient> {
  const emailMap: Record<string, string> = {
    chief: 'chief@verity.test',
    editor: 'editor@verity.test',
    author: 'author@verity.test',
    'editor-nogrant': 'editor-nogrant@verity.test',
    'editor-inactive': 'editor-inactive@verity.test',
  };
  const email = emailMap[role] ?? `${role}@verity.test`;
  const pw = role === 'chief' ? CHIEF_PW : role === 'author' ? AUTHOR_PW : EDITOR_PW;
  const jar: string[] = []
  // Get CSRF token.
  const csrfRes = await fetch(`${BASE}/api/auth/csrf`)
  const setCookies = csrfRes.headers.getSetCookie?.() ?? []
  jar.push(...setCookies)
  const { csrfToken } = (await csrfRes.json()) as { csrfToken: string }
  // Login.
  const loginRes = await fetch(`${BASE}/api/auth/callback/credentials`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Cookie: cookieHeader(jar),
    },
    body: new URLSearchParams({ csrfToken, email, password: pw }).toString(),
    redirect: 'manual',
  })
  const loginCookies = loginRes.headers.getSetCookie?.() ?? []
  jar.push(...loginCookies)
  return { cookies: cookieHeader(jar) }
}

export async function apiAuthHeader(): Promise<string> {
  return `Bearer ${TEST_AGENT_CLIENT_ID}.${API_SECRET}`
}

export async function get(path: string, client?: TestClient): Promise<Response> {
  return fetch(`${BASE}${path}`, {
    headers: client ? { Cookie: client.cookies } : {},
  })
}

export async function postJson(
  path: string,
  body: unknown,
  client?: TestClient,
): Promise<Response> {
  return fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(client ? { Cookie: client.cookies } : {}),
    },
    body: JSON.stringify(body),
  })
}

export async function patchJson(
  path: string,
  body: unknown,
  client?: TestClient,
): Promise<Response> {
  return fetch(`${BASE}${path}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...(client ? { Cookie: client.cookies } : {}),
    },
    body: JSON.stringify(body),
  })
}

// Submit via AI ingestion API (Bearer token with vrtc_ format).
export async function submitAi(body: unknown, authHeader?: string): Promise<Response> {
  return fetch(`${BASE}/api/internal/v1/ai-submissions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: authHeader ?? (await apiAuthHeader()),
    },
    body: JSON.stringify(body),
  })
}

// Create a draft article via CMS API. Returns the created article.
export async function createArticle(
  client: TestClient,
  overrides: Record<string, unknown> = {},
): Promise<{ id: string; slug: string; status: string }> {
  const sources = (overrides.sources as any[]) ?? []
  const { sources: _omitted, desk, deskSlug, format, ...restOverrides } = overrides

  const resolvedDeskSlug = (deskSlug ?? (desk === 'law_justice' ? 'hukum-keadilan' : desk === 'technology_policy' ? 'teknologi-kebijakan' : desk)) ?? 'hukum-keadilan'
  const resolvedFormat = format ? String(format).toUpperCase() : 'ANALYSIS'

  const res = await postJson('/api/cms/articles', {
    title: 'Test Article ' + Math.random().toString(36).slice(2, 8),
    deck: 'Ringkasan artikel pengujian regresi untuk validasi gerbang publikasi.',
    deskSlug: resolvedDeskSlug,
    format: resolvedFormat,
    content: [{ type: 'paragraph', text: 'Test body text.' }],
    aiInvolvement: 'none',
    ...restOverrides,
  }, client)

  const data = (await res.json()) as { id?: string; slug?: string; article?: { id: string; slug: string; status: string } }
  const artId = data.id ?? data.article?.id
  const artSlug = data.slug ?? data.article?.slug

  if (!artId) {
    throw new Error(`Failed to create article: ${JSON.stringify(data)} (status: ${res.status})`)
  }

  // Attach sources via canonical nested route if requested
  for (const src of sources) {
    const srcType = src.sourceType ? String(src.sourceType).toUpperCase() : 'PRIMARY'
    await postJson(`/api/cms/articles/${artId}/sources`, {
      title: src.title ?? 'Sumber Rujukan',
      url: src.url ?? 'https://example.com/sumber',
      sourceType: srcType,
      isKeySource: src.isKeySource ?? false,
    }, client)
  }

  return { id: artId, slug: artSlug ?? '', status: 'DRAFT' }
}

// Transition an article through the workflow.
export async function transition(
  client: TestClient,
  articleId: string,
  toOrAction: string,
  reason?: string,
): Promise<{ status: number; body: unknown }> {
  const actionMap: Record<string, string> = {
    'pending_review': 'SUBMIT_REVIEW',
    'fact_check': 'START_FACT_CHECK',
    'pending_approval': 'SUBMIT_FOR_APPROVAL',
    'published': 'PUBLISH',
    'revision_needed': 'REQUEST_REVISION',
    'rejected': 'REJECT',
    'retracted': 'RETRACT',
    'archived': 'ARCHIVE',
    'withdrawn': 'WITHDRAW',
  }
  const action = actionMap[toOrAction.toLowerCase()] ?? toOrAction
  const res = await postJson(`/api/cms/articles/${articleId}/transition`, { action, reason }, client)
  return { status: res.status, body: await res.json() }
}
