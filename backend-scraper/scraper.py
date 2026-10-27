#!/usr/bin/env python3
"""
Personal Daily Job Aggregator & Tracker - Scraper Engine
Scrapes jobs from multiple platforms (Naukri, Indeed, LinkedIn, Glassdoor, RemoteOK)
and pushes them to Firebase Firestore with duplicate prevention and user status preservation.
"""

import os
import sys
import json
import time
import hashlib
import logging
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List, Optional
import requests
from bs4 import BeautifulSoup
from dotenv import load_dotenv

# Indian Standard Time (IST = UTC + 5:30)
IST = timezone(timedelta(hours=5, minutes=30))

# Load local environment variables if available
load_dotenv()

# Ensure utf-8 encoding on Windows consoles
if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger("JobScraper")

# Try importing jobspy and firebase_admin
try:
    from jobspy import scrape_jobs
    JOBSPY_AVAILABLE = True
except ImportError:
    JOBSPY_AVAILABLE = False
    logger.warning("python-jobspy is not installed yet. Run 'pip install -r requirements.txt'")

try:
    import firebase_admin
    from firebase_admin import credentials, firestore
    FIREBASE_AVAILABLE = True
except ImportError:
    FIREBASE_AVAILABLE = False
    logger.warning("firebase-admin is not installed yet. Run 'pip install -r requirements.txt'")


def load_job_config(db=None, config_path: Optional[str] = None) -> Dict[str, Any]:
    """
    Dynamically loads configuration from Firestore (app_config/job_search_config)
    or falls back to local job_config.json.
    Synchronizes Firestore and local file automatically.
    """
    if not config_path:
        base_dir = os.path.dirname(os.path.abspath(__file__))
        config_path = os.path.join(base_dir, "job_config.json")
    
    local_config: Dict[str, Any] = {}
    if os.path.exists(config_path):
        try:
            with open(config_path, "r", encoding="utf-8") as f:
                local_config = json.load(f)
        except Exception as e:
            logger.warning(f"Could not read local {config_path}: {e}")

    # Check Firestore for cloud-managed admin config
    if db:
        try:
            config_doc = db.collection("app_config").document("job_search_config").get()
            if config_doc.exists:
                cloud_config = config_doc.to_dict() or {}
                if cloud_config.get("job_roles"):
                    logger.info("Loaded dynamic search config directly from Firestore (app_config/job_search_config)!")
                    # Keep local file in sync with cloud
                    try:
                        with open(config_path, "w", encoding="utf-8") as f:
                            json.dump(cloud_config, f, indent=2)
                    except Exception:
                        pass
                    return cloud_config
            else:
                # Initialize cloud document from local config
                if local_config:
                    db.collection("app_config").document("job_search_config").set(local_config)
                    logger.info("Initialized Firestore app_config/job_search_config with local config settings.")
        except Exception as err:
            logger.warning(f"Error checking cloud config in Firestore: {err}")

    if not local_config:
        raise FileNotFoundError(f"Configuration file not found at: {config_path}")

    logger.info(f"Loaded config from local file {config_path}")
    logger.info(f"Roles to scrape: {len(local_config.get('job_roles', []))} roles")
    logger.info(f"Locations: {local_config.get('locations', [])}")
    logger.info(f"Sites to scrape: {local_config.get('sites_to_scrape', [])}")
    return local_config


def initialize_firebase():
    """
    Initializes Firebase Admin SDK using either:
    1. FIREBASE_SERVICE_ACCOUNT env var (JSON string or file path)
    2. serviceAccountKey.json file in backend-scraper or project root
    """
    if not FIREBASE_AVAILABLE:
        logger.warning("Firebase Admin SDK is not available in current Python environment.")
        return None

    if firebase_admin._apps:
        return firestore.client()

    cred = None
    env_service_account = os.environ.get("FIREBASE_SERVICE_ACCOUNT")
    
    # Option A: Env variable contains raw JSON string or path
    if env_service_account:
        env_service_account = env_service_account.strip()
        if env_service_account.startswith("{"):
            try:
                service_account_info = json.loads(env_service_account)
                cred = credentials.Certificate(service_account_info)
                logger.info("Initialized Firebase credentials from FIREBASE_SERVICE_ACCOUNT JSON string.")
            except Exception as e:
                logger.error(f"Failed to parse FIREBASE_SERVICE_ACCOUNT JSON: {e}")
        elif os.path.exists(env_service_account):
            cred = credentials.Certificate(env_service_account)
            logger.info(f"Initialized Firebase credentials from path in FIREBASE_SERVICE_ACCOUNT: {env_service_account}")

    # Option B: Look for serviceAccountKey.json in typical locations
    if not cred:
        search_paths = [
            os.path.join(os.path.dirname(os.path.abspath(__file__)), "serviceAccountKey.json"),
            os.path.join(os.getcwd(), "serviceAccountKey.json"),
            os.path.join(os.getcwd(), "backend-scraper", "serviceAccountKey.json"),
        ]
        for path in search_paths:
            if os.path.exists(path):
                try:
                    cred = credentials.Certificate(path)
                    logger.info(f"Initialized Firebase credentials from local file: {path}")
                    break
                except Exception as e:
                    logger.warning(f"Error reading {path}: {e}")

    if cred:
        firebase_admin.initialize_app(cred)
        db = firestore.client()
        logger.info("Successfully connected to Firestore database.")
        return db
    else:
        logger.warning(
            "No valid Firebase service account found!\n"
            "To connect Firestore, place 'serviceAccountKey.json' in /backend-scraper\n"
            "or set the FIREBASE_SERVICE_ACCOUNT environment variable.\n"
            "Scraped jobs will also be saved to a local preview JSON file."
        )
        return None


