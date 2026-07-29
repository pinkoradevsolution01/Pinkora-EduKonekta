'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { BrandWordmark } from '../components/brand-wordmark';
import { WorkspaceNav } from '../components/workspace-nav';

const api = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';
type Role = 'STUDENT' | 'TEACHER' | 'PARENT' | 'GUIDANCE' | 'SCHOOL_ADMIN' | 'PLATFORM_ADMIN';
type Auth = { email: string; roles: Role[]; schoolId: string | null };
type Task = { title: string; description: string; href: string; icon: string };

const roleNames: Record<Role, string> = {
  STUDENT: 'Student',
  TEACHER: 'Teacher',
  PARENT: 'Parent',
  GUIDANCE: 'Guidance personnel',
  SCHOOL_ADMIN: 'School administrator',
  PLATFORM_ADMIN: 'Platform administrator',
};
const tasks: Record<Role, Task[]> = {
  STUDENT: [
    {
      title: 'Complete assignments',
      description: 'View due dates and submit your own work.',
      href: '/assignments',
      icon: '✓',
    },
    {
      title: 'Stay informed',
      description: 'Read school announcements and calendar events.',
      href: '/communications',
      icon: '◎',
    },
    {
      title: 'Check attendance',
      description: 'Review your attendance summary and history.',
      href: '/attendance',
      icon: '◷',
    },
    {
      title: 'View progress notes',
      description: 'Read parent-visible learning feedback and achievements.',
      href: '/progress',
      icon: '✦',
    },
  ],
  TEACHER: [
    {
      title: 'Manage class assignments',
      description: 'Create and review work for assigned classes.',
      href: '/assignments',
      icon: '✦',
    },
    {
      title: 'Communicate with learners',
      description: 'Publish class announcements and view the calendar.',
      href: '/communications',
      icon: '◉',
    },
    {
      title: 'Record attendance',
      description: 'Complete the daily sheet for assigned classes.',
      href: '/attendance',
      icon: '▦',
    },
    {
      title: 'Document progress',
      description: 'Add respectful, factual notes for assigned students.',
      href: '/progress',
      icon: '✦',
    },
  ],
  PARENT: [
    {
      title: 'Follow linked children',
      description: 'Read assignments, submissions, and teacher feedback.',
      href: '/assignments',
      icon: '◌',
    },
    {
      title: 'Read school updates',
      description: 'View announcements intended for parents and your children.',
      href: '/communications',
      icon: '◎',
    },
    {
      title: 'Monitor children',
      description: 'Review attendance, work status, feedback, and events.',
      href: '/dashboard/parent',
      icon: '♥',
    },
    {
      title: 'View progress notes',
      description: 'Read and acknowledge feedback for linked children.',
      href: '/progress',
      icon: '✦',
    },
  ],
  GUIDANCE: [
    {
      title: 'School updates',
      description: 'Review guidance communications and calendar events.',
      href: '/communications',
      icon: '◎',
    },
  ],
  SCHOOL_ADMIN: [
    {
      title: 'Manage school structure',
      description: 'Maintain years, classes, subjects, enrollments, and relationships.',
      href: '/admin/structure',
      icon: '▦',
    },
    {
      title: 'Review assignments',
      description: 'Monitor assignment activity and student submissions.',
      href: '/assignments',
      icon: '✦',
    },
    {
      title: 'Publish school updates',
      description: 'Manage announcements and calendar events.',
      href: '/communications',
      icon: '◉',
    },
    {
      title: 'Review attendance',
      description: 'Filter attendance and inspect correction history.',
      href: '/attendance',
      icon: '◷',
    },
    {
      title: 'Review progress notes',
      description: 'Review auditable learning observations in your school.',
      href: '/progress',
      icon: '✦',
    },
  ],
  PLATFORM_ADMIN: [
    {
      title: 'Manage school structure',
      description: 'Access authorized platform-level school administration.',
      href: '/admin/structure',
      icon: '▦',
    },
    {
      title: 'Review learning activity',
      description: 'View assignment and submission activity in your tenant context.',
      href: '/assignments',
      icon: '✦',
    },
    {
      title: 'Review progress notes',
      description: 'Review auditable learning observations in your tenant context.',
      href: '/progress',
      icon: '✦',
    },
  ],
};

