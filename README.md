# Frontend Admin Web UI

> Synced from [pinnaclesg-monorepo](https://github.com/GRMedicalApp/pinnaclesg-monorepo) - 2025-12-30

Telemedicine Admin Website

## Installation / Setup

1. Install dependencies using `npm install`
2. Create a `.env` file, referencing the `.env.local` file - replacing both of `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from the supabase project.
3. Start development server using `npm run dev`

# Deployment on Render (Static Site)
## On Refresh, Not Found displayed
- Navigate to Project Redirects/Rewrites [Example Link](https://dashboard.render.com/static/srv-cpk4eo2cn0vc73b0f8jg/redirects)
```
Source:         /:any
Destination:    /
Action:         Rewrite
```