# 🎯 Personal Daily Job Aggregator & Tracker

A complete, production-ready system to automatically aggregate daily job postings across **Naukri**, **Indeed**, **LinkedIn**, **Glassdoor**, and **RemoteOK**, push them to **Firebase Firestore**, and manage/track applications via a modern **React (Vite + Tailwind CSS)** dashboard.

---

## 📁 Monorepo Folder Structure

```text
job-geter/
├── backend-scraper/
│   ├── job_config.json          # Dynamic roles, locations, sites configuration
│   ├── requirements.txt         # Python dependencies (python-jobspy, firebase-admin, etc.)
│   ├── scraper.py               # Main scraper engine with Firestore sync & MD5 deduplication
│   └── serviceAccountKey.json   # (Add your Firebase Admin SDK key here)
│
├── frontend-portal/
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   ├── .env.example             # Firebase Web credentials template
│   ├── .env                     # (Your local Firebase Web credentials)
│   └── src/
│       ├── App.jsx              # Complete dashboard (Stats, Date picker, Filters, Modal)
│       ├── firebase.js          # Firebase JS SDK v10 initialization
│       ├── demoData.js          # Realistic preview jobs for offline / demo mode
│       ├── index.css            # Tailwind & visual styles
│       └── main.jsx
│
├── .github/
│   └── workflows/
│       └── daily_scrape.yml     # Automated 4 Smart Daily Runs: 9 AM, 1 PM, 5 PM, 9 PM IST
│
└── README.md
```

---

## 🛠️ Step 1: Firebase Project Setup

