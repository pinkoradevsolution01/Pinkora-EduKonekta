'use client';
import { FormEvent, useEffect, useState } from 'react';
import { WorkspaceNav } from '../components/workspace-nav';
const api = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';
type Report = { id: string; category: string; incidentDate: string; status: string; createdAt: string; updates: { status: string; reporterNote: string | null; createdAt: string }[] };
export default function SafetyPage() {
  const [reports, setReports] = useState<Report[]>([]); const [notice, setNotice] = useState(''); const [error, setError] = useState('');
  async function load() { const response = await fetch(`${api}/safety/reports/mine`, { credentials: 'include' }); if (response.ok) setReports(await response.json()); }
  useEffect(() => { void load(); }, []);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = event.currentTarget; setError(''); setNotice(''); const data = new FormData(form);
    const file = data.get('evidence') as File; let evidence: object | undefined;
    if (file?.size) {
      if (!['application/pdf', 'image/jpeg', 'image/png'].includes(file.type) || file.size > 5 * 1024 * 1024) { setError('Evidence must be a PDF, JPEG, or PNG no larger than 5 MB.'); return; }
      const contentBase64 = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result).split(',')[1] ?? ''); reader.onerror = reject; reader.readAsDataURL(file); });
      evidence = { name: file.name, mime: file.type, size: file.size, storageKey: `safety/${crypto.randomUUID()}`, contentBase64 };
    }
    const response = await fetch(`${api}/safety/reports`, { method: 'POST', credentials: 'include', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ category: data.get('category'), incidentDate: data.get('incidentDate'), location: data.get('location') || undefined, description: data.get('description'), evidence }) });
    const result = await response.json(); if (!response.ok) { setError(result?.error?.message ?? 'Unable to submit report.'); return; }
    form.reset(); setNotice(result.confirmation); await load();
  }
  return <main className="app-shell text-slate-900"><div className="page-container"><WorkspaceNav />
    <header className="rounded-[1.5rem] bg-[#092d83] p-7 text-white"><p className="text-xs font-bold uppercase tracking-[.2em] text-[#f4c448]">Confidential support</p><h1 className="mt-2 text-3xl font-extrabold">Safety reporting</h1><p className="mt-3 max-w-3xl text-white/85">Your report is confidential, not anonymous. Your identity is protected from ordinary users and may be accessed only by authorized safeguarding personnel under school policy. This form does not provide emergency response.</p></header>
    <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950"><strong>Immediate danger?</strong> Contact local emergency services or a trusted adult now. Do not wait for an online response.</div>
    {error && <p className="mt-5 rounded-xl bg-red-50 p-4 text-red-700">{error}</p>}{notice && <p className="mt-5 rounded-xl bg-emerald-50 p-4 text-emerald-800">{notice}</p>}
    <form onSubmit={submit} className="app-card mt-6 grid gap-4 p-6 md:grid-cols-2"><label className="text-sm font-semibold">Category<select name="category" className="brand-focus mt-2 w-full rounded-xl border p-3"><option value="BULLYING">Bullying</option><option value="HARASSMENT">Harassment</option><option value="THREAT">Threat or safety concern</option><option value="WELLBEING">Wellbeing concern</option><option value="OTHER">Other</option></select></label><label className="text-sm font-semibold">Incident date<input required name="incidentDate" type="date" className="brand-focus mt-2 w-full rounded-xl border p-3" /></label><label className="text-sm font-semibold md:col-span-2">Optional location<input name="location" maxLength={300} className="brand-focus mt-2 w-full rounded-xl border p-3" placeholder="For example: library, online class, school grounds" /></label><label className="text-sm font-semibold md:col-span-2">What happened?<textarea required name="description" minLength={10} maxLength={8000} className="brand-focus mt-2 min-h-36 w-full rounded-xl border p-3" placeholder="Describe facts you observed. Do not make accusations or assumptions." /></label><label className="text-sm font-semibold md:col-span-2">Optional protected evidence<input name="evidence" type="file" accept="application/pdf,image/jpeg,image/png" className="mt-2 block w-full text-sm" /><span className="mt-1 block font-normal text-slate-500">PDF, JPEG, or PNG only, maximum 5 MB. Evidence is encrypted and not included in notifications.</span></label><button className="brand-button w-fit rounded-xl px-5 py-3 font-bold text-white">Submit confidential report</button></form>
    <section className="mt-8"><h2 className="text-xl font-bold text-[#092d83]">Your report updates</h2><div className="mt-4 space-y-3">{reports.map((report) => <article key={report.id} className="app-card p-5"><div className="flex justify-between gap-3"><p className="font-bold text-[#092d83]">{report.category.replace('_', ' ')}</p><span className="status-pill bg-[#e8efff] text-[#092d83]">{report.status.replaceAll('_', ' ')}</span></div><p className="mt-2 text-sm text-slate-500">Submitted {new Date(report.createdAt).toLocaleString()}</p>{report.updates.map((update, index) => <p key={index} className="mt-2 text-sm text-slate-700">{update.reporterNote}</p>)}</article>)}{!reports.length && <p className="mt-3 text-slate-500">No reports submitted.</p>}</div></section>
  </div></main>;
}
