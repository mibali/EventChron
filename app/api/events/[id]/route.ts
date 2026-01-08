import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const eventId = params?.id;
    
    if (!eventId || typeof eventId !== 'string') {
      console.error('GET /api/events/[id]: Invalid event ID', { eventId, params });
      return NextResponse.json({ error: 'Invalid event ID' }, { status: 400 });
    }

    const session = await auth();
    if (!session?.user?.id) {
      console.error('GET /api/events/[id]: Unauthorized', { eventId });
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const event = await prisma.event.findFirst({
      where: {
        id: eventId,
        userId: session.user.id,
      },
      include: {
        activities: {
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!event) {
      console.error('GET /api/events/[id]: Event not found', { 
        eventId,
        userId: session.user.id,
      });
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    return NextResponse.json(event);
  } catch (error) {
    console.error('GET /api/events/[id]: Error fetching event', {
      error,
      message: error instanceof Error ? error.message : 'Unknown error',
      params: params?.id,
    });
    return NextResponse.json(
      { error: 'Failed to fetch event' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Log the incoming request
    const eventId = params?.id;
    console.log('PUT /api/events/[id]: Request received', { 
      eventId,
      eventIdType: typeof eventId,
      url: request.url,
      method: request.method,
    });

    if (!eventId || typeof eventId !== 'string') {
      console.error('PUT /api/events/[id]: Invalid event ID', { eventId, params });
      return NextResponse.json({ error: 'Invalid event ID' }, { status: 400 });
    }

    // Check authentication
    const session = await auth();
    console.log('PUT /api/events/[id]: Session check', { 
      hasSession: !!session,
      hasUserId: !!session?.user?.id,
      userId: session?.user?.id,
    });

    if (!session?.user?.id) {
      console.error('PUT /api/events/[id]: Unauthorized - no session or user ID');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // First check if event exists at all (without user filter for debugging)
    const eventExists = await prisma.event.findUnique({
      where: { id: eventId },
      select: { id: true, userId: true, eventName: true },
    });

    console.log('PUT /api/events/[id]: Event lookup', {
      eventId,
      eventExists: !!eventExists,
      eventUserId: eventExists?.userId,
      requestUserId: session.user.id,
      userIdsMatch: eventExists?.userId === session.user.id,
    });

    // Verify event belongs to user
    const existingEvent = await prisma.event.findFirst({
      where: {
        id: eventId,
        userId: session.user.id,
      },
    });

    if (!existingEvent) {
      console.error('PUT /api/events/[id]: Event not found or access denied', { 
        eventId,
        userId: session.user.id,
        eventExists: !!eventExists,
        eventBelongsToUser: eventExists?.userId === session.user.id,
        eventUserId: eventExists?.userId,
      });
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    // Parse request body
    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      console.error('PUT /api/events/[id]: Failed to parse request body', parseError);
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      );
    }

    const { eventName, eventDate, logoUrl, logoAlignment, activities } = body;

    // Build update data
    const updateData: any = {};
    if (eventName !== undefined) {
      if (typeof eventName !== 'string' || !eventName.trim()) {
        return NextResponse.json(
          { error: 'Event name must be a non-empty string' },
          { status: 400 }
        );
      }
      updateData.eventName = eventName.trim();
    }
    if (eventDate !== undefined) {
      try {
        const parsedDate = new Date(eventDate);
        if (isNaN(parsedDate.getTime())) {
          throw new Error('Invalid date');
        }
        updateData.eventDate = parsedDate;
      } catch (dateError) {
        console.error('PUT /api/events/[id]: Invalid date format', { eventDate, error: dateError });
        return NextResponse.json(
          { error: 'Invalid event date format' },
          { status: 400 }
        );
      }
    }
    if (logoUrl !== undefined) {
      updateData.logoUrl = logoUrl && typeof logoUrl === 'string' && logoUrl.trim() ? logoUrl.trim() : null;
    }
    if (logoAlignment !== undefined) {
      const validAlignments = ['left', 'center', 'right'];
      updateData.logoAlignment = validAlignments.includes(logoAlignment) ? logoAlignment : 'center';
    }

    // Update activities if provided
    if (activities !== undefined) {
      if (!Array.isArray(activities)) {
        console.error('PUT /api/events/[id]: Activities must be an array', { activities });
        return NextResponse.json(
          { error: 'Activities must be an array' },
          { status: 400 }
        );
      }

      // Validate each activity
      for (let i = 0; i < activities.length; i++) {
        const activity = activities[i];
        if (!activity || typeof activity !== 'object') {
          console.error(`PUT /api/events/[id]: Invalid activity at index ${i}`, { activity });
          return NextResponse.json(
            { error: `Activity at position ${i + 1} is invalid` },
            { status: 400 }
          );
        }
        if (!activity.activityName || typeof activity.activityName !== 'string' || !activity.activityName.trim()) {
          console.error(`PUT /api/events/[id]: Invalid activityName at index ${i}`, { activityName: activity.activityName });
          return NextResponse.json(
            { error: `Activity at position ${i + 1} must have a name` },
            { status: 400 }
          );
        }
        if (typeof activity.timeAllotted !== 'number' || activity.timeAllotted < 0 || !Number.isInteger(activity.timeAllotted)) {
          console.error(`PUT /api/events/[id]: Invalid timeAllotted at index ${i}`, { timeAllotted: activity.timeAllotted });
          return NextResponse.json(
            { error: `Activity at position ${i + 1} must have a valid time allotment (non-negative integer in seconds)` },
            { status: 400 }
          );
        }
        // Validate optional time fields
        if (activity.timeSpent !== undefined && activity.timeSpent !== null) {
          if (typeof activity.timeSpent !== 'number' || activity.timeSpent < 0 || !Number.isInteger(activity.timeSpent)) {
            console.error(`PUT /api/events/[id]: Invalid timeSpent at index ${i}`, { timeSpent: activity.timeSpent });
            return NextResponse.json(
              { error: `Activity at position ${i + 1} has invalid timeSpent value` },
              { status: 400 }
            );
          }
        }
        if (activity.extraTimeTaken !== undefined && activity.extraTimeTaken !== null) {
          if (typeof activity.extraTimeTaken !== 'number' || activity.extraTimeTaken < 0 || !Number.isInteger(activity.extraTimeTaken)) {
            console.error(`PUT /api/events/[id]: Invalid extraTimeTaken at index ${i}`, { extraTimeTaken: activity.extraTimeTaken });
            return NextResponse.json(
              { error: `Activity at position ${i + 1} has invalid extraTimeTaken value` },
              { status: 400 }
            );
          }
        }
        if (activity.timeGained !== undefined && activity.timeGained !== null) {
          if (typeof activity.timeGained !== 'number' || activity.timeGained < 0 || !Number.isInteger(activity.timeGained)) {
            console.error(`PUT /api/events/[id]: Invalid timeGained at index ${i}`, { timeGained: activity.timeGained });
            return NextResponse.json(
              { error: `Activity at position ${i + 1} has invalid timeGained value` },
              { status: 400 }
            );
          }
        }
      }

      // Delete all existing activities and recreate
      // This ensures proper ordering and handles additions/removals
      try {
        await prisma.activity.deleteMany({
          where: { eventId: params.id },
        });
      } catch (deleteError) {
        console.error('PUT /api/events/[id]: Error deleting activities', {
          error: deleteError,
          eventId: params.id,
        });
        throw deleteError;
      }
      
      updateData.activities = {
        create: activities.map((activity: any, index: number) => ({
          activityName: activity.activityName.trim(),
          timeAllotted: activity.timeAllotted,
          timeSpent: activity.timeSpent !== undefined && activity.timeSpent !== null ? activity.timeSpent : null,
          extraTimeTaken: activity.extraTimeTaken !== undefined && activity.extraTimeTaken !== null ? activity.extraTimeTaken : null,
          timeGained: activity.timeGained !== undefined && activity.timeGained !== null ? activity.timeGained : null,
          isCompleted: activity.isCompleted === true,
          isActive: activity.isActive === true,
          order: index,
        })),
      };
    }

    // Update event
    try {
      const event = await prisma.event.update({
        where: { id: params.id },
        data: updateData,
        include: {
          activities: {
            orderBy: { order: 'asc' },
          },
        },
      });

      console.log('PUT /api/events/[id]: Event updated successfully', { eventId: event.id, userId: session.user.id });
      return NextResponse.json(event);
    } catch (dbError) {
      console.error('PUT /api/events/[id]: Database error', {
        error: dbError,
        message: dbError instanceof Error ? dbError.message : 'Unknown database error',
        stack: dbError instanceof Error ? dbError.stack : undefined,
        eventId: params.id,
        userId: session.user.id,
        updateData: JSON.stringify(updateData, null, 2),
      });
      
      // Check for specific Prisma errors
      if (dbError instanceof Error) {
        if (dbError.message.includes('Unique constraint')) {
          return NextResponse.json(
            { error: 'An event with this name already exists' },
            { status: 409 }
          );
        }
        if (dbError.message.includes('Foreign key constraint')) {
          return NextResponse.json(
            { error: 'Invalid user account' },
            { status: 400 }
          );
        }
        if (dbError.message.includes('Invalid value') || dbError.message.includes('Argument')) {
          return NextResponse.json(
            { error: 'Invalid data format. Please check all field values.' },
            { status: 400 }
          );
        }
      }

      throw dbError; // Re-throw to be caught by outer catch
    }
  } catch (error) {
    console.error('PUT /api/events/[id]: Unexpected error', {
      error,
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      eventId: params.id,
    });
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    return NextResponse.json(
      { 
        error: 'Failed to update event',
        ...(isDevelopment && { 
          details: errorMessage,
          hint: 'Check server logs for more information',
        }),
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify event belongs to user
    const event = await prisma.event.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
      },
    });

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    await prisma.event.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ message: 'Event deleted' });
  } catch (error) {
    console.error('Error deleting event:', error);
    return NextResponse.json(
      { error: 'Failed to delete event' },
      { status: 500 }
    );
  }
}

