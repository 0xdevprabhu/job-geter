#!/usr/bin/env python3
"""
Traptip - All India & State Government Jobs, Exams, Admit Cards & Results Scraper
Scrapes official updates across ALL Indian States, Union Territories, Central Govt,
Banking, Railways, Defence & Police, extracts state & district information,
resolves direct official apply portals and PDF links, and syncs to Firestore.
"""

import os
import sys
import json
import time
import hashlib
import logging
import re
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List, Optional
from concurrent.futures import ThreadPoolExecutor
import requests
from bs4 import BeautifulSoup
from dotenv import load_dotenv

IST = timezone(timedelta(hours=5, minutes=30))
load_dotenv()

if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger("GovtScraper")

try:
    import firebase_admin
    from firebase_admin import credentials, firestore
    FIREBASE_AVAILABLE = True
except ImportError:
    FIREBASE_AVAILABLE = False
    logger.warning("firebase-admin not installed.")

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
}

EXCLUDED_DOMAINS = [
    "freejobalert", "play.google", "t.me", "telegram", "whatsapp",
    "facebook", "twitter", "instagram", "youtube", "linkedin", "pinterest"
]

ALL_STATES = [
    "All India", "Tamil Nadu", "Kerala", "Karnataka", "Andhra Pradesh",
    "Telangana", "Maharashtra", "Delhi", "Uttar Pradesh", "Bihar",
    "West Bengal", "Rajasthan", "Gujarat", "Madhya Pradesh", "Punjab",
    "Haryana", "Odisha", "Assam", "Jharkhand", "Chhattisgarh",
    "Uttarakhand", "Himachal Pradesh", "Jammu and Kashmir", "Goa",
    "Puducherry", "Chandigarh", "Tripura", "Meghalaya", "Manipur",
    "Nagaland", "Mizoram", "Arunachal Pradesh", "Sikkim",
    "Andaman and Nicobar", "Dadra and Nagar Haveli", "Daman and Diu", "Lakshadweep"
]

TN_DISTRICTS = [
    "Ariyalur", "Chengalpattu", "Chennai", "Coimbatore", "Cuddalore", "Dharmapuri",
    "Dindigul", "Erode", "Kallakurichi", "Kancheepuram", "Kanyakumari", "Karur",
    "Krishnagiri", "Madurai", "Mayiladuthurai", "Nagapattinam", "Namakkal", "Nilgiris",
    "Perambalur", "Pudukkottai", "Ramanathapuram", "Ranipet", "Salem", "Sivaganga",
    "Tenkasi", "Thanjavur", "Theni", "Thoothukudi", "Tiruchirappalli", "Trichy",
    "Tirunelveli", "Tirupathur", "Tiruppur", "Tiruvallur", "Tiruvannamalai",
    "Tiruvarur", "Vellore", "Viluppuram", "Virudhunagar"
]

OTHER_DISTRICTS = [
    "Bangalore", "Mysore", "Hubli", "Mangalore", "Belgaum",
    "Ernakulam", "Trivandrum", "Kochi", "Kozhikode", "Thrissur",
    "Hyderabad", "Warangal", "Visakhapatnam", "Vijayawada", "Guntur", "Tirupati",
    "Mumbai", "Pune", "Nagpur", "Thane", "Nashik", "Aurangabad",
    "Kolkata", "Howrah", "Patna", "Gaya", "Muzaffarpur",
    "Lucknow", "Kanpur", "Varanasi", "Prayagraj", "Noida", "Agra",
    "Jaipur", "Jodhpur", "Udaipur", "Kota", "Ahmedabad", "Surat", "Vadodara", "Rajkot",
    "Bhopal", "Indore", "Jabalpur", "Gwalior", "Bhubaneswar", "Cuttack", "Rourkela",
    "Guwahati", "Ranchi", "Jamshedpur", "Raipur", "Dehradun", "Shimla"
]


def initialize_firebase():
    if not FIREBASE_AVAILABLE:
        return None
    if firebase_admin._apps:
        return firestore.client()

    cred = None
    env_service_account = os.environ.get("FIREBASE_SERVICE_ACCOUNT")
    if env_service_account:
        env_service_account = env_service_account.strip()
        if env_service_account.startswith("{"):
            try:
                cred = credentials.Certificate(json.loads(env_service_account))
            except Exception:
                pass
        elif os.path.exists(env_service_account):
            cred = credentials.Certificate(env_service_account)

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
                    break
                except Exception:
                    pass

    if cred:
        try:
            firebase_admin.initialize_app(cred)
            return firestore.client()
        except Exception:
            return None
    return None