export default function WorkspacePage() {
  const [auth, setAuth] = useState<Auth | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetch(`${api}/auth/me`, { credentials: 'include' })
      .then(async (response) => {
        if (!response.ok) throw new Error('Please sign in to continue.');
        return response.json();
      })
      .then(setAuth)
      .catch((reason) =>
        setError(reason instanceof Error ? reason.message : 'Please sign in to continue.'),
      )
      .finally(() => setLoading(false));
  }, []);
  const userTasks =
    auth?.roles
      .flatMap((role) => tasks[role] ?? [])
      .filter((task, index, all) => all.findIndex((item) => item.href === task.href) === index) ??
    [];

  return (
    <main className="app-shell text-slate-900">
      <div className="page-container">
        {auth && <WorkspaceNav />}
        <header className="relative overflow-hidden rounded-[1.75rem] bg-[#092d83] p-7 text-white shadow-xl shadow-blue-950/15 sm:p-10">
          <div className="absolute -right-20 -top-24 h-64 w-64 rounded-full bg-[#f4ae08]/25 blur-3xl" />
          <div className="absolute -bottom-24 right-24 h-52 w-52 rounded-full bg-[#e31b23]/25 blur-3xl" />
          <div className="relative">
            <BrandWordmark light className="mb-6" />
            <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
              Your school workspace
            </h1>
            {auth && (
              <p className="mt-3 max-w-2xl leading-7 text-white/80">
                Welcome back, {auth.email.split('@')[0]}. You are signed in as{' '}
                {auth.roles.map((role) => roleNames[role]).join(', ')}.
              </p>
            )}
            <div className="mt-6 flex flex-wrap gap-3 text-sm">
              <span className="rounded-full bg-white/12 px-3 py-2 font-semibold text-white/90">
                Secure, tenant-scoped access
              </span>
              <span className="rounded-full bg-white/12 px-3 py-2 font-semibold text-white/90">
                {new Date().toLocaleDateString(undefined, {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                })}
              </span>
            </div>
          </div>
          {error && (
            <p className="relative mt-5 rounded-xl bg-red-50 p-4 text-red-700">
              {error}{' '}
              <Link href="/auth" className="font-semibold underline">
                Sign in
              </Link>
            </p>
          )}
        </header>
        {loading && (
          <section className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((item) => (
              <div key={item} className="skeleton h-52 rounded-2xl" />
            ))}
          </section>
        )}
        {auth && (
          <section className="mt-8">
            <div className="mb-5 flex items-end justify-between gap-4">
              <div>
                <p className="eyebrow">Quick access</p>
                <h2 className="mt-1 text-2xl font-bold text-[#092d83]">
                  What would you like to do?
                </h2>
              </div>
              <p className="hidden text-sm text-slate-500 sm:block">
                Only the tools assigned to your role are shown.
              </p>
            </div>
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {userTasks.map((task) => (
                <Link
                  key={task.href}
                  href={task.href}
                  className="app-card fade-in group relative overflow-hidden p-6 transition duration-200 hover:-translate-y-1 hover:border-[#a9bee9] hover:shadow-xl"
                >
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#e8efff] text-xl font-bold text-[#092d83] transition group-hover:bg-[#092d83] group-hover:text-white">
                    {task.icon}
                  </span>
                  <h2 className="mt-5 text-xl font-bold text-[#092d83]">{task.title}</h2>
                  <p className="mt-3 text-sm leading-6 text-slate-600">{task.description}</p>
                  <span className="mt-5 inline-block font-semibold text-[#e31b23]">
                    Open workspace →
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
