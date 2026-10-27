# FitTrack — Smart Gym Management System

FitTrack is a web-based Smart Gym Management System designed to help organize gym-related activities, manage users, and support fitness tracking. The project is being developed using React, Vite, and Supabase.

## Project Status

The project is currently under development. The frontend project structure, environment configuration, and Supabase integration setup are in progress.

## Technology Stack

- **Frontend:** React 18
- **Build Tool:** Vite 5
- **Routing:** React Router DOM 6
- **Styling:** Tailwind CSS 3
- **Backend and Database:** Supabase
- **Language:** JavaScript
- **Code Quality:** ESLint

## Current Setup

The project currently includes:

- React and Vite application setup
- Frontend source files and public assets
- Client-side routing and application structure
- Supabase project configuration through environment variables
- Supabase SQL files for database setup
- Environment-variable protection through `.gitignore`
- Project documentation

Authentication, database operations, and individual application features should be considered complete only after their respective functionality has been verified.

## Prerequisites

Install the following before running the project:

- Node.js
- npm
- A Supabase project for backend integration

## Installation and Setup

### 1. Clone the Repository

```bash
git clone <your-github-repository-url>
cd FitTrack
```

Replace `<your-github-repository-url>` with the actual GitHub repository URL.

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Create a `.env.local` file in the project root and configure the following variables:

```env
VITE_DATA_SOURCE=supabase
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-publishable-or-anon-key
```

Replace the example URL and key with the appropriate values from your Supabase project. Use the key type supported by the project's Supabase client configuration.

**Security:** Never commit `.env.local` or any Supabase secret/service-role key to GitHub.

### 4. Start the Development Server

```bash
npm run dev
```

Open the local URL shown in the terminal to access the application.

### 5. Build the Project

```bash
npm run build
```

To preview a production build locally:

```bash
npm run preview
```

## Supabase Database Setup

The project includes SQL files under the `supabase/` directory for database configuration.

Run the SQL files in the intended order using the Supabase SQL Editor, if they have not already been applied to the target project. Review each migration before running it and confirm that it completes successfully.

Database changes and application functionality should be verified against the actual Supabase project before deployment.

## Environment Variables

| Variable | Purpose |
|---|---|
| `VITE_DATA_SOURCE` | Selects the configured data source, such as development or Supabase mode |
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Public client key used by the application |

Only public client credentials intended for browser use should be exposed through Vite environment variables.

## Development Notes

- Keep `.env.local` out of version control.
- Do not commit `node_modules/` or generated build output.
- Keep database changes organized in sequential SQL migration files.
- Test authentication, authorization, and database operations before considering them production-ready.

## Future Work

Planned work may include completing and verifying gym management modules, fitness tracking workflows, database operations, and production deployment.

## License

No license has been specified yet.
