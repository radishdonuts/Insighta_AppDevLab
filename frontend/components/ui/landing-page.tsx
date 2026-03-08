"use client";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  ClipboardCheck,
  FileSearch,
  LineChart,
  ShieldCheck,
  UserRoundSearch,
} from "lucide-react";

import { Button } from "@/components/ui/button";

const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6 } },
};

const itemFadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

const cards = [
  {
    icon: FileSearch,
    title: "Guided Complaint Intake",
    body: "Collect complaint details, policy context, attachments, and supporting evidence in one structured flow.",
  },
  {
    icon: ShieldCheck,
    title: "AI-Assisted Triage",
    body: "Support faster review with category, urgency, and prioritization signals for incoming complaint cases.",
  },
  {
    icon: LineChart,
    title: "Complaint Tracking and Structured Feedback",
    body: "Keep complaint progress visible while capturing customer feedback through star ratings and preset categories.",
  },
];

const steps = [
  "Submit a complaint with policy details and supporting information, or share structured feedback through ratings and preset categories.",
  "Review, classify, prioritize, and route complaint cases for the right next action.",
  "Track case updates and keep customer submissions visible in one organized workflow.",
];

const outcomeCards = [
  {
    label: "PRIORITY-FIRST TRIAGE",
    value: "Fewer urgent cases get buried",
    description:
      "Structured complaint data helps teams identify high-priority cases earlier.",
  },
  {
    label: "CLEARER FOLLOW-THROUGH",
    value: "One visible status path",
    description:
      "Customers can follow case progress without relying on scattered updates.",
  },
  {
    label: "STRUCTURED CUSTOMER INPUT",
    value: "Feedback stays organized",
    description:
      "Ratings and preset categories make customer feedback easier to capture, review, and compare.",
  },
];

