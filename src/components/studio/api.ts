// Klien fetch ringan untuk UI studio: melempar error terstruktur dari API
// ({ error, code }) sebagai Error dengan pesan yang siap ditampilkan ke toast.
"use client";

export class ApiClientError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = "ApiClientError";
    this.status = status;
    this.code = code;
  }
}

export async function apiFetch<T>(url: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(init?.headers ?? {}),
      },
    });
  } catch {
    throw new ApiClientError("Tidak dapat menghubungi server. Periksa koneksi Anda.", 0, "NETWORK");
  }

  const text = await response.text();
  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }
  }

  if (!response.ok) {
    const payload = data as { error?: string; code?: string } | null;
    throw new ApiClientError(
      payload?.error ?? `Permintaan gagal (${response.status}).`,
      response.status,
      payload?.code,
    );
  }

  return data as T;
}

/** Pesan error yang aman untuk ditampilkan (dipakai description toast). */
export function apiErrorMessage(error: unknown): string {
  if (error instanceof ApiClientError) return error.message;
  if (error instanceof Error) return error.message;
  return "Terjadi kesalahan tak terduga.";
}
