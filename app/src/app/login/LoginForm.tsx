'use client';

import React, { useActionState } from 'react';
import { Lock, ArrowRight, AlertCircle, Loader2 } from 'lucide-react';
import { loginAction, LoginActionResult } from '@/features/auth/actions';
import styles from './login.module.css';

interface LoginFormProps {
  returnTo?: string;
}

export const LoginForm: React.FC<LoginFormProps> = ({ returnTo = '/' }) => {
  const [state, formAction, isPending] = useActionState<LoginActionResult | null, FormData>(
    loginAction,
    null
  );

  return (
    <form action={formAction} className={styles.form} data-testid="login-form">
      <input type="hidden" name="returnTo" value={returnTo} />

      {state?.error && (
        <div className={styles.errorMessage} role="alert" data-testid="login-error">
          <AlertCircle size={16} aria-hidden="true" style={{ flexShrink: 0 }} />
          <span>{state.error}</span>
        </div>
      )}

      <div className={styles.fieldGroup}>
        <label htmlFor="passcode" className={styles.label}>
          Código de Acceso
        </label>
        <div className={styles.inputWrapper}>
          <Lock size={16} className={styles.inputIcon} aria-hidden="true" />
          <input
            id="passcode"
            name="passcode"
            type="password"
            autoComplete="current-password"
            autoFocus
            required
            placeholder="Ingrese su clave"
            className={styles.input}
            disabled={isPending}
            data-testid="passcode-input"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={isPending}
        className={styles.submitBtn}
        data-testid="login-submit-btn"
      >
        {isPending ? (
          <>
            <Loader2 size={16} className="animate-spin" aria-hidden="true" />
            <span>Verificando...</span>
          </>
        ) : (
          <>
            <span>Ingresar a Atilio</span>
            <ArrowRight size={16} aria-hidden="true" />
          </>
        )}
      </button>
    </form>
  );
};
