// Copies the website's WordPress media (logo, partner logos, blog photos, resume
// templates) into public/site-assets/ so the app can serve its own copies.
//
//   npm run site:assets
//   then build with VITE_SITE_MEDIA_BASE=/site-assets
//
// Source defaults to the dev site; override with SITE_MEDIA_SOURCE=<uploads URL>.
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import process from "node:process";

const SOURCE = (process.env.SITE_MEDIA_SOURCE || "https://dev.skooljobs.com/wp-content/uploads").replace(/\/+$/, "");
const TARGET = join(process.cwd(), "public", "site-assets");

const templates = [
  "2026/05/Purple-Modern-Teacher-Resume",
  "2026/05/White-and-Blue-Clean-Lines-Teacher-Resume",
  "2026/05/Blue-and-White-Clean-Professional-A4-Resume",
  "2026/05/Black-and-White-Clean-Professional-A4-Resume",
  "2026/05/Light-Blue-Simple-Professional-Resume-for-Accountant",
];
const blogPhotos = [
  "2026/05/pexels-photo-12758782-12758782",
  "2026/05/pexels-photo-36781271-36781271",
  "2026/05/pexels-photo-35552523-35552523",
];

const FILES = [
  "2026/05/400dpiLogoCropped.png",
  "2021/05/site-logo.svg",
  "2021/05/logo-20.svg",
  "2021/05/logo-21.svg",
  "2021/05/logo-18.svg",
  "2021/05/logo-3.svg",
  "2021/05/logo-22.svg",
  "2021/05/logo-2.svg",
  "2026/05/pexels-photo-11572425-11572425-scaled.jpg",
  ...templates.flatMap((t) => [`${t}.jpg`, `${t}-212x300.jpg`]),
  ...blogPhotos.map((p) => `${p}-150x150.jpg`),
  "2026/05/pexels-photo-12758782-12758782-683x1024.jpg",
  "2026/05/pexels-photo-36781271-36781271-1024x683.jpg",
  "2026/05/pexels-photo-35552523-35552523-1024x683.jpg",
];

let failed = 0;
for (const file of FILES) {
  const url = `${SOURCE}/${file}`;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const out = join(TARGET, file);
    await mkdir(dirname(out), { recursive: true });
    await writeFile(out, Buffer.from(await res.arrayBuffer()));
    console.log(`✓ ${file}`);
  } catch (err) {
    failed += 1;
    console.error(`✗ ${file} (${err.message})`);
  }
}

console.log(`\n${FILES.length - failed}/${FILES.length} files saved to public/site-assets/`);
if (failed) process.exitCode = 1;
else console.log("Build with VITE_SITE_MEDIA_BASE=/site-assets to use them.");
