# EventChron - Usage Guide

## Quick Start

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Start Development Server**
   ```bash
   npm run dev
   ```

3. **Open Browser**
   Navigate to `http://localhost:3000`

## Creating an Event

1. Click "Create New Event" on the home page
2. Fill in:
   - Event Name (required)
   - Event Date (required)
   - Logo (optional) - Upload an image file
   - Logo Alignment - Choose left, center, or right
3. Add Activities:
   - Enter activity name (e.g., "Opening Prayer")
   - Enter time allotted (e.g., "3 minutes" or "12 minutes")
   - Click "Add" to add to the list
   - Repeat for all activities
4. Click "Save Event"

## Running an Event

1. Open your event from the home page
2. The first activity will be displayed
3. Click "Start Activity" to begin the timer
4. The timer counts up from 00:00:00
5. When finished, click "Stop"
6. The system automatically:
   - Records time spent
   - Calculates time gained (if finished early)
   - Calculates extra time taken (if went over)
   - Moves to the next activity

## Timer Features

- **Visual Indicators**:
  - Green: On track (under 90% of allotted time)
  - Yellow: Warning (90-100% of allotted time)
  - Red: Over time (exceeded allotted time)

- **Navigation**:
  - Use Previous/Next buttons to navigate between activities
  - Only available when timer is not running

## Exporting Data

After all activities are completed:

1. Click "Export JSON" to download results as JSON
2. Click "Export CSV" to download results as CSV

The exported data includes:
- Activity Name
- Time Allotted
- Time Spent
- Extra Time Taken (if any)
- Time Gained (if any)
- Date

## Tips

- **Projector Mode**: The timer display uses large, bold fonts optimized for projection
- **Time Format**: Enter time as "X minutes" or "X hours Y minutes"
- **Multiple Events**: Create and manage multiple events from the home page
- **Data Persistence**: All data is stored locally in your browser

## Future Enhancements

- Cloud storage and sync
- User authentication
- Team collaboration
- Advanced analytics
- Custom themes


## Next steps for production
- Add authentication (e.g., NextAuth.js)
- Replace localStorage with a database (PostgreSQL/MongoDB)
- Add cloud storage for logos
- Implement user accounts and subscriptions
- Add analytics dashboard
- Deploy to Vercel/Netlify