export function InsightaLandingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-[radial-gradient(circle_at_top_left,_rgba(15,23,42,0.08),_transparent_28%),radial-gradient(circle_at_top_right,_rgba(14,165,233,0.18),_transparent_24%),linear-gradient(180deg,_#f8fbff_0%,_#eef5ff_42%,_#ffffff_100%)] text-slate-950">
      <main className="flex-1">
        <section className="px-4 pb-14 pt-20 sm:px-6 lg:px-8 lg:pb-20 lg:pt-24">
          <div className="mx-auto grid max-w-7xl gap-8 rounded-[2rem] border border-white/70 bg-white/75 p-6 shadow-[0_30px_80px_rgba(15,23,42,0.08)] backdrop-blur xl:grid-cols-[1.08fr_0.92fr] xl:p-10">
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeIn} className="flex flex-col justify-center gap-6 py-3">
              <div className="space-y-4">
                <div className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-sm font-medium text-sky-900">
                  <ClipboardCheck className="size-4" />
                  AI-assisted complaint and feedback management
                </div>
                <h1 className="max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl xl:text-6xl xl:leading-[1.05]">
                  Manage insurance complaints and feedback with
                  <span className="bg-gradient-to-r from-slate-950 via-sky-700 to-cyan-500 bg-clip-text text-transparent">
                    {" "}clearer intake, faster triage, and visible follow-through.
                  </span>
                </h1>
                <p className="max-w-2xl text-base leading-8 text-slate-600 sm:text-lg">
                  Insighta helps customers submit insurance complaints clearly, share structured feedback through
                  ratings and categories, and keep complaint progress visible from intake to resolution.
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <Button asChild size="lg" className="rounded-full bg-slate-950 px-7 hover:bg-slate-800">
                  <Link href="/submit">
                    Submit a Complaint
                    <ArrowRight className="ml-2 size-4" />
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="rounded-full px-7">
                  <Link href="/track">Track a Ticket</Link>
                </Button>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                {[
                  {
                    title: "Guided complaint intake",
                    description:
                      "Capture policy details, issue context, and supporting evidence in one clear flow.",
                  },
                  {
                    title: "AI-assisted prioritization",
                    description:
                      "Surface urgency, category, and routing signals to support faster complaint review.",
                  },
                  {
                    title: "Structured feedback submission",
                    description:
                      "Collect customer feedback through star ratings and preset categories in a consistent format.",
                  },
                ].map((point) => (
                  <div key={point.title} className="rounded-[1.25rem] border border-slate-200/80 bg-slate-50/80 px-4 py-4 text-sm text-slate-700">
                    <p className="font-semibold text-slate-950">{point.title}</p>
                    <p className="mt-2 leading-6 text-slate-600">{point.description}</p>
                  </div>
                ))}
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, x: 72 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.8 }}>
              <div className="overflow-hidden rounded-[2rem] bg-[linear-gradient(160deg,_rgba(15,23,42,0.96),_rgba(14,116,144,0.82))] p-6 text-white shadow-[0_20px_80px_rgba(8,47,73,0.32)]">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.25em] text-sky-100/80">
                      Queue preview
                    </p>
                    <h2 className="mt-3 max-w-sm text-2xl font-semibold leading-tight">
                      Priority-aware complaint routing for insurance operations.
                    </h2>
                  </div>
                  <div className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold">
                    Keep case progress and customer input visible
                  </div>
                </div>

                <div className="mt-6 grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
                  <div className="rounded-[1.5rem] border border-white/15 bg-white/10 p-4 backdrop-blur">
                    <div className="rounded-[1.25rem] bg-white/95 p-4 text-slate-900">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-slate-500">Claimant timeline</p>
                          <p className="mt-1 text-lg font-semibold">Misrouted reimbursement dispute</p>
                        </div>
                        <span className="rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-700">
                          Escalate
                        </span>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center justify-between rounded-[1.25rem] border border-white/10 bg-slate-950/20 px-4 py-3 text-sm">
                      <span>Help teams spot urgent, misrouted, or high-risk complaint cases before they stall.</span>
                      <ArrowRight className="size-4" />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="rounded-[1.5rem] border border-white/15 bg-white/10 p-4 backdrop-blur">
                      <div className="flex items-center gap-3">
                        <div className="flex size-11 items-center justify-center rounded-2xl bg-white/15">
                          <UserRoundSearch className="size-5" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-sky-50/80">Complaint and feedback visibility</p>
                          <p className="text-lg font-semibold">Keep case progress and customer input visible</p>
                        </div>
                      </div>
                    </div>
                    <div className="overflow-hidden rounded-[1.5rem] border border-white/15 bg-white/10 p-2 backdrop-blur">
                      <Image
                        src="/assets/images/try6.png"
                        alt="Insighta complaint tracking interface preview"
                        width={980}
                        height={1100}
                        className="h-[260px] w-full rounded-[1rem] object-cover object-top"
                        priority
                      />
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        <section id="capabilities" className="px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
          <div className="mx-auto max-w-7xl rounded-[2rem] border border-slate-200/80 bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.06)] xl:p-10">
            <div className="mx-auto max-w-3xl text-center">
              <div className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-sm font-medium text-slate-700">
                Capabilities
              </div>
              <h2 className="mt-4 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
                Built for complaint-heavy insurance operations.
              </h2>
            </div>
            <div className="mt-10 grid gap-4 lg:grid-cols-3">
              {cards.map((card) => {
                const Icon = card.icon;
                return (
                  <motion.article key={card.title} variants={itemFadeIn} whileHover={{ y: -6 }} className="rounded-[1.75rem] border border-slate-200 bg-[linear-gradient(180deg,_#ffffff_0%,_#f8fbff_100%)] p-6 shadow-sm">
                    <div className="flex size-14 items-center justify-center rounded-[1.25rem] bg-slate-950 text-white">
                      <Icon className="size-6" />
                    </div>
                    <h3 className="mt-5 text-xl font-semibold text-slate-950">{card.title}</h3>
                    <p className="mt-3 text-sm leading-7 text-slate-600">{card.body}</p>
                  </motion.article>
                );
              })}
            </div>
          </div>
        </section>

        <section id="workflow" className="px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
          <div className="mx-auto grid max-w-7xl gap-6 rounded-[2rem] border border-slate-200/80 bg-slate-950 p-6 text-white shadow-[0_20px_70px_rgba(15,23,42,0.18)] lg:grid-cols-[0.85fr_1.15fr] xl:p-10">
            <div className="space-y-4">
              <div className="inline-flex rounded-full border border-white/20 bg-white/10 px-3 py-1 text-sm font-medium text-sky-100">
                Workflow
              </div>
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                From issue submission to coordinated follow-through.
              </h2>
              <p className="text-base leading-8 text-slate-300 sm:text-lg">
                Insighta helps teams manage insurance complaints more clearly while also capturing structured customer
                feedback in one platform.
              </p>
              <div className="overflow-hidden rounded-[1.5rem] border border-white/10 bg-white/5">
                <Image src="/assets/images/blue_logo.png" alt="Insighta logo artwork" width={800} height={800} className="h-[280px] w-full object-cover" />
              </div>
            </div>

            <div className="grid gap-4">
              {steps.map((step, index) => (
                <div key={step} className="rounded-[1.5rem] border border-white/10 bg-white/5 p-5 backdrop-blur">
                  <p className="text-sm font-semibold uppercase tracking-[0.22em] text-sky-200">
                    Step 0{index + 1}
                  </p>
                  <p className="mt-3 text-lg leading-8 text-white">{step}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="contact" className="px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
          <div className="mx-auto max-w-5xl rounded-[2rem] border border-slate-200/80 bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.06)] xl:p-10">
            <div className="space-y-5">
              <div className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-sm font-medium text-slate-700">
                Why Insighta
              </div>
              <h2 className="text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
                Bring more structure to complaints and customer input.
              </h2>
              <div className="grid gap-4">
                {outcomeCards.map((card) => (
                  <div key={card.label} className="rounded-[1.35rem] border border-slate-200 bg-slate-50 px-4 py-4">
                    <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">{card.label}</p>
                    <p className="mt-2 text-lg font-semibold text-slate-950">{card.value}</p>
                    <p className="mt-2 text-sm leading-7 text-slate-600">{card.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
