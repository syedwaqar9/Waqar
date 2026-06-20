"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Inbox" },
  { href: "/create", label: "Create from upload" },
  { href: "/brand", label: "Brand Brain" },
];

export default function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="mark">S</div>
        <div>
          <div className="name">Sunnyvale</div>
          <div className="sub">IAIMS · LinkedIn</div>
        </div>
      </div>
      <nav className="nav">
        {LINKS.map((l) => {
          const active =
            l.href === "/"
              ? pathname === "/" || pathname.startsWith("/week")
              : pathname.startsWith(l.href);
          return (
            <Link key={l.href} href={l.href} className={active ? "active" : ""}>
              <span className="dot" />
              {l.label}
            </Link>
          );
        })}
      </nav>
      <div className="side-foot">Foundation and signal phase. Goal: credibility and first inbound.</div>
    </aside>
  );
}