def generate_job_id(apply_link: str) -> str:
    """Generates an MD5 hash of the job URL to use as document ID."""
    clean_url = apply_link.strip().lower()
    return hashlib.md5(clean_url.encode("utf-8")).hexdigest()


def normalize_source_name(raw_name: str) -> str:
    """Standardizes source app names to title format."""
    name_map = {
        "naukri": "Naukri",
        "indeed": "Indeed",
        "linkedin": "LinkedIn",
        "glassdoor": "Glassdoor",
        "remoteok": "RemoteOK",
        "google": "Google Jobs",
        "bayt": "Bayt",
    }
    return name_map.get(str(raw_name).lower().strip(), str(raw_name).capitalize())


def clean_html_text(html_content: str, max_length: int = 1500) -> str:
    """Strips HTML tags and normalizes whitespace."""
    if not html_content:
        return ""
    try:
        soup = BeautifulSoup(str(html_content), "html.parser")
        text = soup.get_text(separator=" ", strip=True)
        text = " ".join(text.split())
        return text[:max_length]
    except Exception:
        return str(html_content)[:max_length]


def scrape_jobspy_jobs(
    role: str,
    location: str,
    sites: List[str],
    results_wanted: int,
    hours_old: int,
    scraped_date: str
) -> List[Dict[str, Any]]:
    """
    Scrapes jobs using python-jobspy for a specific role and location.
    Handles per-site execution safely to prevent total failure if one site blocks.
    """
    if not JOBSPY_AVAILABLE:
        logger.warning("python-jobspy library not available, skipping JobSpy scraping.")
        return []

    jobs_found: List[Dict[str, Any]] = []
    
    # Supported sites in JobSpy
    supported_sites = ["indeed", "linkedin", "glassdoor", "naukri"]
    active_sites = [s.lower() for s in sites if s.lower() in supported_sites]

    if not active_sites:
        active_sites = ["indeed", "linkedin", "glassdoor"]

    logger.info(f"🔍 Searching JobSpy for role='{role}' in location='{location}' on sites={active_sites}...")

    # Set country appropriately
    country_indeed = "India"
    if "remote" in location.lower():
        country_indeed = "India"  # Can also query globally

    try:
        df = scrape_jobs(
            site_name=active_sites,
            search_term=role,
            location=location,
            results_wanted=results_wanted,
            hours_old=hours_old,
            country_indeed=country_indeed,
        )

        if df is not None and not df.empty:
            logger.info(f"  ✓ JobSpy returned {len(df)} jobs for '{role}' in '{location}'.")
            for _, row in df.iterrows():
                try:
                    # Prefer direct apply link if available
                    apply_link = str(row.get("job_url_direct") or row.get("job_url") or "").strip()
                    if not apply_link or apply_link == "nan" or apply_link == "None":
                        continue

                    title = str(row.get("title") or "Untitled Job").strip()
                    company = str(row.get("company") or "Unknown Company").strip()
                    job_loc = str(row.get("location") or location).strip()
                    site_raw = str(row.get("site") or "Indeed").strip()
                    desc = clean_html_text(str(row.get("description") or ""))
                    
                    # Posting date
                    raw_date = row.get("date_posted")
                    if raw_date and str(raw_date) != "nan":
                        if isinstance(raw_date, datetime):
                            date_posted = raw_date.strftime("%Y-%m-%d")
                        else:
                            date_posted = str(raw_date)[:10]
                    else:
                        date_posted = scraped_date

                    job_id = generate_job_id(apply_link)
                    job_dict = {
                        "id": job_id,
                        "title": title,
                        "company": company,
                        "location": job_loc,
                        "source_app": normalize_source_name(site_raw),
                        "search_category": role,
                        "apply_link": apply_link,
                        "description": desc,
                        "date_posted": date_posted,
                        "scraped_date": scraped_date,
                        "is_applied": False,
                        "is_saved": False,
                    }
                    jobs_found.append(job_dict)
                except Exception as row_err:
                    logger.debug(f"Error parsing job row: {row_err}")
        else:
            logger.info(f"  - No jobs returned by JobSpy for '{role}' in '{location}'.")

    except Exception as e:
        logger.error(f"  ✗ JobSpy query error for '{role}' in '{location}': {e}")

    return jobs_found


