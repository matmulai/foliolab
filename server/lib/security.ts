
/**
 * Safely stringifies a value for use in a <script> tag.
 * escapes <, >, and & to prevent XSS attacks when the JSON is embedded in HTML.
 */
export function safeJsonStringify(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}
