"use client";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  ClipboardCheck,
  Circle,
  Github,
  Instagram,
  Linkedin,
  Search,
  SlidersHorizontal,
  Twitter,
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

const queuePreviewTickets = [
  {
    id: "preview-urgent",
    ticketNumber: "TRK-FQBL-J44K-H2JU",
    title: "Delayed reimbursement for emergency admission",
    status: "Escalated",
    priority: "High",
    category: "Claims",
    assignee: "Maria Dela Cruz",
    updated: "5m ago",
  },
  {
    id: "preview-followup",
    ticketNumber: "TRK-M7CP-9XLD-Q8WR",
    title: "Policy cancellation refund follow-up",
    status: "In Progress",
    priority: "Medium",
    category: "Billing",
    assignee: "Queue review",
    updated: "18m ago",
  },
];

function previewBadgeClass(kind: "status" | "priority", value: string) {
  if (kind === "status") {
    if (value === "Escalated") return "border-rose-200 bg-rose-50 text-rose-700";
    if (value === "In Progress") return "border-blue-200 bg-blue-50 text-blue-700";
    return "border-slate-200 bg-slate-100 text-slate-700";
  }

  if (value === "High") return "border-amber-200 bg-amber-50 text-amber-700";
  if (value === "Medium") return "border-orange-200 bg-orange-50 text-orange-700";
  return "border-slate-200 bg-slate-100 text-slate-700";
}