def normalize_key_part(value: str) -> str:
    return re.sub(r"\s+", " ", re.sub(r"[^\w\s]", "", (value or "").lower())).strip()


def generate_item_id(category: str, board: str, title: str, post_date: str) -> str:
    """Canonical deterministic ID independent of table state so Central/State duplicates merge."""
    key = f"{normalize_key_part(category)}_{normalize_key_part(board)}_{normalize_key_part(title)}_{normalize_key_part(post_date)}"
    return hashlib.md5(key.encode("utf-8")).hexdigest()


def detect_state(table_heading: str, board: str, title: str) -> str:
    """Matches table heading or keywords to an Indian state."""
    text = f"{table_heading} {board} {title}".lower()

    if "tamil nadu" in text or "tnpsc" in text or "chennai" in text or "trb" in text:
        return "Tamil Nadu"
    if "kerala" in text or "kpsc" in text or "kochi" in text:
        return "Kerala"
    if "karnataka" in text or "bangalore" in text or "kpsc" in table_heading.lower():
        return "Karnataka"
    if "andhra pradesh" in text or "appsc" in text:
        return "Andhra Pradesh"
    if "telangana" in text or "tspsc" in text:
        return "Telangana"
    if "maharashtra" in text or "mpsc" in text or "mumbai" in text or "pune" in text:
        return "Maharashtra"
    if "delhi" in text or "dsssb" in text:
        return "Delhi"
    if "uttar pradesh" in text or "upsssc" in text or "uppsc" in text:
        return "Uttar Pradesh"
    if "bihar" in text or "bpsc" in text:
        return "Bihar"
    if "west bengal" in text or "wbpsc" in text or "wbssc" in text or "kolkata" in text:
        return "West Bengal"
    if "rajasthan" in text or "rpsc" in text:
        return "Rajasthan"
    if "gujarat" in text or "gpsc" in text:
        return "Gujarat"
    if "madhya pradesh" in text or "mppsc" in text:
        return "Madhya Pradesh"
    if "punjab" in text or "ppsc" in text:
        return "Punjab"
    if "haryana" in text or "hpsc" in text:
        return "Haryana"
    if "odisha" in text or "opsc" in text:
        return "Odisha"
    if "assam" in text or "apsc" in text:
        return "Assam"
    if "jharkhand" in text or "jpsc" in text:
        return "Jharkhand"
    if "chhattisgarh" in text or "cgpsc" in text:
        return "Chhattisgarh"
    if "uttarakhand" in text or "ukpsc" in text:
        return "Uttarakhand"
    if "himachal pradesh" in text or "hppsc" in text:
        return "Himachal Pradesh"
    if "jammu and kashmir" in text or "jkssb" in text:
        return "Jammu and Kashmir"
    if "puducherry" in text or "pondicherry" in text:
        return "Puducherry"
    if "goa" in text:
        return "Goa"
    if "chandigarh" in text:
        return "Chandigarh"

    # Direct match from heading
    for st in ALL_STATES:
        if st.lower() in table_heading.lower():
            return st

    return "All India"


def detect_district(state: str, board: str, title: str) -> str:
    """Extracts district name if mentioned in board or title."""
    text = f"{board} {title}"
    if state == "Tamil Nadu":
        for d in TN_DISTRICTS:
            if re.search(r'\b' + re.escape(d) + r'\b', text, re.IGNORECASE):
                return d
    for d in OTHER_DISTRICTS:
        if re.search(r'\b' + re.escape(d) + r'\b', text, re.IGNORECASE):
            return d
    return ""


def detect_sector(board: str, title: str, state: str) -> str:
    text = f"{board} {title}".lower()
    if any(k in text for k in ["bank", "sbi", "rbi", "ibps", "nabard", "pnb", "lic", "gic", "insurance", "bob", "psb"]):
        return "Banking & Finance"
    if any(k in text for k in ["railway", "rrb", "rrc", "irctc", "metro"]):
        return "Railways"
    if any(k in text for k in ["police", "army", "navy", "air force", "cisf", "crpf", "bsf", "defence", "constable", "si recruitment", "guard"]):
        return "Defence & Police"
    if state == "Tamil Nadu" or any(k in text for k in ["tnpsc", "tamil nadu", "trb", "mrb", "tangedco", "aavin"]):
        return "Tamil Nadu Govt"
    if any(k in text for k in ["upsc", "ssc", "cgl", "chsl", "nda", "cds", "central govt"]):
        return "Central Govt / UPSC / SSC"
    if any(k in text for k in ["iocl", "ongc", "ntpc", "bel", "bhel", "drdo", "isro", "sail", "hal"]):
        return "PSU / Technical"
    if any(k in text for k in ["teacher", "teaching", "professor", "ugc", "net", "tet", "school"]):
        return "Teaching & Education"
    if state != "All India":
        return "State Govt"
    return "All India Govt"


