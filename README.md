# Sahi Company — Internal Job Management & CRM

Enterprise-grade internal task and personnel management with a corporate UI (Zinc/Slate, glassmorphism sidebar, light/dark mode).

## Tech stack

- **Next.js 15** (App Router), **Tailwind CSS**, **shadcn-style UI** (Radix + CVA), **Lucide icons**
- **Supabase** (auth + database), **React Query** (TanStack Query)
- **Port:** dev server runs on **3001**

## Quick start

```bash
npm install
cp .env.example .env.local
# Edit .env.local with your Supabase URL and anon key
npm run dev
```

Open [http://localhost:3001](http://localhost:3001). Default route redirects to **Personnel**.

## Supabase setup

1. Create a project at [supabase.com](https://supabase.com).
2. In **Settings → API** copy the project URL and anon (public) key into `.env.local`:

   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
   ```

3. **Create the `profiles` and `tasks` tables** (required for Personnel, Tasks, and login):
   - In Supabase go to **SQL Editor** → **New query**.
   - Open the file **`supabase/run-all-migrations.sql`** in this repo, copy its **entire** contents, paste into the editor, and click **Run**.
   - Then open **Table Editor** in the sidebar — you should see **profiles** and **tasks**.
   - Detailed steps and troubleshooting: **`supabase/SETUP-DATABASE.md`**.

4. (Optional) Enable Auth and add users; link them to `profiles` by `id = auth.uid()`. Without Auth, the app still runs; role-based task visibility uses the first profile or defaults to full access for demo.

## Login and admin access

1. **Enable Email auth** in Supabase: Dashboard → Authentication → Providers → Email (enable, optionally disable “Confirm email” for dev).
2. **Create a user** in Supabase: Authentication → Users → “Add user” (email + password). Or use “Sign up” if you add a sign-up page.
3. **Open the app** and go to [http://localhost:3001/login](http://localhost:3001/login). Sign in with that email and password.
4. **First sign-in** creates a profile with `role: 'staff'`. To **log in as admin**:
   - In Supabase go to **Table Editor → profiles**.
   - Find the row whose `email` matches your login email (or `id` matches the user id from Authentication → Users).
   - Edit that row and set **role** to `admin`, then save.
5. Refresh the app (or sign out and sign in again). You can now open **Administration** and access `/admin/settings`. Use **Sign out** in the sidebar to log out.

## Data model

- **profiles:** `id`, `full_name`, `avatar_url`, `email`, `phone`, `role` (admin | chef | staff), `hire_date`, `birth_date`, `emergency_contact`, `department`
- **tasks:** `id`, `title`, `description`, `assigner_id`, `assignee_id`, `due_date`, `status` (Pending | In Progress | Review Pending | Completed), `priority` (Low | Medium | High | Urgent)

## Routes

- **/** → redirects to `/personnel`
- **/dashboard** — stats and overview
- **/personnel** — personnel directory: Add/Edit/Delete with modal form; table with avatars, role badges, row actions
- **/tasks** — Kanban task tracker: columns by status, Create Task dialog, task cards with assignee/priority/due date; approval workflow (Staff → Review Pending, only Admin/Chef can set Completed); role-based visibility (Admin: all, Chef: department, Staff: own tasks)

## Restart dev server (after changing .env.local)

Env vars are loaded only when the server starts. After editing `.env.local`, restart:

**Option A — Stop then start (same terminal)**  
1. In the terminal where the server is running, press **Ctrl+C** (Windows/Linux) or **Cmd+C** (Mac) to stop it.  
2. Start again: `npm run dev`

**Option B — Kill process on port 3001, then start**

- **Windows (Command Prompt or PowerShell):**
  ```cmd
  for /f "tokens=5" %a in ('netstat -ano ^| findstr ":3001" ^| findstr "LISTENING"') do taskkill /F /PID %a
  npm run dev
  ```
  In a `.bat` file use `%%a` instead of `%a`.

- **macOS / Linux:**
  ```bash
  lsof -ti:3001 | xargs kill -9
  npm run dev
  ```

Or double-click **Run Server.vbs** (Windows) or **Start Server.command** (Mac); those scripts kill port 3001 and start the server.

## Scripts

- `npm run dev` — dev server on **port 3001**
- `npm run build` — production build
- `npm run start` — start production server on port 3001
- `npm run lint` — ESLint
