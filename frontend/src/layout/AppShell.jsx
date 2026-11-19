import {
  IconAdjustmentsBolt,
  IconBell,
  IconBellRinging,
  IconClockBolt,
  IconMoodSmile,
  IconSmartHome,
} from '@tabler/icons-react';
import { DateTime } from 'luxon';
import { useState } from 'react';
import { Link, NavLink, Outlet } from 'react-router';
import { useAuth } from '../auth/AuthContext';
import { LogoWithName } from '../components/Logo';
import { useUnreadCount } from '../features/alerts/useUnreadCount';
import { AddSpotDialog } from '../features/places/AddSpotDialog';
import { SpotList } from '../features/places/SpotList';

const NAV_ITEMS = [
  { to: '/', label: 'Home', icon: IconSmartHome, end: true },
  { to: '/rules', label: 'Rules', icon: IconAdjustmentsBolt },
  { to: '/alerts', label: 'Alerts', icon: IconBellRinging, showsUnread: true },
  { to: '/profile', label: 'Profile', icon: IconMoodSmile },
];

/**
 * The logged-in layout. Desktop and tablet (1000 px and up): yellow sidebar on the left.
 * Phone: the sidebar is replaced by a bottom tab bar (UI-UX.md "Layout and responsive").
 *
 * "Add a spot" can be opened from the sidebar, the dashboard and the Rules page, so the
 * shell owns that dialog and gives pages openAddSpot through the outlet context.
 */
export function AppShell() {
  const unread = useUnreadCount();
  const [addSpotOpen, setAddSpotOpen] = useState(false);
  const openAddSpot = () => setAddSpotOpen(true);

  return (
    <div className="min-h-dvh tab:grid tab:grid-cols-[250px_1fr]">
      <Sidebar unread={unread} onAddSpot={openAddSpot} />
      <main className="min-w-0 px-4 pt-5 pb-28 tab:px-[30px] tab:pt-7 tab:pb-8">
        <TopBar unread={unread} />
        <Outlet context={{ openAddSpot }} />
      </main>
      <BottomTabs unread={unread} />
      <AddSpotDialog open={addSpotOpen} onClose={() => setAddSpotOpen(false)} />
    </div>
  );
}

function Sidebar({ unread, onAddSpot }) {
  return (
    <aside className="sticky top-0 hidden h-dvh flex-col gap-2 overflow-y-auto border-r-3 border-ink bg-sun px-4 py-6 tab:flex">
      <LogoWithName size={40} className="mx-1 mb-[18px] text-[22px]" />
      <nav aria-label="Main" className="flex flex-col gap-2">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-[18px] border-3 px-3.5 py-3 font-display text-base ${
                isActive ? 'border-ink bg-white shadow-pop-sm' : 'border-transparent'
              }`
            }
          >
            <item.icon size={22} aria-hidden="true" />
            {item.label}
            {item.showsUnread && unread > 0 && (
              <span className="ml-auto rounded-full border-2 border-ink bg-coral px-2 text-xs">
                {unread}
                <span className="sr-only"> unread</span>
              </span>
            )}
          </NavLink>
        ))}
      </nav>
      <SpotList onAddSpot={onAddSpot} />
      <div className="mt-auto rounded-[20px] border-3 border-ink bg-white p-3.5 text-[13px]">
        <p className="mb-1 flex items-center gap-1 font-display text-base whitespace-nowrap">
          <IconClockBolt size={17} aria-hidden="true" /> Checked every 30 min
        </p>
        We compare your rules with the forecast and send one email per event. Never twice.
      </div>
    </aside>
  );
}

function greeting(timeZone) {
  const hour = DateTime.now().setZone(timeZone).hour;
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function TopBar({ unread }) {
  const { user } = useAuth();
  const firstName = user.name.split(' ')[0];

  return (
    <header className="mb-6 flex items-center gap-3">
      {/* Phone: the logo instead of the greeting, which doesn't fit next to the buttons. */}
      <LogoWithName size={34} className="flex-1 text-xl tab:hidden" />
      <h2 className="hidden min-w-0 flex-1 truncate text-[34px] tab:block">
        {greeting(user.timeZone)}, {firstName}
      </h2>
      <Link to="/alerts" className="icon-btn relative" aria-label={unread > 0 ? `Alerts, ${unread} unread` : 'Alerts'}>
        <IconBell size={20} aria-hidden="true" />
        {unread > 0 && (
          <span className="absolute -top-1.5 -right-1.5 size-[18px] rounded-full border-[2.5px] border-ink bg-coral" />
        )}
      </Link>
      <Link
        to="/profile"
        aria-label="Profile"
        className="grid size-[50px] shrink-0 place-items-center rounded-[18px] border-3 border-ink bg-grape font-display text-[22px] font-bold text-white shadow-pop-sm"
      >
        {firstName.charAt(0).toUpperCase()}
      </Link>
    </header>
  );
}

function BottomTabs({ unread }) {
  return (
    <nav
      aria-label="Main"
      className="fixed right-3.5 bottom-3.5 left-3.5 z-40 flex justify-around rounded-[22px] border-3 border-ink bg-white p-2.5 shadow-pop-sm tab:hidden"
    >
      {NAV_ITEMS.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          className={({ isActive }) =>
            `relative grid h-11 w-14 place-items-center rounded-xl border-[2.5px] ${
              isActive ? 'border-ink bg-sun' : 'border-transparent'
            }`
          }
        >
          <item.icon size={24} aria-hidden="true" />
          <span className="sr-only">
            {item.label}
            {item.showsUnread && unread > 0 ? `, ${unread} unread` : ''}
          </span>
          {item.showsUnread && unread > 0 && (
            <span className="absolute top-0 right-2 size-3 rounded-full border-2 border-ink bg-coral" aria-hidden="true" />
          )}
        </NavLink>
      ))}
    </nav>
  );
}
