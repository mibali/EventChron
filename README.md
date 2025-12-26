# Event Timer - SaaS Platform

A production-ready SaaS platform for managing event timers with count-up functionality, designed for church services, conferences, and meetups.

## Features

- **Event Management**: Create and configure events with custom branding (logo, name, layout)
- **Activity Configuration**: Define ordered activities with time allotments
- **Count-Up Timers**: Track time spent per activity with visual indicators
- **Time Analytics**: Automatically calculate time gained or extra time taken
- **Data Export**: Export event data as JSON or CSV
- **Multi-Tenant**: Support for multiple events per user

## Getting Started

1. Install dependencies:
```bash
npm install
```

2. Run the development server:
```bash
npm run dev
```

3. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Tech Stack

- **Next.js 14** - React framework with App Router
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Lucide React** - Icons

## Project Structure

```
/app
  /api          - API routes (future)
  /events       - Event management pages
  /components   - Reusable components
/lib            - Utilities and types
/public         - Static assets
```

## License

MIT


