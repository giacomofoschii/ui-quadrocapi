import { Liveblocks } from '@liveblocks/node';
import { getToken } from 'next-auth/jwt';
import { NextRequest, NextResponse } from 'next/server';

const ANIMALI_SCOUT = [
  'Lupo',
  'Falco',
  'Cervo',
  'Orso',
  'Volpe',
  'Aquila',
  'Puma',
  'Tigre',
];

export async function POST(request: NextRequest) {
  try {
    if (!process.env.LIVEBLOCKS_SECRET_KEY) {
      console.error('ERRORE: Manca la LIVEBLOCKS_SECRET_KEY!');
      return new NextResponse('Manca la chiave segreta', { status: 500 });
    }

    const liveblocks = new Liveblocks({
      secret: process.env.LIVEBLOCKS_SECRET_KEY,
    });

    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    });

    let room = 'lavagna-principale';
    try {
      const body = await request.json();
      if (body?.room) room = body.room;
    } catch (e) {
      // Ignoriamo l'errore se non c'è un body JSON
    }

    let email = token?.email;
    let name = token?.name;
    let avatar = token?.picture || '';

    if (!email || !name) {
      const animale =
        ANIMALI_SCOUT[Math.floor(Math.random() * ANIMALI_SCOUT.length)];
      const idCasuale = Math.floor(Math.random() * 1000);
      email = `anonimo_${idCasuale}@scout.it`;
      name = `${animale} Misterioso`;
      avatar = `https://api.dicebear.com/7.x/bottts/svg?seed=${animale}`;
    }

    const session = liveblocks.prepareSession(email, {
      userInfo: { name, avatar },
    });

    session.allow(room, session.FULL_ACCESS);

    const { status, body: sessionBody } = await session.authorize();
    return new NextResponse(sessionBody, { status });
  } catch (error) {
    console.error('Errore critico in API Liveblocks:', error);
    return new NextResponse('Errore interno del server', { status: 500 });
  }
}
