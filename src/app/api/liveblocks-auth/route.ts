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
  const liveblocks = new Liveblocks({
    secret: process.env.LIVEBLOCKS_SECRET_KEY as string,
  });

  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });
  const { room } = await request.json();

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

  const { status, body } = await session.authorize();
  return new NextResponse(body, { status });
}
