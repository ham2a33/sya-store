export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;
  if (process.env.NODE_ENV !== 'production' || process.env.NEXT_PHASE === 'phase-production-build') return;

  const { synchronizeCatalogOnce } = await import('./lib/catalog-sync');
  await synchronizeCatalogOnce();
}
