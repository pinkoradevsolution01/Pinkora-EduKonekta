'use client';

import { useEffect, useState } from 'react';
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

export default function CommunicationsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    Promise.all([
      fetch(`${api}/communications/announcements`, { credentials: 'include' }).then((response) =>
        response.json(),
      ),
      fetch(`${api}/communications/calendar/events`, { credentials: 'include' }).then((response) =>
        response.json(),
      ),
    ])
      .then(([nextAnnouncements, nextEvents]) => {
        setAnnouncements(Array.isArray(nextAnnouncements) ? nextAnnouncements : []);
        setEvents(Array.isArray(nextEvents) ? nextEvents : []);
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
