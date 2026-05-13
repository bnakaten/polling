# Polling System - Project Guide

## Tech Stack

- **Framework**: Next.js 16.2.4 (App Router)
- **Database**: SQLite with Prisma 7.8.0
- **Authentication**: Custom JWT + HTTP-only cookies
- **Styling**: Tailwind CSS 4
- **React**: 19.2.4

## Project Structure

```
polling/
├── app/
│   ├── api/                    # API routes
│   │   ├── auth/              # Auth endpoints (login, register, session, logout)
│   │   ├── polls/             # Poll CRUD + management
│   │   │   ├── generate-tokens/  # Bulk token generation
│   │   │   ├── [id]/
│   │   │   │   ├── results/     # Poll results data
│   │   │   │   ├── export/      # CSV export
│   │   │   │   └── token/       # Single token generation
│   │   │   └── [id]/route.ts    # Poll detail/update/delete
│   │   ├── vote/              # Voting endpoints
│   │   │   ├── [token]/
│   │   │   │   ├── submit/      # Vote submission
│   │   │   │   ├── validate/    # Token validation
│   │   │   │   └── route.ts     # Token verification
│   │   └── polls/route.ts     # Poll creation/list
│   ├── dashboard/             # Admin dashboard
│   ├── create-poll/           # Poll creation form
│   ├── poll/[id]/             # Poll detail pages
│   │   ├── edit/              # Poll editing
│   │   ├── GenerateTokenForm.tsx
│   │   ├── GenerateUrlsForm.tsx
│   │   ├── DownloadCSV.tsx
│   │   └── PollResultsPageClient.tsx
│   ├── vote/[token]/          # Public voting page
│   │   ├── VoteForm.tsx
│   │   └── page.tsx
│   ├── login/                 # User login
│   ├── register/              # User registration
│   ├── page.tsx               # Landing page
│   └── layout.tsx
├── prisma/
│   └── schema.prisma          # Database schema
└── AGENTS.md                  # This file
```

## Database Schema

```
User {
  id, email (unique), password, isAdmin, createdAt
  → Polls (one-to-many)
}

Poll {
  id, title, description, createdAt, userId
  → Questions (one-to-many)
  → Tokens (one-to-many)
}

Question {
  id, text, answerType (default/rating/textarea), pollId
  → Options (one-to-many)
  → Responses (one-to-many)
}

Option {
  id, text, questionId
  → Responses (one-to-many)
}

Token {
  id, token (unique), pollId, used, createdAt
  → Responses (one-to-many)
}

Response {
  id, token, questionId, optionId?, text?
  → Token (many-to-one)
  → Question (many-to-one)
  → Option (many-to-one, optional)
}
```

## Key Features

1. **Authentication**: JWT + HTTP-only cookies for admin login/registration
2. **Poll Creation**: Create polls with title, description, and multiple questions
3. **Question Types**:
   - `default`: Radio buttons (single choice)
   - `rating`: 0-10 slider
   - `textarea`: Open text responses
4. **Voting**: Single-use tokens (one vote per link)
5. **Bulk Token Generation**: Generate 1-100 voting links at once
6. **Results**: Real-time vote counts with progress bars
7. **CSV Export**: Download poll results as CSV
8. **Poll Status**: Shows "Closed" when all links used
9. **Poll Deletion**: Delete polls with confirmation

## Important Conventions

- **Client Components**: Files with "Client" suffix use `use client` directive
- **API Routes**: All API routes are in `app/api/` with explicit HTTP method handlers
- **Server Actions**: Use direct API calls from client components (no server actions file)
- **Auth**: Check `req.headers.get("authorization")` for JWT in API routes
- **Dev Server**: Binds to `localhost` only for security

## Common Tasks

### Running Development Server
```bash
npm run dev
```

### Building for Production
```bash
npm run build
```

### Database Migrations
```bash
npx prisma migrate dev
npx prisma generate
```

### Adding New Answer Types
1. Update `schema.prisma` Question model if needed
2. Add type to `app/vote/[token]/VoteForm.tsx`
3. Update results rendering in `PollResultsPageClient.tsx`

### Adding New API Endpoints
1. Create file in `app/api/`
2. Export `GET`, `POST`, etc. functions
3. Use `prisma` from `@prisma/client`
4. Check auth with `req.headers.get("authorization")`

## Build Verification

Project builds successfully with `npm run build`. All pages compile without errors.