def parse_date_to_iso(raw_date_str: str) -> str:
    if not raw_date_str:
        return ""
    clean = raw_date_str.strip().replace("/", "-")
    parts = clean.split("-")
    if len(parts) == 3:
        if len(parts[0]) == 2 and len(parts[2]) == 4:
            return f"{parts[2]}-{parts[1]}-{parts[0]}"
        elif len(parts[0]) == 4:
            return clean
    return raw_date_str


def calculate_job_status(last_date_iso: str, category: str) -> Dict[str, Any]:
    if category == "admit_card":
        return {"status": "Admit Card Out", "badge_color": "purple", "days_left": None}
    if category == "result":
        return {"status": "Result Declared", "badge_color": "emerald", "days_left": None}
    if category == "exam_date":
        return {"status": "Schedule Out", "badge_color": "blue", "days_left": None}

    if not last_date_iso:
        return {"status": "Application Open", "badge_color": "green", "days_left": None}

    try:
        today = datetime.now(IST).date()
        parts = [int(p) for p in last_date_iso.split("-")]
        if len(parts) == 3:
            end_date = datetime(parts[0], parts[1], parts[2]).date()
            diff_days = (end_date - today).days

            if diff_days < 0:
                return {"status": "Registration Closed", "badge_color": "gray", "days_left": -1}
            elif diff_days == 0:
                return {"status": "Closes Today!", "badge_color": "rose", "days_left": 0}
            elif diff_days <= 3:
                return {"status": f"Closes in {diff_days}d", "badge_color": "amber", "days_left": diff_days}
            else:
                return {"status": "Application Open", "badge_color": "green", "days_left": diff_days}
    except Exception:
        pass

    return {"status": "Application Open", "badge_color": "green", "days_left": None}


def extract_direct_govt_links(details_url: str) -> Dict[str, str]:
    res = {"apply_url": "", "pdf_url": "", "official_site": ""}
    if not details_url or not details_url.startswith("http"):
        return res

    try:
        r = requests.get(details_url, headers=HEADERS, timeout=6)
        if r.status_code != 200:
            return res

        soup = BeautifulSoup(r.text, "html.parser")

        for row in soup.find_all("tr"):
            row_text = row.get_text(" ", strip=True).lower()
            for a in row.find_all("a", href=True):
                href = a["href"].strip()
                link_text = a.get_text(" ", strip=True).lower()
                
                if not href.startswith("http") or any(b in href.lower() for b in EXCLUDED_DOMAINS):
                    continue

                if any(k in row_text or k in link_text for k in ["notification", "advertisement", "advt", "detailed advertisement", "pdf"]):
                    if not res["pdf_url"]:
                        res["pdf_url"] = href
                elif href.endswith(".pdf") and not res["pdf_url"]:
                    res["pdf_url"] = href

                if any(k in row_text or k in link_text for k in [
                    "apply online", "online application", "registration", "candidate login",
                    "admit card", "call letter", "hall ticket", "score card", "result",
                    "check result", "download admit", "exam date", "interview"
                ]):
                    if not res["apply_url"]:
                        res["apply_url"] = href

                if any(k in row_text or k in link_text for k in ["official website", "careers", "current opportunities", "department website"]):
                    if not res["official_site"]:
                        res["official_site"] = href

        if not res["apply_url"]:
            if res["official_site"]:
                res["apply_url"] = res["official_site"]
            elif res["pdf_url"]:
                res["apply_url"] = res["pdf_url"]
            else:
                for a in soup.find_all("a", href=True):
                    href = a["href"].strip()
                    if href.startswith("http") and not any(b in href.lower() for b in EXCLUDED_DOMAINS):
                        if any(dom in href.lower() for dom in [".gov.in", ".nic.in", "ibps", ".bank", ".ac.in", ".edu.in"]):
                            res["apply_url"] = href
                            break

    except Exception:
        pass

    if not res["apply_url"]:
        res["apply_url"] = details_url

    return res


