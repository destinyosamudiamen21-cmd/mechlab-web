import { Link, Outlet, useLocation } from "react-router";
import { useQueryClient } from "@tanstack/react-query";
import { logout, useAuth } from "../api/auth";

type IconName = "courses" | "community" | "progress";
type NavEntry = { to: string; label: string; icon: IconName; ready: boolean };

// "ready: false" items are shown as "Soon" and can't be clicked.
// Flip to true when the page exists.
const NAV: NavEntry[] = [
  { to: "/", label: "Courses", icon: "courses", ready: true },
  { to: "/community", label: "Community", icon: "community", ready: true },
  { to: "/progress", label: "Progress", icon: "progress", ready: false },
];

// Which sidebar item a page belongs to. Course, topic and question pages are all "Courses".
function sectionOf(pathname: string): IconName | null {
  if (pathname.startsWith("/community")) return "community";
  if (
    pathname === "/" ||
    pathname.startsWith("/courses") ||
    pathname.startsWith("/topics") ||
    pathname.startsWith("/questions")
  ) {
    return "courses";
  }
  return null;
}

const ICON_PATHS: Record<IconName, string> = {
  courses: "M4 5h7v14H4zM13 5h7v14h-7z",
  community: "M4 5h16v10H9l-5 4z",
  progress: "M5 19v-8M12 19V5M19 19v-6",
};

function NavIcon({ name }: { name: IconName }) {
  return (
    <svg
      className='nav-icon'
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth='2'
      strokeLinecap='round'
      strokeLinejoin='round'
      aria-hidden='true'
    >
      <path d={ICON_PATHS[name]} />
    </svg>
  );
}

function NavItems() {
  const { pathname } = useLocation();
  const section = sectionOf(pathname);

  return (
    <>
      {NAV.map((item) =>
        item.ready ? (
          <Link
            key={item.label}
            to={item.to}
            className={
              section === item.icon ? "nav-item is-active" : "nav-item"
            }
            aria-current={section === item.icon ? "page" : undefined}
          >
            <NavIcon name={item.icon} />
            {item.label}
          </Link>
        ) : (
          <span
            key={item.label}
            className='nav-item is-soon'
            aria-disabled='true'
          >
            <NavIcon name={item.icon} />
            {item.label}
            <span className='soon'>Soon</span>
          </span>
        )
      )}
    </>
  );
}

// Shows "Log in" to visitors, and the name with "Log out" to members.
function Account() {
  const { user, isLoading } = useAuth();
  const queryClient = useQueryClient();
  const { pathname, search } = useLocation();

  if (isLoading) return null;

  if (!user) {
    // Remember where the visitor was, so login brings them back to the same page.
    const here =
      pathname.startsWith("/login") || pathname.startsWith("/register")
        ? "/"
        : pathname + search;
    return (
      <Link
        to={`/login?next=${encodeURIComponent(here)}`}
        className='account-link'
      >
        Log in
      </Link>
    );
  }

  function handleLogout() {
    logout();
    queryClient.removeQueries({ queryKey: ["me"] });
  }

  return (
    <div className='account'>
      <span className='account-name'>{user.full_name}</span>
      {user.role !== "student" && <span className='role-tag'>{user.role}</span>}
      <button className='account-out' onClick={handleLogout}>
        Log out
      </button>
    </div>
  );
}

export default function Layout() {
  return (
    <div className='shell'>
      {/* Laptop: sidebar on the left */}
      <aside className='sidebar'>
        <Link to='/' className='brand'>
          Mech<span>Lab</span>
        </Link>
        <nav className='nav' aria-label='Main'>
          <NavItems />
        </nav>
        <div className='sidebar-foot'>
          <Account />
          <div className='sidebar-note'>
            <strong>Every answer shows its status</strong>
            "Checked" means a scholar solved it independently and agreed.
          </div>
        </div>
      </aside>

      <div className='main'>
        {/* Phone: slim bar on top */}
        <header className='topbar'>
          <Link to='/' className='brand'>
            Mech<span>Lab</span>
          </Link>
          <Account />
        </header>
        <main className='page'>
          <Outlet />
        </main>
      </div>

      {/* Phone: tab bar at the bottom, within thumb reach */}
      <nav className='tabbar' aria-label='Main'>
        <NavItems />
      </nav>
    </div>
  );
}
