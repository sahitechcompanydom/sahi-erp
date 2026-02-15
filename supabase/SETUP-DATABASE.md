# Create the `profiles` and `tasks` tables in Supabase

If you don’t see **profiles** (or **tasks**) in the Table Editor, the schema hasn’t been applied yet. Do this once per project.

## Steps

1. Open **[Supabase Dashboard](https://supabase.com/dashboard)** and select your project (the one whose URL is in your `.env.local`).

2. In the left sidebar, go to **SQL Editor**.

3. Click **New query**.

4. **Run the migration SQL**:
   - Open the file **`supabase/run-all-migrations.sql`** in your project (in your code editor, not in the browser).
   - **Copy the whole file contents** (all the SQL, starting from the first `CREATE TABLE` — you can include the comment lines too).
   - **Paste into the Supabase SQL Editor** (the big text area).
   - Click **Run** (or Ctrl/Cmd + Enter).
   - **Do not** type or paste the file path like `supabase/run-all-migrations.sql` into the editor — that is not valid SQL and will cause a syntax error.

5. **Second script** – in a **new** query (or clear the editor), paste the contents of:
   - **`supabase/migrations/002_profiles_standalone.sql`**  
   Then click **Run** again.

6. Go to **Table Editor** in the left sidebar. You should see:
   - **profiles**
   - **tasks**

7. To set yourself as admin after logging in:
   - **Authentication → Users**: note your user’s **UUID** (or email).
   - **Table Editor → profiles**: find the row with that email (or add one with `id` = your user UUID and `role` = `admin`).

If **Run** shows an error, read the message. Common cases:
- **“relation auth.users does not exist”** – You’re not in a Supabase project or Auth isn’t enabled. Use a real Supabase project and enable Auth.
- **“already exists”** – The table or policy is already there; you can skip that script or run the other one.
