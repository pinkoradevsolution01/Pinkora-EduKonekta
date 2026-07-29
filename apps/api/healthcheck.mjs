try {
  const response = await fetch('http://127.0.0.1:4000/api/v1/health');
  const body = await response.json();
  process.exit(response.ok && body.status === 'ok' && body.database === 'up' ? 0 : 1);
} catch {
  process.exit(1);
}
