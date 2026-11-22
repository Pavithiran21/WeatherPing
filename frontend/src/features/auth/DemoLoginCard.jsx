import { IconAlertCircle, IconLoader2, IconPresentation, IconUserCircle } from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { getDemoAccounts } from '../../api/demo';
import { queryKeys } from '../../api/queryKeys';
import { useAuth } from '../../auth/AuthContext';

function CredentialRow({ label, value }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-3">
      <dt className="text-muted">{label}</dt>
      <dd className="m-0 font-bold break-all select-all">{value}</dd>
    </div>
  );
}

/**
 * Screen 19: the "Demo mode" card under the Log in form, with one "Log in as <role>" button per
 * demo account. The backend lists the accounts only when it runs with DEMO_MODE=true; otherwise
 * the request answers 404 and the card isn't shown at all, so Log in looks exactly like screen 1.
 */
export function DemoLoginCard() {
  const { demoLogin } = useAuth();
  const accounts = useQuery({
    queryKey: queryKeys.demoAccounts,
    queryFn: getDemoAccounts,
    retry: false, // A 404 means "demo mode is off", not a failure to retry.
    staleTime: Infinity,
  });
  const [pendingRole, setPendingRole] = useState(null);
  const [failed, setFailed] = useState(false);

  if (!accounts.isSuccess) {
    return null;
  }

  async function logInAs(role) {
    setFailed(false);
    setPendingRole(role);
    try {
      await demoLogin(role); // GuestOnly then opens the dashboard.
    } catch {
      setFailed(true);
      setPendingRole(null);
    }
  }

  return (
    <section
      className="mt-[22px] rounded-[20px] border-3 border-dashed border-ink bg-mint-soft p-4"
      aria-labelledby="demo-mode-title"
    >
      <span id="demo-mode-title" className="tag bg-white">
        <IconPresentation size={16} aria-hidden="true" /> Demo mode
      </span>
      <p className="mt-2.5 mb-3 text-[15px]">
        Try WeatherPing with a ready-made account: one click, no password needed. Its emails (weather
        alerts) go to a test inbox, not to a real mailbox.
      </p>
      {accounts.data.accounts.map((account) => (
        <div key={account.role} className="mb-2 last:mb-0">
          <button
            type="button"
            className="btn btn-white min-h-11 w-full"
            disabled={pendingRole !== null}
            onClick={() => logInAs(account.role)}
          >
            {pendingRole === account.role ? (
              <>
                <IconLoader2 size={20} className="motion-safe:animate-spin" aria-hidden="true" /> Logging in…
              </>
            ) : (
              <>
                <IconUserCircle size={20} aria-hidden="true" /> Log in as {account.role}
              </>
            )}
          </button>
          <dl className="mt-2 rounded-[14px] border-2 border-ink bg-white px-3 py-2 text-sm">
            <CredentialRow label="Email" value={account.email} />
          </dl>
        </div>
      ))}
      {failed && (
        <p className="form-error mt-3" role="alert">
          <IconAlertCircle size={20} aria-hidden="true" /> Couldn't start the demo. Try again.
        </p>
      )}
    </section>
  );
}
