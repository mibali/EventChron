import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const eventId = params?.id;
    
    if (!eventId) {
      return NextResponse.json({ error: 'Invalid event ID' }, { status: 400 });
    }

    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: {
        activities: {
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    if (event.userId !== session.user.id) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    return NextResponse.json(event);
  } catch (error) {
    console.error('GET /api/events/[id]: Error', error);
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
  const eventId = params?.id;
  let session: Awaited<ReturnType<typeof auth>> = null;
  let body: any = null;

  try {
    if (!eventId) {
      return NextResponse.json({ error: 'Invalid event ID' }, { status: 400 });
    }

    session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const { eventName, eventDate, logoUrl, logoAlignment, timerGradient, activities } = body;

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
      const parsedDate = new Date(eventDate);
      if (isNaN(parsedDate.getTime())) {
        return NextResponse.json({ error: 'Invalid event date' }, { status: 400 });
      }
      updateData.eventDate = parsedDate;
    }
    
    if (logoUrl !== undefined) {
      updateData.logoUrl = logoUrl || null;
    }
    
    if (logoAlignment !== undefined) {
      const validAlignments = ['left', 'center', 'right'];
      updateData.logoAlignment = validAlignments.includes(logoAlignment) ? logoAlignment : 'center';
    }

    if (timerGradient !== undefined) {
      updateData.timerGradient = timerGradient ? JSON.stringify(timerGradient) : null;
    }

    // Use a single transaction for the entire operation
    const event = await prisma.$transaction(async (tx) => {
      // Verify event exists and belongs to user
      const existingEvent = await tx.event.findUnique({
        where: { id: eventId },
        select: { id: true, userId: true },
      });

      if (!existingEvent) {
        throw new Error('EVENT_NOT_FOUND');
      }

      if (existingEvent.userId !== session.user.id) {
        throw new Error('EVENT_NOT_FOUND');
      }

      // Handle activities update if provided
      if (activities !== undefined && Array.isArray(activities)) {
        // Delete existing activities
        await tx.activity.deleteMany({
          where: { eventId: eventId },
        });

        // Create new activities
        updateData.activities = {
          create: activities.map((activity: any, index: number) => ({
            activityName: String(activity.activityName || '').trim() || 'Activity',
            timeAllotted: Math.floor(Number(activity.timeAllotted) || 0),
            timeSpent: activity.timeSpent != null ? Math.floor(Number(activity.timeSpent)) : null,
            extraTimeTaken: activity.extraTimeTaken != null ? Math.floor(Number(activity.extraTimeTaken)) : null,
            timeGained: activity.timeGained != null ? Math.floor(Number(activity.timeGained)) : null,
            isCompleted: activity.isCompleted === true,
            isActive: activity.isActive === true,
            order: index,
          })),
        };
      }

      // Update the event
      return await tx.event.update({
        where: { id: eventId },
        data: updateData,
        include: {
          activities: {
            orderBy: { order: 'asc' },
          },
        },
      });
    });

    return NextResponse.json(event);
  } catch (error) {
    if (error instanceof Error && error.message === 'EVENT_NOT_FOUND') {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    console.error('PUT /api/events/[id]: Error', {
      error,
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      errorStack: error instanceof Error ? error.stack : undefined,
      eventId,
      userId: session?.user?.id,
      hasActivities: !!body?.activities,
      activitiesCount: body?.activities?.length,
      activitiesSample: body?.activities?.slice(0, 2), // First 2 activities for debugging
      requestBody: JSON.stringify(body, null, 2),
    });
    
    // If it's a Prisma error, log more details
    if (error && typeof error === 'object' && 'code' in error) {
      console.error('PUT /api/events/[id]: Prisma error details', {
        code: (error as any).code,
        meta: (error as any).meta,
      });
    }
    
    return NextResponse.json(
      { error: 'Failed to update event' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const eventId = params?.id;

    if (!eventId) {
      return NextResponse.json({ error: 'Invalid event ID' }, { status: 400 });
    }

    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Use transaction to verify and delete
    await prisma.$transaction(async (tx) => {
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

      await tx.event.delete({
        where: { id: eventId },
      });
    });

    return NextResponse.json({ message: 'Event deleted' });
  } catch (error) {
    if (error instanceof Error && error.message === 'EVENT_NOT_FOUND') {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    console.error('DELETE /api/events/[id]: Error', error);
    return NextResponse.json(
      { error: 'Failed to delete event' },
      { status: 500 }
    );
  }
}
