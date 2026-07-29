import Image from 'next/image';
import { BrandWordmark } from './components/brand-wordmark';

export default function HomePage() {
  return (
    <main className="brand-gradient min-h-screen px-6 py-10 sm:py-16">
      <section className="mx-auto max-w-5xl overflow-hidden rounded-[2rem] bg-white shadow-2xl shadow-blue-950/10">
        <div className="grid items-center gap-10 p-8 sm:p-12 lg:grid-cols-[1.15fr_0.85fr]">
          <div>
            <BrandWordmark className="mb-6" />
            <h1 className="text-4xl font-bold tracking-tight text-[#092d83] sm:text-6xl">
              Connect. Communicate. Empower.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-slate-600">
              A trusted school communication and student-support platform built around every
              learner, every family, and every educator.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href="/auth"
                className="brand-button rounded-xl px-5 py-3 font-semibold text-white"
              >
                Sign in to your school
              </a>
              <span className="rounded-xl border border-[#f4ae08]/40 bg-[#fff8e5] px-5 py-3 font-semibold text-[#092d83]">
                Guide with hope
              </span>
            </div>
          </div>
          <div className="rounded-3xl bg-[#f5f8ff] p-4 ring-1 ring-[#dbe6ff]">
            <Image
              src="/pinkora-logo.png"
              alt="Pinkora EduKonekta logo"
              width={1024}
              height={1024}
              priority
              className="h-auto w-full rounded-2xl"
            />
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 border-t border-slate-100 bg-[#092d83] px-8 py-5 text-center text-sm font-semibold tracking-wide text-white">
          <span>
            <b className="text-[#f4ae08]">CONNECT</b> stronger together
          </span>
          <span>
            <b className="text-[#ff5961]">COMMUNICATE</b> open and timely
          </span>
          <span>
            <b className="text-[#f4ae08]">LEARN</b> every student matters
          </span>
          <span>
            <b className="text-[#ff5961]">PROTECT</b> safe and trusted
          </span>
        </div>
      </section>
    </main>
  );
}
