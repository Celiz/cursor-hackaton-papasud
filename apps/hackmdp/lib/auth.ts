/**
 * Auth utilities for Gestie
 * Uses JWT tokens with jose
 */

import { cookies } from "next/headers";
import { jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "locus-dev-secret-change-in-production"
);

export interface SessionUser {
  id: string;
  user_id: string;
  persona_id: string;
  nombre: string;
  email: string;
  rol?: string;
  is_admin?: boolean;
  org_id?: string;
  org_nombre?: string;
  org_logo?: string;
  org_theme?: string;
  org_tipo?: string;
  org_pais?: string;
  modulos_ocultos?: string[];
  modulos_solo_lectura?: string[];
}

/**
 * Get current session from JWT token
 */
export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth_token")?.value;

  if (!token) {
    return null;
  }

  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    if (!payload) return null;

    return {
      id: payload.sub as string,
      user_id: payload.user_id as string,
      persona_id: (payload.persona_id || payload.sub) as string,
      nombre: payload.nombre as string,
      email: payload.email as string,
      rol: payload.rol as string,
      is_admin: payload.is_admin as boolean,
      org_id: payload.org_id as string | undefined,
      org_nombre: payload.org_nombre as string | undefined,
      org_logo: payload.org_logo as string | undefined,
      org_theme: payload.org_theme as string | undefined,
      org_tipo: payload.org_tipo as string | undefined,
      org_pais: payload.org_pais as string | undefined,
      modulos_ocultos: (payload.modulos_ocultos as string[] | undefined) ?? [],
      modulos_solo_lectura: (payload.modulos_solo_lectura as string[] | undefined) ?? [],
    };
  } catch {
    return null;
  }
}

/**
 * Require authentication - throws if not authenticated
 */
export async function requireSession(): Promise<SessionUser> {
  const session = await getSession();
  if (!session) {
    throw new Error("No autorizado");
  }
  return session;
}

/**
 * Get user ID from request (for API routes)
 */
export async function getUserId(): Promise<string | null> {
  const session = await getSession();
  return session?.id || null;
}

/**
 * Check if current user is admin
 */
export async function isAdmin(): Promise<boolean> {
  const session = await getSession();
  return session?.is_admin || false;
}

/**
 * Helper for API routes - gets session or returns 401
 */
export async function withAuth<T>(
  handler: (session: SessionUser) => Promise<T>
): Promise<T | Response> {
  const session = await getSession();
  if (!session) {
    return new Response(JSON.stringify({ error: "No autorizado" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  return handler(session);
}

/**
 * Legacy auth() function for compatibility with existing code
 * Returns NextAuth-like session format
 */
export async function auth(): Promise<{ user: { id: string; email: string; name: string; role?: string; isAdmin?: boolean } } | null> {
  const session = await getSession();
  if (!session) return null;

  return {
    user: {
      id: session.id,
      email: session.email,
      name: session.nombre,
      role: session.rol,
      isAdmin: session.is_admin,
    }
  };
}
