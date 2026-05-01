# Deployment Guide: Vercel & Netlify

This application is built with a Vite frontend and an Express backend. Deploying to serverless platforms requires some specific configurations.

## 1. Prerequisites
- **Database**: This app currently uses local JSON files for memory and tasks. **This will not work on Vercel/Netlify** because they have read-only filesystems. 
  - **Action**: You MUST replace the local file logic in `server.ts` with a real database like **MongoDB**, **PostgreSQL**, or **Firebase/Firestore**.
- **Environment Variables**: Set these in your Vercel/Netlify dashboard:
  - `GEMINI_API_KEY`: Your Google AI Studio key.
  - `STARK_MAIL_USER` & `STARK_MAIL_PASS`: For email notifications.

## 2. Vercel Deployment
1. Install the Vercel CLI: `npm i -g vercel`
2. Run `vercel`.
3. Vercel will use the `vercel.json` provided. It maps `/api` requests to a serverless function.

## 3. Netlify Deployment
1. Install the Netlify CLI: `npm i -g netlify-cli`
2. Run `netlify deploy --build`.
3. Netlify uses `netlify.toml`. Note that you might need to move the server entry point to a `netlify/functions` directory if the direct mapping in `netlify.toml` isn't enough.

## 4. Why it lags on these platforms?
- **Cold Starts**: Serverless functions "sleep" when not in use. The first request after a while might be slow.
- **WebSocket Limits**: Standard Vercel/Netlify functions do not support persistent WebSockets (which this app uses for the Live API). For a fully functional Jarvis experience, a platform like **Railway**, **Heroku**, or **Google Cloud Run** (where you are now) is recommended.
