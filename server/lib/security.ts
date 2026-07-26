
/**
 * Safely stringifies a value for use in a <script> tag.
 * escapes <, >, and & to prevent XSS attacks when the JSON is embedded in HTML.
 */
export function safeJsonStringify(value: unknown): string {
  const json = JSON.stringify(value) ?? 'null';
  return json
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

/**
 * Recursively masks sensitive fields from objects or arrays.
 */
export function redactSensitiveData(data: any): any {
  if (data === null || data === undefined) {
    return data;
  }

  if (data instanceof Date) {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map(item => redactSensitiveData(item));
  }

  if (Object.prototype.toString.call(data) === '[object Object]') {
    const redacted: Record<string, any> = {};
    const sensitiveKeys = ['accesstoken', 'token', 'apikey', 'password', 'email', 'authorization'];

    for (const [key, value] of Object.entries(data)) {
      if (sensitiveKeys.includes(key.toLowerCase()) || sensitiveKeys.some(k => key.toLowerCase().includes(k))) {
        redacted[key] = '[REDACTED]';
      } else {
        redacted[key] = redactSensitiveData(value);
      }
    }
    return redacted;
  }

  return data;
}
