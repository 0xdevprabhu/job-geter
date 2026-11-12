import admin from 'firebase-admin';

// Initialize Firebase Admin safely inside Vercel serverless functions
function initFirebase() {
  if (admin.apps.length > 0) return admin.firestore();

  const serviceAccountEnv = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (serviceAccountEnv) {
    try {
      const parsed = JSON.parse(serviceAccountEnv);
      admin.initializeApp({ credential: admin.credential.cert(parsed) });
      return admin.firestore();
    } catch (e) {
      console.warn('Could not parse FIREBASE_SERVICE_ACCOUNT for sitemap:', e);
    }
  }

  // Fallback to project defaults if env vars are present
  if (process.env.VITE_FIREBASE_PROJECT_ID) {
    try {
      admin.initializeApp({ projectId: process.env.VITE_FIREBASE_PROJECT_ID });
      return admin.firestore();
    } catch {}
  }

  return null;
}

function escapeXml(unsafe = '') {
  return String(unsafe).replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
      default: return c;
    }
  });
}

export default async function handler(req, res) {
  const baseUrl = 'https://job-geter.vercel.app';
  const todayIso = new Date().toISOString().split('T')[0];

  // 1. Core Evergreen High-Priority Landing Pages
  const staticRoutes = [
    { loc: `${baseUrl}/`, priority: '1.0', changefreq: 'hourly' },
    { loc: `${baseUrl}/?tab=govt`, priority: '0.95', changefreq: 'hourly' },
    { loc: `${baseUrl}/?tab=discover`, priority: '0.85', changefreq: 'daily' },
    { loc: `${baseUrl}/?tab=insights`, priority: '0.70', changefreq: 'daily' },
    // Popular State & Category URLs for organic search ranking
    { loc: `${baseUrl}/?state=Tamil+Nadu&tab=govt`, priority: '0.90', changefreq: 'daily' },
    { loc: `${baseUrl}/?state=All+India&tab=govt`, priority: '0.90', changefreq: 'daily' },
    { loc: `${baseUrl}/?state=Kerala&tab=govt`, priority: '0.80', changefreq: 'daily' },
    { loc: `${baseUrl}/?state=Karnataka&tab=govt`, priority: '0.80', changefreq: 'daily' },
    { loc: `${baseUrl}/?state=Delhi&tab=govt`, priority: '0.80', changefreq: 'daily' },
    { loc: `${baseUrl}/?state=Maharashtra&tab=govt`, priority: '0.80', changefreq: 'daily' },
    { loc: `${baseUrl}/?category=job&tab=govt`, priority: '0.90', changefreq: 'hourly' },
    { loc: `${baseUrl}/?category=admit_card&tab=govt`, priority: '0.85', changefreq: 'hourly' },
    { loc: `${baseUrl}/?category=result&tab=govt`, priority: '0.85', changefreq: 'hourly' },
    { loc: `${baseUrl}/?category=exam_date&tab=govt`, priority: '0.80', changefreq: 'hourly' },
  ];

  const dynamicUrls = [];

  try {
    const db = initFirebase();
    if (db) {
      // Fetch up to 150 active Govt notifications
      const govtSnap = await db
        .collection('govt_notifications')
        .orderBy('post_date_iso', 'desc')
        .limit(150)
        .get();

      govtSnap.forEach((doc) => {
        const d = doc.data();
        const postDate = d.post_date_iso || todayIso;
        dynamicUrls.push({
          loc: `${baseUrl}/?tab=govt&id=${encodeURIComponent(doc.id)}`,
          lastmod: postDate,
          priority: '0.8',
          changefreq: 'daily',
        });
      });

      // Fetch up to 150 active daily private jobs
      const jobsSnap = await db
        .collection('daily_jobs')
        .where('scraped_date', '==', todayIso)
        .limit(150)
        .get();

      jobsSnap.forEach((doc) => {
        dynamicUrls.push({
          loc: `${baseUrl}/?job=${encodeURIComponent(doc.id)}`,
          lastmod: todayIso,
          priority: '0.8',
          changefreq: 'daily',
        });
      });
    }
  } catch (err) {
    console.warn('Sitemap dynamic item query warning:', err.message);
  }

  const allUrls = [...staticRoutes.map((r) => ({ ...r, lastmod: todayIso })), ...dynamicUrls];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
${allUrls
  .map(
    (u) => `  <url>
    <loc>${escapeXml(u.loc)}</loc>
    <lastmod>${u.lastmod}</lastmod>
    <changefreq>${u.changefreq || 'daily'}</changefreq>
    <priority>${u.priority || '0.7'}</priority>
  </url>`
  )
  .join('\n')}
</urlset>`;

  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=7200');
  return res.status(200).send(xml);
}

