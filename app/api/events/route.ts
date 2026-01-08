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
    // Check authentication
    const session = await auth();
    if (!session?.user?.id) {
      console.error('POST /api/events: Unauthorized - no session or user ID');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      console.error('POST /api/events: Failed to parse request body', parseError);
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      );
    }

    const { eventName, eventDate, logoUrl, logoAlignment, activities } = body;

    // Validate required fields
    if (!eventName || typeof eventName !== 'string' || !eventName.trim()) {
      console.error('POST /api/events: Missing or invalid eventName', { eventName });
      return NextResponse.json(
        { error: 'Event name is required' },
        { status: 400 }
      );
    }

    if (!eventDate) {
      console.error('POST /api/events: Missing eventDate');
      return NextResponse.json(
        { error: 'Event date is required' },
        { status: 400 }
      );
    }

    if (!activities || !Array.isArray(activities) || activities.length === 0) {
      console.error('POST /api/events: Missing or invalid activities', { activities });
      return NextResponse.json(
        { error: 'At least one activity is required' },
        { status: 400 }
      );
    }

    // Validate activities
    for (let i = 0; i < activities.length; i++) {
      const activity = activities[i];
      if (!activity || typeof activity !== 'object') {
        console.error(`POST /api/events: Invalid activity at index ${i}`, { activity });
        return NextResponse.json(
          { error: `Activity at position ${i + 1} is invalid` },
          { status: 400 }
        );
      }
      if (!activity.activityName || typeof activity.activityName !== 'string' || !activity.activityName.trim()) {
        console.error(`POST /api/events: Invalid activityName at index ${i}`, { activityName: activity.activityName });
        return NextResponse.json(
          { error: `Activity at position ${i + 1} must have a name` },
          { status: 400 }
        );
      }
      if (typeof activity.timeAllotted !== 'number' || activity.timeAllotted < 0 || !Number.isInteger(activity.timeAllotted)) {
        console.error(`POST /api/events: Invalid timeAllotted at index ${i}`, { timeAllotted: activity.timeAllotted });
        return NextResponse.json(
          { error: `Activity at position ${i + 1} must have a valid time allotment (non-negative integer in seconds)` },
          { status: 400 }
        );
      }
    }

    // Parse and validate date
    let parsedDate: Date;
    try {
      parsedDate = new Date(eventDate);
      if (isNaN(parsedDate.getTime())) {
        throw new Error('Invalid date');
      }
    } catch (dateError) {
      console.error('POST /api/events: Invalid date format', { eventDate, error: dateError });
      return NextResponse.json(
        { error: 'Invalid event date format' },
        { status: 400 }
      );
    }

    // Validate logoAlignment
    const validAlignments = ['left', 'center', 'right'];
    const finalLogoAlignment = validAlignments.includes(logoAlignment) ? logoAlignment : 'center';

    // Create event in database
    try {
      const event = await prisma.event.create({
        data: {
          eventName: eventName.trim(),
          eventDate: parsedDate,
          logoUrl: logoUrl && typeof logoUrl === 'string' && logoUrl.trim() ? logoUrl.trim() : null,
          logoAlignment: finalLogoAlignment,
          userId: session.user.id,
          activities: {
            create: activities.map((activity: any, index: number) => ({
              activityName: activity.activityName.trim(),
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

      console.log('POST /api/events: Event created successfully', { eventId: event.id, userId: session.user.id });
      return NextResponse.json(event, { status: 201 });
    } catch (dbError) {
      console.error('POST /api/events: Database error', {
        error: dbError,
        message: dbError instanceof Error ? dbError.message : 'Unknown database error',
        stack: dbError instanceof Error ? dbError.stack : undefined,
        userId: session.user.id,
        eventName: eventName.trim(),
        activitiesCount: activities.length,
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
      }

      throw dbError; // Re-throw to be caught by outer catch
    }
  } catch (error) {
    console.error('POST /api/events: Unexpected error', {
      error,
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    return NextResponse.json(
      { 
        error: 'Failed to create event',
        ...(isDevelopment && { 
          details: errorMessage,
          hint: 'Check server logs for more information',
        }),
      },
      { status: 500 }
    );
  }
}

