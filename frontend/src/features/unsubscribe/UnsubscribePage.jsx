import {
  IconArrowBackUp,
  IconBellOff,
  IconBellRinging,
  IconLinkOff,
  IconPlugConnectedX,
  IconRefresh,
} from '@tabler/icons-react';
import { useMutation } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { undoUnsubscribe, unsubscribe } from '../../api/unsubscribe';
import { useAuth } from '../../auth/AuthContext';
import { LogoWithName } from '../../components/Logo';
import { errorMessage } from '../../lib/apiErrors';

/** The link itself is no good: its signature was changed, it was cut short, or its rule was deleted. */
function isInvalidLink(error) {
  return error?.status === 404 || error?.code === 'UNSUBSCRIBE_LINK_INVALID' || error?.code === 'VALIDATION_FAILED';
}

/**
 * Screen 9: the page behind "Unsubscribe from this rule" in an alert email (/unsubscribe?token=...).
 * No login: the signed token names the rule. Opening the page pauses the rule with a POST, so
 * mail scanners that only fetch the link change nothing; Undo turns the rule back on.
 */
export function UnsubscribePage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  // The server's last answer ({ status, summary, locationName }). Kept while Undo is in flight,
  // so the card doesn't disappear; the screen always shows the status the server returned.
  const [rule, setRule] = useState(null);
  const change = useMutation({
    mutationFn: (status) => (status === 'paused' ? unsubscribe(token) : undoUnsubscribe(token)),
    onSuccess: (answer) => setRule(answer),
  });

  const { mutate } = change;
  const started = useRef(false);
  useEffect(() => {
    if (token && !started.current) {
      started.current = true;
      mutate('paused');
    }
  }, [token, mutate]);

  let content;
  if (!token || isInvalidLink(change.error)) {
    content = <InvalidLink />;
  } else if (!rule && change.isError) {
    content = <CouldNotUnsubscribe message={errorMessage(change.error)} onRetry={() => mutate('paused')} />;
  } else if (!rule) {
    content = <Working />;
  } else {
    content = (
      <RuleStatus
        rule={rule}
        sending={change.isPending ? change.variables : null}
        error={change.isError ? errorMessage(change.error) : null}
        onChange={mutate}
      />
    );
  }

  return <main className="grid min-h-dvh place-items-center p-4">{content}</main>;
}

function Card({ tone, centered = false, children }) {
  return (
    <section className={`box w-full max-w-[520px] p-5 tab:p-7 ${tone} ${centered ? 'text-center' : ''}`}>
      <LogoWithName size={32} className="mb-4 text-lg" />
      {children}
    </section>
  );
}

function RuleStatus({ rule, sending, error, onChange }) {
  const paused = rule.status === 'paused';
  const where = rule.locationName ? ` in ${rule.locationName}` : '';
  const StatusIcon = paused ? IconBellOff : IconBellRinging;

  return (
    <Card tone="bg-sky" centered>
      <span className="mx-auto mb-3 grid size-[76px] place-items-center rounded-3xl border-3 border-ink bg-white shadow-pop-sm">
        <StatusIcon size={40} aria-hidden="true" />
      </span>
      {/* Announced when Undo changes it. */}
      <div aria-live="polite">
        <h1 className="text-[28px]">{paused ? "You're unsubscribed" : 'Emails are back on'}</h1>
        <p className="mt-1.5 mb-[18px] text-base">
          {paused ? (
            <>
              We won't email you when <b>{rule.summary}</b>
              {where} any more. Your other rules still send alerts.
            </>
          ) : (
            <>
              We'll email you again when <b>{rule.summary}</b>
              {where}.
            </>
          )}
        </p>
      </div>
      <div className="flex flex-wrap justify-center gap-2.5">
        {paused ? (
          <button type="button" className="btn btn-white" disabled={sending !== null} onClick={() => onChange('active')}>
            <IconArrowBackUp size={20} aria-hidden="true" /> {sending === 'active' ? 'Undoing…' : 'Undo'}
          </button>
        ) : (
          <button type="button" className="btn btn-white" disabled={sending !== null} onClick={() => onChange('paused')}>
            <IconBellOff size={20} aria-hidden="true" /> {sending === 'paused' ? 'Unsubscribing…' : 'Unsubscribe'}
          </button>
        )}
        <Link to="/rules" className="btn btn-sun">
          Manage my rules
        </Link>
      </div>
      {error && (
        <p className="form-error mt-4 text-left" role="alert">
          {error}
        </p>
      )}
    </Card>
  );
}

function Working() {
  return (
    <Card tone="bg-sky" centered>
      <div aria-busy="true">
        <p className="font-display text-lg">Turning off emails for this rule…</p>
        <div className="skel mx-auto w-[70%]" />
        <div className="skel mx-auto w-[85%]" />
      </div>
    </Card>
  );
}

function InvalidLink() {
  const { user, isLoading } = useAuth();
  return (
    <Card tone="bg-coral-soft">
      <div role="alert">
        <h1 className="flex items-center gap-2 text-xl">
          <IconLinkOff size={24} className="shrink-0" aria-hidden="true" /> This unsubscribe link isn't valid
        </h1>
        <p className="mt-1.5 text-[15px]">
          It may have been changed or the rule was deleted.
          {/* Its wording depends on being signed in, which is known once the session check is done. */}
          {!isLoading && (
            <>
              {' '}
              <Link to="/rules" className="link">
                {user ? 'Manage your rules' : 'Log in to manage your rules'}
              </Link>
            </>
          )}
        </p>
      </div>
    </Card>
  );
}

function CouldNotUnsubscribe({ message, onRetry }) {
  return (
    <Card tone="bg-coral-soft" centered>
      <div role="alert">
        <IconPlugConnectedX size={46} className="mx-auto" aria-hidden="true" />
        <h1 className="text-[22px]">We couldn't unsubscribe you yet</h1>
        <p className="mt-1.5 mb-3.5 text-sm">{message}</p>
        <button type="button" className="btn btn-white" onClick={onRetry}>
          <IconRefresh size={20} aria-hidden="true" /> Try again
        </button>
      </div>
    </Card>
  );
}
