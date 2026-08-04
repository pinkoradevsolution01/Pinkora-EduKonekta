'use client';

import { FormEvent, useEffect, useState } from 'react';
import { WorkspaceNav } from '../components/workspace-nav';

const api = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';
type Announcement = {
  id: string;
  title: string;
  bodyHtml: string;
  publishAt: string | null;
  visibilityState: string;
  read: boolean;
  acknowledged: boolean;
};
type CalendarEvent = {
  id: string;
  title: string;
  startsAt: string;
  endsAt: string;
  description: string | null;
};
type Auth = { roles: string[] };
type ClassOption = { id: string; name: string };

export default function CommunicationsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [auth, setAuth] = useState<Auth>({ roles: [] });
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [message, setMessage] = useState('');
  useEffect(() => {
    Promise.all([
      fetch(`${api}/auth/me`, { credentials: 'include' }).then((response) => response.json()),
      fetch(`${api}/communications/announcements`, { credentials: 'include' }).then((response) =>
        response.json(),
      ),
      fetch(`${api}/communications/calendar/events`, { credentials: 'include' }).then((response) =>
        response.json(),
      ),
    ])
      .then(([me, nextAnnouncements, nextEvents]) => {
        setAuth(me);
        setAnnouncements(Array.isArray(nextAnnouncements) ? nextAnnouncements : []);
        setEvents(Array.isArray(nextEvents) ? nextEvents : []);
        if (me.roles?.includes('TEACHER'))
          void fetch(`${api}/structure/classes`, { credentials: 'include' })
            .then((response) => response.json())
            .then((items) => setClasses(Array.isArray(items) ? items : []));
        else if (
          me.roles?.some((role: string) => ['SCHOOL_ADMIN', 'PLATFORM_ADMIN'].includes(role))
        )
          void fetch(`${api}/structure/administration-overview`, { credentials: 'include' })
            .then((response) => response.json())
            .then((overview) =>
              setClasses(Array.isArray(overview?.classes) ? overview.classes : []),
            );
      })
      .catch(() => setError('Sign in to view school communications.'))
      .finally(() => setLoading(false));
  }, []);
  async function action(id: string, path: string) {
    const response = await fetch(`${api}/communications/announcements/${id}/${path}`, {
      method: 'POST',
      credentials: 'include',
    });
    if (!response.ok) {
      setError('That update could not be saved. Please try again.');
      return;
    }
    setAnnouncements((current) =>
      current.map((item) =>
        item.id === id
          ? {
              ...item,
              read: path === 'read' ? true : item.read,
              acknowledged: path === 'acknowledge' ? true : item.acknowledged,
            }
          : item,
      ),
    );
  }
  const canPublish = auth.roles.some((role) =>
    ['TEACHER', 'SCHOOL_ADMIN', 'PLATFORM_ADMIN'].includes(role),
  );
  async function createAnnouncement(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const audience = String(form.get('audience'));
    try {
      const item = await fetch(`${api}/communications/announcements`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          title: form.get('title'),
          bodyHtml: form.get('bodyHtml'),
          audiences: [audience],
          classIds: audience === 'CLASS' ? [form.get('classId')] : [],
          publishAt: form.get('publishAt') || undefined,
          expiresAt: form.get('expiresAt') || undefined,
        }),
      }).then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data?.error?.message);
        return data;
      });
      const publishResponse = await fetch(
        `${api}/communications/announcements/${item.id}/publish`,
        {
          method: 'POST',
          credentials: 'include',
        },
      );
      if (!publishResponse.ok) throw new Error((await publishResponse.json())?.error?.message);
      setMessage(
        'Announcement saved and published or scheduled for its selected publication time.',
      );
      event.currentTarget.reset();
      const refreshed = await fetch(`${api}/communications/announcements`, {
        credentials: 'include',
      });
      if (refreshed.ok) setAnnouncements(await refreshed.json());
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Announcement could not be saved.');
    }
  }
  async function createEvent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch(`${api}/communications/calendar/events`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          classId: form.get('classId') || undefined,
          title: form.get('title'),
          description: form.get('description') || undefined,
          startsAt: form.get('startsAt'),
          endsAt: form.get('endsAt'),
        }),
      });
      if (!response.ok) throw new Error((await response.json())?.error?.message);
      setMessage('Calendar event saved and authorized recipients will be notified.');
      event.currentTarget.reset();
      const refreshed = await fetch(`${api}/communications/calendar/events`, {
        credentials: 'include',
      });
      if (refreshed.ok) setEvents(await refreshed.json());
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Calendar event could not be saved.');
    }
  }
  return (
    <main className="app-shell text-slate-900">
      <div className="page-container">
        <WorkspaceNav />
        <header className="flex flex-col justify-between gap-5 rounded-[1.5rem] border border-[#dce5f7] bg-white/80 p-7 sm:flex-row sm:items-end">
          <div>
            <p className="eyebrow">School pulse</p>
            <h1 className="page-title mt-2">Announcements & calendar</h1>
            <p className="page-copy mt-3">
              Updates intended for your school role, classes, and approved relationships.
            </p>
          </div>
          <div className="rounded-2xl bg-[#092d83] px-5 py-4 text-white">
            <p className="text-xs font-bold uppercase tracking-wider text-[#f4c448]">
              Unread updates
            </p>
            <p className="mt-1 text-3xl font-extrabold">
              {announcements.filter((item) => !item.read).length}
            </p>
          </div>
        </header>
        {error && <p className="mt-6 rounded-xl bg-red-50 p-4 text-red-700">{error}</p>}
        {message && <p className="mt-6 rounded-xl bg-emerald-50 p-4 text-emerald-700">{message}</p>}
        {canPublish && (
          <section className="mt-7 grid gap-5 lg:grid-cols-2">
            <form onSubmit={createAnnouncement} className="app-card p-6">
              <h2 className="text-xl font-bold text-[#092d83]">Publish an announcement</h2>
              <div className="mt-4 grid gap-3">
                <input
                  name="title"
                  required
                  maxLength={200}
                  placeholder="Announcement title"
                  className="brand-focus rounded-xl border p-3"
                />
                <textarea
                  name="bodyHtml"
                  required
                  maxLength={100000}
                  placeholder="Write a clear school update…"
                  className="brand-focus min-h-28 rounded-xl border p-3"
                />
                <select
                  name="audience"
                  defaultValue={auth.roles.includes('TEACHER') ? 'CLASS' : 'SCHOOL'}
                  className="brand-focus rounded-xl border p-3"
                >
                  <option value="SCHOOL" disabled={auth.roles.includes('TEACHER')}>
                    Whole school
                  </option>
                  <option value="CLASS">Selected class</option>
                </select>
                <select
                  name="classId"
                  required={auth.roles.includes('TEACHER')}
                  className="brand-focus rounded-xl border p-3"
                >
                  <option value="">
                    {classes.length ? 'Select a class' : 'Class target not selected'}
                  </option>
                  {classes.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
                <label className="text-sm">
                  Publish later (optional)
                  <input
                    name="publishAt"
                    type="datetime-local"
                    className="mt-1 block w-full rounded-xl border p-3"
                  />
                </label>
                <label className="text-sm">
                  Expires (optional)
                  <input
                    name="expiresAt"
                    type="datetime-local"
                    className="mt-1 block w-full rounded-xl border p-3"
                  />
                </label>
                <button className="brand-button brand-focus rounded-xl p-3 font-bold text-white">
                  Publish or schedule
                </button>
              </div>
            </form>
            <form onSubmit={createEvent} className="app-card p-6">
              <h2 className="text-xl font-bold text-[#092d83]">Create calendar event</h2>
              <div className="mt-4 grid gap-3">
                <input
                  name="title"
                  required
                  maxLength={200}
                  placeholder="Event title"
                  className="brand-focus rounded-xl border p-3"
                />
                <textarea
                  name="description"
                  maxLength={20000}
                  placeholder="Optional event details"
                  className="brand-focus min-h-24 rounded-xl border p-3"
                />
                <select name="classId" className="brand-focus rounded-xl border p-3">
                  <option value="">Whole school</option>
                  {classes.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
                <label className="text-sm">
                  Starts
                  <input
                    name="startsAt"
                    type="datetime-local"
                    required
                    className="mt-1 block w-full rounded-xl border p-3"
                  />
                </label>
                <label className="text-sm">
                  Ends
                  <input
                    name="endsAt"
                    type="datetime-local"
                    required
                    className="mt-1 block w-full rounded-xl border p-3"
                  />
                </label>
                <button className="brand-button brand-focus rounded-xl p-3 font-bold text-white">
                  Create event
                </button>
              </div>
            </form>
          </section>
        )}
        <div className="mt-8 grid gap-8 lg:grid-cols-[1.55fr_0.8fr]">
          <section>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-[#092d83]">Latest updates</h2>
              <span className="text-sm font-medium text-slate-500">
                {announcements.length} available
              </span>
            </div>
            {loading && (
              <div className="space-y-4">
                {[1, 2].map((item) => (
                  <div key={item} className="skeleton h-48" />
                ))}
              </div>
            )}
            <div className="space-y-4">
              {announcements.map((item) => (
                <article
                  key={item.id}
                  className={`app-card fade-in overflow-hidden p-6 ${item.read ? '' : 'border-l-4 border-l-[#e31b23]'}`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex flex-wrap gap-2">
                        <span className="status-pill bg-[#e8efff] text-[#092d83]">
                          {item.visibilityState}
                        </span>
                        {!item.read && (
                          <span className="status-pill bg-red-50 text-[#c91624]">New</span>
                        )}
                      </div>
                      <h3 className="mt-3 text-xl font-bold text-[#092d83]">{item.title}</h3>
                    </div>
                    {item.publishAt && (
                      <time className="text-right text-xs font-semibold text-slate-500">
                        {new Date(item.publishAt).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </time>
                    )}
                  </div>
                  <div
                    className="prose prose-sm mt-4 max-w-none leading-6 text-slate-600"
                    dangerouslySetInnerHTML={{ __html: item.bodyHtml }}
                  />
                  <div className="mt-5 flex flex-wrap gap-2 border-t border-[#edf1f8] pt-4">
                    <button
                      onClick={() => action(item.id, 'read')}
                      className="brand-focus rounded-xl border border-[#d5dfef] px-3 py-2 text-sm font-bold text-[#092d83] hover:bg-[#f5f8ff]"
                    >
                      {item.read ? 'Read' : 'Mark as read'}
                    </button>
                    <button
                      onClick={() => action(item.id, 'acknowledge')}
                      className="brand-button brand-focus rounded-xl px-3 py-2 text-sm font-bold text-white"
                    >
                      {item.acknowledged ? 'Acknowledged' : 'Acknowledge update'}
                    </button>
                  </div>
                </article>
              ))}
            </div>
            {!loading && !announcements.length && (
              <Empty
                title="No announcements right now"
                copy="When your school publishes an update for you, it will appear here."
              />
            )}
          </section>
          <aside>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-[#092d83]">Coming up</h2>
              <span className="text-sm text-slate-500">Calendar</span>
            </div>
            <div className="space-y-3">
              {events.map((event) => (
                <article key={event.id} className="app-card border-l-4 border-l-[#f4ae08] p-5">
                  <time className="text-xs font-extrabold uppercase tracking-[0.12em] text-[#a36d00]">
                    {new Date(event.startsAt).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      weekday: 'short',
                    })}
                  </time>
                  <h3 className="mt-2 font-bold text-[#092d83]">{event.title}</h3>
                  <p className="mt-2 text-sm text-slate-600">
                    {new Date(event.startsAt).toLocaleTimeString([], {
                      hour: 'numeric',
                      minute: '2-digit',
                    })}{' '}
                    –{' '}
                    {new Date(event.endsAt).toLocaleTimeString([], {
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
                  </p>
                  {event.description && (
                    <p className="mt-3 text-sm leading-6 text-slate-600">{event.description}</p>
                  )}
                </article>
              ))}
            </div>
            {!loading && !events.length && (
              <Empty title="No upcoming events" copy="Your school calendar is clear for now." />
            )}
          </aside>
        </div>
      </div>
    </main>
  );
}
function Empty({ title, copy }: { title: string; copy: string }) {
  return (
    <div className="app-card mt-4 p-6 text-center">
      <p className="font-bold text-[#092d83]">{title}</p>
      <p className="mt-2 text-sm text-slate-500">{copy}</p>
    </div>
  );
}
