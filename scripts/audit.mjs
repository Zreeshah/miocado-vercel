import fs from "node:fs";
import path from "node:path";
import { URL } from "node:url";
const root = path.resolve("public");
const adsenseClient = "ca-pub-9104218233845530";
const adsenseLoader = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${adsenseClient}`;
const adsTxt = "google.com, pub-9104218233845530, DIRECT, f08c47fec0942fa0\n";
const pages = [];
function walk(dir) { for (const name of fs.readdirSync(dir)) { const p=path.join(dir,name); const s=fs.statSync(p); if(s.isDirectory()) walk(p); else if(name.endsWith(".html") && !p.includes(`${path.sep}wp-content${path.sep}`)) pages.push(p); } }
walk(root);
const failures=[]; const warnings=[];
for (const file of pages) { const t=fs.readFileSync(file,"utf8"); const rel=path.relative(root,file);
  if(!/<title>[\s\S]*?<\/title>/i.test(t)) failures.push(`${rel}: missing title`);
  if(!/rel=["']canonical["']/i.test(t)) failures.push(`${rel}: missing canonical`);
  for (const [label,pattern] of [["description",/name=["']description["']/i],["H1",/<h1\b/i],["schema",/application\/ld\+json/i]]) if(!pattern.test(t)) warnings.push(`${rel}: source has no ${label}`);
  if(/<img\b[^>]*(?:image-palceholder|data:image\/)/i.test(t)) failures.push(`${rel}: lazy image placeholder remains`);
  const head = t.match(/<head\b[^>]*>[\s\S]*?<\/head>/i)?.[0] ?? "";
  const loaders = [...t.matchAll(/<script\b[^>]*\bsrc=["']([^"']*pagead2\.googlesyndication\.com\/pagead\/js\/adsbygoogle\.js[^"']*)["'][^>]*><\/script>/gi)].map(m => m[1]);
  if (loaders.length !== 1 || loaders[0] !== adsenseLoader || !head.includes(adsenseLoader)) failures.push(`${rel}: must contain exactly one approved AdSense loader in head`);
  const publisherIds = [...t.matchAll(/(?:ca-)?pub-\d+/gi)].map(m => m[0].toLowerCase());
  if (publisherIds.some(id => id !== adsenseClient)) failures.push(`${rel}: contains unapproved AdSense publisher ID`);
  if (/monitag|quge5\.com|data-zone=["']197866["']/i.test(t)) failures.push(`${rel}: removed Monitag code remains`);
  for (const raw of [...t.matchAll(/(?:src|href)=["']([^"']+)["']/gi)].map(m=>m[1])) { try { const u=new URL(raw, "https://SOURCE.invalid/"); if(u.hostname!=="SOURCE.invalid" && !u.hostname.endsWith("socrates-gm.com") && !u.hostname.endsWith("myjdw.org") && !u.hostname.endsWith("miocado.co.uk") && !u.hostname.endsWith("myehtrip.us")) continue; if(!/\.(?:css|js|png|jpe?g|gif|svg|webp|ico|woff2?)(?:$|[?#])/i.test(u.pathname)) continue; const disk=path.join(root,u.pathname.replace(/^\//,"")); if(!fs.existsSync(disk)) warnings.push(`${rel}: external/origin asset not mirrored ${u.pathname}`); } catch {} }
}
for(const f of ["robots.txt","ads.txt","sitemap_index.xml"]) if(!fs.existsSync(path.join(root,f))) failures.push(`missing ${f}`);
const actualAdsTxt = fs.readFileSync(path.join(root, "ads.txt"), "utf8");
if (actualAdsTxt !== adsTxt) failures.push("ads.txt: must contain only the approved Google DIRECT entry");
if(failures.length){ console.error(failures.join("\n")); process.exit(1); }
console.log(`Static SEO audit passed: ${pages.length} page HTML files`);
if(warnings.length) console.log(`Source-preserved warnings: ${warnings.length}`);
