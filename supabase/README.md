# SkillSync Supabase setup

1. Open the Supabase project SQL Editor for the URL in `backend/.env`.
2. Paste and run `schema.sql`.
3. Confirm the tables and RLS policies exist under Database > Tables.
4. Start the API from the repository root with:

```powershell
Push-Location api
npm start
Pop-Location
```

The API reads `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` from `backend/.env`. The service-role key is server-only and must never be copied into frontend files.

The existing FastAPI service remains the Gemini-only service on port 8000. The new Express/Supabase API runs on port 3000.
