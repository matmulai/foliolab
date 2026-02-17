
/**
 * Redacts sensitive information from objects to prevent logging of secrets.
 *
 * @param data The object or value to redact
 * @returns A new object with sensitive values replaced by "[REDACTED]", or the original value if not an object
 */
export function redactSensitiveData(data: any): any {
  if (!data) return data;
  // Handle primitives (string, number, boolean, null, undefined)
  if (typeof data !== 'object') return data;

  if (Array.isArray(data)) {
    return data.map(item => redactSensitiveData(item));
  }

  // Handle Date objects and other non-plain objects if necessary,
  // but for JSON logging, usually we deal with plain objects.
  // If it's a Buffer, we might not want to traverse it, but JSON.stringify handles Buffers.

  const redacted: Record<string, any> = {};

  // List of keys that contain sensitive information
  // Using lower case for case-insensitive matching
  const SENSITIVE_KEYS = new Set([
    'accesstoken',
    'access_token',
    'refreshtoken',
    'refresh_token',
    'clientsecret',
    'client_secret',
    'password',
    'apppassword',
    'authorization',
    'token',
    'secret',
    'apikey',
    'api_key'
  ]);

  for (const key of Object.keys(data)) {
    const value = data[key];
    const lowerKey = key.toLowerCase();

    if (SENSITIVE_KEYS.has(lowerKey)) {
       redacted[key] = '[REDACTED]';
    } else {
       // Recursively redact
       redacted[key] = redactSensitiveData(value);
    }
  }

  return redacted;
}
