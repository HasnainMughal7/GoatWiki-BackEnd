import ftp from 'basic-ftp';
import fs from 'fs';
import { getAllForNavAndAP } from './database.js';
import dotenv from 'dotenv'


dotenv.config()

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
    const dynamicRoutes = PostsArray.map(post => `/Post/${post.metaPermalink}`);

    const allRoutes = [...staticRoutes, ...dynamicRoutes];

    const xmlHeader = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;
    const xmlFooter = `</urlset>`;

    const urls = allRoutes.map(route => {
      return `<url>\n  <loc>${baseUrl.replace(/\/$/, '')}/${route.replace(/^\//, '')}</loc>\n</url>`;
    }).join('\n');

    const sitemapContent = xmlHeader + urls + '\n' + xmlFooter;

    fs.writeFileSync('sitemap.xml', sitemapContent);

    // Now upload to Hostinger
    const response = await uploadToHostinger();
    return response
  } catch (err) {
    console.error(err);
    return false
  }
}

// Function to upload sitemap.xml to Hostinger via FTP
async function uploadToHostinger() {
  const client = new ftp.Client();
  client.ftp.verbose = true;

  try {
    await client.access({
      host: process.env.FTP_HOST,
      user: process.env.FTP_USER,
      password: process.env.FTP_PASS,
      port: 21,
      secure: false
    })

    await client.uploadFrom('sitemap.xml', '/public_html/sitemap.xml')
    return true
  } catch (err) {
    console.error('❌ FTP Upload Error:', err);
    return false
  } finally {
    client.close();
  }
}