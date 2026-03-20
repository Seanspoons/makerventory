# Makerventory

Makerventory is a production-style 3D printing inventory and operations manager for serious hobbyists, maker labs, and small print shops. It centralizes printers, AMS units, dryers, plates, hotends, filament, consumables, safety equipment, smart plugs, workshop parts, wishlist planning, and maintenance history in a single operational UI.

## Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- shadcn-style UI primitives
- Prisma
- PostgreSQL

## Project Overview

Makerventory is designed as an internal-tool style SaaS dashboard rather than a toy CRUD demo. The application emphasizes:

- operational workshop visibility
- realistic seeded data
- compatibility-aware hardware modeling
- maintenance and inventory workflows
- future extensibility for telemetry, QR labels, power automation, and usage analytics

## Features

- Dashboard with workshop health, low stock, maintenance activity, smart plug state, safety visibility, and compatibility callouts
- Dedicated inventory pages for printers, material systems, build plates, hotends, filament, consumables, safety equipment, smart plugs, tools/parts, wishlist, and maintenance logs
- Detailed printer pages with installed hardware, linked systems, compatibility coverage, and maintenance history
- Filament workflow with filters for material, brand, abrasive handling, hygroscopic risk, and stock state
- Server actions for quick-add flows, maintenance logging, filament state updates, and archive/retire workflows
- Realistic seeded data for the provided Bambu Lab workshop setup

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Copy the environment file and point it at a PostgreSQL database:

```bash
cp .env.example .env
```

3. Push the Prisma schema to your database:

```bash
npm run db:push
```

4. Seed the database:

```bash
npm run db:seed
```

5. Start the development server:

```bash
npm run dev
```

6. Open `http://localhost:3000`.

## Prisma Workflow

- Generate Prisma Client:

```bash
npm run db:generate
```

- Push schema changes during development:

```bash
npm run db:push
```

- Create a migration if you want a migration history:

```bash
npm run db:migrate
```

- Seed the database:

```bash
npm run db:seed
```

## Seed Notes

The seed includes:

- Bambu Lab A1 Mini and Bambu Lab P2S printer records
- AMS Lite, AMS 2 Pro, AMS HT, and external dryer coverage
- 180mm and 256mm build plate compatibility
- A1 Mini and P2S hotend compatibility
- realistic filament stock states, low-spool conditions, abrasive and hygroscopic guidance
- maintenance history, smart plug assignments, wishlist priorities, and safety gaps

## Screenshots

- Dashboard: `TODO`
- Printer detail: `TODO`
- Filament inventory: `TODO`
- Wishlist planning: `TODO`

## Future Roadmap

- Add QR code labels for bins, spools, and printer components
- Track spool consumption and remaining grams from print history
- Log print history and print outcomes per machine
- Integrate printer telemetry and job state polling
- Automate smart plug control and shutdown policies
- Surface recurring maintenance reminders
- Add filament drying schedules and desiccant refresh alerts
- Build analytics around material usage, waste, and cost

## Verification

Production build verified with:

```bash
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/makerventory" npm run build
```

## Notes

- The app uses a PostgreSQL datasource in Prisma as requested.
- Pages are rendered dynamically so the dashboard and inventory views can read live operational data.
- The UI is optimized primarily for desktop but remains responsive on smaller screens.
