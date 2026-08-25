import Pusher from 'pusher';
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID!,
  key: process.env.PUSHER_KEY!,
  secret: process.env.PUSHER_SECRET!,
  cluster: process.env.PUSHER_CLUSTER!,
  useTLS: true,
});

export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  const userId = cookieStore.get('userId')?.value;

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const body = await request.text();
  const params = new URLSearchParams(body);
  const socketId = params.get('socket_id')!;
  const channel = params.get('channel_name')!;

  const authResponse = pusher.authorizeChannel(socketId, channel);
  return NextResponse.json(authResponse);
}
