export async function onRequestGet() {
  return Response.json({
    status: 'ok',
    mode: 'mock',
    cacheTTL: 30,
    timestamp: new Date().toISOString(),
  });
}
