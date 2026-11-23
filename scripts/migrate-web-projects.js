// Migra los proyectos de la web (proyectos-actuales.json) a `projects/{id}.web`.
//
//   node scripts/migrate-web-projects.js <proyectos-actuales.json> [--images <carpeta>] [--apply]
//
// Sin --apply solo muestra qué haría (dry-run). Usa credenciales ADC del proyecto encuadre-prod
// (gcloud auth application-default login). Vincula por nombre a un proyecto existente o crea uno nuevo.
// --images: carpeta con estas-hero.png, estas-logo.png, verde-hero.png, verde-logo.svg, pose-hero.jpg, pose-logo.svg
//           (public/assets/projects/ del repo de la web). Se suben tal cual; conviene volver a subir
//           la foto desde el panel para obtener el WebP de 2400 px y la miniatura.
const fs = require('fs');
const path = require('path');
const { initializeApp, applicationDefault } = require('../functions/node_modules/firebase-admin/app');
const { getFirestore, FieldValue } = require('../functions/node_modules/firebase-admin/firestore');
const { getStorage } = require('../functions/node_modules/firebase-admin/storage');

const args = process.argv.slice(2);
const file = args.find((a) => !a.startsWith('--') && a.endsWith('.json'));
const apply = args.includes('--apply');
const imagesDir = args.includes('--images') ? args[args.indexOf('--images') + 1] : null;
if (!file) { console.error('Uso: node scripts/migrate-web-projects.js <proyectos-actuales.json> [--images <carpeta>] [--apply]'); process.exit(1); }

initializeApp({ credential: applicationDefault(), projectId: 'encuadre-prod', storageBucket: process.env.FIREBASE_STORAGE_BUCKET || 'encuadre-prod.firebasestorage.app' });
const db = getFirestore();
const bucket = getStorage().bucket();
const MIME = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml', '.webp': 'image/webp' };

const norm = (s) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');

async function uploadImage(projectId, webPath, name) {
  if (!webPath || !imagesDir) return undefined;
  const local = path.join(imagesDir, path.basename(webPath));
  if (!fs.existsSync(local)) { console.warn(`  ! falta ${local}`); return undefined; }
  const dest = `web/projects/${projectId}/${name}${path.extname(local).toLowerCase()}`;
  if (apply) await bucket.upload(local, { destination: dest, metadata: { contentType: MIME[path.extname(local).toLowerCase()], cacheControl: 'public,max-age=300' } });
  console.log(`  ${apply ? 'subido' : 'subiría'} ${local} -> ${dest}`);
  return dest;
}

(async () => {
  const items = JSON.parse(fs.readFileSync(file, 'utf8'));
  const existing = (await db.collection('projects').get()).docs.filter((d) => d.data().deleted !== true);
  for (const item of items) {
    const { hero, logo, ...web } = item;
    const match = existing.find((d) => norm(String(d.data().name || '')) === norm(item.title) || norm(String(d.data().name || '')) === norm(item.slug));
    console.log(`\n${item.title}: ${match ? `vincula a ${match.id}` : 'crea proyecto nuevo'}`);
    const ref = match ? match.ref : db.collection('projects').doc();
    const heroPath = await uploadImage(ref.id, hero, 'hero');
    const logoPath = await uploadImage(ref.id, logo, 'logo');
    const data = { ...web, creditsSource: 'manual', ...(heroPath && { heroPath }), ...(logoPath && { logoPath }), updatedAt: FieldValue.serverTimestamp() };
    if (!apply) { console.log('  web =', Object.keys(data).join(', ')); continue; }
    if (match) await ref.update({ web: data, updatedAt: FieldValue.serverTimestamp() });
    else await ref.set({ name: item.title, description: item.summary, type: 'film', status: 'draft', startDate: FieldValue.serverTimestamp(), responsibleId: '', tags: [], metadata: {}, createdBy: 'web-migration', createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp(), web: data });
    console.log('  listo');
  }
  console.log(apply ? '\nMigración aplicada.' : '\nDry-run terminado. Repite con --apply para escribir.');
})().catch((e) => { console.error(e); process.exit(1); });
