const navItems = [
  { href: "#skills", key: "skills", label: "Skills" },
  { href: "#rules", key: "rules", label: "Rules" },
  { href: "#agents", key: "agents", label: "Agents" },
  { href: "#workflows", key: "workflows", label: "Workflows" },
  { href: "#config", key: "config", label: "Config" },
  { href: "#status", key: "status", label: "Status" },
  { href: "#reflect", key: "reflect", label: "Reflect" },
  { href: "#improve", key: "improve", label: "Improve" },
  { href: "#registry", key: "registry", label: "Registry" },
] as const

export function SidebarNav({ currentRoute }: { currentRoute: string }) {
  return (
    <nav className="sidebar-nav" aria-label="Primary">
      {navItems.map((item) => (
        <a
          key={item.key}
          href={item.href}
          data-nav={item.key}
          className="block border-l-2 border-transparent px-4 py-[0.62rem] text-hub-text-faint no-underline transition-[background-color,color,border-color] duration-[140ms] ease-in-out hover:bg-[rgba(110,168,255,0.06)] hover:text-hub-text-dim aria-[current=page]:border-l-hub-accent aria-[current=page]:bg-[rgba(110,168,255,0.12)] aria-[current=page]:text-[#f4f7ff]"
          aria-current={currentRoute === item.key ? "page" : undefined}
        >
          {item.label}
        </a>
      ))}
    </nav>
  )
}
