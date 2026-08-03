'use client';

import { FormEvent, ReactNode, useState } from 'react';
import { WorkspaceNav } from '../../components/workspace-nav';

const api = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';

export default function StructureAdminPage() {
  const [schoolId, setSchoolId] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  async function submit(path: string, body: unknown, event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage('');
    setError('');
    try {
      const response = await fetch(`${api}${path}`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json', 'x-school-id': schoolId },
        body: JSON.stringify(body),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error?.message ?? 'Request failed');
      setMessage('Saved successfully. Relationship changes are audited.');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Request failed');
    }
  }
  return (
    <main className="brand-gradient min-h-screen px-5 py-10 text-slate-900 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <WorkspaceNav />
        <header>
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#e31b23]">
            JVerse EduKonekta
          </p>
          <h1 className="mt-2 text-3xl font-bold text-[#092d83]">School structure</h1>
          <p className="mt-2 max-w-2xl text-slate-600">
            Create academic structures and relationships from a tenant-scoped administrator
            workspace. Imports validate first and never delete existing records.
          </p>
        </header>
        <label className="mt-8 block max-w-xl text-sm font-medium">
          Active school ID
          <input
            value={schoolId}
            onChange={(event) => setSchoolId(event.target.value)}
            placeholder="School UUID"
            className="mt-1 w-full rounded-xl border bg-white p-3"
            required
          />
        </label>
        <div className="mt-8 grid gap-6 md:grid-cols-3">
          <Form
            title="School year"
            onSubmit={(event) =>
              submit(
                '/structure/school-years',
                {
                  name: new FormData(event.currentTarget).get('name'),
                  startsOn: new FormData(event.currentTarget).get('startsOn'),
                  endsOn: new FormData(event.currentTarget).get('endsOn'),
                },
                event,
              )
            }
            fields={
              <>
                <input
                  name="name"
                  placeholder="2026-2027"
                  required
                  className="rounded-xl border p-3"
                />
                <input name="startsOn" type="date" required className="rounded-xl border p-3" />
                <input name="endsOn" type="date" required className="rounded-xl border p-3" />
              </>
            }
          />
          <Form
            title="Subject"
            onSubmit={(event) =>
              submit(
                '/structure/subjects',
                {
                  code: new FormData(event.currentTarget).get('code'),
                  name: new FormData(event.currentTarget).get('name'),
                },
                event,
              )
            }
            fields={
              <>
                <input
                  name="code"
                  placeholder="MATH-7"
                  required
                  className="rounded-xl border p-3"
                />
                <input
                  name="name"
                  placeholder="Mathematics"
                  required
                  className="rounded-xl border p-3"
                />
              </>
            }
          />
          <Form
            title="Class"
            onSubmit={(event) =>
              submit(
                '/structure/classes',
                {
                  schoolYearId: new FormData(event.currentTarget).get('schoolYearId'),
                  name: new FormData(event.currentTarget).get('name'),
                  gradeLevel: new FormData(event.currentTarget).get('gradeLevel'),
                },
                event,
              )
            }
            fields={
              <>
                <input
                  name="schoolYearId"
                  placeholder="School year UUID"
                  required
                  className="rounded-xl border p-3"
                />
                <input
                  name="name"
                  placeholder="Grade 7 - A"
                  required
                  className="rounded-xl border p-3"
                />
                <input
                  name="gradeLevel"
                  placeholder="Grade level"
                  className="rounded-xl border p-3"
                />
              </>
            }
          />
        </div>
        <section className="mt-8 rounded-2xl border border-dashed border-[#f4ae08] bg-[#fff8e5] p-5">
          <h2 className="font-semibold">Safe bulk import</h2>
          <p className="mt-1 text-sm text-slate-600">
            Use the API validation endpoint to inspect enrollment rows before importing. Existing
            records are never automatically removed or overwritten.
          </p>
          <code className="mt-3 block overflow-auto rounded-xl bg-white p-3 text-xs">
            POST /api/v1/structure/bulk/enrollments/validate
          </code>
        </section>
        {message && <p className="mt-5 rounded-xl bg-emerald-50 p-3 text-emerald-700">{message}</p>}
        {error && <p className="mt-5 rounded-xl bg-red-50 p-3 text-red-700">{error}</p>}
      </div>
    </main>
  );
}

function Form({
  title,
  fields,
  onSubmit,
}: {
  title: string;
  fields: ReactNode;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3 rounded-2xl bg-white p-5 shadow-sm">
      <h2 className="font-semibold">{title}</h2>
      {fields}
      <button className="brand-button brand-focus rounded-xl p-3 font-semibold text-white">
        Create
      </button>
    </form>
  );
}
