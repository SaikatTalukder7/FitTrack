# FitTrack – Smart Gym Management System

FitTrack is a web-based Smart Gym Management System designed to simplify gym operations, manage memberships, organize workouts, monitor fitness progress, and streamline administrative activities.

The platform provides dedicated experiences for gym administrators and customers, bringing essential gym management and fitness tracking features together in one application.

## Project Status

**Status:** Under Development

The project includes a React-based frontend, an Express.js backend, MongoDB Atlas database integration, authentication, and gym management modules.

## Technology Stack

- **Frontend:** React 18, JavaScript
- **Build Tool:** Vite 5
- **Routing:** React Router DOM 6
- **Styling:** Tailwind CSS 3, CSS3
- **Backend:** Node.js, Express.js
- **Database:** MongoDB Atlas
- **Authentication:** JWT, bcryptjs, HTTP-only Cookies
- **Email Service:** Brevo API
- **Deployment:** Vercel (Frontend), Render (Backend)
- **Version Control:** Git, GitHub

## Key Features

### Public Features
- Responsive landing page
- User registration and login
- Email verification
- Forgot password and password reset
- FAQ and How It Works pages

### Customer Features
- Customer dashboard
- Profile management
- Membership management
- Workout routines
- Routine customization
- Workout sessions
- Fitness progress tracking

### Admin Features
- Admin dashboard
- Customer management
- Customer details
- Attendance management
- Exercise management
- Workout routines and split schedules
- Payment requests
- Gym operations
- Statistics and reports

## Project Structure

```text
FitTrack/
├── public/
│   └── images/
├── server/
│   ├── handlers/
│   ├── api.server.js
│   ├── auth.server.js
│   ├── db.server.js
│   ├── email.server.js
│   ├── http.js
│   ├── index.js
│   ├── rules.js
│   └── seed.server.js
├── src/
│   ├── components/
│   ├── context/
│   ├── hooks/
│   ├── layouts/
│   ├── pages/
│   ├── routes/
│   ├── services/
│   ├── styles/
│   └── utils/
├── .env
├── .gitignore
├── index.html
├── package.json
├── vite.config.js
└── vercel.json
```

## Prerequisites

Install the following before running the project:

- Node.js
- npm
- MongoDB Atlas account
- Brevo account (for email functionality)

## Installation and Setup

### 1. Clone the Repository

```bash
git clone https://github.com/SaikatTalukder7/FitTrack.git
cd FitTrack
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Create a `.env` file in the project root:

```env
MONGODB_URI=your_mongodb_connection_string
MONGODB_DB=fittrack
JWT_SECRET=your_secure_jwt_secret

BREVO_API_KEY=your_brevo_api_key
BREVO_SENDER_EMAIL=your_verified_sender_email

APP_URL=http://localhost:5173
```

Replace the example values with your actual credentials.

**Security:** Never commit `.env` or expose database credentials, JWT secrets, or API keys in frontend code.

### 4. Start the Development Server

```bash
npm run dev
```

This starts the Express backend and Vite development server concurrently.

- Frontend: http://localhost:5173
- Backend: http://localhost:4000

### 5. Run Backend Separately (Optional)

```bash
npm run server
```

### 6. Build for Production

```bash
npm run build
```

### 7. Preview Production Build

```bash
npm run preview
```

## Database Configuration

FitTrack uses MongoDB Atlas as its database.

To configure the database:

1. Create a MongoDB Atlas account.
2. Create or select a cluster.
3. Configure a database user.
4. Allow the application server to access the cluster.
5. Copy the MongoDB connection string.
6. Configure `MONGODB_URI` and `MONGODB_DB` in the environment variables.

## Deployment

FitTrack uses a separate frontend and backend deployment architecture.

### Frontend – Vercel

The React and Vite frontend is deployed on Vercel.

**Live URL:** https://fittrack7.vercel.app

### Backend – Render

The Express.js backend is deployed on Render.

**Backend URL:** https://fittrack-dtpu.onrender.com

**API Endpoint:** `/api`

### Database – MongoDB Atlas

MongoDB Atlas provides cloud database hosting for the application.

### Environment Variables for Deployment

Configure the following server-side variables in Render:

| Variable | Purpose |
|---|---|
| `MONGODB_URI` | MongoDB connection string |
| `MONGODB_DB` | Database name |
| `JWT_SECRET` | JWT signing secret |
| `BREVO_API_KEY` | Brevo API key |
| `BREVO_SENDER_EMAIL` | Verified sender email |
| `APP_URL` | Production frontend URL |

Vercel handles frontend deployment and API routing through the project's `vercel.json` configuration.

## Development Notes

- Keep environment files out of version control.
- Never expose server-side credentials in Vite frontend variables.
- Keep `node_modules/` and `dist/` out of Git.
- Maintain secure authentication and authorization.
- Test API requests and database operations before production releases.
- Verify email functionality and authentication flows after deployment.

## Future Improvements

- Further improvements to gym management workflows.
- Enhanced fitness analytics and reporting.
- Additional workout customization features.
- Improved performance and security.
- Additional customer and administrative features.

## License

No license has been specified yet.
