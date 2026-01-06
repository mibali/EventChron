import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const event = await prisma.event.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
      },
      include: {
        activities: {
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    return NextResponse.json(event);
  } catch (error) {
    console.error('Error fetching event:', error);
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
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify event belongs to user
    const existingEvent = await prisma.event.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
      },
    });

    if (!existingEvent) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    const body = await request.json();
    const { eventName, eventDate, logoUrl, logoAlignment, activities } = body;

    // Build update data
    const updateData: any = {};
    if (eventName !== undefined) updateData.eventName = eventName;
    if (eventDate !== undefined) updateData.eventDate = new Date(eventDate);
    if (logoUrl !== undefined) updateData.logoUrl = logoUrl;
    if (logoAlignment !== undefined) updateData.logoAlignment = logoAlignment;

    // Update activities if provided
    if (activities) {
      // Delete all existing activities and recreate
      // This ensures proper ordering and handles additions/removals
      await prisma.activity.deleteMany({
        where: { eventId: params.id },
      });
      
      updateData.activities = {
        create: activities.map((activity: any, index: number) => ({
          activityName: activity.activityName,
          timeAllotted: activity.timeAllotted,
          timeSpent: activity.timeSpent ?? null,
          extraTimeTaken: activity.extraTimeTaken ?? null,
          timeGained: activity.timeGained ?? null,
          isCompleted: activity.isCompleted ?? false,
          isActive: activity.isActive ?? false,
          order: index,
        })),
      };
    }

    // Update event
    const event = await prisma.event.update({
      where: { id: params.id },
      data: updateData,
      include: {
        activities: {
          orderBy: { order: 'asc' },
        },
      },
    });

    return NextResponse.json(event);
  } catch (error) {
    console.error('Error updating event:', error);
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

