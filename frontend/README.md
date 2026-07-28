# SDICS Frontend - React + TypeScript

Strategic Digital Identification & Campaign System - Modern React + TypeScript frontend.

## Setup

```bash
cd frontend
npm install
npm run dev
```

Build for production:

```bash
npm run build
npm run preview
```

## Project Structure

```
src/
├── api/              # Axios instance and API calls
├── components/       # Shared components
├── features/         # Feature modules (auth, dashboard, citizens, etc)
├── layouts/          # Layout components
├── lib/             # Utilities and query client
├── styles/          # Global styles
├── theme/           # MUI theme configuration
└── App.tsx          # Main app component
```

## Features

- ✅ React 19 + TypeScript
- ✅ Vite for fast development
- ✅ React Router for navigation
- ✅ Tanstack Query for server state
- ✅ Axios with JWT auth
- ✅ React Hook Form + Zod validation
- ✅ Material UI components
- ✅ Zustand for auth state
- ✅ Recharts for data visualization

## Environment Variables

Copy `.env.example` to `.env` and set the API URL:

```
VITE_API_URL=http://206.81.28.246/api/v1
```

## Integration with Backend

- All API calls use `/api/v1` prefix
- JWT tokens stored in localStorage
- Automatic token refresh on 401
- Error handling with toast notifications
