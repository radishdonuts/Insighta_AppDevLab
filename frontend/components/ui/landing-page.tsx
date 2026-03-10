"use client";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  ClipboardCheck,
  UserRoundSearch,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { FeatureSteps } from "@/components/ui/feature-section";

const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6 } },
};

const slideInRight = {
  hidden: { opacity: 0, x: 72 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.8 } },
};

const itemFadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

const staggerContainer = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.12,
    },
  },
};

const viewportSettings = {
  once: false,
  amount: 0.25,
};

const capabilityFeatures = [
  {
    step: "Step 01",
    title: "Guided complaint intake",
    content:
      "Capture policy details, issue context, uploaded evidence, and contact information in one structured submission flow before review even starts.",
    image: "/assets/images/landing/feature-intake.jpg",
  },
  {
    step: "Step 02",
    title: "AI-assisted triage and routing",
    content:
      "Surface category, urgency, and handling signals early so staff can separate routine complaints from escalation-ready cases and keep the queue actionable.",
    image: "/assets/images/landing/feature-triage.jpg",
  },
  {
    step: "Step 03",
    title: "Visible follow-through with structured feedback",
    content:
      "Keep complaint progress easy to track while collecting customer ratings and feedback categories in a format teams can review consistently.",
    image: "/assets/images/landing/feature-tracking.jpg",
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
        <section className="px-4 pb-6 pt-4 sm:px-6 lg:px-8 lg:pb-8 lg:pt-6">
          <div className="mx-auto grid max-w-7xl gap-8 rounded-[2rem] border border-white/70 bg-white/75 p-6 shadow-[0_30px_80px_rgba(15,23,42,0.08)] backdrop-blur xl:grid-cols-[1.08fr_0.92fr] xl:p-10">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={viewportSettings}
              variants={staggerContainer}
              className="flex flex-col justify-center gap-6 py-3"
            >
              <motion.div variants={fadeIn} className="space-y-4">
                <motion.div
                  variants={itemFadeIn}
                  className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-sm font-medium text-sky-900"
                >
                  <ClipboardCheck className="size-4" />
                  AI-assisted complaint and feedback management
                </motion.div>
                <motion.h1
                  variants={itemFadeIn}
                  className="max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl xl:text-6xl xl:leading-[1.05]"
                >
                  Manage insurance complaints and feedback with 
                  <span className="bg-gradient-to-r from-slate-950 via-sky-700 to-cyan-500 bg-clip-text text-transparent">
                    {" "}speed, clarity, and accountability.
                  </span>
                </motion.h1>
              </motion.div>

              <motion.div variants={itemFadeIn} className="flex flex-col gap-3 sm:flex-row">
                <Button asChild size="lg" className="rounded-full bg-slate-950 px-7 hover:bg-slate-800">
                  <Link href="/submit">
                    Submit a Complaint
                    <ArrowRight className="ml-2 size-4" />
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="rounded-full px-7">
                  <Link href="/track">Track a Ticket</Link>
                </Button>
              </motion.div>
            </motion.div>

            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={viewportSettings}
              variants={slideInRight}
            >
              <div className="overflow-hidden rounded-[2rem] bg-[linear-gradient(160deg,_rgba(15,23,42,0.96),_rgba(14,116,144,0.82))] p-6 text-white shadow-[0_20px_80px_rgba(8,47,73,0.32)]">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.25em] text-sky-100/80">
                      Queue preview
                    </p>
                    <h2 className="mt-3 max-w-sm text-2xl font-semibold leading-tight">
                      Priority-first complaint triage for insurance operations.
                    </h2>
                  </div>
                  <div className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold">
                    Escalation-ready routing for urgent cases
                  </div>
                </div>

                <div className="mt-6 grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
                  <div className="rounded-[1.5rem] border border-white/15 bg-white/10 p-4 backdrop-blur">
                    <div className="rounded-[1.25rem] bg-white/95 p-4 text-slate-900">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-slate-500">High-risk complaint</p>
                          <p className="mt-1 text-lg font-semibold">Misrouted reimbursement dispute</p>
                        </div>
                        <span className="rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-700">
                          Escalate
                        </span>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center justify-between rounded-[1.25rem] border border-white/10 bg-slate-950/20 px-4 py-3 text-sm">
                      <span>Surface urgent complaints early and route them to the right reviewer before they stall.</span>
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
                          <p className="text-sm font-semibold text-sky-50/80">Escalation-ready routing</p>
                          <p className="text-lg font-semibold">Flag priority complaints and keep the staff queue actionable</p>
                        </div>
                      </div>
                    </div>
                    <div className="overflow-hidden rounded-[1.5rem] border border-white/15 bg-white/10 p-2 backdrop-blur">
                      <Image
                        src="/assets/images/try6.png"
                        alt="Insighta staff complaint queue preview"
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

        <section id="capabilities" className="px-4 py-5 sm:px-6 lg:px-8 lg:py-7">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={viewportSettings}
            variants={staggerContainer}
            className="mx-auto max-w-7xl rounded-[2rem] border border-slate-200/80 bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.06)] xl:p-10"
          >
            <motion.div variants={fadeIn} className="mx-auto max-w-3xl text-center">
              <div className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-sm font-medium text-slate-700">
                Capabilities
              </div>
            </motion.div>
            <div className="mt-8">
              <FeatureSteps
                features={capabilityFeatures}
                title="Built for complaint-heavy insurance operations."
                autoPlayInterval={4000}
                imageHeight="h-[320px] sm:h-[420px] lg:h-[520px]"
              />
            </div>
          </motion.div>
        </section>

        <section id="workflow" className="px-4 py-5 sm:px-6 lg:px-8 lg:py-7">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={viewportSettings}
            variants={staggerContainer}
            className="mx-auto grid max-w-7xl gap-6 rounded-[2rem] border border-slate-200/80 bg-slate-950 p-6 text-white shadow-[0_20px_70px_rgba(15,23,42,0.18)] lg:grid-cols-[0.85fr_1.15fr] xl:p-10"
          >
            <motion.div variants={fadeIn} className="space-y-4">
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
            </motion.div>

            <motion.div variants={staggerContainer} className="grid gap-4">
              {steps.map((step, index) => (
                <motion.div key={step} variants={itemFadeIn} className="rounded-[1.5rem] border border-white/10 bg-white/5 p-5 backdrop-blur">
                  <p className="text-sm font-semibold uppercase tracking-[0.22em] text-sky-200">
                    Step 0{index + 1}
                  </p>
                  <p className="mt-3 text-lg leading-8 text-white">{step}</p>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        </section>

        <section id="contact" className="px-4 py-5 sm:px-6 lg:px-8 lg:py-7">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={viewportSettings}
            variants={staggerContainer}
            className="mx-auto max-w-5xl rounded-[2rem] border border-slate-200/80 bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.06)] xl:p-10"
          >
            <motion.div variants={fadeIn} className="space-y-5">
              <div className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-sm font-medium text-slate-700">
                Why Insighta
              </div>
              <h2 className="text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
                Bring more structure to complaints and customer input.
              </h2>
              <motion.div variants={staggerContainer} className="grid gap-4">
                {outcomeCards.map((card) => (
                  <motion.div
                    key={card.label}
                    variants={itemFadeIn}
                    className="rounded-[1.35rem] border border-slate-200 bg-slate-50 px-4 py-4"
                  >
                    <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">{card.label}</p>
                    <p className="mt-2 text-lg font-semibold text-slate-950">{card.value}</p>
                    <p className="mt-2 text-sm leading-7 text-slate-600">{card.description}</p>
                  </motion.div>
                ))}
              </motion.div>
            </motion.div>
          </motion.div>
        </section>
      </main>
    </div>
  );
}
