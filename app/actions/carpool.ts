"use server";

import { PrismaClient } from '@prisma/client';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';

const prisma = new PrismaClient();

async function getUserId() {
  const cookieStore = await cookies();
  return cookieStore.get('userId')?.value;
}

export async function getCarpoolPosts() {
  try {
    const userId = await getUserId();
    if (!userId) return { success: false, message: "Not logged in" };

    const posts = await prisma.carpoolPost.findMany({
      where: { status: { in: ['OPEN', 'MATCHED'] } },
      include: {
        author: { select: { id: true, name: true, email: true, department: true } },
        requests: {
          include: { user: { select: { id: true, name: true, email: true } } },
        },
        _count: { select: { requests: true } },
      },
      orderBy: { departureTime: 'asc' },
    });

    return { success: true, posts, currentUserId: userId };
  } catch (error: any) {
    console.error("Failed to fetch carpool posts:", error);
    return { success: false, message: "Failed to fetch posts" };
  }
}

export async function createCarpoolPost(data: {
  origin: string;
  destination: string;
  departureTime: Date;
  transportMode: string;
  estimatedFare: number;
}) {
  try {
    const userId = await getUserId();
    if (!userId) return { success: false, message: "Not logged in" };

    const post = await prisma.carpoolPost.create({
      data: {
        authorId: userId,
        origin: data.origin,
        destination: data.destination,
        departureTime: data.departureTime,
        transportMode: data.transportMode,
        estimatedFare: data.estimatedFare,
      },
    });

    revalidatePath('/carpool');
    return { success: true, post };
  } catch (error: any) {
    console.error("Failed to create carpool post:", error);
    return { success: false, message: "Failed to create post" };
  }
}

export async function requestToJoin(postId: string) {
  try {
    const userId = await getUserId();
    if (!userId) return { success: false, message: "Not logged in" };

    // Check if already requested
    const existing = await prisma.carpoolRequest.findUnique({
      where: { postId_userId: { postId, userId } },
    });
    if (existing) return { success: false, message: "You've already requested to join this ride" };

    // Check if user is the author
    const post = await prisma.carpoolPost.findUnique({ where: { id: postId } });
    if (!post) return { success: false, message: "Post not found" };
    if (post.authorId === userId) return { success: false, message: "You can't join your own post" };

    await prisma.carpoolRequest.create({
      data: { postId, userId },
    });

    revalidatePath('/carpool');
    return { success: true, message: "Request sent!" };
  } catch (error: any) {
    console.error("Failed to request join:", error);
    return { success: false, message: "Failed to send request" };
  }
}

export async function approveJoinRequest(requestId: string) {
  try {
    const userId = await getUserId();
    if (!userId) return { success: false, message: "Not logged in" };

    const request = await prisma.carpoolRequest.findUnique({
      where: { id: requestId },
      include: { post: true },
    });

    if (!request) return { success: false, message: "Request not found" };
    if (request.post.authorId !== userId) return { success: false, message: "Not authorized" };

    await prisma.carpoolRequest.update({
      where: { id: requestId },
      data: { status: 'APPROVED' },
    });

    // Update post status to MATCHED
    await prisma.carpoolPost.update({
      where: { id: request.postId },
      data: { status: 'MATCHED' },
    });

    revalidatePath('/carpool');
    return { success: true, message: "Request approved!" };
  } catch (error: any) {
    console.error("Failed to approve request:", error);
    return { success: false, message: "Failed to approve" };
  }
}

export async function getPostDetails(postId: string) {
  try {
    const userId = await getUserId();
    if (!userId) return { success: false, message: "Not logged in" };

    const post = await prisma.carpoolPost.findUnique({
      where: { id: postId },
      include: {
        author: { select: { id: true, name: true, email: true, department: true } },
        requests: {
          include: { user: { select: { id: true, name: true, email: true } } },
        },
        messages: {
          include: { user: { select: { id: true, name: true } } },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!post) return { success: false, message: "Post not found" };

    // Only allow author or approved joiners to see full details
    const isAuthor = post.authorId === userId;
    const isApproved = post.requests.some(r => r.userId === userId && r.status === 'APPROVED');

    return { success: true, post, currentUserId: userId, isAuthor, isApproved, canChat: isAuthor || isApproved };
  } catch (error: any) {
    console.error("Failed to get post details:", error);
    return { success: false, message: "Failed to fetch post" };
  }
}

export async function deleteCarpoolPost(postId: string) {
  try {
    const userId = await getUserId();
    if (!userId) return { success: false, message: "Not logged in" };

    const post = await prisma.carpoolPost.findUnique({ where: { id: postId } });
    if (!post || post.authorId !== userId) return { success: false, message: "Not authorized" };

    await prisma.carpoolPost.delete({ where: { id: postId } });
    revalidatePath('/carpool');
    return { success: true, message: "Post deleted" };
  } catch (error: any) {
    console.error("Failed to delete post:", error);
    return { success: false, message: "Failed to delete" };
  }
}
