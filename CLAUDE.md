@AGENTS.md

# Domis — Project Instructions

## Project Overview
This is **Domis**, an AI-powered property management platform built with:
- **Next.js** (App Router)
- **Supabase** (database + storage)
- **Clerk** (authentication)
- **Anthropic** (AI report generation)

## AI Model
Always use `claude-sonnet-4-6` as the AI model. Never use an older or different model.

## Git & Deployment
- Always push to GitHub when a task is complete.
- Always run `npm run build` and confirm it compiles without errors before pushing.
- Environment variables are managed in Vercel — never hardcode any secrets, keys, or URLs.

## Code Behavior
- Never ask for confirmation on edits — make the best decision and proceed.
- Always handle errors gracefully with user-facing messages (never swallow errors silently).
- All API routes must return JSON error responses, never raw HTML or unhandled exceptions.

## Styling
- Use Tailwind CSS for all styling — no inline styles, no CSS modules unless already present.
- Keep the design dark, professional, and clean (consistent with the existing dark theme).
