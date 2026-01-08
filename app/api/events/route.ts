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

    // Verify user exists in database (prevent foreign key constraint errors)
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true },
    });

    if (!user) {
      console.error('POST /api/events: User not found in database', { 
        userId: session.user.id,
        userEmail: session.user.email,
      });
      return NextResponse.json(
        { error: 'User account not found. Please sign in again.' },
        { status: 401 }
      );
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

    const { eventName, eventDate, logoUrl, logoAlignment, timerGradient, activities } = body;

    console.log('POST /api/events: Request body received', {
      hasEventName: !!eventName,
      eventNameType: typeof eventName,
      hasEventDate: !!eventDate,
      eventDateType: typeof eventDate,
      hasActivities: !!activities,
      activitiesType: Array.isArray(activities) ? 'array' : typeof activities,
      activitiesLength: Array.isArray(activities) ? activities.length : 'N/A',
      bodyKeys: Object.keys(body),
    });

    // Validate required fields
    if (!eventName || typeof eventName !== 'string' || !eventName.trim()) {
      console.error('POST /api/events: Missing or invalid eventName', { 
        eventName,
        eventNameType: typeof eventName,
        bodyKeys: Object.keys(body),
      });
      return NextResponse.json(
        { error: 'Event name is required' },
        { status: 400 }
      );
    }

    if (!eventDate) {
      console.error('POST /api/events: Missing eventDate', { 
        eventDate,
        eventDateType: typeof eventDate,
        bodyKeys: Object.keys(body),
      });
      return NextResponse.json(
        { error: 'Event date is required' },
        { status: 400 }
      );
    }

    if (!activities || !Array.isArray(activities) || activities.length === 0) {
      console.error('POST /api/events: Missing or invalid activities', { 
        activities,
        activitiesType: typeof activities,
        isArray: Array.isArray(activities),
        length: activities?.length,
        bodyKeys: Object.keys(body),
      });
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
      // Validate timeAllotted - allow numbers and convert to integer
      if (activity.timeAllotted === undefined || activity.timeAllotted === null) {
        console.error(`POST /api/events: Missing timeAllotted at index ${i}`, { activity });
        return NextResponse.json(
          { error: `Activity at position ${i + 1} must have a time allotment` },
          { status: 400 }
        );
      }
      
      // Convert to number if it's a string
      let timeAllottedValue: number;
      if (typeof activity.timeAllotted === 'string') {
        timeAllottedValue = parseFloat(activity.timeAllotted);
        if (isNaN(timeAllottedValue)) {
          console.error(`POST /api/events: Invalid timeAllotted string at index ${i}`, { timeAllotted: activity.timeAllotted });
          return NextResponse.json(
            { error: `Activity at position ${i + 1} has invalid time allotment format` },
            { status: 400 }
          );
        }
      } else if (typeof activity.timeAllotted === 'number') {
        timeAllottedValue = activity.timeAllotted;
      } else {
        console.error(`POST /api/events: Invalid timeAllotted type at index ${i}`, { timeAllotted: activity.timeAllotted, type: typeof activity.timeAllotted });
        return NextResponse.json(
          { error: `Activity at position ${i + 1} must have a valid time allotment (number in seconds)` },
          { status: 400 }
        );
      }
      
      // Ensure it's a non-negative integer (0 is allowed)
      const timeAllottedInt = Math.floor(Math.abs(timeAllottedValue));
      if (isNaN(timeAllottedInt) || timeAllottedInt < 0) {
        console.error(`POST /api/events: Invalid timeAllotted at index ${i}`, { 
          timeAllotted: timeAllottedValue,
          timeAllottedInt,
        });
        return NextResponse.json(
          { error: `Activity at position ${i + 1} must have a valid non-negative time allotment` },
          { status: 400 }
        );
      }
      
      // Update the activity with the validated integer value
      activity.timeAllotted = timeAllottedInt;
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
      // Prepare activities data with validated values
      const activitiesData = activities.map((activity: any, index: number) => ({
        activityName: activity.activityName.trim(),
        timeAllotted: activity.timeAllotted, // Already validated and converted to integer
        order: index,
      }));

      console.log('POST /api/events: Attempting to create event', {
        userId: session.user.id,
        eventName: eventName.trim(),
        eventDate: parsedDate.toISOString(),
        activitiesCount: activitiesData.length,
        activities: activitiesData.map(a => ({ name: a.activityName, time: a.timeAllotted })),
      });

      const event = await prisma.event.create({
        data: {
          eventName: eventName.trim(),
          eventDate: parsedDate,
          logoUrl: logoUrl && typeof logoUrl === 'string' && logoUrl.trim() ? logoUrl.trim() : null,
          logoAlignment: finalLogoAlignment,
          timerGradient: timerGradient ? JSON.stringify(timerGradient) : null,
          userId: session.user.id,
          activities: {
            create: activitiesData,
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
        eventDate: parsedDate.toISOString(),
        activitiesCount: activities.length,
        activities: activities.map((a: any) => ({
          name: a.activityName,
          timeAllotted: a.timeAllotted,
          timeAllottedType: typeof a.timeAllotted,
        })),
        requestBody: JSON.stringify({ eventName, eventDate, logoUrl, logoAlignment, activities }, null, 2),
      });
      
      // Check for specific Prisma errors
      if (dbError instanceof Error) {
        // Check for Prisma error codes
        const prismaError = dbError as any;
        if (prismaError.code === 'P2002') {
          // Unique constraint violation
          return NextResponse.json(
            { error: 'An event with this name already exists' },
            { status: 409 }
          );
        }
        if (prismaError.code === 'P2003') {
          // Foreign key constraint violation
          console.error('POST /api/events: Foreign key constraint failed', {
            userId: session.user.id,
            error: dbError.message,
            meta: prismaError.meta,
          });
          return NextResponse.json(
            { error: 'User account not found. Please sign out and sign in again.' },
            { status: 401 }
          );
        }
        if (dbError.message.includes('Unique constraint') || dbError.message.includes('unique')) {
          return NextResponse.json(
            { error: 'An event with this name already exists' },
            { status: 409 }
          );
        }
        if (dbError.message.includes('Foreign key constraint') || dbError.message.includes('foreign key')) {
          console.error('POST /api/events: Foreign key constraint failed (message match)', {
            userId: session.user.id,
            error: dbError.message,
          });
          return NextResponse.json(
            { error: 'User account not found. Please sign out and sign in again.' },
            { status: 401 }
          );
        }
        if (dbError.message.includes('Invalid value') || dbError.message.includes('Argument') || dbError.message.includes('Invalid')) {
          return NextResponse.json(
            { 
              error: 'Invalid data format. Please check all field values.',
              details: process.env.NODE_ENV === 'development' ? dbError.message : undefined,
            },
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
      errorName: error instanceof Error ? error.name : 'Unknown',
      errorCode: (error as any)?.code,
    });
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    // Provide more helpful error messages
    let userFriendlyError = 'Failed to create event';
    if (error instanceof Error) {
      if (error.message.includes('timeout') || error.message.includes('ECONNRESET')) {
        userFriendlyError = 'Database connection timeout. Please try again.';
      } else if (error.message.includes('connection') || error.message.includes('connect')) {
        userFriendlyError = 'Unable to connect to database. Please try again later.';
      }
    }
    
    return NextResponse.json(
      { 
        error: userFriendlyError,
        ...(isDevelopment && { 
          details: errorMessage,
          hint: 'Check server logs for more information',
        }),
      },
      { status: 500 }
    );
  }
}

