// Shared settings for the public website pages (ported from dev.skooljobs.com).

// Images that were uploaded to the WordPress media library. They are loaded from
// the WordPress uploads folder by default. Run `npm run site:assets` to copy them
// into public/site-assets/, then set VITE_SITE_MEDIA_BASE=/site-assets so the app
// serves its own copies.
export const SITE_MEDIA_BASE = (
  import.meta.env.VITE_SITE_MEDIA_BASE || "https://dev.skooljobs.com/wp-content/uploads"
).replace(/\/+$/, "");

export const media = (path) => `${SITE_MEDIA_BASE}/${path}`;

export const SITE_IMAGES = {
  logo: media("2026/05/400dpiLogoCropped.png"),
  partnerLogos: [
    "2021/05/site-logo.svg",
    "2021/05/logo-20.svg",
    "2021/05/logo-21.svg",
    "2021/05/logo-18.svg",
    "2021/05/logo-3.svg",
    "2021/05/logo-22.svg",
    "2021/05/logo-2.svg",
  ].map(media),
  resumeTemplates: [
    "2026/05/Purple-Modern-Teacher-Resume",
    "2026/05/White-and-Blue-Clean-Lines-Teacher-Resume",
    "2026/05/Blue-and-White-Clean-Professional-A4-Resume",
    "2026/05/Black-and-White-Clean-Professional-A4-Resume",
    "2026/05/Light-Blue-Simple-Professional-Resume-for-Accountant",
  ].map((p) => ({ thumb: media(`${p}-212x300.jpg`), full: media(`${p}.jpg`) })),
  jdFaq: media("2026/05/pexels-photo-11572425-11572425-scaled.jpg"),
};

// Stock photos the website already loads from Unsplash.
export const unsplash = (id, width = 1200) =>
  `https://images.unsplash.com/photo-${id}?q=80&w=${width}&auto=format&fit=crop`;

export const CONTACT_INFO = {
  phone: "+91 7 467 134-984",
  phoneHref: "tel:+917467134984",
  email: "hello@skooljobs.com",
  address: "Delhi, India",
};

export const SOCIAL_LINKS = [
  { label: "Facebook", short: "f", href: "#" },
  { label: "Instagram", short: "ig", href: "#" },
  { label: "X (Twitter)", short: "X", href: "#" },
  { label: "LinkedIn", short: "in", href: "#" },
];

export const NAV_LINKS = [
  { label: "Home", to: "/", end: true },
  { label: "Job", to: "/jobs" },
  { label: "Services", to: "/services" },
  { label: "Blog", to: "/blog" },
  { label: "About Us", to: "/about" },
  { label: "Contact", to: "/contact" },
];

export const FOOTER_COLUMNS = [
  {
    title: "Explore",
    links: [
      { label: "About Us", to: "/about" },
      { label: "Service", to: "/services" },
      { label: "Contact", to: "/contact" },
    ],
  },
  {
    title: "Tools",
    links: [
      { label: "Resume Builder", to: "/resume-builder" },
      { label: "JD Builder", to: "/jd-builder" },
    ],
  },
];

// In-app routes the website buttons lead to.
export const APP_LINKS = {
  login: "/login",
  signup: "/signup",
  jobs: "/jobs",
  postVacancy: "/signup",
  registerTeacher: "/signup",
};

export const SITE_TAGLINE =
  "Built exclusively for the education sector, SkoolJobs connects schools with the right talent and empowers educators to grow their careers, all on one trusted platform.";
