'use server';

import { redirect } from 'next/navigation';
import {
  verifyPasscode,
  createSessionToken,
  setSessionCookie,
  clearSessionCookie,
} from '@/core/application/auth/session';

export interface LoginActionResult {
  success: boolean;
  error?: string;
}

/**
 * Server Action to authenticate human user with passcode
 */
export async function loginAction(
  _prevState: LoginActionResult | null,
  formData: FormData
): Promise<LoginActionResult> {
  const passcode = (formData.get('passcode') as string) || '';
  const returnTo = (formData.get('returnTo') as string) || '/';

  if (!passcode || passcode.trim().length === 0) {
    return {
      success: false,
      error: 'Por favor, ingrese el código de acceso.',
    };
  }

  const isValid = await verifyPasscode(passcode);
  if (!isValid) {
    return {
      success: false,
      error: 'Código de acceso incorrecto.',
    };
  }

  const token = await createSessionToken();
  await setSessionCookie(token);

  // Safe redirect path validation: must start with single slash, not double slash or external URL
  let target = returnTo.startsWith('/') && !returnTo.startsWith('//') ? returnTo : '/';
  if (target === '/login') {
    target = '/';
  }

  redirect(target);
}

/**
 * Server Action to log out and remove session
 */
export async function logoutAction(): Promise<void> {
  await clearSessionCookie();
  redirect('/login');
}
