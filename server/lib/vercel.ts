/**
 * Helper function to generate Vercel API headers.
 *
 * @param accessToken - The Vercel access token.
 * @param teamId - The optional Team ID.
 * @returns An object containing the Authorization header and optionally the X-Vercel-Team-Id header.
 */
export function getVercelHeaders(accessToken: string, teamId?: string) {
  return {
    'Authorization': `Bearer ${accessToken}`,
    ...(teamId ? { 'X-Vercel-Team-Id': teamId } : {})
  };
}
