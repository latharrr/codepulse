'use client';

import { isValidRegno, LPU_REGNO_CONFIG } from '@codepulse/types';
import { useEffect, useRef, useState } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { completeOnboarding, type OnboardingActionResult } from './actions';

interface Props {
  branches: string[];
  userEmail: string;
}

const initialState: OnboardingActionResult = { ok: true };

function SubmitButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();

  return (
    <button
      id="btn-complete-onboarding"
      type="submit"
      disabled={pending || disabled}
      className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition-all hover:-translate-y-0.5 hover:bg-primary/90 hover:shadow-md disabled:cursor-not-allowed disabled:translate-y-0 disabled:opacity-50 disabled:shadow-none"
    >
      {pending ? (
        <>
          <svg
            className="h-4 w-4 animate-spin"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"
            />
          </svg>
          Saving...
        </>
      ) : (
        <>
          Continue to Connect Platforms
          <svg
            className="h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </>
      )}
    </button>
  );
}

export function OnboardingForm({ branches }: Props) {
  const [state, formAction] = useFormState(completeOnboarding, initialState);
  const [regno, setRegno] = useState('');
  const [regnoTouched, setRegnoTouched] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const regnoClientError =
    regnoTouched && regno.length > 0 && !isValidRegno(regno, LPU_REGNO_CONFIG)
      ? 'Registration number must be 8 digits (e.g. 12420010)'
      : null;

  const serverRegnoError = !state.ok ? state.fieldErrors?.regno : null;
  const regnoError = serverRegnoError ?? regnoClientError;

  return (
    <form action={formAction} className="space-y-5">
      {!state.ok && !state.fieldErrors && (
        <div
          role="alert"
          className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          {state.error}
        </div>
      )}

      <div className="space-y-1.5">
        <label htmlFor="regno" className="block text-sm font-medium text-foreground">
          Registration Number <span className="text-destructive">*</span>
        </label>
        <input
          ref={inputRef}
          id="regno"
          name="regno"
          type="text"
          inputMode="numeric"
          placeholder="e.g. 12420010"
          maxLength={8}
          value={regno}
          onChange={(event) => setRegno(event.target.value.replace(/\D/g, ''))}
          onBlur={() => setRegnoTouched(true)}
          aria-invalid={!!regnoError}
          aria-describedby={regnoError ? 'regno-error' : 'regno-hint'}
          className={`w-full rounded-lg border px-3 py-2.5 font-mono text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-ring ${
            regnoError
              ? 'border-destructive bg-destructive/5 text-destructive'
              : 'border-input bg-background text-foreground hover:border-ring'
          }`}
          required
        />
        {regnoError ? (
          <p id="regno-error" className="text-xs text-destructive" role="alert">
            {regnoError}
          </p>
        ) : (
          <p id="regno-hint" className="text-xs text-muted-foreground">
            Your 8-digit university registration number (e.g. 12420010)
          </p>
        )}
      </div>

      <div className="space-y-1.5">
        <label htmlFor="branch" className="block text-sm font-medium text-foreground">
          Branch / Programme <span className="text-destructive">*</span>
        </label>
        <select
          id="branch"
          name="branch"
          aria-invalid={!state.ok && !!state.fieldErrors?.branch}
          className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm text-foreground transition-colors hover:border-ring focus:outline-none focus:ring-2 focus:ring-ring"
          required
          defaultValue=""
        >
          <option value="" disabled>
            Select your branch...
          </option>
          {branches.map((branch) => (
            <option key={branch} value={branch}>
              {branch}
            </option>
          ))}
        </select>
        {!state.ok && state.fieldErrors?.branch && (
          <p className="text-xs text-destructive" role="alert">
            {state.fieldErrors.branch}
          </p>
        )}
      </div>

      <div className="space-y-1.5">
        <label
          htmlFor="section"
          className="flex items-center gap-2 text-sm font-medium text-foreground"
        >
          Section
          <span className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
            Optional
          </span>
        </label>
        <input
          id="section"
          name="section"
          type="text"
          placeholder="e.g. K21, G2"
          maxLength={10}
          className="w-full rounded-lg border border-input bg-background px-3 py-2.5 font-mono text-sm text-foreground transition-colors hover:border-ring focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <p className="text-xs text-muted-foreground">
          Your class section code assigned by your university
        </p>
      </div>

      {regno.length === 8 && isValidRegno(regno, LPU_REGNO_CONFIG) && (
        <div className="rounded-lg border border-accent/20 bg-accent/5 px-4 py-3 text-sm">
          <p className="text-foreground">
            <span className="font-medium">Batch year detected: </span>
            <span className="font-bold text-accent">
              {2000 + parseInt(regno.slice(1, 3), 10)}
            </span>
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            This will be used to calculate your cohort ranking.
          </p>
        </div>
      )}

      <SubmitButton disabled={!!regnoClientError} />
    </form>
  );
}