export function InsightaLandingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-[#ffffff] text-[#0A111F]">
      <main className="flex-1">
        <section className="px-4 pb-6 pt-4 sm:px-6 lg:px-8 lg:pb-8 lg:pt-6">
          <div className="mx-auto grid max-w-7xl gap-8 rounded-[2rem] border border-[#D9E1E8] bg-[#EBEDF0] p-6 shadow-[0_30px_80px_rgba(10,17,31,0.12)] xl:grid-cols-[1.08fr_0.92fr] xl:p-10">
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
                  className="inline-flex items-center gap-2 rounded-full border border-[#AFC3D5] bg-[#D9E4EE] px-3 py-1 text-sm font-medium text-[#1E5D88]"
                >
                  <ClipboardCheck className="size-4" />
                  AI-assisted complaint and feedback management
                </motion.div>
                <motion.h1
                  variants={itemFadeIn}
                  className="max-w-3xl text-4xl font-bold tracking-tight text-[#0A111F] sm:text-5xl xl:text-6xl xl:leading-[1.05]"
                >
                  Manage insurance complaints and feedback with 
                  <span className="bg-gradient-to-r from-[#0A111F] via-[#005D9F] to-[#19B5D8] bg-clip-text text-transparent">
                    {" "}speed, clarity, and accountability.
                  </span>
                </motion.h1>
              </motion.div>

              <motion.div variants={itemFadeIn} className="flex flex-col gap-3 sm:flex-row">
                <Button asChild size="lg" className="rounded-full bg-[#005D9F] px-7 text-white hover:bg-[#004C81]">
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
              <div className="overflow-hidden rounded-[2rem] border border-[#D9E1E8] bg-[#F3F5F7] p-5 text-[#0A111F] shadow-[0_24px_64px_rgba(10,17,31,0.1)] xl:p-5">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#6A7D90]">
                      Queue preview
                    </p>
                    <h2 className="mt-2 max-w-sm text-xl font-semibold leading-tight text-[#0A111F]">
                      Ticket workspace for fast queue review.
                    </h2>
                  </div>
                  <div className="rounded-full border border-[#AFC3D5] bg-[#D9E4EE] px-3 py-1 text-xs font-semibold text-[#1E5D88]">
                    Staff workflow
                  </div>
                </div>

                <div className="mt-4 rounded-[1.5rem] border border-[#D9E1E8] bg-[#EBEDF0] p-3.5">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#D9E1E8] pb-3">
                    <div className="flex items-center gap-3">
                      <div className="flex size-9 items-center justify-center rounded-xl border border-[#B7CADB] bg-[#DCE6EF]">
                        <ClipboardCheck className="size-4.5 text-[#005D9F]" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-[#0A111F]">Ticket Workspace</p>
                        <p className="text-xs text-[#7A8897]">Assigned and escalation-ready queue</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="inline-flex items-center gap-2 rounded-full border border-[#D1D9E0] bg-[#F8F9FA] px-3 py-1 text-xs text-[#718295]">
                        <Search className="size-3.5" />
                        Search tickets
                      </div>
                      <div className="inline-flex size-7 items-center justify-center rounded-full border border-[#D1D9E0] bg-[#F8F9FA] text-[#718295]">
                        <SlidersHorizontal className="size-4" />
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-[#0A111F] px-3 py-1 text-xs font-semibold text-white">
                      Assigned
                    </span>
                    <span className="rounded-full border border-[#D1D9E0] bg-[#F8F9FA] px-3 py-1 text-xs font-semibold text-[#66788B]">
                      Unassigned
                    </span>
                    <span className="rounded-full border border-[#D1D9E0] bg-[#F8F9FA] px-3 py-1 text-xs font-semibold text-[#66788B]">
                      All
                    </span>
                  </div>

                  <div className="mt-3 grid gap-2.5">
                    <div className="rounded-[1.25rem] border border-[#D4DCE3] bg-[#F8F9FA] p-3.5 shadow-sm">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold text-[#66788B]">{queuePreviewTickets[0].ticketNumber}</p>
                            <span className="inline-flex items-center gap-1 text-xs text-[#94A0AE]">
                              <Circle className="size-2 fill-current stroke-none" />
                              {queuePreviewTickets[0].updated}
                            </span>
                          </div>
                          <p className="mt-1.5 line-clamp-2 text-[15px] font-semibold leading-6 text-[#0A111F]">
                            {queuePreviewTickets[0].title}
                          </p>
                        </div>
                        <div className="rounded-full border border-[#D1D9E0] bg-[#EEF1F4] px-2.5 py-1 text-xs font-semibold text-[#5F7082]">
                          {queuePreviewTickets[0].category}
                        </div>
                      </div>

                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${previewBadgeClass("status", queuePreviewTickets[0].status)}`}
                        >
                          {queuePreviewTickets[0].status}
                        </span>
                        <span
                          className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${previewBadgeClass("priority", queuePreviewTickets[0].priority)}`}
                        >
                          {queuePreviewTickets[0].priority}
                        </span>
                      </div>

                      <div className="mt-3 flex items-center justify-between gap-3 rounded-[1rem] border border-[#D1D9E0] bg-[#EEF1F4] px-3 py-2 text-sm">
                        <div>
                          <p className="font-medium text-[#0A111F]">{queuePreviewTickets[0].assignee}</p>
                          <p className="text-xs text-[#718295]">Current owner</p>
                        </div>
                        <div className="inline-flex items-center gap-2 text-sm font-medium text-[#005D9F]">
                          Open ticket
                          <ArrowRight className="size-4" />
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-3 rounded-[1rem] border border-[#D4DCE3] bg-[#F8F9FA] px-3 py-2.5 text-sm shadow-sm">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-[#66788B]">{queuePreviewTickets[1].ticketNumber}</p>
                          <span className="inline-flex items-center gap-1 text-xs text-[#94A0AE]">
                            <Circle className="size-2 fill-current stroke-none" />
                            {queuePreviewTickets[1].updated}
                          </span>
                        </div>
                        <p className="mt-1 truncate font-medium text-[#0A111F]">{queuePreviewTickets[1].title}</p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <span
                          className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${previewBadgeClass("priority", queuePreviewTickets[1].priority)}`}
                        >
                          {queuePreviewTickets[1].priority}
                        </span>
                        <ArrowRight className="size-4 text-[#005D9F]" />
                      </div>
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
            className="mx-auto max-w-7xl rounded-[2rem] border border-[#D9E1E8] bg-[#EBEDF0] p-6 shadow-[0_20px_60px_rgba(10,17,31,0.1)] xl:p-10"
          >
            <motion.div variants={fadeIn} className="mx-auto max-w-3xl text-center">
              <div className="inline-flex rounded-full border border-[#D1D9E0] bg-[#F6F7F8] px-3 py-1 text-sm font-medium text-[#586A7C]">
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
            className="mx-auto grid max-w-7xl gap-6 rounded-[2rem] border border-[#D9E1E8] bg-[#EBEDF0] p-6 text-[#0A111F] shadow-[0_20px_60px_rgba(10,17,31,0.1)] lg:grid-cols-[0.85fr_1.15fr] xl:p-10"
          >
            <motion.div variants={fadeIn} className="space-y-4">
              <div className="inline-flex rounded-full border border-[#D1D9E0] bg-[#F6F7F8] px-3 py-1 text-sm font-medium text-[#586A7C]">
                Workflow
              </div>
              <h2 className="text-3xl font-bold tracking-tight text-[#0A111F] sm:text-4xl">
                From issue submission to coordinated follow-through.
              </h2>
              <p className="text-base leading-8 text-[#5D6D7E] sm:text-lg">
                Insighta helps teams manage insurance complaints more clearly while also capturing structured customer
                feedback in one platform.
              </p>
              <Image
                src="/assets/images/blue_logo.png"
                alt="Insighta logo artwork"
                width={800}
                height={800}
                className="h-[280px] w-full object-contain"
              />
            </motion.div>

            <motion.div variants={staggerContainer} className="grid gap-4">
              {steps.map((step, index) => (
                <motion.div key={step} variants={itemFadeIn} className="rounded-[1.5rem] border border-[#D1D9E0] bg-[#F6F7F8] p-5 shadow-sm">
                  <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#6A7D90]">
                    Step 0{index + 1}
                  </p>
                  <p className="mt-3 text-lg leading-8 text-[#0A111F]">{step}</p>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        </section>

      </main>
      <footer className="px-4 pb-8 pt-4 sm:px-6 lg:px-8 lg:pb-10">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={viewportSettings}
          variants={fadeIn}
          className="mx-auto grid max-w-7xl gap-6 rounded-[2rem] border border-[#D9E1E8] bg-[#EBEDF0] p-6 shadow-[0_20px_60px_rgba(10,17,31,0.1)] lg:grid-cols-[1.3fr_0.8fr_0.8fr] xl:p-8"
        >
          <div className="space-y-4">
            <Link href="/" className="flex items-center gap-3">
              <Image
                src="/assets/images/blue_logo.png"
                alt="Insighta logo"
                width={48}
                height={48}
                className="size-12 object-contain"
              />
              <div>
                <p className="text-xl font-bold text-[#0A111F]">Insighta</p>
                <p className="text-sm text-[#5D6D7E]">Insurance complaint workflow platform</p>
              </div>
            </Link>
            <p className="max-w-sm text-sm leading-7 text-[#5D6D7E]">
              Manage complaint intake, queue review, follow-through, and customer visibility in one structured support experience.
            </p>
            <div className="flex items-center gap-3">
              {[
                { icon: Instagram, label: "Instagram" },
                { icon: Twitter, label: "Twitter" },
                { icon: Linkedin, label: "LinkedIn" },
                { icon: Github, label: "GitHub" },
              ].map((social) => {
                const Icon = social.icon;
                return (
                  <Link
                    key={social.label}
                    href="#"
                    className="inline-flex size-10 items-center justify-center rounded-full border border-[#D1D9E0] bg-[#F6F7F8] text-[#5D6D7E] transition-colors hover:border-[#AFC3D5] hover:text-[#005D9F]"
                    aria-label={social.label}
                  >
                    <Icon className="size-4.5" />
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-[#0A111F]">Company</h3>
            <nav className="flex flex-col gap-3 text-sm">
              <Link href="/about" className="text-[#5D6D7E] hover:text-[#005D9F]">
                About
              </Link>
              <Link href="/submit" className="text-[#5D6D7E] hover:text-[#005D9F]">
                Submit a Ticket
              </Link>
              <Link href="/track" className="text-[#5D6D7E] hover:text-[#005D9F]">
                Track Ticket
              </Link>
              <Link href="/feedback" className="text-[#5D6D7E] hover:text-[#005D9F]">
                Feedback
              </Link>
            </nav>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-[#0A111F]">Resources</h3>
            <nav className="flex flex-col gap-3 text-sm">
              <Link href="/login" className="text-[#5D6D7E] hover:text-[#005D9F]">
                Login
              </Link>
              <Link href="/register" className="text-[#5D6D7E] hover:text-[#005D9F]">
                Register
              </Link>
              <Link href="#" className="text-[#5D6D7E] hover:text-[#005D9F]">
                Privacy Policy
              </Link>
              <Link href="#" className="text-[#5D6D7E] hover:text-[#005D9F]">
                Terms of Service
              </Link>
            </nav>
          </div>

        </motion.div>

        <div className="mx-auto mt-4 flex max-w-7xl flex-col items-center justify-between gap-3 border-t border-[#97A9BC] px-1 pt-4 text-xs text-[#31465B] sm:flex-row">
          <p>&copy; {new Date().getFullYear()} Insighta. All rights reserved.</p>
          <p className="text-[#41576D]">Built for structured complaint and feedback operations.</p>
        </div>
      </footer>
    </div>
  );
}