def get_table_heading(table) -> str:
    prev = table.find_previous(["h1", "h2", "h3", "h4", "strong", "p", "b"])
    if prev:
        return prev.get_text(strip=True)
    return "All India"


def scrape_all_india_and_state_jobs(max_per_state: int = 5) -> List[Dict[str, Any]]:
    """Scrapes across Central, Banking, Railways, and ALL individual States equally."""
    logger.info("🔍 Scraping All India and State Govt Job Notifications...")
    url = "https://www.freejobalert.com/latest-notifications/"
    jobs = []

    try:
        r = requests.get(url, headers=HEADERS, timeout=12)
        if r.status_code != 200:
            return []

        soup = BeautifulSoup(r.text, "html.parser")
        tables = soup.find_all("table")

        for table in tables:
            heading = get_table_heading(table)
            rows = table.find_all("tr")
            if not rows or len(rows) < 2:
                continue

            header_text = [th.get_text(strip=True).lower() for th in rows[0].find_all(["th", "td"])]
            if not any("post date" in h for h in header_text):
                continue

            # Give priority: Tamil Nadu, Central, and large states get more jobs
            limit = 15 if "tamil nadu" in heading.lower() else (8 if any(k in heading.lower() for k in ["bank", "railway", "defence", "all india", "kerala", "karnataka"]) else max_per_state)

            state_count = 0
            for row in rows[1:]:
                cols = [td.get_text(" ", strip=True) for td in row.find_all(["td"])]
                links = [a["href"] for a in row.find_all("a", href=True)]
                
                if len(cols) >= 6 and cols[0] and re.search(r'\d{2}[/-]\d{2}[/-]\d{4}', cols[0]):
                    post_date_raw = cols[0]
                    board = cols[1]
                    raw_title = cols[2]
                    qualification = cols[3]
                    advt_no = cols[4]
                    last_date_raw = cols[5]
                    details_url = links[0] if links else ""

                    vacancies = ""
                    title = raw_title
                    vac_match = re.search(r'[–-]\s*(\d+[\d,]*\s*Posts?)', raw_title, re.IGNORECASE)
                    if vac_match:
                        vacancies = vac_match.group(1).strip()
                        title = re.sub(r'[–-]\s*\d+[\d,]*\s*Posts?', '', raw_title, flags=re.IGNORECASE).strip()

                    state = detect_state(heading, board, title)
                    district = detect_district(state, board, title)
                    sector = detect_sector(board, title, state)
                    post_date_iso = parse_date_to_iso(post_date_raw)
                    last_date_iso = parse_date_to_iso(last_date_raw)
                    status_info = calculate_job_status(last_date_iso, "job")
                    # Skip already expired postings so only active notifications enter the feed
                    if status_info["days_left"] is not None and status_info["days_left"] < 0:
                        continue
                    doc_id = generate_item_id("job", board, title, post_date_raw)

                    jobs.append({
                        "id": doc_id,
                        "category": "job",
                        "title": title,
                        "board": board,
                        "vacancies": vacancies,
                        "qualification": qualification,
                        "advt_no": advt_no if advt_no != "–" else "",
                        "post_date": post_date_raw,
                        "post_date_iso": post_date_iso,
                        "last_date": last_date_raw if last_date_raw != "–" else "",
                        "last_date_iso": last_date_iso,
                        "state": state,
                        "district": district,
                        "sector": sector,
                        "status": status_info["status"],
                        "badge_color": status_info["badge_color"],
                        "days_left": status_info["days_left"],
                        "details_url": details_url,
                        "apply_url": details_url,
                        "pdf_url": "",
                        "scraped_at": datetime.now(IST).isoformat(),
                    })

                    state_count += 1
                    if state_count >= limit:
                        break

        logger.info(f"✓ Found {len(jobs)} Govt Jobs across India and States.")
    except Exception as e:
        logger.error(f"Error scraping jobs: {e}")

    return jobs