def scrape_remoteok_jobs(job_roles: List[str], scraped_date: str) -> List[Dict[str, Any]]:
    """
    Fetches remote jobs from RemoteOK API matching the search roles.
    Includes proper User-Agent header as required by RemoteOK guidelines.
    """
    logger.info("🌐 Fetching remote opportunities from RemoteOK API...")
    url = "https://remoteok.com/api"
    headers = {
        "User-Agent": "JobAggregatorBot/1.0 (Personal Job Tracker; contact: candidate@workplace.local)",
        "Accept": "application/json"
    }

    try:
        response = requests.get(url, headers=headers, timeout=20)
        if response.status_code != 200:
            logger.warning(f"RemoteOK API returned HTTP {response.status_code}")
            return []

        data = response.json()
        if not isinstance(data, list):
            return []

        # First item in RemoteOK is usually API disclaimer metadata
        raw_jobs = [item for item in data if isinstance(item, dict) and "id" in item and "position" in item]
        logger.info(f"  ✓ Downloaded {len(raw_jobs)} total listings from RemoteOK. Matching configured roles...")

        matched_jobs: List[Dict[str, Any]] = []

        # Normalize keywords from job_roles
        normalized_roles = [r.lower().replace(".js", "").replace("developer", "").replace("software", "").strip() for r in job_roles]
        
        for job in raw_jobs:
            position = str(job.get("position") or "")
            tags = [str(t).lower() for t in job.get("tags", [])]
            company = str(job.get("company") or "Unknown Company")
            description = clean_html_text(str(job.get("description") or ""))
            apply_link = str(job.get("url") or f"https://remoteok.com/l/{job.get('id')}")

            # Match against configured roles
            matched_role = None
            pos_lower = position.lower()
            tags_text = " ".join(tags)

            for original_role, term in zip(job_roles, normalized_roles):
                tokens = term.split()
                if any(tok in pos_lower or tok in tags_text for tok in tokens if len(tok) > 2):
                    matched_role = original_role
                    break

            if matched_role:
                # Raw date posted
                date_posted = scraped_date
                raw_date = job.get("date")
                if raw_date:
                    try:
                        date_posted = str(raw_date)[:10]
                    except Exception:
                        date_posted = scraped_date

                job_id = generate_job_id(apply_link)
                job_dict = {
                    "id": job_id,
                    "title": position,
                    "company": company,
                    "location": str(job.get("location") or "Remote"),
                    "source_app": "RemoteOK",
                    "search_category": matched_role,
                    "apply_link": apply_link,
                    "description": description,
                    "date_posted": date_posted,
                    "scraped_date": scraped_date,
                    "is_applied": False,
                    "is_saved": False,
                }
                matched_jobs.append(job_dict)

        logger.info(f"  ✓ Found {len(matched_jobs)} RemoteOK jobs matching your roles.")
        return matched_jobs

    except Exception as e:
        logger.error(f"  ✗ Error querying RemoteOK API: {e}")
        return []


def push_jobs_to_firestore(db, jobs: List[Dict[str, Any]]) -> Dict[str, int]:
    """
    Pushes jobs to Firestore collection 'daily_jobs'.
    Preserves user 'is_applied' and 'is_saved' statuses if the job already exists!
    """
    stats = {"created": 0, "updated": 0, "failed": 0}
    if not jobs:
        return stats

    if not db:
        logger.info("Firestore client not configured. Skipping database push.")
        return stats

    collection_ref = db.collection("daily_jobs")
    logger.info(f"💾 Pushing {len(jobs)} jobs to Firestore collection 'daily_jobs'...")

    for job in jobs:
        doc_id = job["id"]
        doc_ref = collection_ref.document(doc_id)

        try:
            # Check if document already exists to preserve user interactions
            doc_snap = doc_ref.get()
            
            data_to_save = dict(job)
            data_to_save["timestamp"] = firestore.SERVER_TIMESTAMP

            if doc_snap.exists:
                existing_data = doc_snap.to_dict() or {}
                # Keep user-modified status flags
                data_to_save["is_applied"] = existing_data.get("is_applied", False)
                data_to_save["is_saved"] = existing_data.get("is_saved", False)
                # If already scraped earlier, we can keep original scraped_date or update
                if "scraped_date" in existing_data:
                    data_to_save["scraped_date"] = existing_data["scraped_date"]
                
                doc_ref.set(data_to_save, merge=True)
                stats["updated"] += 1
            else:
                doc_ref.set(data_to_save, merge=True)
                stats["created"] += 1

        except Exception as e:
            logger.error(f"Failed to save job {doc_id} ({job.get('title')}): {e}")
            stats["failed"] += 1

    return stats


