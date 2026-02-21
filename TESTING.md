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
- Realtime subscription for the `participants` and `sessions` tables

### Step 1b: Enable Realtime for Sessions (if you already ran the initial schema)

If you already set up the database before, you need to enable Realtime for the sessions table:

1. Go to **SQL Editor**
2. Run the contents of `supabase-migration-realtime-sessions.sql`

### Step 2: Enable Realtime (if not already enabled)

1. In Supabase dashboard, go to **Database** → **Replication**
2. Find the `participants` and `sessions` tables
3. Make sure the toggle is **ON** for Realtime for both tables

## 2. Session Lifecycle & Host Controls

### Understanding Session States

Sessions have three states:

- **waiting** (Open) - Participants can join
- **done** (Closed) - No new participants, host can generate groups
- **grouping** - Groups are being generated/displayed

### Host-Only Features

When you sign in and create a session, you become the **host**. The host has special privileges:

1. **Cannot join as a participant** - The join form is hidden for the host
2. **Session controls** - Buttons to manage the session lifecycle
3. **Test tools** - Quick buttons to add test participants

### Session Workflow

**Phase 1: Open Session (Status: waiting)**

- Host creates session and shares the code
- Participants can join
- Host sees "Close Session" button
- Host can add test participants

**Phase 2: Closed Session (Status: done)**

- Host clicks "Close Session"
- No new participants can join (form is hidden)
- Host sees three options:
  - **Generate Groups** - Create AI-powered groupings
  - **Reset Session** - Delete all participants and reopen
  - **Continue Session** - Reopen to accept more participants

**Phase 3: Generate Groups (Status: grouping)**

- Host clicks "Generate Groups"
- AI creates optimal groups based on participant summaries
- Groups are displayed to all participants in real-time

### Testing the Session Lifecycle

1. **Create a session** as a signed-in host
2. **Verify you don't see the join form** (host shouldn't join)
3. **Open another tab** and join as a participant
4. **Add test participants** using the "+ 10 Test Users" button
5. **Click "Close Session"** and verify:
   - Session status changes to "Closed"
   - Three new buttons appear: Generate Groups, Reset Session, Continue Session
   - Other tabs are updated in real-time
6. **Click "Continue Session"** to reopen
   - Status changes back to "Open"
   - Participants can join again
7. **Click "Reset Session"** to clear all participants
   - All participants are removed
   - Session reopens automatically

## 3. Test the Real-time Functionality

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

### Quick Test: Add Multiple Participants at Once

Want to test with a lot of participants quickly? Use the test seed buttons!

1. **Create a session** and sign in as the host
2. **Scroll to Host Controls** at the bottom of the session page
3. **Click one of the test buttons**:
   - "+ 5 Test Users" - adds 5 random participants
   - "+ 10 Test Users" - adds 10 random participants
   - "+ 20 Test Users" - adds 20 random participants

4. **Watch them appear in real-time** across all tabs
5. Each test participant has:
   - A unique random name (e.g., "Alex42", "Jordan17")
   - A random interest/personality summary
   - These work great for testing the grouping algorithm!

**Tip:** Open multiple tabs first, then seed participants to see the real-time magic happen everywhere at once!

### Test Scenario: Participant Reconnection & Saved Info

Real users (non-generated) have their information saved and can automatically rejoin!

**What happens:**

- When you join a session, your name and summary are saved locally
- If you close the tab, you're automatically removed from the participants list
- If you reopen the same session link, you'll **automatically rejoin** with your saved info

**How to test it:**

1. **Join a session as a participant** (not as host):
   - Open `localhost:3000/ABC123` in a new tab
   - Enter your name: "Alice"
   - Enter a summary: "I love React and TypeScript"
   - Click "Join Session"

2. **Verify you've joined**:
   - You should see "✓ You've Joined!"
   - Your name appears in the participants list

3. **Close the tab** (click the X):
   - Wait a few seconds
   - Check another tab with the session open
   - "Alice" should disappear from the participants list (presence detected disconnect)

4. **Reopen the same session** (open `localhost:3000/ABC123` again):
   - The form should auto-populate with "Alice" and your summary
   - You'll automatically rejoin as a participant
   - Your name reappears in the participants list

5. **Try the "Leave and clear saved info" button**:
   - After joining, click this button
   - Your saved info is cleared
   - You can now join as a different person

**Important Notes:**

- This only works for **real users** (not test/generated participants)
- Generated users (from the seed buttons) are NOT removed on disconnect
- Your info is saved per session code in browser localStorage
- If you clear your browser data, saved session info is lost

**Alternative: Command-line script**

You can also add test participants from the terminal:

```bash
node scripts/seed-participants.js ABC123 15
```

This adds 15 test participants to session ABC123. Great for automation or quick testing!

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
