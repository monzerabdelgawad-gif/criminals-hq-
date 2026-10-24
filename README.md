# criminals · season HQ

Team dashboard for **Criminals** (FLL BIOGLOW 2026–27). Every edit is written straight into the Google Sheet. The sheet stays the source of truth and the backup.

- **Website:** React + Vite, hosted free on Vercel from a private repo (`web/`)
- **Backend:** Google Apps Script attached to the sheet (`apps-script/`). It reads and writes the sheet, uploads files to Drive, and logs who changed what.
- **Login:** Google sign-in. Only emails listed in the sheet's `USERS` tab can get in.

```
Vercel site  ──Google sign-in──►  Apps Script web app  ──►  Sheet + Drive folder
```

## Pages and the sheet tabs they use
| Page | Sheet tab |
|---|---|
| Home (KPIs, countdown, my tasks) | calculated from TASK DATABASE + MILESTONES |
| Tasks (board / list / editing) | TASK DATABASE |
| Timeline | built from task dates (replaces SEASON CALENDAR) |
| Milestones · Risks | MILESTONES & RISKS |
| Weekly Review | WEEKLY REVIEW |
| Team | USERS (login access) + SETTINGS → Team Directory |
| Uploads | Drive folder + UPLOADS tab |
| Activity | ACTIVITY LOG |
| Resources · Settings · Guide | SETTINGS · USER GUIDE |

---

## One-time setup (~20 min)

### 1. Google OAuth client (free)
1. Go to https://console.cloud.google.com → create a project called `criminals-dashboard`.
2. **APIs & Services → OAuth consent screen**: External, app name "Criminals HQ", add your email. Publish it (it only asks for basic profile/email, so Google doesn't need to review it).
3. **Credentials → Create credentials → OAuth client ID → Web application**.
   - Authorized JavaScript origins: `http://localhost:5179` (add the Vercel URL after step 5)
4. Copy the **Client ID** (`…apps.googleusercontent.com`).

### 2. Apps Script backend
1. Open the sheet → **Extensions → Apps Script**.
2. Create 3 script files with the same names and paste in the contents: `Code.gs`, `sheetMap.gs`, `setup.gs` (from `apps-script/`).
3. **Project Settings (⚙) → Script properties**, then add:
   - `OAUTH_CLIENT_ID` = the client ID from step 1
   - `DRIVE_FOLDER_ID` is set by `setup` to the **criminals docs** folder (`1N71gnZRUF1VkqJ9Z6mifKFlcz6CqCA4o`). Only set it yourself to use a different folder.
4. Choose the function `setup` → **Run** → allow the permissions. This:
   - backs up the tabs it changes (hidden `_BACKUP …` tabs)
   - fixes the template bugs (see below)
   - creates `USERS`, `ACTIVITY LOG`, `UPLOADS` and adds you as the first user
5. **Deploy → New deployment → Web app**: Execute as **Me**, Who has access **Anyone** → Deploy → copy the URL ending in `/exec`.
   > "Anyone" only means the URL can be reached. Every request still needs a signed-in Google account that is on the USERS list.

### 3. Add the team
In the sheet's `USERS` tab (or in the dashboard under Team → Add member), add each person's Gmail, name, role (Student/Instructor) and task roles (e.g. `Programmer, Builder`). Task roles connect people to tasks, because the sheet assigns tasks to roles, not names.

### 4. Run locally
```powershell
cd "C:\Users\Joe\Projects\Team's dashboard\web"
Copy-Item .env.example .env.local   # then fill both values
npm install
npm run dev -- --port 5179
```
If both values are left empty, the site runs in **demo mode** with sample data and no Google login.

### 5. Publish (Vercel, free, private code)
1. Push this folder to a **private** GitHub repo (or skip GitHub and use `npx vercel` from the `web` folder).
2. https://vercel.com → Add New Project → import the repo → **Root Directory: `web`** (framework is detected as Vite).
3. Environment Variables: `VITE_API_URL`, `VITE_GOOGLE_CLIENT_ID` → Deploy.
4. Add the Vercel URL (e.g. `https://criminals-hq.vercel.app`) to the OAuth client's *Authorized JavaScript origins*.

Every push to `main` deploys again on its own. (`.github/workflows/deploy.yml` is the GitHub Pages option. It only works if the repo is public, so ignore it if you use Vercel.)

---

## Template bugs fixed by `setup()`
- TASK DATABASE: notes were sitting in *Review Result* and "Not Reviewed" in *Last Updated*. Both moved to the correct columns.
- OP-07: its dependencies had spread across 5 columns. They are now joined in *Dependency ID*.
- The Priority dropdown had a fake "Priority" option. Removed.
- Dates were typed as text. They are now real dates (they look the same), so formulas can use them.
- DASHBOARD: the formulas stopped at row 53, so new tasks weren't counted. They now cover the whole column. "% done" no longer counts cancelled tasks, the *Overdue* column now shows real numbers, and *Upcoming milestones* updates by itself.
- DASHBOARD showed a made-up competition date (30 Apr 2027). It now reads from SETTINGS.
- Team Name set to "Criminals". The "Example: Alex" row was removed.
- Added an *Updated By* column (Z) in TASK DATABASE.

## Updating the backend later
After editing the `.gs` files: **Deploy → Manage deployments → ✏️ → Version: New version → Deploy**. The URL stays the same.

## Moving to a team Google account later
1. In the team account: **File → Make a copy** of the sheet (the script comes with it), or transfer ownership.
2. Set the Script properties again (`OAUTH_CLIENT_ID`, `DRIVE_FOLDER_ID`), run `setup` once (it skips steps that are already done), then deploy as a new web app.
3. Put the new `/exec` URL in Vercel's `VITE_API_URL` → Redeploy.

## Limits
- One upload can be at most 25 MB (Apps Script limit). Put bigger videos in the Drive folder directly. The Uploads page has an "Open Drive folder" button.
- The site checks for changes every 20 s, so edits made directly in the sheet show up too.
- If two people edit the same field at the same time, the second person gets a "someone changed this" message and sees the latest value. Nothing gets overwritten without anyone noticing.