def main():
    start_time = time.time()
    logger.info("=" * 60)
    logger.info("🚀 Personal Daily Job Aggregator & Tracker - Starting Run")
    logger.info("=" * 60)

    # 1. Connect to Firestore
    db = initialize_firebase()

    # 2. Load dynamic configuration (checks Firestore app_config/job_search_config first)
    try:
        config = load_job_config(db=db)
    except Exception as e:
        logger.error(f"Failed to load job configuration: {e}")
        sys.exit(1)

    job_roles = config.get("job_roles", [])
    locations = config.get("locations", ["Madurai, Tamil Nadu", "Chennai, Tamil Nadu", "Remote"])
    sites_to_scrape = config.get("sites_to_scrape", ["naukri", "indeed", "linkedin", "glassdoor"])
    hours_old = int(config.get("hours_old", 24))
    results_per_role = int(config.get("results_per_role", 25))

    # Lock scraped date stamp strictly to Indian Standard Time (IST)
    today_date = datetime.now(IST).strftime("%Y-%m-%d")
    logger.info(f"Scraped Date stamp (IST): {today_date}")

    all_scraped_jobs: List[Dict[str, Any]] = []
    seen_ids = set()

    # 3. Scrape jobs with python-jobspy across configured roles & locations
    for role in job_roles:
        logger.info(f"\n--- Processing Role: '{role}' ---")
        for loc in locations:
            # Skip redundant queries or query each location
            loc_jobs = scrape_jobspy_jobs(
                role=role,
                location=loc,
                sites=sites_to_scrape,
                results_wanted=results_per_role,
                hours_old=hours_old,
                scraped_date=today_date
            )

            for job in loc_jobs:
                if job["id"] not in seen_ids:
                    seen_ids.add(job["id"])
                    all_scraped_jobs.append(job)

            # Polite delay between location searches to prevent rate limits
            time.sleep(2)

    # 4. Scrape remote jobs from RemoteOK API
    remoteok_jobs = scrape_remoteok_jobs(job_roles, today_date)
    for job in remoteok_jobs:
        if job["id"] not in seen_ids:
            seen_ids.add(job["id"])
            all_scraped_jobs.append(job)

    logger.info("\n" + "=" * 60)
    logger.info(f"📊 Total unique jobs discovered today: {len(all_scraped_jobs)}")
    logger.info("=" * 60)

    # Breakdown by Source
    source_counts: Dict[str, int] = {}
    for j in all_scraped_jobs:
        src = j.get("source_app", "Unknown")
        source_counts[src] = source_counts.get(src, 0) + 1
    
    for src, count in source_counts.items():
        logger.info(f"  • {src}: {count} jobs")

    # 5. Push to Firestore
    if db:
        stats = push_jobs_to_firestore(db, all_scraped_jobs)
        logger.info(f"\nFirestore Push Summary: {stats['created']} new added, {stats['updated']} updated/merged, {stats['failed']} errors.")

        # Record synchronization status & timestamps for the frontend dashboard in IST
        try:
            now_ist = datetime.now(IST)
            now_iso = now_ist.isoformat()
            now_ist_str = now_ist.strftime("%I:%M %p")
            db.collection("app_config").document("sync_status").set({
                "last_synced_at": now_iso,
                "last_synced_time": f"{now_ist_str} IST",
                "last_synced_date": today_date,
                "total_jobs_scraped": len(all_scraped_jobs),
                "created_count": stats["created"],
                "updated_count": stats["updated"],
                "status": "success",
                "timezone": "IST (UTC+5:30)",
                "next_slots_ist": ["09:00 AM", "01:00 PM", "05:00 PM", "09:00 PM"]
            }, merge=True)
            logger.info(f"Recorded sync status in Firestore app_config/sync_status (IST Time: {now_ist_str} IST).")
        except Exception as sync_err:
            logger.warning(f"Failed to record sync status in Firestore: {sync_err}")
    else:
        # Fallback local preview file so user can review immediately
        preview_file = os.path.join(os.path.dirname(os.path.abspath(__file__)), "scraped_jobs_preview.json")
        with open(preview_file, "w", encoding="utf-8") as f:
            json.dump(all_scraped_jobs, f, indent=2, default=str)
        logger.info(f"Saved {len(all_scraped_jobs)} jobs locally to: {preview_file}")

    elapsed = round(time.time() - start_time, 2)
    logger.info(f"\n🎉 Scraper finished in {elapsed} seconds.")


if __name__ == "__main__":
    main()