### 1.1 Create Firebase Project & Firestore
1. Visit [Firebase Console](https://console.firebase.google.com/) and click **Create a project**.
2. Navigate to **Build > Firestore Database** and click **Create database**.
3. Choose your nearest region (e.g. `asia-south1` Mumbai) and start in test mode or production mode.
4. Set up security rules in the **Rules** tab:
   ```javascript
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /daily_jobs/{jobId} {
         // Allow read and status updates (is_applied, is_saved) from your personal portal
         allow read, write: if true;
       }
     }
   }
   ```

### 1.2 Get Backend Key (`serviceAccountKey.json`)
1. In Firebase Console, click the gear icon ⚙️ next to **Project Overview** -> **Project Settings**.
2. Go to the **Service accounts** tab.
3. Click **Generate new private key** and download the JSON file.
4. Rename this file to `serviceAccountKey.json` and place it inside:
   `backend-scraper/serviceAccountKey.json`
   *(This file is ignored by git to protect your credentials)*.

### 1.3 Get Frontend Web Credentials
1. In Firebase Console **Project Settings** -> **General** tab.
2. Under **Your apps**, click the Web icon `</>` and register your app.
3. Copy your Firebase config object and paste the values into `/frontend-portal/.env`:
   ```bash
   cp frontend-portal/.env.example frontend-portal/.env
   ```
   Fill in:
   ```env
   VITE_FIREBASE_API_KEY=AIzaSy...
   VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your-project
   VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=1234567890
   VITE_FIREBASE_APP_ID=1:123456:web:...
   ```

---

## ⚙️ Step 2: Customizing Job Searches (`job_config.json`)

You can edit `/backend-scraper/job_config.json` at any time without modifying any Python code:

```json
{
  "job_roles": [
    "PHP Developer",
    "Laravel Developer",
    "React.js Developer",
    "Full Stack Developer",
    "Junior Software Developer"
  ],
  "locations": [
    "Madurai, Tamil Nadu",
    "Chennai, Tamil Nadu",
    "Coimbatore, Tamil Nadu",
    "Remote"
  ],
  "sites_to_scrape": ["naukri", "indeed", "linkedin", "glassdoor"],
  "hours_old": 24,
  "results_per_role": 25
}
```

---

## 🐍 Step 3: Running the Backend Scraper Locally

```bash
# Navigate to backend folder
cd backend-scraper

# Create virtual environment (recommended)
python -m venv venv

# Activate virtual environment
# Windows:
.\venv\Scripts\activate
# Linux/macOS:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run scraper
python scraper.py
```

### What `scraper.py` does:
1. Loads `job_config.json` dynamically.
2. Scrapes `job_roles` across specified `locations` using `python-jobspy`.
3. Scrapes remote opportunities from `https://remoteok.com/api` matching your role keywords.
4. Generates an MD5 hash of each `apply_link` as the Firestore document ID to eliminate duplicates.
5. Preserves existing `is_applied` and `is_saved` statuses if a job is rescraped.
6. Pushes to the `daily_jobs` collection with timestamp and `scraped_date`.

---

## 💻 Step 4: Running the Frontend Portal

```bash
# Open a new terminal in frontend-portal
cd frontend-portal

# Install Node dependencies
npm install

# Start Vite development server
npm run dev
```

Visit `http://localhost:3000` in your browser.

### Key Features of the Dashboard:
- **Top Stats Bar:** Total jobs found for the selected date, live breakdown by platform (Naukri, Indeed, LinkedIn, Glassdoor, RemoteOK), and applied/saved counts.
- **Date Picker & Quick Arrows:** Seamlessly browse listings day by day with `⬅ Previous Day` and `Next Day ➡` buttons or the calendar picker.
- **Category & Source Filtering:** Filter by job roles, search query, or platform pills.
- **Direct Status Toggle:** Click `⭐ Save` or `✅ Applied` directly on any card to update Firestore in real time.
- **Detail & Apply Modal:** View full description, inspect raw apply link with one-click copy, and click **🚀 Apply on [Platform]** to launch the employer page in a new tab.
- **Interactive Demo Mode:** If Firebase credentials are not yet entered, the portal includes realistic sample jobs so you can preview all UI features immediately.

---

## 🤖 Step 5: Automated Daily Scraping (GitHub Actions)

The workflow file is pre-configured at `.github/workflows/daily_scrape.yml`:
- Runs automatically **4 times daily in IST**:
  - **09:00 AM IST** (03:30 UTC) - Morning batch
  - **01:00 PM IST** (07:30 UTC) - Lunchtime batch
  - **05:00 PM IST** (11:30 UTC) - Evening batch
  - **09:00 PM IST** (15:30 UTC) - End-of-day recap
- Can also be manually triggered anytime via the **Actions** tab in GitHub (**Run workflow** button).

### Setting up the GitHub Secret:
1. Push your repository to GitHub.
2. In your repository, go to **Settings > Secrets and variables > Actions**.
3. Click **New repository secret**.
4. Name: `FIREBASE_SERVICE_ACCOUNT`
5. Value: Open your `serviceAccountKey.json`, copy the entire raw JSON text, and paste it.
6. Click **Add secret**.

That's it! GitHub Actions will run the scraper daily, and your React dashboard will automatically show fresh jobs for that date.

---

## 📋 Firestore Document Schema (`daily_jobs`)

| Field | Type | Description |
|---|---|---|
| `id` | `string` | MD5 hash of `apply_link` (Document ID) |
| `title` | `string` | Job Title |
| `company` | `string` | Company Name |
| `location` | `string` | Job Location or "Remote" |
| `source_app` | `string` | "Naukri", "Indeed", "LinkedIn", "Glassdoor", "RemoteOK" |
| `search_category` | `string` | Keyword from `job_config.json` that matched |
| `apply_link` | `string` | Direct URL to apply |
| `description` | `string` | Job description snippet |
| `date_posted` | `string` | Posting date (`YYYY-MM-DD`) |
| `scraped_date` | `string` | Scraped date (`YYYY-MM-DD`) |
| `is_applied` | `boolean` | `true` if marked applied, default `false` |
| `is_saved` | `boolean` | `true` if bookmarked, default `false` |
| `timestamp` | `timestamp` | Firestore server timestamp |
