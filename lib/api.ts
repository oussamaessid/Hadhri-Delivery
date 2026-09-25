const unavailable = 'Le service est temporairement indisponible. Réessayez dans quelques instants.';

export async function requestJson<T>(url: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  if (!headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  let response: Response;
  let body: string;
  try {
    response = await fetch(url, {...options, headers});
    body = await response.text();
  } catch (error) {
    if (options.signal?.aborted) throw error;
    throw new Error('Connexion au service impossible. Vérifiez votre connexion puis réessayez.');
  }
  if (response.status === 204) return undefined as T;
  let value: unknown;
  try {
    value = JSON.parse(body);
  } catch {
    throw new Error(response.ok
      ? 'La réponse du service est invalide. Veuillez réessayer.'
      : unavailable);
  }
  if (!response.ok) {
    const message = value && typeof value === 'object' && 'error' in value
      && typeof value.error === 'string' ? value.error : undefined;
    throw new Error(message || unavailable);
  }
  return value as T;
}
