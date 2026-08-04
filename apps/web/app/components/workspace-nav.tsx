'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { BrandWordmark } from './brand-wordmark';

const api = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';
type Role = 'STUDENT' | 'TEACHER' | 'PARENT' | 'GUIDANCE' | 'SCHOOL_ADMIN' | 'PLATFORM_ADMIN';
const links: Array<{ href: string; label: string; roles: Role[] }> = [
  {
    href: '/workspace',
    label: 'Workspace',
    roles: ['STUDENT', 'TEACHER', 'PARENT', 'GUIDANCE', 'SCHOOL_ADMIN', 'PLATFORM_ADMIN'],
  },
  {
    href: '/assignments',
    label: 'Assignments',
    roles: ['STUDENT', 'TEACHER', 'PARENT', 'SCHOOL_ADMIN', 'PLATFORM_ADMIN'],
  },
  {
    href: '/attendance',
    label: 'Attendance',
    roles: ['STUDENT', 'TEACHER', 'PARENT', 'SCHOOL_ADMIN', 'PLATFORM_ADMIN'],
  },
  {
    href: '/progress',
    label: 'Progress notes',
    roles: ['STUDENT', 'TEACHER', 'PARENT', 'SCHOOL_ADMIN', 'PLATFORM_ADMIN'],
  },
  { href: '/messages', label: 'Messages', roles: ['TEACHER', 'PARENT'] },
  {
    href: '/safety',
    label: 'Safety report',
    roles: ['STUDENT', 'TEACHER', 'PARENT', 'GUIDANCE', 'SCHOOL_ADMIN', 'PLATFORM_ADMIN'],
  },
  { href: '/safety/intake', label: 'Safeguarding intake', roles: ['GUIDANCE'] },
  { href: '/guidance/cases', label: 'Guidance cases', roles: ['GUIDANCE'] },
  {
    href: '/dashboard/parent',
    label: 'Parent dashboard',
    roles: ['PARENT'],
  },
  {
    href: '/communications',
    label: 'Announcements & calendar',
    roles: ['STUDENT', 'TEACHER', 'PARENT', 'GUIDANCE', 'SCHOOL_ADMIN', 'PLATFORM_ADMIN'],
  },
  {
    href: '/admin/structure',
    label: 'School structure',
    roles: ['SCHOOL_ADMIN', 'PLATFORM_ADMIN'],
  },
  {
    href: '/dashboard/admin',
    label: 'Admin dashboard',
    roles: ['SCHOOL_ADMIN', 'PLATFORM_ADMIN'],
  },
];

export function WorkspaceNav() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();
  useEffect(() => {
    const cached = window.sessionStorage.getItem('pinkora.navigation.roles');
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) setRoles(parsed as Role[]);
      } catch {
        window.sessionStorage.removeItem('pinkora.navigation.roles');
      }
    }
    fetch(`${api}/auth/me`, { credentials: 'include' })
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        const nextRoles = data?.roles ?? [];
        setRoles(nextRoles);
        window.sessionStorage.setItem('pinkora.navigation.roles', JSON.stringify(nextRoles));
      })
      .catch(() => {
        setRoles([]);
        window.sessionStorage.removeItem('pinkora.navigation.roles');
      });
  }, []);
  async function signOut() {
    await fetch(`${api}/auth/logout`, { method: 'POST', credentials: 'include' });
    window.sessionStorage.removeItem('pinkora.navigation.roles');
    window.location.assign('/auth');
  }
  return (
    <nav className="workspace-nav mb-8 rounded-2xl border border-white/10 bg-[#071f61]/95 p-2.5 text-sm text-white shadow-xl shadow-blue-950/20 backdrop-blur">
      <div className="workspace-nav-head flex flex-wrap items-center gap-2">
        <Link href="/workspace" className="mr-auto flex items-center gap-2 rounded-xl px-2 py-1.5">
          <Image src="/pinkora-logo.png" alt="" width={34} height={34} className="rounded-lg" />
          <BrandWordmark light compact className="workspace-brand-title" />
        </Link>
        <span className="hidden rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-white/80 lg:inline">
          {roles[0]?.replace('_', ' ') ?? 'School member'}
        </span>
        <button
          type="button"
          onClick={signOut}
          className="brand-focus rounded-xl border border-white/20 px-3 py-2 font-semibold transition hover:bg-white/10"
        >
          Sign out
        </button>
        <button
          type="button"
          className="workspace-menu-toggle brand-focus rounded-xl border border-white/20 px-3 py-2 font-semibold transition hover:bg-white/10 lg:hidden"
          onClick={() => setMenuOpen((open) => !open)}
          aria-expanded={menuOpen}
          aria-controls="workspace-navigation-links"
        >
          {menuOpen ? 'Close' : 'Menu'}
        </button>
      </div>
      <div
        id="workspace-navigation-links"
        className={`workspace-nav-links ${menuOpen ? 'workspace-nav-links-open' : ''} mt-2 flex gap-1 overflow-x-auto border-t border-white/10 pt-2`}
      >
        {links
          .filter((link) => link.roles.some((role) => roles.includes(role)))
          .map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? 'page' : undefined}
                onClick={() => setMenuOpen(false)}
                className={`whitespace-nowrap rounded-lg px-3 py-2 font-medium transition ${
                  active
                    ? 'bg-white text-[#092d83] shadow-sm'
                    : 'text-white/75 hover:bg-white/10 hover:text-white'
                }`}
              >
                {link.label}
              </Link>
            );
          })}
      </div>
    </nav>
  );
}
