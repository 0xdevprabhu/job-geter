import scrapedPreview from './scraped_govt_preview.json';

export const getFallbackGovtData = () => {
  if (Array.isArray(scrapedPreview) && scrapedPreview.length > 0) {
    return scrapedPreview;
  }

  // Backup mock data if preview is ever empty
  return [
    {
      id: "indian-bank-apprentices-2026",
      category: "job",
      title: "Engagement of Apprentices for FY 2026-27",
      board: "Indian Bank",
      vacancies: "1,500 Posts",
      qualification: "Any Graduate in Any Discipline",
      advt_no: "IB/HR/APPR/2026",
      post_date: "06/11/2026",
      post_date_iso: "2026-11-06",
      last_date: "25-11-2026",
      last_date_iso: "2026-11-25",
      sector: "Banking & Finance",
      status: "Application Open",
      badge_color: "green",
      days_left: 16,
      details_url: "https://indianbank.bank.in",
      apply_url: "https://ibpsreg.ibps.in/inbraoct26/",
      pdf_url: "https://indianbank.bank.in/notification.pdf"
    },
    {
      id: "ssc-cgl-2026",
      category: "job",
      title: "Combined Graduate Level (CGL) Examination 2026",
      board: "Staff Selection Commission (SSC)",
      vacancies: "14,500 Posts",
      qualification: "Bachelor's Degree from a recognized University",
      advt_no: "HQ-PPII03(02)/2026",
      post_date: "04/11/2026",
      post_date_iso: "2026-11-04",
      last_date: "18-11-2026",
      last_date_iso: "2026-11-18",
      sector: "Central Govt / UPSC / SSC",
      status: "Closing Soon ⏳",
      badge_color: "amber",
      days_left: 9,
      details_url: "https://ssc.gov.in",
      apply_url: "https://ssc.gov.in/apply",
      pdf_url: "https://ssc.gov.in/notice_cgl2026.pdf"
    },
    {
      id: "tnpsc-group-4-2026",
      category: "job",
      title: "Combined Civil Services Examination (Group IV)",
      board: "TNPSC (Tamil Nadu)",
      vacancies: "8,932 Posts",
      qualification: "10th / SSLC Pass or Equivalent",
      advt_no: "01/2026-TNPSC",
      post_date: "01/11/2026",
      post_date_iso: "2026-11-01",
      last_date: "30-11-2026",
      last_date_iso: "2026-11-30",
      sector: "Tamil Nadu Govt",
      status: "Application Open",
      badge_color: "green",
      days_left: 21,
      details_url: "https://www.tnpsc.gov.in",
      apply_url: "https://apply.tnpscexams.in",
      pdf_url: "https://www.tnpsc.gov.in/document/group4.pdf"
    },
    {
      id: "rrb-alp-cbt1-admit-card",
      category: "admit_card",
      title: "Assistant Loco Pilot (ALP) CBT-1 Admit Card & Exam City Slip",
      board: "Railway Recruitment Board (RRB)",
      vacancies: "",
      qualification: "Admit Card Released",
      advt_no: "CEN 01/2026",
      post_date: "05/11/2026",
      post_date_iso: "2026-11-05",
      last_date: "",
      last_date_iso: "",
      sector: "Railways",
      status: "Admit Card Out",
      badge_color: "purple",
      days_left: null,
      details_url: "https://rrbcdg.gov.in",
      apply_url: "https://rrbapply.gov.in/#/auth/login",
      pdf_url: ""
    },
    {
      id: "rbi-attendant-scorecard-2026",
      category: "result",
      title: "RBI Bank Office Attendant Final Result & Cut-Off Score Card",
      board: "Reserve Bank of India (RBI)",
      vacancies: "",
      qualification: "Result Declared",
      advt_no: "RBI/2026/ATT",
      post_date: "04/11/2026",
      post_date_iso: "2026-11-04",
      last_date: "",
      last_date_iso: "",
      sector: "Banking & Finance",
      status: "Result Declared",
      badge_color: "emerald",
      days_left: null,
      details_url: "https://opportunities.rbi.org.in",
      apply_url: "https://ibpsreg.ibps.in/rbioct26/",
      pdf_url: "https://rbidocs.rbi.org.in/cut_off_2026.pdf"
    }
  ];
};

