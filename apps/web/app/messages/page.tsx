'use client';

import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { WorkspaceNav } from '../components/workspace-nav';

const api = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';
type Message = {
  id: string;
  authorUserId: string;
  content: string;
  createdAt: string;
  readAt: string | null;
  author: { displayName: string };
};
type Conversation = {
  id: string;
  state: string;
  student: { user: { displayName: string } };
  parent: { displayName: string };
  teacher: { displayName: string };
  messages: Message[];
};
type Auth = { userId: string };

export default function MessagesPage() {
  const [items, setItems] = useState<Conversation[]>([]);
  const [auth, setAuth] = useState<Auth | null>(null);
  const [selectedId, setSelectedId] = useState('');
  const [error, setError] = useState('');
  const messageHistoryRef = useRef<HTMLDivElement>(null);
  const selected = useMemo(
    () => items.find((item) => item.id === selectedId) ?? items[0],
    [items, selectedId],
  );
  async function load() {
    try {
      const [me, conversations] = await Promise.all([
        fetch(`${api}/auth/me`, { credentials: 'include' }).then((r) => r.json()),
        fetch(`${api}/messaging/conversations`, { credentials: 'include' }).then(async (r) => {
          const data = await r.json();
          if (!r.ok) throw Error(data?.error?.message);
          return data;
        }),
      ]);
      setAuth(me);
      setItems(Array.isArray(conversations) ? conversations : []);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to load messages.');
    }
  }
  useEffect(() => {
    void load();
  }, []);
  useEffect(() => {
    const history = messageHistoryRef.current;
    if (history) history.scrollTop = history.scrollHeight;
  }, [selected?.id, selected?.messages.length]);
  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;
    const form = event.currentTarget;
    const content = new FormData(form).get('content');
    const response = await fetch(`${api}/messaging/conversations/${selected.id}/messages`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ content }),
    });
    const data = await response.json();
    if (!response.ok) {
      setError(data?.error?.message ?? 'Unable to send message.');
      return;
    }
    form.reset();
    await load();
  }
  async function action(path: 'read' | 'archive' | 'report') {
    if (!selected) return;
    const body =
      path === 'report' ? JSON.stringify({ reason: 'Requested administrator review.' }) : undefined;
    const response = await fetch(`${api}/messaging/conversations/${selected.id}/${path}`, {
      method: 'POST',
      credentials: 'include',
      headers: body ? { 'content-type': 'application/json' } : undefined,
      body,
    });
    if (!response.ok)
      setError((await response.json())?.error?.message ?? 'Unable to update conversation.');
    else await load();
  }
  return (
    <main className="app-shell">
      <div className="page-container">
        <WorkspaceNav />
        <header>
          <p className="eyebrow">Secure communication</p>
          <h1 className="page-title mt-2">Parent-teacher messages</h1>
          <p className="page-copy mt-3">
            Only authorized student relationships can participate in a conversation.
          </p>
        </header>
        {error && <p className="mt-5 rounded-xl bg-red-50 p-4 text-red-700">{error}</p>}
        <section className="app-card mt-7 grid h-[calc(100vh-15rem)] min-h-[38rem] max-h-[48rem] overflow-hidden lg:grid-cols-[18rem_1fr]">
          <aside className="min-h-0 overflow-y-auto border-b border-[#dce5f7] bg-[#f8faff] lg:border-b-0 lg:border-r">
            <div className="border-b border-[#dce5f7] p-4">
              <h2 className="font-bold text-[#092d83]">Conversations</h2>
            </div>
            {items.map((item) => (
              <button
                key={item.id}
                onClick={() => setSelectedId(item.id)}
                className={`block w-full border-b border-[#e7edf8] p-4 text-left transition ${selected?.id === item.id ? 'bg-[#e8efff]' : 'hover:bg-white'}`}
              >
                <p className="font-bold text-[#092d83]">{item.student.user.displayName}</p>
                <p className="mt-1 truncate text-xs text-slate-500">
                  {item.messages.at(-1)?.content ?? 'No messages yet'}
                </p>
              </button>
            ))}
            {!items.length && (
              <p className="p-4 text-sm text-slate-500">No authorized conversations yet.</p>
            )}
          </aside>
          <div className="flex min-h-0 flex-col">
            {selected ? (
              <>
                <div className="flex items-center justify-between border-b border-[#dce5f7] p-4">
                  <div>
                    <h2 className="font-bold text-[#092d83]">
                      {selected.student.user.displayName}
                    </h2>
                    <p className="text-xs text-slate-500">
                      {selected.parent.displayName} ↔ {selected.teacher.displayName}
                    </p>
                  </div>
                  <span className="status-pill bg-[#e8efff] text-[#092d83]">{selected.state}</span>
                </div>
                <div
                  ref={messageHistoryRef}
                  className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain bg-[#f5f8ff]/60 p-5"
                  aria-label="Message history"
                >
                  {selected.messages.map((message) => {
                    const own = message.authorUserId === auth?.userId;
                    return (
                      <div
                        key={message.id}
                        className={`flex ${own ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[80%] rounded-2xl px-4 py-3 shadow-sm ${own ? 'rounded-br-md bg-[#092d83] text-white' : 'rounded-bl-md bg-white text-slate-700'}`}
                        >
                          <p
                            className={`text-xs font-bold ${own ? 'text-white/75' : 'text-[#1455c0]'}`}
                          >
                            {own ? 'You' : message.author.displayName}
                          </p>
                          <p className="mt-1 whitespace-pre-wrap text-sm leading-6">
                            {message.content}
                          </p>
                          <p
                            className={`mt-2 text-[0.65rem] ${own ? 'text-white/60' : 'text-slate-400'}`}
                          >
                            {new Date(message.createdAt).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="border-t border-[#dce5f7] bg-white p-4">
                  <div className="mb-3 flex gap-2 text-xs">
                    <button
                      onClick={() => action('read')}
                      className="rounded-lg border px-3 py-2 text-[#092d83]"
                    >
                      Mark read
                    </button>
                    <button
                      onClick={() => action('report')}
                      className="rounded-lg border border-[#f4ae08] px-3 py-2 text-[#8a5d00]"
                    >
                      Report
                    </button>
                    <button
                      onClick={() => action('archive')}
                      className="rounded-lg border px-3 py-2 text-slate-600"
                    >
                      Archive
                    </button>
                  </div>
                  <form onSubmit={send} className="flex gap-2">
                    <input
                      name="content"
                      required
                      maxLength={5000}
                      className="brand-focus min-w-0 flex-1 rounded-xl border border-[#dce5f7] p-3"
                      placeholder="Write a respectful message…"
                    />
                    <button className="brand-button rounded-xl px-5 font-bold text-white">
                      Send
                    </button>
                  </form>
                </div>
              </>
            ) : (
              <div className="m-auto text-center text-slate-500">
                Select a conversation to begin.
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