def scrape_tabular_section(url: str, category: str, default_status: str, badge_color: str, max_items: int = 30) -> List[Dict[str, Any]]:
    items = []
    try:
        r = requests.get(url, headers=HEADERS, timeout=12)
        if r.status_code != 200:
            return []

        soup = BeautifulSoup(r.text, "html.parser")
        tables = soup.find_all("table")

        for table in tables:
            heading = get_table_heading(table)
            rows = table.find_all("tr")
            if not rows or len(rows) < 2:
                continue

            header_text = [th.get_text(strip=True).lower() for th in rows[0].find_all(["th", "td"])]
            if not any("post date" in h for h in header_text):
                continue

            for row in rows[1:]:
                cols = [td.get_text(" ", strip=True) for td in row.find_all(["td"])]
                links = [a["href"] for a in row.find_all("a", href=True)]

                if len(cols) >= 3 and cols[0] and cols[1]:
                    post_date_raw = cols[0].strip()
                    if not re.search(r'\d{2}[/-]\d{2}[/-]\d{4}', post_date_raw):
                        continue

                    board = cols[1].strip()
                    raw_title = cols[2].strip()
                    details_url = links[0] if links else ""

                    if not raw_title or not board:
                        continue

                    state = detect_state(heading, board, raw_title)
                    district = detect_district(state, board, raw_title)
                    sector = detect_sector(board, raw_title, state)
                    post_date_iso = parse_date_to_iso(post_date_raw)
                    doc_id = generate_item_id(category, board, raw_title, post_date_raw)

                    if category == "admit_card":
                        title = f"{board} {raw_title} Hall Ticket / Admit Card"
                        qual = "Admit Card Released"
                    elif category == "result":
                        title = f"{board} {raw_title} Result & Score Card"
                        qual = "Result Declared"
                    else:
                        title = f"{board} {raw_title} Exam Schedule"
                        qual = "Schedule Announced"

                    items.append({
                        "id": doc_id,
                        "category": category,
                        "title": title,
                        "board": board,
                        "vacancies": "",
                        "qualification": qual,
                        "advt_no": "",
                        "post_date": post_date_raw,
                        "post_date_iso": post_date_iso,
                        "last_date": "",
                        "last_date_iso": "",
                        "state": state,
                        "district": district,
                        "sector": sector,
                        "status": default_status,
                        "badge_color": badge_color,
                        "days_left": None,
                        "details_url": details_url,
                        "apply_url": details_url,
                        "pdf_url": "",
                        "scraped_at": datetime.now(IST).isoformat(),
                    })

                    if len(items) >= max_items:
                        break
            if len(items) >= max_items:
                break

    except Exception as e:
        logger.error(f"Error scraping {category}: {e}")

    return items


def enrich_item_links(item: Dict[str, Any]):
    details = item.get("details_url")
    if details:
        extracted = extract_direct_govt_links(details)
        if extracted.get("apply_url"):
            item["apply_url"] = extracted["apply_url"]
        if extracted.get("pdf_url"):
            item["pdf_url"] = extracted["pdf_url"]
        if extracted.get("official_site"):
            item["official_site"] = extracted["official_site"]


def enrich_all_items_with_direct_links(items: List[Dict[str, Any]], max_workers: int = 10):
    logger.info(f"🔗 Resolving direct official government portal links for {len(items)} items in parallel...")
    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        executor.map(enrich_item_links, items)
    logger.info("✓ Finished resolving direct links.")


def cleanup_expired_notifications(db, keep_active_ids: List[str]):
    """Purge notifications from Firestore that have passed their last date or are no longer active."""
    if not db:
        return
    try:
        col_ref = db.collection("govt_notifications")
        today_iso = datetime.now(IST).strftime("%Y-%m-%d")
        deleted_count = 0

        # Query all docs in govt_notifications to check expiration
        docs = col_ref.stream()
        for doc_snap in docs:
            data = doc_snap.to_dict()
            last_date_iso = data.get("last_date_iso")
            category = data.get("category", "job")
            doc_id = doc_snap.id

            # If it's a job and last date has passed, delete it
            should_delete = False
            if category == "job" and last_date_iso and last_date_iso < today_iso:
                should_delete = True
            
            # If item was scraped long ago (>45 days) for results/admit cards, cleanup stale ones
            post_date_iso = data.get("post_date_iso")
            if post_date_iso:
                try:
                    post_dt = datetime.strptime(post_date_iso[:10], "%Y-%m-%d")
                    now_dt = datetime.now()
                    if (now_dt - post_dt).days > 60:
                        should_delete = True
                except Exception:
                    pass

            if should_delete:
                doc_snap.reference.delete()
                deleted_count += 1

        if deleted_count > 0:
            logger.info(f"🧹 Cleaned up {deleted_count} expired/stale government notifications from Firestore.")
    except Exception as e:
        logger.warning(f"Could not run cleanup on expired notifications: {e}")


