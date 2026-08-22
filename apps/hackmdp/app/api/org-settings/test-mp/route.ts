import { query } from "@/lib/db";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

export const revalidate = 0;

// POST — Test MercadoPago connection using stored access token
export async function POST() {
  try {
    const session = await getSession();
    if (!session?.org_id || !session.is_admin) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const result = await query(
      `SELECT valor FROM org_settings WHERE org_id = $1 AND clave = 'mp_access_token'`,
      [session.org_id]
    );

    const accessToken = result.rows[0]?.valor || process.env.MP_TEST_ACCESS_TOKEN;
    if (!accessToken) {
      return NextResponse.json({ ok: false, error: 'No hay access token configurado' });
    }

    const res = await fetch('https://api.mercadopago.com/users/me', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (res.ok) {
      const data = await res.json();
      return NextResponse.json({
        ok: true,
        account: {
          id: data.id,
          nickname: data.nickname,
          email: data.email,
          site_id: data.site_id,
        },
      });
    }

    return NextResponse.json({ ok: false, error: `MP respondió ${res.status}` });
  } catch (error: any) {
    console.error("Error testing MP connection:", error);
    return NextResponse.json({ ok: false, error: error.message });
  }
}
