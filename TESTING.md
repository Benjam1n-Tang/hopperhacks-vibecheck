# Database Setup & Testing Guide

## 1. Setup Supabase Database

### Step 1: Run the SQL Schema

1. Go to your Supabase project dashboard: https://diezobyjyllqxlxhztbp.supabase.co
2. Navigate to **SQL Editor** in the left sidebar
3. Click **New Query**
4. Copy and paste the entire contents of `supabase-schema.sql`
5. Click **Run** to execute the SQL

This will create:

- `users`, `sessions`, `participants`, `pinned_pairs` tables
- Proper indexes for performance
- Row Level Security (RLS) policies
- Realtime subscription for the `participants` table

### Step 2: Enable Realtime (if not already enabled)

1. In Supabase dashboard, go to **Database** → **Replication**
2. Find the `participants` table
3. Make sure the toggle is **ON** for Realtime

## 2. Test the Real-time Functionality

### Test Scenario: Multiple Tabs

1. **Start the development server** (if not running):

   ```bash
   npm run dev
   ```

2. **Sign in** to your account in the browser

3. **Create a session**:
   - Click "+ Create Session" in the navbar
   - Note the session code (e.g., `ABC123`)
   - You should be on `localhost:3000/ABC123`

4. **Open a second tab/window**:
   - Go to `localhost:3000/ABC123` (use the same code)
   - Or go to `localhost:3000` and enter the code manually

5. **Join as a participant** in the second tab:
   - Enter a display name (e.g., "Test User")
   - Enter a summary (e.g., "I love coding and coffee")
   - Click "Join Session"

6. **Watch the magic happen**:
   - Switch back to the first tab (host tab)
   - You should see "Test User" appear in the Participants list **automatically**
   - No refresh needed!

7. **Try with more tabs**:
   - Open a third tab with the same code
   - Join with a different name
   - Watch all tabs update in real-time

### Test Scenario: Different Devices/Browsers

1. Create a session on your computer
2. On your phone (or another browser), navigate to the same session code
3. Join as a participant
4. Watch the participant appear on your computer in real-time

## 3. Troubleshooting

### Participants not appearing?

**Check 1: Verify the tables exist**

```sql
-- Run in Supabase SQL Editor
SELECT * FROM sessions ORDER BY created_at DESC LIMIT 5;
SELECT * FROM participants ORDER BY joined_at DESC LIMIT 10;
```

**Check 2: Verify Realtime is enabled**

- Go to Database → Replication
- Ensure `participants` table has Realtime enabled

**Check 3: Check browser console**

- Open DevTools (F12)
- Look for any errors in the Console tab
- You should see "New participant joined:" logs when someone joins

**Check 4: Restart the dev server**

```bash
# Stop the server (Ctrl+C) and restart
npm run dev
```

### "Session not found" error?

This means the session wasn't properly created in the database.

- Check the Supabase URL and API key in `.env`
- Verify you ran the SQL schema
- Check browser console for API errors

### Foreign Key Constraint Error?

If you see an error like:

```
insert or update on table "sessions" violates foreign key constraint "sessions_host_clerk_id_fkey"
```

**Solution 1: Code automatically handles this (Recommended)**
The latest code now automatically creates user records when you create a session. Just restart your dev server:

```bash
# Stop the server (Ctrl+C) and restart
npm run dev
```

Then try creating a session again.

**Solution 2: Remove the Foreign Key Constraint (Optional)**
If you added a foreign key constraint manually and want to remove it:

1. Go to Supabase SQL Editor
2. Run the contents of `supabase-migration-remove-fk.sql`
3. This removes the strict constraint while keeping the reference

**Why this happens:**
Your Clerk user needs to exist in the Supabase `users` table before creating a session. The updated code now handles this automatically.

### Realtime not working?

1. Make sure you have the correct Supabase URL in `.env`
2. Verify Realtime is enabled in Supabase dashboard
3. Check that `ALTER PUBLICATION supabase_realtime ADD TABLE participants;` was executed

## 4. What's Happening Behind the Scenes?

When you join a session:

1. The join form sends data to `/api/session/join`
2. The API inserts a new row into the `participants` table
3. Supabase broadcasts this INSERT event via Realtime
4. All connected clients listening to that session receive the event
5. The React component adds the new participant to state
6. The UI updates automatically across all tabs/devices

This is why you see updates in real-time without refreshing!
