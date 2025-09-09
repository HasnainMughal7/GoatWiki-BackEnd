import ftp from 'basic-ftp';
import fs from 'fs';
import { getAllForNavAndAP } from './database.js';
import dotenv from 'dotenv';

dotenv.config();

export async function generateSitemap() {
  const baseUrl = 'https://goatwiki.com';
  const PostsArray = await getAllForNavAndAP();

  const staticRoutes = [
    '/',
    '/About',
    '/KikoGoats',
    '/SpanishGoats',
    '/BoerGoats',
    '/NigerianDwarfGoats',
    '/DamascusGoats',
    '/PrivacyPolicy',
    '/TermsConditions',
  ];

  try {
    // Prepare dynamic routes with lastmod
    const dynamicRoutes = PostsArray.map(post => {
      const lastModified = new Date(post.PublishingDate).toISOString().split('T')[0]; // Format: YYYY-MM-DD
      return `
        <url>
          <loc>${baseUrl}/Post/${post.metaPermalink}</loc>
          <lastmod>${lastModified}</lastmod>
        </url>`;
    });

    // Prepare static routes without lastmod
    const staticRouteUrls = staticRoutes.map(route => `
      <url>
        <loc>${baseUrl.replace(/\/$/, '')}/${route.replace(/^\//, '')}</loc>
      </url>`);

    const xmlHeader = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;
    const xmlFooter = `</urlset>`;

    // Combine static and dynamic routes
    const sitemapContent = xmlHeader + [...staticRouteUrls, ...dynamicRoutes].join('\n') + xmlFooter;

    // Save the sitemap file
    fs.writeFileSync('sitemap.xml', sitemapContent);

    // Upload to Hostinger
    const response = await uploadToHostinger();
    return response;
  } catch (err) {
    console.error(err);
    return false;
  }
}

// Function to upload sitemap.xml to Hostinger via FTP
// async function uploadToHostinger() {
//   const client = new ftp.Client();
//   client.ftp.verbose = true;

//   try {
//     await client.access({
//       host: process.env.FTP_HOST,
//       user: process.env.FTP_USER,
//       password: process.env.FTP_PASS,
//       port: 21,
//       secure: false,
//     });

//     await client.uploadFrom('sitemap.xml', '/public_html/sitemap.xml');
//     return true;
//   } catch (err) {
//     console.error('❌ FTP Upload Error:', err);
//     return false;
//   } finally {
//     client.close();
//   }
// }
