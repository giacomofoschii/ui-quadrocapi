import { Liveblocks } from '@liveblocks/node';
import { NextRequest, NextResponse } from 'next/server';

const liveblocks = new Liveblocks({
  secret: process.env.LIVEBLOCKS_SECRET_KEY as string,
});

type SessionRequest = {
  action: 'create' | 'join' | 'delete';
  id?: string;
  pin?: string;
  roomId?: string;
};

function errorResponse(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as SessionRequest;
  const { action, id, pin, roomId } = body;

  if (!id || !pin || !roomId) {
    return errorResponse('ID, PIN e room mancanti.', 400);
  }

  try {
    if (action === 'create') {
      const existingSessions = await liveblocks.getRooms({
        limit: 100,
        query: { metadata: { sessionId: id } },
      });
      if (existingSessions.data.length > 0) {
        return errorResponse('Questo ID sessione non è disponibile.', 409);
      }

      try {
        await liveblocks.getRoom(roomId);
        return errorResponse('Questo ID sessione non è disponibile.', 409);
      } catch {
        await liveblocks.createRoom(roomId, {
          defaultAccesses: [],
          metadata: { sessionId: id, pin },
        });
        return NextResponse.json({ ok: true });
      }
    }

    let room;
    try {
      room = await liveblocks.getRoom(roomId);
    } catch {
      const sessions = await liveblocks.getRooms({
        limit: 100,
        query: { metadata: { sessionId: id } },
      });
      room = sessions.data.find((candidate) => candidate.metadata.pin === pin);
      if (!room) return errorResponse('ID sessione o PIN non validi.', 403);
    }

    const roomPin = room.metadata.pin;
    if (room.metadata.sessionId !== id || roomPin !== pin) {
      return errorResponse('ID sessione o PIN non validi.', 403);
    }

    if (action === 'delete') {
      await liveblocks.deleteRoom(room.id);
    }

    return NextResponse.json({ ok: true });
  } catch {
    return errorResponse('Sessione non trovata.', 404);
  }
}
