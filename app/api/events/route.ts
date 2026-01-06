import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const search = searchParams.get('search');

    let where: any = { userId: session.user.id };

    if (startDate || endDate) {
      where.eventDate = {};
      if (startDate) {
        where.eventDate.gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        where.eventDate.lte = end;
      }
    }

    if (search) {
      // SQLite doesn't support case-insensitive mode, so we'll filter in memory
      // For production with PostgreSQL, use: { contains: search, mode: 'insensitive' }
      where.eventName = { contains: search };
    }

    let events = await prisma.event.findMany({
      where,
      include: {
        activities: {
          orderBy: { order: 'asc' },
        },
      },
      orderBy: { eventDate: 'desc' },
    });

    // Filter by search case-insensitively for SQLite
    if (search) {
      const searchLower = search.toLowerCase();
      events = events.filter((event) =>
        event.eventName.toLowerCase().includes(searchLower)
      );
    }

    return NextResponse.json(events);
  } catch (error) {
    console.error('Error fetching events:', error);
    return NextResponse.json(
      { error: 'Failed to fetch events' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { eventName, eventDate, logoUrl, logoAlignment, activities } = body;

    if (!eventName || !eventDate || !activities || activities.length === 0) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const event = await prisma.event.create({
      data: {
        eventName,
        eventDate: new Date(eventDate),
        logoUrl,
        logoAlignment: logoAlignment || 'center',
        userId: session.user.id,
        activities: {
          create: activities.map((activity: any, index: number) => ({
            activityName: activity.activityName,
            timeAllotted: activity.timeAllotted,
            order: index,
          })),
        },
      },
      include: {
        activities: {
          orderBy: { order: 'asc' },
        },
      },
    });

    return NextResponse.json(event, { status: 201 });
  } catch (error) {
    console.error('Error creating event:', error);
    return NextResponse.json(
      { error: 'Failed to create event' },
      { status: 500 }
    );
  }
}

