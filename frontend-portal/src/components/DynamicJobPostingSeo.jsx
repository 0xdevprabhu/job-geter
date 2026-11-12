import React, { useEffect } from 'react';

/**
 * Injects Google for Jobs (schema.org/JobPosting) Structured Data (JSON-LD)
 * into <head> dynamically so Google can feature jobs in the Google Jobs Widget
 * and Google Search Rich Results.
 */
export default function DynamicJobPostingSeo({ jobs = [], govtItems = [], activeNav = 'dashboard' }) {
  useEffect(() => {
    const existingScript = document.getElementById('zipzap-dynamic-job-schema');
    if (existingScript) {
      existingScript.remove();
    }

    const jobPostings = [];

    // 1. Process Private Jobs (up to 25 top jobs)
    if (activeNav === 'dashboard' || activeNav === 'discover') {
      const topJobs = jobs.slice(0, 25);
      topJobs.forEach((j) => {
        if (!j || !j.title) return;
        const validThroughDate = new Date();
        validThroughDate.setDate(validThroughDate.getDate() + 30);

        jobPostings.push({
          '@type': 'JobPosting',
          title: j.title,
          description: j.description || `${j.title} opening at ${j.company || 'Hiring Company'} in ${j.location || 'India'}. Apply directly on ZipZap Jobs.`,
          identifier: {
            '@type': 'PropertyValue',
            name: j.company || 'ZipZap Jobs',
            value: String(j.id || ''),
          },
          datePosted: j.date_posted || j.scraped_date || new Date().toISOString().split('T')[0],
          validThrough: validThroughDate.toISOString(),
          employmentType: (j.job_type || 'FULL_TIME').toUpperCase().replace(/\s+/g, '_'),
          hiringOrganization: {
            '@type': 'Organization',
            name: j.company || 'Confidential Employer',
            sameAs: 'https://job-geter.vercel.app/',
          },
          jobLocation: {
            '@type': 'Place',
            address: {
              '@type': 'PostalAddress',
              addressLocality: j.location || 'India',
              addressCountry: 'IN',
            },
          },
          directApply: true,
          url: j.job_url || 'https://job-geter.vercel.app/',
        });
      });
    }

    // 2. Process Government Jobs (up to 25 top notifications)
    if (activeNav === 'govt' || activeNav === 'dashboard') {
      const topGovt = govtItems.slice(0, 25);
      topGovt.forEach((g) => {
        if (!g || !g.title) return;
        let validDate = g.last_date_iso;
        if (!validDate) {
          const dt = new Date();
          dt.setDate(dt.getDate() + 30);
          validDate = dt.toISOString().split('T')[0];
        }

        jobPostings.push({
          '@type': 'JobPosting',
          title: `${g.board ? g.board + ' - ' : ''}${g.title}`,
          description: `Official Government Notification: ${g.title} by ${g.board || 'Govt of India'}. Qualification required: ${g.qualification || 'As per norms'}. State: ${g.state || 'All India'}. Check notification details and apply directly.`,
          identifier: {
            '@type': 'PropertyValue',
            name: g.board || 'Government of India',
            value: String(g.id || ''),
          },
          datePosted: g.post_date_iso || new Date().toISOString().split('T')[0],
          validThrough: validDate,
          employmentType: 'FULL_TIME',
          hiringOrganization: {
            '@type': 'Organization',
            name: g.board || 'Government of India',
            sameAs: g.official_site || 'https://job-geter.vercel.app/?tab=govt',
          },
          jobLocation: {
            '@type': 'Place',
            address: {
              '@type': 'PostalAddress',
              addressLocality: g.district || g.state || 'India',
              addressRegion: g.state || 'India',
              addressCountry: 'IN',
            },
          },
          directApply: true,
          url: g.apply_url || g.details_url || 'https://job-geter.vercel.app/?tab=govt',
        });
      });
    }

    if (jobPostings.length === 0) return;

    const schemaData = {
      '@context': 'https://schema.org',
      '@graph': jobPostings,
    };

    const script = document.createElement('script');
    script.id = 'zipzap-dynamic-job-schema';
    script.type = 'application/ld+json';
    script.innerHTML = JSON.stringify(schemaData);
    document.head.appendChild(script);

    return () => {
      const s = document.getElementById('zipzap-dynamic-job-schema');
      if (s) s.remove();
    };
  }, [jobs, govtItems, activeNav]);

  return null;
}

