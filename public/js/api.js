export async function api(path, { method = 'GET', body, signal } = {}) {
  const options = {
    method,
    signal,
    credentials: 'same-origin',
  };
  if (method !== 'GET') {
    options.headers = { 'Content-Type': 'application/json' };
    options.body = JSON.stringify(body ?? {});
  }
  const response = await fetch(`/api${path}`, options);
  const result = await response.json();
  if (!response.ok)
    throw Object.assign(new Error(result.error.message), {
      status: response.status,
      code: result.error.code,
    });
  return result;
}

export function query(values) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) {
    for (const entry of Array.isArray(value) ? value : [value]) {
      if (entry !== '' && entry !== undefined) params.append(key, entry);
    }
  }
  return params.toString();
}
