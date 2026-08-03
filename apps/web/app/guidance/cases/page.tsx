'use client';

import { FormEvent, useEffect, useState } from 'react';
import { WorkspaceNav } from '../../components/workspace-nav';

const api = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';
type Case = { id: string; status: string; priority: string; followUpAt: string | null };

export default function CasesPage() {
  const [cases, setCases] = useState<Case[]>([]);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  async function load() {
    const response = await fetch(`${api}/guidance/cases`, { credentials: 'include' });
    const data = await response.json();
    if (response.ok) setCases(data);
    else setError(data?.error?.message ?? 'Restricted case access unavailable.');
  }
  useEffect(() => {
    void load();
  }, []);
  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const response = await fetch(`${api}/guidance/cases`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ reportId: data.get('reportId'), priority: data.get('priority') }),
    });
    if (!response.ok) setError((await response.json())?.error?.message ?? 'Unable to create case.');
    else {
      setNotice('Case created and assigned to you.');
      form.reset();
      await load();
    }
  }
  return (
    <main className="app-shell">
      <div className="page-container">
        <WorkspaceNav />
        <header>
          <p className="eyebrow">Restricted workspace</p>
          <h1 className="page-title mt-2">Guidance cases</h1>
          <p className="page-copy mt-3">
            Protected cases are visible only to explicitly assigned safeguarding personnel. Every
            view is audited.
          </p>
        </header>
        {error && <p className="mt-5 rounded-xl bg-red-50 p-4 text-red-700">{error}</p>}
        {notice && <p className="mt-5 rounded-xl bg-emerald-50 p-4 text-emerald-800">{notice}</p>}
        <form onSubmit={create} className="app-card mt-6 flex flex-wrap gap-3 p-5">
          <input
            required
            name="reportId"
            className="min-w-72 flex-1 rounded-xl border p-3"
            placeholder="Safety report UUID"
          />
          <select name="priority" className="rounded-xl border p-3">
            <option>MEDIUM</option>
            <option>LOW</option>
            <option>HIGH</option>
            <option>URGENT</option>
          </select>
          <button className="brand-button rounded-xl px-5 font-bold text-white">
            Create protected case
          </button>
        </form>
        <section className="mt-8 space-y-3">
          {cases.map((item) => (
            <article key={item.id} className="app-card p-5">
              <div className="flex justify-between">
                <strong className="text-[#092d83]">Case {item.id.slice(0, 8)}</strong>
                <span className="status-pill bg-[#e8efff] text-[#092d83]">
                  {item.status} · {item.priority}
                </span>
              </div>
              <p className="mt-2 text-sm text-slate-500">
                Follow-up:{' '}
                {item.followUpAt ? new Date(item.followUpAt).toLocaleDateString() : 'Not scheduled'}
              </p>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
