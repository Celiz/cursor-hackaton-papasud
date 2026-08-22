import { NextRequest, NextResponse } from 'next/server';
import { getGoogleAuthUrl } from '@/lib/google-calendar';
import { getSession } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.persona_id) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const statePart = searchParams.get('state') || '';
    const origin = searchParams.get('origin') || '';

    // Encode state, origin, and persona_id into the OAuth state parameter
    // Format: "statePart|origin|persona_id"
    const state = `${statePart}|${origin}|${session.persona_id}`;

    const authUrl = getGoogleAuthUrl(state);

    return NextResponse.redirect(authUrl);
  } catch (error: any) {
    console.error('Error generating auth URL:', error);
    return NextResponse.json(
      { error: error.message || 'Error al generar URL de autenticación' },
      { status: 500 }
    );
  }
}
