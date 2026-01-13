import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import type { Session } from 'next-auth';

/**
 * PATCH /api/events/[id]/activities/[activityId]
 * Update a single activity within an event
 * This is optimized for partial updates (start/stop activities)
 * instead of updating all activities at once
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; activityId: string } }
) {
  try {
    const eventId = params?.id;
    const activityId = params?.activityId;

    if (!eventId || !activityId) {
      return NextResponse.json(
        { error: 'Invalid event ID or activity ID' },
        { status: 400 }
      );
    }

    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      );
    }

    // Use transaction with timeout to prevent hanging (20 seconds max)
    // This prevents 503 errors from long-running transactions
    const result = await prisma.$transaction(async (tx) => {
      // Verify event exists and belongs to user
      const event = await tx.event.findUnique({
        where: { id: eventId },
        select: { id: true, userId: true },
      });

      if (!event) {
        throw new Error('EVENT_NOT_FOUND');
      }

      if (event.userId !== session.user.id) {
        throw new Error('EVENT_NOT_FOUND');
      }

      // Verify activity exists and belongs to event
      const existingActivity = await tx.activity.findUnique({
        where: { id: activityId },
        select: { id: true, eventId: true },
      });

      if (!existingActivity) {
        throw new Error('ACTIVITY_NOT_FOUND');
      }

      if (existingActivity.eventId !== eventId) {
        throw new Error('ACTIVITY_NOT_FOUND');
      }

      // Build update data - only include fields that are provided
      const updateData: any = {};

      if (body.activityName !== undefined) {
        if (typeof body.activityName !== 'string' || !body.activityName.trim()) {
          throw new Error('INVALID_ACTIVITY_NAME');
        }
        updateData.activityName = body.activityName.trim();
      }

      if (body.timeAllotted !== undefined) {
        const timeAllotted = Math.floor(Number(body.timeAllotted) || 0);
        if (timeAllotted < 0) {
          throw new Error('INVALID_TIME_ALLOTTED');
        }
        updateData.timeAllotted = timeAllotted;
      }

      if (body.timeSpent !== undefined) {
        updateData.timeSpent = body.timeSpent != null ? Math.floor(Number(body.timeSpent)) : null;
      }

      if (body.extraTimeTaken !== undefined) {
        updateData.extraTimeTaken = body.extraTimeTaken != null ? Math.floor(Number(body.extraTimeTaken)) : null;
      }

      if (body.timeGained !== undefined) {
        updateData.timeGained = body.timeGained != null ? Math.floor(Number(body.timeGained)) : null;
      }

      if (body.isCompleted !== undefined) {
        updateData.isCompleted = body.isCompleted === true;
      }

      if (body.isActive !== undefined) {
        updateData.isActive = body.isActive === true;
        
        // If setting an activity as active, deactivate all other activities in the event
        // Use a more efficient query with limit to avoid scanning all activities
        if (body.isActive === true) {
          await tx.activity.updateMany({
            where: {
              eventId: eventId,
              id: { not: activityId },
              isActive: true,
            },
            data: { isActive: false },
          });
        }
      }

      if (body.order !== undefined) {
        updateData.order = Math.floor(Number(body.order) || 0);
      }

      // Update the activity
      await tx.activity.update({
        where: { id: activityId },
        data: updateData,
      });

      // Return the full event with all activities for consistency
      // This is necessary for the frontend to stay in sync
      const updatedEvent = await tx.event.findUnique({
        where: { id: eventId },
        include: {
          activities: {
            orderBy: { order: 'asc' },
          },
        },
      });

      return updatedEvent;
    }, {
      maxWait: 10000, // Maximum time to wait for a transaction slot (10 seconds)
      timeout: 20000, // Maximum time the transaction can run (20 seconds)
    });

    return NextResponse.json(result);
  } catch (error) {
    // Get session for logging (don't fail if auth fails)
    let session: Session | null = null;
    try {
      session = await auth();
    } catch {
      // Ignore auth errors in error handler
    }

    if (error instanceof Error) {
      if (error.message === 'EVENT_NOT_FOUND') {
        return NextResponse.json({ error: 'Event not found' }, { status: 404 });
      }
      if (error.message === 'ACTIVITY_NOT_FOUND') {
        return NextResponse.json({ error: 'Activity not found' }, { status: 404 });
      }
      if (error.message === 'INVALID_ACTIVITY_NAME') {
        return NextResponse.json(
          { error: 'Activity name must be a non-empty string' },
          { status: 400 }
        );
      }
      if (error.message === 'INVALID_TIME_ALLOTTED') {
        return NextResponse.json(
          { error: 'Time allotted must be a non-negative number' },
          { status: 400 }
        );
      }
    }

    // Check for timeout or connection errors
    const isTimeoutError = error instanceof Error && (
      error.message.includes('timeout') ||
      error.message.includes('TIMEOUT') ||
      error.message.includes('P2034') || // Prisma transaction timeout
      error.message.includes('P1008') || // Prisma operation timeout
      error.message.includes('ECONNRESET') ||
      error.message.includes('ETIMEDOUT')
    );

    console.error('PATCH /api/events/[id]/activities/[activityId]: Error', {
      error,
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      errorStack: error instanceof Error ? error.stack : undefined,
      eventId: params?.id,
      activityId: params?.activityId,
      userId: session?.user?.id,
      isTimeoutError,
      errorCode: error && typeof error === 'object' && 'code' in error ? (error as any).code : undefined,
    });

    // Return 503 for timeout/connection errors so client can retry
    if (isTimeoutError) {
      return NextResponse.json(
        { error: 'Service temporarily unavailable. Please try again.' },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to update activity' },
      { status: 500 }
    );
  }
}