def push_to_firestore(db, items: List[Dict[str, Any]]) -> Dict[str, int]:
    stats = {"created": 0, "updated": 0, "failed": 0}
    if not db or not items:
        return stats

    col_ref = db.collection("govt_notifications")
    logger.info(f"💾 Syncing {len(items)} items to Firestore 'govt_notifications'...")

    for item in items:
        doc_id = item["id"]
        doc_ref = col_ref.document(doc_id)
        try:
            data = dict(item)
            data["updated_at"] = firestore.SERVER_TIMESTAMP
            doc_snap = doc_ref.get()
            if doc_snap.exists:
                doc_ref.set(data, merge=True)
                stats["updated"] += 1
            else:
                doc_ref.set(data, merge=True)
                stats["created"] += 1
        except Exception as e:
            logger.error(f"Error saving {doc_id}: {e}")
            stats["failed"] += 1

    try:
        sync_ref = db.collection("app_config").document("govt_sync_status")
        sync_ref.set({
            "last_synced_at": datetime.now(IST).isoformat(),
            "total_items": len(items),
            "jobs_count": sum(1 for i in items if i["category"] == "job"),
            "admit_cards_count": sum(1 for i in items if i["category"] == "admit_card"),
            "results_count": sum(1 for i in items if i["category"] == "result"),
            "exam_dates_count": sum(1 for i in items if i["category"] == "exam_date"),
            "status": "success",
        }, merge=True)
    except Exception:
        pass

    return stats


def save_local_preview(items: List[Dict[str, Any]]):
    base_dir = os.path.dirname(os.path.abspath(__file__))
    preview_path = os.path.join(base_dir, "scraped_govt_preview.json")
    try:
        with open(preview_path, "w", encoding="utf-8") as f:
            json.dump(items, f, indent=2, ensure_ascii=False)
        logger.info(f"💾 Saved local preview to {preview_path} ({len(items)} items)")

        frontend_src = os.path.join(base_dir, "..", "frontend-portal", "src", "scraped_govt_preview.json")
        frontend_dir = os.path.dirname(frontend_src)
        if os.path.exists(frontend_dir):
            with open(frontend_src, "w", encoding="utf-8") as f:
                json.dump(items, f, indent=2, ensure_ascii=False)
            logger.info(f"💾 Synced local preview to frontend: {frontend_src}")
    except Exception as e:
        logger.warning(f"Could not write local preview: {e}")


def main():
    start_time = time.time()
    logger.info("=====================================================")
    logger.info("🇮🇳 Starting Traptip Indian Government Jobs & Exams Scraper")
    logger.info("=====================================================")

    db = initialize_firebase()

    # Step 1: Scrape jobs across All India + States (Tamil Nadu, Kerala, Karnataka, Delhi, etc.)
    all_jobs = scrape_all_india_and_state_jobs(max_per_state=5)
    admit_cards = scrape_tabular_section("https://www.freejobalert.com/admit-card/", "admit_card", "Admit Card Out", "purple", max_items=25)
    results = scrape_tabular_section("https://www.freejobalert.com/exam-results/", "result", "Result Declared", "emerald", max_items=25)
    exam_dates = scrape_tabular_section("https://www.freejobalert.com/exam-dates/", "exam_date", "Schedule Out", "blue", max_items=25)

    all_items = all_jobs + admit_cards + results + exam_dates

    # Step 2: Parallel Resolution of direct official links
    enrich_all_items_with_direct_links(all_items, max_workers=10)

    # Step 3: Save local preview
    save_local_preview(all_items)

    # Step 4: Push to Firestore & Cleanup Expired
    if db:
        stats = push_to_firestore(db, all_items)
        logger.info(f"Database Sync Results: Created={stats['created']}, Updated={stats['updated']}, Failed={stats['failed']}")
        cleanup_expired_notifications(db, [it["id"] for it in all_items])

    elapsed = round(time.time() - start_time, 2)
    logger.info("=====================================================")
    logger.info(f"🎉 Scraping complete in {elapsed}s! Total items: {len(all_items)}")
    logger.info(f"   • Jobs: {len(all_jobs)}")
    logger.info(f"   • Admit Cards: {len(admit_cards)}")
    logger.info(f"   • Results: {len(results)}")
    logger.info(f"   • Exam Dates: {len(exam_dates)}")
    logger.info("=====================================================")


if __name__ == "__main__":
    main()
