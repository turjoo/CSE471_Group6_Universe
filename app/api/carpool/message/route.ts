import Pusher from 'pusher';
import { PrismaClient } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const prisma = new PrismaClient();

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

  const { content, postId } = await request.json();

  if (!content || !postId) {
    return NextResponse.json({ error: 'Missing content or postId' }, { status: 400 });
  }

  // Get user info for the message
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true },
  });

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  // Save message to database
  const message = await prisma.chatMessage.create({
    data: {
      content,
      postId,
      userId,
    },
  });

  // Broadcast via Pusher
  await pusher.trigger(`private-carpool-${postId}`, 'new-message', {
    id: message.id,
    content: message.content,
    createdAt: message.createdAt,
    user: { id: user.id, name: user.name },
  });

  return NextResponse.json({ success: true, message });
}
