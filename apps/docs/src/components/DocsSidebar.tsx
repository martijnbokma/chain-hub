import { NavLink } from 'react-router-dom';
import { docSections } from '../lib/nav';

export function DocsSidebar({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav className="space-y-8">
      {docSections.map((group) => (
        <div key={group.section}>
          <h2 className="font-mono text-[11px] text-muted-foreground uppercase tracking-widest mb-3">
            {group.section}
          </h2>
          <ul className="space-y-1">
            {group.pages.map((page) => (
              <li key={page.path}>
                <NavLink
                  to={page.path}
                  end={page.path === '/'}
                  onClick={onNavigate}
                  className={({ isActive }) =>
                    `block text-sm py-1.5 px-3 rounded-lg transition-colors ${
                      isActive
                        ? 'text-primary font-medium bg-secondary/50'
                        : 'text-muted-foreground hover:text-foreground'
                    }`
                  }
                >
                  {page.title}
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
}
