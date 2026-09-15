import { BrowserContext } from '@playwright/test';
import { createSessionToken, SESSION_COOKIE_NAME, getAuthSecret } from '../../src/core/application/auth/session';

export async function authenticateContext(context: BrowserContext, baseURL: string = 'http://localhost:3000') {
  const secret = getAuthSecret();
  const token = await createSessionToken(secret);
  
  const url = new URL(baseURL);
  
  await context.addCookies([
    {
      name: SESSION_COOKIE_NAME,
      value: token,
      domain: url.hostname,
      path: '/',
      httpOnly: true,
      secure: false,
      sameSite: 'Lax',
    },
  ]);
}
