"use client";

import {
  ArrowLeft,
  ArrowRight,
  Brain,
  BracketsCurly,
  Buildings,
  CheckCircle,
  CloudRain,
  Database,
  FloppyDisk,
  LockKey,
  MapPin,
  Microscope,
  ShieldCheck,
  SignOut,
  UserCircle,
  UsersThree,
  WaveSine,
} from "@phosphor-icons/react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import {
  type FormEvent,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";
import { sendPasswordResetEmail, updateProfile } from "firebase/auth";
import { useMutation, useQuery } from "convex/react";

import { WorkspaceGate } from "@/components/auth/WorkspaceGate";
import { AppShell } from "@/components/prototype/AppShell";
import { Button } from "@/components/ui";
import { useFirebaseAuth } from "@/components/auth/FirebaseAuthProvider";
import type { ProductRole } from "@/data/prototype";
import {
  type ProvisionAccount,
  WithEnsureCurrent,
} from "@/components/auth/EnsureCurrent";
import { convexConfigured } from "@/lib/convex-config";
import { api } from "../../../../../convex/_generated/api";
import type { User } from "firebase/auth";

import { getFirebaseAuth } from "@/lib/firebase";

import {
  ActionLink,
  CheckControl,
  Notice,
  PasswordField,
  PageHeading,
  SelectControl,
  StatusBadge,
  Stepper,
  Surface,
  TextAreaField,
  TextField,
} from "./Primitives";

function PublicShell({
  children,
  showPublicLinks = false,
}: {
  children: ReactNode;
  showPublicLinks?: boolean;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const sourceReturn = searchParams.get("from");
  const preservedReturn = searchParams.get("return");
  const isInformationPage = [
    "/about",
    "/methodology",
    "/official-sources",
  ].includes(pathname);
  const informationParent = isInformationPage ? pathname : sourceReturn;
  const informationReturn =
    pathname === "/methodology" ? sourceReturn : preservedReturn;
  const informationQuery = informationParent
    ? `?from=${encodeURIComponent(informationParent)}${
        informationReturn
          ? `&return=${encodeURIComponent(informationReturn)}`
          : ""
      }`
    : "";

  return (
    <div className="min-h-screen bg-canvas text-ink">
      <header className="flex min-h-16 items-center border-b border-line px-4 sm:px-6">
        <Link href="/welcome" className="flex items-center gap-2">
          <WaveSine size={30} weight="bold" />
          <span className="text-section">RiverGuard</span>
        </Link>
        {showPublicLinks ? (
          <nav
            className="text-navigation ml-auto hidden items-center gap-4 sm:flex"
            aria-label="Public navigation"
          >
            <Link href={`/about${informationQuery}`}>About</Link>
            <Link href={`/official-sources${informationQuery}`}>
              Official sources
            </Link>
          </nav>
        ) : null}
      </header>
      {children}
    </div>
  );
}

export function WelcomeScreen() {
  const roleCards = [
    {
      icon: <MapPin size={22} />,
      title: "Residents",
      body: "Read a simplified outlook for a supported city and follow official safety sources when conditions change.",
    },
    {
      icon: <Buildings size={22} />,
      title: "LGU operators",
      body: "Review stored forecasts for assigned locations and record an internal operational assessment.",
    },
    {
      icon: <Microscope size={22} />,
      title: "Researchers",
      body: "Run three- or seven-day forecasts, inspect model inputs, and compare stored results.",
    },
    {
      icon: <UsersThree size={22} />,
      title: "Administrators",
      body: "Manage account access, supported locations, data sources, and platform configuration.",
    },
  ];

  const pipeline = [
    {
      number: "01",
      title: "Weather window",
      body: "Open-Meteo supplies current, antecedent, and forecast weather values.",
    },
    {
      number: "02",
      title: "Feature calculation",
      body: "RiverGuard derives rainfall totals, soil moisture, temperature, month, and elevation.",
    },
    {
      number: "03",
      title: "Model scoring",
      body: "The classifier estimates flood probability while the regressor estimates a water-level proxy.",
    },
    {
      number: "04",
      title: "Stored result",
      body: "Each completed run keeps its provider, model version, quality status, and limitations.",
    },
  ];

  return (
    <div className="landing-page min-h-screen bg-[#f5f8fb] text-[#071b3d]">
      <header className="landing-nav sticky top-0 z-40 border-b border-[#0a2a4b]/10 bg-[#f8fbfd]/95 backdrop-blur-xl">
        <div className="mx-auto flex min-h-[4.75rem] max-w-[90rem] items-center px-5 sm:px-8 lg:px-16">
          <Link
            href="/welcome"
            className="group flex items-center gap-3"
            aria-label="RiverGuard home"
          >
            <span className="relative block size-11 overflow-hidden bg-white ring-1 ring-[#0a2a4b]/12">
              <Image
                src="/images/riverguard-logo.jpg"
                alt=""
                width={1024}
                height={1024}
                priority
                className="absolute left-1/2 top-[68%] w-[88px] max-w-none -translate-x-1/2 -translate-y-1/2"
              />
            </span>
            <span className="text-xl font-semibold tracking-[-0.04em] text-[#071b3d]">
              RiverGuard
            </span>
          </Link>

          <nav
            aria-label="Public navigation"
            className="ml-auto hidden items-center gap-7 text-sm font-medium text-[#42566c] lg:flex"
          >
            <Link className="landing-nav-link" href="#purpose">
              Purpose
            </Link>
            <Link className="landing-nav-link" href="#how-it-works">
              How it works
            </Link>
            <Link className="landing-nav-link" href="#responsible-use">
              Responsible use
            </Link>
          </nav>

          <div className="ml-auto flex items-center gap-2 lg:ml-8">
            <Link
              href="/auth/login"
              className="hidden min-h-11 items-center justify-center rounded-xl px-4 text-sm font-semibold text-[#0a3157] transition hover:bg-[#e7f0f7] lg:inline-flex"
            >
              Log in
            </Link>
            <Link
              href="/auth/signup"
              className="landing-primary-button inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#086ccf] px-5 text-sm font-semibold text-white shadow-[0_10px_28px_rgba(8,108,207,0.22)] transition duration-200 hover:-translate-y-0.5 hover:bg-[#075db2] active:translate-y-0"
            >
              Create an account <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </header>

      <main id="top">
        <section className="landing-hero relative isolate min-h-[calc(100svh-4.75rem)] overflow-hidden px-5 py-12 sm:px-8 sm:py-16 lg:px-16 xl:h-[calc(100svh-4.75rem)] xl:min-h-0 xl:py-10">
          <div className="landing-river-glow pointer-events-none absolute inset-0 -z-10" />
          <div className="landing-hero-grid mx-auto grid min-h-[calc(100svh-10.75rem)] max-w-[90rem] items-center gap-12 xl:h-full xl:min-h-0 xl:grid-cols-[minmax(0,0.82fr)_minmax(34rem,1.18fr)] xl:gap-16">
            <div className="landing-enter max-w-2xl">
              <p className="inline-flex items-center gap-2 rounded-full border border-[#157e8e]/20 bg-white/72 px-3 py-1.5 text-sm font-semibold text-[#146877] shadow-sm">
                <span className="size-2 rounded-full bg-[#16a0ae]" />
                Flood-risk decision support for Metro Manila
              </p>
              <h1 className="mt-7 text-[clamp(3.2rem,7vw,6.6rem)] leading-[0.88] font-semibold tracking-[-0.07em] text-[#071b3d]">
                Flood-risk forecasts for NCR cities.
              </h1>
              <p className="mt-7 max-w-xl text-lg leading-8 text-[#314b64]">
                RiverGuard combines weather inputs with a city-level
                machine-learning model, then keeps every completed run available
                for review.
              </p>
              <p className="mt-5 text-sm font-semibold text-[#173f65]">
                Four supported NCR cities · Three- or seven-day horizons
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/auth/login"
                  className="landing-primary-button inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#086ccf] px-6 text-base font-semibold text-white shadow-[0_14px_32px_rgba(8,108,207,0.24)] transition duration-200 hover:-translate-y-0.5 hover:bg-[#075db2] active:translate-y-0"
                >
                  Open your workspace <ArrowRight size={18} />
                </Link>
              </div>
            </div>

            <div className="landing-enter landing-product-frame relative mx-auto w-full max-w-[50rem] overflow-hidden rounded-[1.4rem] border border-[#0c355b]/10 bg-[#f8fbfc] p-3 shadow-[0_36px_90px_rgba(7,36,68,0.18)] sm:p-4 xl:h-full xl:max-h-[36rem]">
              <div className="grid h-full min-h-0 gap-3 sm:grid-cols-[1.25fr_0.75fr]">
                <div className="relative min-h-[20rem] overflow-hidden rounded-[1.25rem] bg-[#dbeaf2] p-5 sm:min-h-[27rem] sm:p-6">
                  <div className="landing-contours absolute inset-0 opacity-75" />
                  <div className="relative z-10 flex h-full flex-col justify-between">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-xs font-semibold text-[#32717b]">
                          Geographic context
                        </p>
                        <p className="mt-1 text-2xl font-semibold tracking-[-0.04em] text-[#082a4b]">
                          Marikina River
                        </p>
                      </div>
                      <span className="inline-flex size-10 items-center justify-center rounded-xl bg-white/85 text-[#0871c9] shadow-sm">
                        <MapPin size={20} weight="fill" />
                      </span>
                    </div>
                    <div className="relative mx-auto flex size-44 items-center justify-center overflow-hidden border border-white/75 bg-white shadow-[0_24px_60px_rgba(7,54,91,0.16)] sm:size-56">
                      <Image
                        src="/images/riverguard-logo.jpg"
                        alt="RiverGuard river and data-network mark"
                        width={1024}
                        height={1024}
                        className="absolute left-1/2 top-[68%] w-[200%] max-w-none -translate-x-1/2 -translate-y-1/2"
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        ["Weather", "Open-Meteo"],
                        ["Model", "0.1.0-test"],
                        ["Storage", "Convex"],
                      ].map(([label, value]) => (
                        <div
                          key={label}
                          className="rounded-xl bg-white/80 p-3 backdrop-blur-sm"
                        >
                          <p className="text-[0.68rem] text-[#64798b]">
                            {label}
                          </p>
                          <p className="mt-1 truncate text-xs font-semibold text-[#123653]">
                            {value}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-rows-[auto_1fr_auto]">
                  <article className="landing-preview-evidence rounded-[1.25rem] bg-[#082b4d] p-5 text-white shadow-[0_18px_40px_rgba(7,36,68,0.16)]">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold">Forecast evidence</p>
                      <CloudRain size={21} className="text-[#5fd1dc]" />
                    </div>
                    <p className="landing-preview-title mt-7 text-3xl font-semibold tracking-[-0.05em]">
                      Seven days
                    </p>
                    <p className="mt-2 text-sm leading-6 text-white/66">
                      Rainfall, probability, predicted level, and risk status
                      remain linked to the run.
                    </p>
                  </article>

                  <article className="landing-preview-pipeline rounded-[1.25rem] border border-[#0c355b]/10 bg-white p-5">
                    <div className="flex items-center gap-2 text-[#0c446b]">
                      <Database size={19} />
                      <p className="text-sm font-semibold">
                        Traceable pipeline
                      </p>
                    </div>
                    <div className="landing-preview-steps mt-5 grid gap-3">
                      {[
                        "Weather retrieved",
                        "Features calculated",
                        "Run stored",
                      ].map((item, index) => (
                        <div key={item} className="flex items-center gap-3">
                          <span className="flex size-7 items-center justify-center rounded-full bg-[#e3f2f5] text-xs font-bold text-[#147384]">
                            {index + 1}
                          </span>
                          <span className="text-sm font-medium text-[#40566b]">
                            {item}
                          </span>
                        </div>
                      ))}
                    </div>
                  </article>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-[1.1rem] border border-[#0c355b]/10 bg-white p-4">
                      <p className="text-xs text-[#53697d]">Supported cities</p>
                      <p className="mt-1 text-2xl font-semibold text-[#0b3154]">
                        4
                      </p>
                    </div>
                    <div className="rounded-[1.1rem] border border-[#0c355b]/10 bg-white p-4">
                      <p className="text-xs text-[#53697d]">Run status</p>
                      <p className="mt-2 text-sm font-semibold text-[#147384]">
                        Source visible
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section
          id="purpose"
          className="scroll-mt-20 bg-white px-5 py-24 sm:px-8 lg:px-16 lg:py-32"
        >
          <div className="mx-auto max-w-[90rem]">
            <div className="grid gap-8 lg:grid-cols-[0.7fr_1.3fr] lg:gap-16">
              <div>
                <p className="text-sm font-semibold text-[#147384]">
                  RiverGuard purpose
                </p>
                <h2 className="mt-3 max-w-lg text-[clamp(2.4rem,5vw,4.7rem)] leading-[0.96] font-semibold tracking-[-0.06em] text-[#071b3d]">
                  City-level evidence for four responsibilities.
                </h2>
                <p className="mt-5 max-w-md text-base leading-7 text-[#334b61]">
                  RiverGuard helps supported NCR cities inspect experimental
                  flood-risk information without presenting the model as an
                  official warning system.
                </p>
                <p className="mt-5 text-sm font-semibold text-[#173f65]">
                  Current coverage: Quezon City, Marikina, Manila, and Pasig
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {roleCards.map((card) => (
                  <article
                    key={card.title}
                    className="landing-card rounded-[1.4rem] border border-[#0b3358]/10 bg-[#f6f9fb] p-6 transition duration-200 hover:-translate-y-0.5 hover:border-[#0d76c7]/20 hover:shadow-[0_18px_48px_rgba(7,42,76,0.08)]"
                  >
                    <span className="inline-flex size-11 items-center justify-center rounded-xl bg-[#e4f2f4] text-[#126e7a]">
                      {card.icon}
                    </span>
                    <h3 className="mt-6 text-xl font-semibold tracking-[-0.03em] text-[#0b2b4b]">
                      {card.title === "Residents"
                        ? "Resident outlook"
                        : card.title === "LGU operators"
                          ? "LGU forecast review"
                          : card.title === "Researchers"
                            ? "Research workspace"
                            : "Administrator controls"}
                    </h3>
                    <p className="mt-3 text-sm leading-6 text-[#374e63]">
                      {card.body}
                    </p>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section
          id="how-it-works"
          className="scroll-mt-20 bg-[#eaf2f7] px-5 py-24 sm:px-8 lg:px-16 lg:py-32"
        >
          <div className="mx-auto max-w-[90rem]">
            <div className="max-w-3xl">
              <p className="text-sm font-semibold text-[#147384]">
                Forecast pipeline
              </p>
              <h2 className="mt-3 text-[clamp(2.4rem,5vw,4.7rem)] leading-[0.96] font-semibold tracking-[-0.06em] text-[#071b3d]">
                From weather data to a stored run.
              </h2>
              <p className="mt-5 max-w-2xl text-base leading-7 text-[#30495f]">
                The interface keeps the source, calculated inputs, model
                version, and limitations beside the result.
              </p>
            </div>
            <div className="mt-14 grid gap-px overflow-hidden rounded-[1.5rem] border border-[#0b3358]/10 bg-[#0b3358]/10 lg:grid-cols-4">
              {pipeline.map((step, index) => (
                <article key={step.number} className="min-h-64 bg-white p-7">
                  <div className="flex items-center justify-between text-[#168191]">
                    <p className="text-sm font-semibold">{step.number}</p>
                    {index === 0 ? (
                      <CloudRain size={23} />
                    ) : index === 1 ? (
                      <BracketsCurly size={23} />
                    ) : index === 2 ? (
                      <Brain size={23} />
                    ) : (
                      <Database size={23} />
                    )}
                  </div>
                  <h3 className="mt-12 text-xl font-semibold tracking-[-0.03em] text-[#0a2b4d]">
                    {step.title}
                  </h3>
                  <p className="mt-3 text-sm leading-6 text-[#374e63]">
                    {step.body}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section
          id="responsible-use"
          className="scroll-mt-20 bg-white px-5 py-24 sm:px-8 lg:px-16 lg:py-32"
        >
          <div className="mx-auto grid max-w-[90rem] items-center gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:gap-20">
            <div className="relative overflow-hidden rounded-[1.75rem] bg-[#0a2d50] p-7 text-white sm:p-10 lg:min-h-[34rem]">
              <div className="landing-dark-contours absolute inset-0 opacity-45" />
              <div className="relative flex min-h-[27rem] flex-col justify-between">
                <div className="flex items-center justify-between gap-4">
                  <span className="inline-flex size-12 items-center justify-center rounded-xl bg-white/10 text-[#6be0e6]">
                    <ShieldCheck size={24} />
                  </span>
                  <span className="rounded-full border border-white/15 px-3 py-1 text-xs font-semibold text-white/75">
                    Research use
                  </span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#71d7dc]">
                    Known boundary
                  </p>
                  <p className="mt-3 max-w-xl text-3xl font-semibold leading-tight tracking-[-0.045em] sm:text-5xl">
                    A model output is evidence, not an official warning.
                  </p>
                </div>
              </div>
            </div>
            <div>
              <p className="text-sm font-semibold text-[#147384]">
                Responsible use
              </p>
              <h2 className="mt-3 text-[clamp(2.4rem,5vw,4.6rem)] leading-[0.96] font-semibold tracking-[-0.06em] text-[#071b3d]">
                Limits stay beside the result.
              </h2>
              <p className="mt-6 max-w-xl text-base leading-8 text-[#31495f]">
                RiverGuard identifies experimental city-level risk. Predicted
                water level is a model-derived proxy, local hazard geometry is
                not yet verified, and official agencies remain the source for
                emergency instructions.
              </p>
              <div className="mt-8 grid gap-3">
                {[
                  "Forecasts are available only for supported city-level locations.",
                  "Missing or unsupported data is not presented as assumed low risk.",
                  "Use PAGASA and your local LGU or DRRMO for advisories and evacuation instructions.",
                ].map((item) => (
                  <div
                    key={item}
                    className="flex items-start gap-3 border-t border-[#123d60]/12 pt-3 text-sm leading-6 text-[#31495f]"
                  >
                    <CheckCircle
                      size={18}
                      weight="fill"
                      className="mt-0.5 shrink-0 text-[#168191]"
                    />
                    <p>{item}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/10 bg-[#071b3d] px-5 py-12 text-white sm:px-8 lg:px-16 lg:py-16">
        <div className="mx-auto grid max-w-[90rem] gap-10 sm:grid-cols-[1fr_auto] sm:items-end">
          <div>
            <div className="flex items-center gap-3">
              <span className="relative block size-12 overflow-hidden bg-white ring-1 ring-white/15">
                <Image
                  src="/images/riverguard-logo.jpg"
                  alt=""
                  width={1024}
                  height={1024}
                  className="absolute left-1/2 top-[68%] w-24 max-w-none -translate-x-1/2 -translate-y-1/2"
                />
              </span>
              <span className="text-xl font-semibold tracking-[-0.04em] text-white">
                RiverGuard
              </span>
            </div>
            <p className="mt-4 max-w-md text-sm leading-6 text-white/65">
              Experimental flood-risk decision support for supported NCR cities.
            </p>
          </div>
          <nav
            aria-label="Landing page information"
            className="flex flex-wrap gap-x-6 gap-y-3 text-sm font-semibold text-white/75 sm:justify-end"
          >
            <Link className="transition hover:text-white" href="#purpose">
              Purpose
            </Link>
            <Link className="transition hover:text-white" href="#how-it-works">
              How it works
            </Link>
            <Link
              className="transition hover:text-white"
              href="#responsible-use"
            >
              Responsible use
            </Link>
            <Link className="transition hover:text-white" href="#top">
              Back to top
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}

function AuthLayout({
  accountRole,
  children,
  title,
  description,
}: {
  accountRole?: ProductRole;
  children: ReactNode;
  description: string;
  title: string;
}) {
  const accountContent = {
    public: {
      eyebrow: "RiverGuard access",
      heading: "Your flood-risk workspace, securely connected.",
      body: "Sign in to continue to the tools and evidence available to your RiverGuard role.",
    },
    resident: {
      eyebrow: "Resident access",
      heading: "Flood information for your city.",
      body: "Create an account to save locations and review RiverGuard outlooks.",
    },
    lgu: {
      eyebrow: "LGU operator access",
      heading: "Operational access for local response teams.",
      body: "Request access to city-level flood-risk evidence and review workflows.",
    },
    researcher: {
      eyebrow: "Researcher access",
      heading: "Research access with clear responsibility.",
      body: "Provide your research context so an administrator can review your request.",
    },
    admin: {
      eyebrow: "Administrator access",
      heading: "Manage RiverGuard with clear responsibility.",
      body: "Administrator accounts are assigned by an existing administrator.",
    },
  }[accountRole ?? "public"];
  const isSignup = accountRole !== undefined;
  return (
    <div className="auth-page min-h-screen bg-[#edf5f9] text-[#071b3d]">
      <header className="border-b border-[#0a2a4b]/10 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex min-h-[4.75rem] max-w-[90rem] items-center justify-between px-5 sm:px-8 lg:px-16">
          <Link
            href="/welcome"
            className="group flex items-center gap-3"
            aria-label="RiverGuard home"
          >
            <span className="relative block size-11 overflow-hidden bg-white ring-1 ring-[#0a2a4b]/12">
              <Image
                src="/images/riverguard-logo.jpg"
                alt=""
                width={1024}
                height={1024}
                priority
                className="absolute left-1/2 top-[68%] w-[88px] max-w-none -translate-x-1/2 -translate-y-1/2"
              />
            </span>
            <span className="text-xl font-semibold tracking-[-0.04em] text-[#071b3d]">
              RiverGuard
            </span>
          </Link>
        </div>
      </header>

      <main className="relative isolate overflow-hidden px-5 py-8 sm:px-8 sm:py-12 lg:px-16 lg:py-16">
        <div className="landing-river-glow pointer-events-none absolute inset-0 -z-20 opacity-80" />
        <div className="landing-contours pointer-events-none absolute inset-y-0 left-0 -z-10 hidden w-[58%] opacity-25 lg:block" />
        <div
          className={
            isSignup
              ? "mx-auto flex max-w-[44rem] justify-center"
              : "mx-auto grid max-w-[78rem] items-start gap-8 lg:grid-cols-[minmax(0,0.88fr)_minmax(26rem,0.62fr)] lg:gap-16 xl:gap-24"
          }
        >
          {isSignup ? null : (
            <section
              className="auth-story pt-3 lg:pt-10"
              aria-labelledby="auth-story-title"
            >
              <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[#147384]">
                {accountContent.eyebrow}
              </p>
              <h1
                id="auth-story-title"
                className="mt-4 max-w-2xl text-[clamp(2.7rem,5.4vw,5.4rem)] leading-[0.92] font-semibold tracking-[-0.065em] text-[#071b3d]"
              >
                {accountContent.heading}
              </h1>
              <p className="mt-6 max-w-xl text-base leading-7 text-[#38536b] sm:text-lg sm:leading-8">
                {accountContent.body}
              </p>
            </section>
          )}

          <section
            className={
              isSignup
                ? "auth-panel w-full rounded-[1.65rem] border border-[#0b3358]/10 bg-white p-5 shadow-[0_30px_80px_rgba(7,42,76,0.14)] sm:p-7 lg:p-8"
                : "auth-panel rounded-[1.65rem] border border-[#0b3358]/10 bg-white p-5 shadow-[0_30px_80px_rgba(7,42,76,0.14)] sm:p-7 lg:p-8"
            }
          >
            <div className="mb-6 border-b border-[#0b3358]/10 pb-5">
              <h2 className="text-2xl font-semibold tracking-[-0.04em] text-[#092847]">
                {title}
              </h2>
              <p className="mt-2 text-sm leading-6 text-[#53697d]">
                {description}
              </p>
            </div>
            {children}
          </section>
        </div>
      </main>
    </div>
  );
}

function LoginForm() {
  return (
    <WithEnsureCurrent>
      {(ensureCurrent) => <LoginFormBody ensureCurrent={ensureCurrent} />}
    </WithEnsureCurrent>
  );
}

function LoginFormBody({
  ensureCurrent,
}: {
  ensureCurrent: ProvisionAccount | null;
}) {
  const router = useRouter();
  const { signInWithEmail, signInWithGoogle, sendEmailVerification } =
    useFirebaseAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  async function finishSignIn() {
    // Without Convex the account (and therefore the role) cannot be read, so the
    // default workspace is used. Sign-in itself still succeeded.
    const account = await provisionWithTimeout(ensureCurrent, {});
    const destination =
      account &&
      ["resident", "lgu", "researcher", "admin"].includes(account.role)
        ? `/${account.role}`
        : "/resident";
    router.push(destination);
  }
  async function signInWithGoogleAccount() {
    setLoading(true);
    setError("");
    try {
      await signInWithGoogle();
      await finishSignIn();
    } catch (signInError) {
      setLoading(false);
      setError(formatAuthError(signInError));
    }
  }
  async function signInWithEmailAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    const formData = new FormData(event.currentTarget);
    try {
      const signedInUser = await signInWithEmail(
        String(formData.get("login-email")).trim(),
        String(formData.get("login-password")),
      );
      if (!signedInUser.emailVerified) {
        let verificationSent = false;
        try {
          const sent = await settleWithin(sendEmailVerification(), 10_000);
          verificationSent = sent !== null;
          if (!verificationSent) {
            setError(
              "Verification email request timed out. You can resend it on the next screen.",
            );
          }
        } catch (verificationSendError) {
          setError(formatAuthError(verificationSendError));
        }
        const account = await provisionWithTimeout(ensureCurrent, {
          requestedRole: "resident",
        });
        const role =
          account &&
          ["resident", "lgu", "researcher", "admin"].includes(account.role)
            ? account.role
            : "resident";
        router.push(
          `/auth/verify?role=${role}&source=signup&sent=${verificationSent ? "1" : "0"}`,
        );
        return;
      }
      await finishSignIn();
    } catch (signInError) {
      setLoading(false);
      setError(formatAuthError(signInError));
    }
  }
  return (
    <div className="grid gap-4">
      {error ? <p className="text-metadata text-danger">{error}</p> : null}
      <form onSubmit={signInWithEmailAccount} className="grid gap-3">
        <TextField
          id="login-email"
          label="Email"
          type="email"
          name="login-email"
          autoComplete="email"
          placeholder="you@example.com"
          required
        />
        <PasswordField
          id="login-password"
          label="Password"
          name="login-password"
          autoComplete="current-password"
          placeholder="Enter your password"
          required
        />
        <CheckControl
          id="remember-device"
          label="Remember this device"
          description="Keep this account signed in on this device."
        />
        <Button
          type="submit"
          loading={loading}
          loadingLabel="Logging in"
          className="w-full"
        >
          Log in
        </Button>
      </form>
      <div className="border-t border-line pt-3">
        <Button
          type="button"
          variant="quiet"
          onClick={signInWithGoogleAccount}
          loading={loading}
          loadingLabel="Connecting to Google"
          className="w-full border-[#dadce0] bg-white text-[#3c4043] hover:bg-[#f8fafd]"
        >
          <GoogleMark />
          Sign in with Google
        </Button>
      </div>
      <Link
        href="/auth/signup"
        className="text-metadata text-center text-brand-primary"
      >
        New to RiverGuard? Create Account
      </Link>
    </div>
  );
}

const PASSWORD_REQUIREMENTS = [
  {
    label: "At least 8 characters",
    test: (value: string) => value.length >= 8,
  },
  {
    label: "One uppercase letter (A–Z)",
    test: (value: string) => /[A-Z]/.test(value),
  },
  {
    label: "One lowercase letter (a–z)",
    test: (value: string) => /[a-z]/.test(value),
  },
  { label: "One number (0–9)", test: (value: string) => /[0-9]/.test(value) },
  {
    label: "One special character (!@#$%)",
    test: (value: string) => /[^A-Za-z0-9]/.test(value),
  },
] as const;

function PasswordRequirements({ password }: { password: string }) {
  return (
    <div className="grid gap-1" aria-live="polite">
      <p className="text-metadata text-muted">Password must contain:</p>
      <ul className="grid gap-1">
        {PASSWORD_REQUIREMENTS.map((requirement) => {
          const satisfied = requirement.test(password);
          return (
            <li
              key={requirement.label}
              className={`text-metadata flex items-center gap-1.5 transition-colors duration-200 ${
                satisfied ? "text-success" : "text-muted"
              }`}
            >
              {satisfied ? (
                <CheckCircle
                  aria-hidden="true"
                  size={14}
                  weight="fill"
                  className="shrink-0 animate-[password-check_220ms_ease-out]"
                />
              ) : (
                <span
                  aria-hidden="true"
                  className="size-3.5 shrink-0 rounded-full border border-current"
                />
              )}
              <span>{requirement.label}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function GoogleMark() {
  return (
    <svg
      aria-hidden="true"
      className="size-[18px] shrink-0"
      viewBox="0 0 24 24"
      role="img"
    >
      <path
        fill="#4285F4"
        d="M21.35 12.27c0-.79-.07-1.55-.2-2.27H12v4.3h5.24a4.48 4.48 0 0 1-1.94 2.94v2.45h3.14c1.84-1.69 2.91-4.18 2.91-7.42Z"
      />
      <path
        fill="#34A853"
        d="M12 21.5c2.63 0 4.84-.87 6.45-2.36l-3.14-2.45c-.87.58-1.98.92-3.31.92-2.54 0-4.7-1.72-5.47-4.03H3.28v2.53A9.75 9.75 0 0 0 12 21.5Z"
      />
      <path
        fill="#FBBC05"
        d="M6.53 13.58A5.86 5.86 0 0 1 6.22 12c0-.55.11-1.09.31-1.58V7.89H3.28A9.5 9.5 0 0 0 2.25 12c0 1.48.35 2.88 1.03 4.11l3.25-2.53Z"
      />
      <path
        fill="#EA4335"
        d="M12 6.39c1.43 0 2.71.49 3.72 1.46l2.79-2.79C16.84 3.48 14.63 2.5 12 2.5a9.75 9.75 0 0 0-8.72 5.39l3.25 2.53c.77-2.31 2.93-4.03 5.47-4.03Z"
      />
    </svg>
  );
}

function buildRoleProfile(formData: FormData, role: ProductRole) {
  const value = (name: string) => String(formData.get(name) ?? "").trim();
  if (role === "resident") {
    return { city: value("signup-city") };
  }
  if (role === "lgu") {
    return {
      organization: value("signup-organization"),
      position: value("signup-position"),
      requestedArea: value("signup-area"),
      purpose: value("signup-purpose"),
    };
  }
  return {
    organization: value("signup-organization"),
    researcherType: value("signup-researcher-type") as
      | "student"
      | "faculty"
      | "government"
      | "private"
      | "independent"
      | "other",
    requestedArea: value("signup-area"),
    purpose: value("signup-purpose"),
  };
}

function ResidentSignup({
  onRoleChange,
  role,
}: {
  onRoleChange: (role: ProductRole) => void;
  role: ProductRole;
}) {
  return (
    <WithEnsureCurrent>
      {(ensureCurrent) => (
        <ResidentSignupBody
          ensureCurrent={ensureCurrent}
          onRoleChange={onRoleChange}
          role={role}
        />
      )}
    </WithEnsureCurrent>
  );
}

function ResidentSignupBody({
  ensureCurrent,
  onRoleChange,
  role,
}: {
  ensureCurrent: ProvisionAccount | null;
  onRoleChange: (role: ProductRole) => void;
  role: ProductRole;
}) {
  const router = useRouter();
  const { createAccountWithEmail, sendEmailVerification, signInWithGoogle } =
    useFirebaseAuth();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const signupForm = useRef<HTMLFormElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    const formData = new FormData(event.currentTarget);
    try {
      const password = String(formData.get("signup-password"));
      const confirmation = String(formData.get("signup-confirm"));
      if (password !== confirmation) {
        throw new Error("Passwords do not match.");
      }
      const passwordRequirementError = getPasswordRequirementError(password);
      if (passwordRequirementError) {
        throw new Error(passwordRequirementError);
      }
      await createAccountWithEmail(
        String(formData.get("signup-email")).trim(),
        password,
      );
      await provisionWithTimeout(ensureCurrent, {
        requestedRole: role,
        roleProfile: buildRoleProfile(formData, role),
      });
      let verificationSent = false;
      const sent = await settleWithin(sendEmailVerification(), 10_000);
      verificationSent = sent !== null;
      if (!verificationSent) {
        setError(
          "Verification email request timed out. You can resend it on the next screen.",
        );
      }
      router.push(
        `/auth/verify?role=${role}&source=signup&sent=${verificationSent ? "1" : "0"}`,
      );
    } catch (signupError) {
      setError(formatAuthError(signupError));
    } finally {
      setLoading(false);
    }
  };
  return (
    <form ref={signupForm} className="grid gap-3" onSubmit={submit}>
      {error ? <p className="text-metadata text-danger">{error}</p> : null}
      <SelectControl
        id="signup-role"
        name="signup-role"
        label="Account type"
        value={role}
        onChange={(event) => onRoleChange(event.target.value as ProductRole)}
        required
      >
        <option value="resident">Resident</option>
        <option value="lgu">LGU operator</option>
        <option value="researcher">Researcher</option>
      </SelectControl>
      {role === "lgu" ? (
        <Notice title="LGU access review" tone="info">
          LGU accounts remain pending until a RiverGuard administrator reviews
          the request.
        </Notice>
      ) : role === "researcher" ? (
        <Notice title="Researcher access review" tone="info">
          Researcher accounts remain pending until a RiverGuard administrator
          reviews the request.
        </Notice>
      ) : null}
      <TextField
        id="signup-name"
        name="signup-name"
        label="Full name"
        autoComplete="name"
        placeholder="Your full name"
        required
      />
      <TextField
        id="signup-email"
        name="signup-email"
        label="Email"
        type="email"
        autoComplete="email"
        placeholder="you@example.com"
        required
      />
      <PasswordField
        id="signup-password"
        name="signup-password"
        label="Password"
        autoComplete="new-password"
        placeholder="Create a password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        required
        hint={<PasswordRequirements password={password} />}
      />
      <PasswordField
        id="signup-confirm"
        name="signup-confirm"
        label="Confirm password"
        autoComplete="new-password"
        placeholder="Re-enter your password"
        value={confirmPassword}
        onChange={(event) => setConfirmPassword(event.target.value)}
        error={
          confirmPassword && confirmPassword !== password
            ? "Passwords do not match."
            : undefined
        }
        required
      />
      {role === "resident" ? (
        <SelectControl
          id="signup-city"
          name="signup-city"
          label="Primary city"
          autoComplete="address-level2"
        >
          <option>Marikina</option>
          <option>Quezon City</option>
          <option>Manila</option>
          <option>Pasig</option>
          <option>Unsupported area</option>
        </SelectControl>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {role === "researcher" ? (
            <SelectControl
              id="signup-researcher-type"
              name="signup-researcher-type"
              label="Researcher type"
              required
            >
              <option value="student">Student</option>
              <option value="faculty">Professor/Faculty</option>
              <option value="government">Government researcher</option>
              <option value="private">Private-sector researcher</option>
              <option value="independent">Independent researcher</option>
              <option value="other">Other</option>
            </SelectControl>
          ) : null}
          <TextField
            id="signup-organization"
            name="signup-organization"
            label={role === "lgu" ? "LGU or agency" : "Organization"}
            autoComplete="organization"
            placeholder={
              role === "lgu" ? "e.g. Marikina DRRMO" : "Organization name"
            }
            required
          />
          {role === "lgu" ? (
            <TextField
              id="signup-position"
              name="signup-position"
              label="Position"
              autoComplete="organization-title"
              placeholder="e.g. DRRM officer"
              required
            />
          ) : null}
          <SelectControl
            id="signup-area"
            name="signup-area"
            label="Requested area"
            required
          >
            <option>Marikina</option>
            <option>Quezon City</option>
            <option>Manila</option>
            <option>Pasig</option>
          </SelectControl>
          <div className="sm:col-span-2">
            <TextAreaField
              id="signup-purpose"
              name="signup-purpose"
              label={
                role === "lgu" ? "Operational purpose" : "Research purpose"
              }
              required
              placeholder="Tell us how you plan to use RiverGuard."
            />
          </div>
        </div>
      )}
      <CheckControl
        id="signup-terms"
        name="signup-terms"
        label="Accept future terms and privacy notice"
        description="This refers to RiverGuard’s terms of use, privacy notice, and authorized-use limitations."
        required
      />
      <CheckControl
        id="signup-notifications"
        name="signup-notifications"
        label="Receive RiverGuard notifications"
        description="Optional and separate from account consent."
      />
      <Button
        type="submit"
        loading={loading}
        loadingLabel="Creating account"
        className="w-full"
      >
        Create Account
      </Button>
      <div className="border-t border-line pt-3">
        <Button
          type="button"
          variant="quiet"
          onClick={async () => {
            setLoading(true);
            setError("");
            try {
              await signInWithGoogle();
              const formData = signupForm.current
                ? new FormData(signupForm.current)
                : new FormData();
              await provisionWithTimeout(ensureCurrent, {
                requestedRole: role,
                roleProfile: buildRoleProfile(formData, role),
              });
              router.push(`/onboarding/${role}`);
            } catch (signupError) {
              setError(formatAuthError(signupError));
            } finally {
              setLoading(false);
            }
          }}
          loading={loading}
          loadingLabel="Connecting to Google"
          className="w-full border-[#dadce0] bg-white text-[#3c4043] hover:bg-[#f8fafd]"
        >
          <GoogleMark />
          Sign up with Google
        </Button>
      </div>
      <Link
        href="/auth/login"
        className="text-metadata text-center text-brand-primary"
      >
        Already have an account? Log in
      </Link>
    </form>
  );
}

async function provisionWithTimeout(
  provision: ProvisionAccount | null,
  args: Parameters<ProvisionAccount>[0],
): Promise<Awaited<ReturnType<ProvisionAccount>> | null> {
  if (!provision) return null;
  let timer: number | null = null;
  try {
    return await Promise.race([
      provision(args),
      new Promise<null>((resolve) => {
        timer = window.setTimeout(() => resolve(null), 12_000);
      }),
    ]);
  } catch {
    return null;
  } finally {
    if (timer !== null) window.clearTimeout(timer);
  }
}

async function settleWithin<T>(
  operation: Promise<T>,
  timeoutMs: number,
): Promise<T | null> {
  let timer: number | null = null;
  try {
    return await Promise.race([
      operation,
      new Promise<null>((resolve) => {
        timer = window.setTimeout(() => resolve(null), timeoutMs);
      }),
    ]);
  } catch {
    return null;
  } finally {
    if (timer !== null) window.clearTimeout(timer);
  }
}

function formatAuthError(error: unknown) {
  if (!(error instanceof Error)) {
    return "Sign-in failed. Please try again.";
  }

  if (error.message.includes("auth/invalid-credential")) {
    return "The email or password is incorrect.";
  }
  if (error.message.includes("auth/too-many-requests")) {
    return "Too many attempts. Try again later.";
  }
  if (error.message.includes("auth/operation-not-allowed")) {
    return "Email/password sign-in is not enabled in Firebase yet.";
  }
  if (error.message.includes("auth/popup-closed-by-user")) {
    return "Google sign-in was cancelled.";
  }
  return error.message;
}

function getPasswordRequirementError(password: string) {
  if (password.length < 8) {
    return "Password must be at least 8 characters long.";
  }
  if (!/[a-z]/.test(password)) {
    return "Password must include at least one lowercase letter.";
  }
  if (!/[A-Z]/.test(password)) {
    return "Password must include at least one uppercase letter.";
  }
  if (!/[0-9]/.test(password)) {
    return "Password must include at least one number.";
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    return "Password must include at least one symbol.";
  }
  return "";
}

function AccessRequest() {
  const router = useRouter();
  return (
    <form
      className="grid gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        router.push("/auth/verify?role=lgu&source=access");
      }}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <TextField id="access-name" label="Full name" required />
        <TextField id="access-email" label="Work email" type="email" required />
        <TextField id="access-org" label="Organization" required />
        <TextField
          id="access-role"
          name="access-role"
          label="Requested role"
          value="LGU operator"
          readOnly
        />
        <SelectControl id="access-location" label="Requested area">
          <option>Marikina</option>
          <option>Quezon City</option>
          <option>Manila</option>
          <option>Pasig</option>
        </SelectControl>
        <TextField id="access-reference" label="Reference or contact" />
      </div>
      <TextAreaField
        id="access-reason"
        label="Reason for access"
        required
        placeholder="Explain the research or authorized operational purpose…"
      />
      <CheckControl
        id="access-acknowledge"
        label="Authorized-use acknowledgement"
        required
        description="Requesting a role does not grant it."
      />
      <Button type="submit" className="w-full">
        Submit access request
      </Button>
      <Link
        href="/auth/login"
        className="text-metadata text-center text-brand-primary underline"
      >
        Cancel and return to login
      </Link>
    </form>
  );
}

function Verification() {
  return (
    <WithEnsureCurrent>
      {(ensureCurrent) => <VerificationBody ensureCurrent={ensureCurrent} />}
    </WithEnsureCurrent>
  );
}

function VerificationBody({
  ensureCurrent,
}: {
  ensureCurrent: ProvisionAccount | null;
}) {
  const params = useSearchParams();
  const { user, sendEmailVerification } = useFirebaseAuth();
  const [verified, setVerified] = useState(false);
  const [resent, setResent] = useState(false);
  const [verificationError, setVerificationError] = useState("");
  const [checking, setChecking] = useState(false);
  const [code, setCode] = useState("");
  const [secondsRemaining, setSecondsRemaining] = useState(
    params.get("sent") === "0" ? 0 : 60,
  );
  const codeInputs = useRef<Array<HTMLInputElement | null>>([]);
  const roleParam = params.get("role") ?? "lgu";
  const role: ProductRole = ["resident", "lgu", "researcher", "admin"].includes(
    roleParam,
  )
    ? (roleParam as ProductRole)
    : "lgu";
  const source = params.get("source") ?? "access";
  const isEmailVerification = source === "signup";
  const initialSendFailed = params.get("sent") === "0";
  const [sendStatus, setSendStatus] = useState<"idle" | "sent" | "failed">(
    initialSendFailed ? "failed" : "idle",
  );
  useEffect(() => {
    if (secondsRemaining <= 0) return;
    const timer = window.setInterval(
      () => setSecondsRemaining((current) => Math.max(0, current - 1)),
      1000,
    );
    return () => window.clearInterval(timer);
  }, [secondsRemaining]);
  if (verified)
    return (
      <AuthSuccess
        title="Identity verified"
        description={
          role === "resident"
            ? "Your account has been verified and is ready for onboarding."
            : "Your role request is now pending administrator approval."
        }
        href={
          role === "resident"
            ? "/onboarding/resident"
            : source === "invitation"
              ? `/auth/mfa?role=${role}&source=invitation`
              : `/auth/pending?role=${role}`
        }
        action={
          role === "resident" ? "Continue to onboarding" : "View request status"
        }
      />
    );
  return (
    <div className="grid min-w-0 gap-3">
      {isEmailVerification ? (
        <Notice
          title={
            sendStatus === "failed"
              ? "Verification email could not be sent"
              : resent
                ? "Verification email resent"
                : "Check your email"
          }
          tone={sendStatus === "failed" ? "warning" : "info"}
        >
          {sendStatus === "failed"
            ? `Use Resend verification email to try again for ${user?.email ?? "your email address"}.`
            : `We sent a verification link to ${user?.email ?? "your email address"}. Open the email and click the link to confirm your address.`}
        </Notice>
      ) : (
        <Notice title={resent ? "New code sent" : "Code sent"}>
          A verification code was sent to re••••••@example.com.
        </Notice>
      )}
      {!isEmailVerification ? (
        <div className="grid w-full gap-1.5">
          <span className="text-button">Six-digit code</span>
          <div
            className="grid min-w-0 grid-cols-6 gap-2"
            aria-label="Six-digit verification code"
          >
            {Array.from({ length: 6 }, (_, index) => (
              <input
                key={index}
                ref={(element) => {
                  codeInputs.current[index] = element;
                }}
                aria-label={`Digit ${index + 1}`}
                className="text-body h-11 min-w-0 w-full rounded-control border border-line bg-canvas text-center text-ink outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
                inputMode="numeric"
                maxLength={1}
                value={code[index] ?? ""}
                onChange={(event) => {
                  const digit = event.target.value.replace(/\D/g, "").slice(-1);
                  const next = code.padEnd(6, "").split("");
                  next[index] = digit;
                  setCode(next.join("").slice(0, 6));
                  if (digit && index < 5)
                    codeInputs.current[index + 1]?.focus();
                }}
                onKeyDown={(event) => {
                  if (event.key === "Backspace" && !code[index] && index > 0) {
                    codeInputs.current[index - 1]?.focus();
                  }
                }}
              />
            ))}
          </div>
        </div>
      ) : null}
      {verificationError ? (
        <p className="text-metadata text-danger">{verificationError}</p>
      ) : null}
      <div className="mt-1 flex items-center justify-between text-metadata">
        <button
          type="button"
          disabled={secondsRemaining > 0}
          onClick={() => {
            if (isEmailVerification) {
              void settleWithin(sendEmailVerification(), 10_000)
                .then((sent) => {
                  if (sent === null) {
                    setSendStatus("failed");
                    setVerificationError(
                      "The verification email request timed out. Check Firebase mail settings and try again.",
                    );
                    return;
                  }
                  setResent(true);
                  setSendStatus("sent");
                  setSecondsRemaining(60);
                  setVerificationError("");
                })
                .catch((error: unknown) => {
                  setSendStatus("failed");
                  setVerificationError(formatAuthError(error));
                });
            } else {
              setResent(true);
              setCode("");
              setSecondsRemaining(60);
            }
          }}
          className={
            secondsRemaining > 0
              ? "cursor-not-allowed text-muted"
              : "text-brand-primary"
          }
        >
          {isEmailVerification
            ? resent
              ? "Email resent"
              : "Resend verification email"
            : resent
              ? "Code resent"
              : "Resend code"}
        </button>
        <span className="text-muted">
          Expires in 00:{String(secondsRemaining).padStart(2, "0")}
        </span>
      </div>
      <Button
        loading={checking}
        onClick={async () => {
          if (!isEmailVerification) {
            setVerified(true);
            return;
          }
          setChecking(true);
          setVerificationError("");
          try {
            const reloadResult = user
              ? await settleWithin(user.reload(), 8_000)
              : null;
            if (reloadResult === null) {
              throw new Error(
                "Verification status could not be refreshed. Check your connection and try again.",
              );
            }
            if (!user?.emailVerified) {
              throw new Error(
                "Click the verification link in your email first.",
              );
            }
            await provisionWithTimeout(ensureCurrent, {
              requestedRole: role,
            });
            setVerified(true);
          } catch (error) {
            setVerificationError(formatAuthError(error));
          } finally {
            setChecking(false);
          }
        }}
        className="w-full"
      >
        {isEmailVerification ? "I verified my email" : "Verify"}
      </Button>
      <div className="text-center text-metadata">
        <Link href="/auth/login" className="text-brand-primary">
          Back to login
        </Link>
      </div>
    </div>
  );
}

function PendingApproval() {
  const router = useRouter();
  const params = useSearchParams();
  const role = params.get("role") ?? "lgu";
  const [approved, setApproved] = useState(false);
  if (approved)
    return (
      <AuthSuccess
        title="Access approved"
        description="Your role-specific onboarding is ready to begin."
        href={`/onboarding/${role}`}
        action="Begin onboarding"
      />
    );
  return (
    <div className="grid gap-3">
      <div className="flex justify-center">
        <span className="inline-flex size-12 items-center justify-center rounded-full bg-brand-secondary-soft text-brand-secondary">
          <ShieldCheck size={26} />
        </span>
      </div>
      <div className="text-center">
        <p className="text-section">LGU operator access requested</p>
        <p className="text-body mt-1 text-muted">
          Submitted · Verification complete
        </p>
      </div>
      <div className="rounded-control bg-canvas-soft p-3 text-body">
        <p>
          <strong>Status:</strong> Pending administrator approval
        </p>
        <p className="mt-1 text-muted">
          You cannot enter a protected workspace until the request is approved.
        </p>
      </div>
      <Button
        variant="quiet"
        className="w-full"
        onClick={() => {
          setApproved(true);
          router.refresh();
        }}
      >
        Refresh status
      </Button>
      <ActionLink href="/auth/logout" variant="quiet" className="w-full">
        Log out
      </ActionLink>
    </div>
  );
}

function MfaScreen() {
  return (
    <div className="grid gap-3">
      <Notice title="MFA is not configured" tone="warning">
        This prototype does not provide Firebase MFA or recovery-code
        verification.
      </Notice>
      <Button className="w-full" variant="quiet" disabled>
        MFA setup unavailable
      </Button>
    </div>
  );
}

function Invitation() {
  return (
    <div className="grid gap-3">
      <Notice title="Workspace invitations are unavailable" tone="warning">
        This prototype has no invitation record or account-provisioning backend.
        Do not enter credentials or use this screen for real access.
      </Notice>
      <ActionLink href="/welcome" variant="quiet" className="w-full">
        Back to overview
      </ActionLink>
    </div>
  );
}

function AccountProblem({ screen }: { screen: string }) {
  const content: Record<string, [string, string, string]> = {
    rejected: [
      "Access request not approved",
      "Your sample request was not approved. A neutral administrator note may be shown when appropriate.",
      "Contact administrator",
    ],
    suspended: [
      "Account suspended",
      "Access is temporarily unavailable. Contact the administrator for non-sensitive guidance.",
      "Contact administrator",
    ],
    locked: [
      "Account locked",
      "Too many attempts or a security event requires account recovery.",
      "Recover account",
    ],
    unauthorized: [
      "Permission required",
      "This account does not have access to the requested workspace.",
      "Return to role home",
    ],
    unavailable: [
      "Authentication unavailable",
      "The identity service cannot be reached. Your entered information has been preserved.",
      "Try again",
    ],
    "session-expired": [
      "Session expired",
      "Log in again to continue. Your safe return destination will be retained.",
      "Log in again",
    ],
    "invitation-expired": [
      "Invitation expired",
      "This invitation can no longer be accepted. Request a new invitation from the assigning administrator.",
      "Return to login",
    ],
    "verification-expired": [
      "Verification link expired",
      "Request a new verification link before continuing the account flow.",
      "Return to verification",
    ],
  };
  const [title, description, action] = content[screen] ?? content.unauthorized;
  return (
    <div className="grid gap-3 text-center">
      <span className="mx-auto inline-flex size-12 items-center justify-center rounded-full bg-warning/10 text-warning">
        <LockKey size={24} />
      </span>
      <div>
        <p className="text-section">{title}</p>
        <p className="text-body mt-1 text-muted">{description}</p>
      </div>
      <ActionLink href="/auth/login">{action}</ActionLink>
    </div>
  );
}

function LogoutScreen() {
  const { signOut } = useFirebaseAuth();
  useEffect(() => {
    void signOut();
  }, [signOut]);
  return (
    <div className="grid gap-3 text-center">
      <span className="mx-auto inline-flex size-12 items-center justify-center rounded-full bg-brand-secondary-soft text-brand-secondary">
        <SignOut size={24} />
      </span>
      <div>
        <p className="text-section">You have been logged out</p>
        <p className="text-body mt-1 text-muted">
          Your RiverGuard session has ended.
        </p>
      </div>
      <ActionLink href="/auth/login">Return to login</ActionLink>
    </div>
  );
}

function AuthSuccess({
  action,
  description,
  href,
  title,
}: {
  action: string;
  description: string;
  href: string;
  title: string;
}) {
  return (
    <div className="grid gap-3 text-center">
      <span className="mx-auto inline-flex size-12 items-center justify-center rounded-full bg-success/10 text-success">
        <CheckCircle size={26} weight="fill" />
      </span>
      <div>
        <p className="text-section">{title}</p>
        <p className="text-body mt-1 text-muted">{description}</p>
      </div>
      <ActionLink href={href}>{action}</ActionLink>
    </div>
  );
}

export function AuthScreen({ screen }: { screen: string }) {
  const [signupRole, setSignupRole] = useState<ProductRole>("resident");
  const titles: Record<string, [string, string]> = {
    login: ["Log in", "Sign in to your RiverGuard workspace."],
    signup: [
      "Create Account",
      "Set up your account and continue to the workspace available to your role.",
    ],
    "request-access": [
      "Request staff access",
      "LGU operator access requires administrator approval. Administrator access is invitation-only.",
    ],
    verify: ["Verify identity", "Confirm the account destination."],
    pending: [
      "Pending approval",
      "Track the status of a privileged-role request.",
    ],
    mfa: [
      "Multi-factor authentication",
      "Complete the required security challenge.",
    ],
    invitation: [
      "Accept invitation",
      "Review the assigned role, area, and authorized-use notice.",
    ],
    logout: ["Signed out", "Your RiverGuard session has ended."],
  };
  const [title, description] = titles[screen] ?? [
    "Account status",
    "Review the account state and available next action.",
  ];
  let content: ReactNode;
  if (screen === "login") content = <LoginForm />;
  else if (screen === "signup")
    content = <ResidentSignup role={signupRole} onRoleChange={setSignupRole} />;
  else if (screen === "request-access") content = <AccessRequest />;
  else if (screen === "verify") content = <Verification />;
  else if (screen === "pending") content = <PendingApproval />;
  else if (screen === "mfa") content = <MfaScreen />;
  else if (screen === "invitation") content = <Invitation />;
  else if (screen === "logout") content = <LogoutScreen />;
  else content = <AccountProblem screen={screen} />;
  return (
    <AuthLayout
      accountRole={screen === "signup" ? signupRole : undefined}
      title={title}
      description={description}
    >
      {content}
    </AuthLayout>
  );
}

const onboardingContent: Record<
  ProductRole,
  { steps: string[]; title: string; destination: string }
> = {
  resident: {
    title: "Resident onboarding",
    destination: "/resident",
    steps: ["Welcome", "Locations", "Preferences", "Safety"],
  },
  lgu: {
    title: "LGU operator onboarding",
    destination: "/lgu",
    steps: [
      "Assignment",
      "Authority",
      "Review flow",
      "Notes",
      "Notifications",
      "Safety",
      "Ready",
    ],
  },
  researcher: {
    title: "Researcher onboarding",
    destination: "/researcher",
    steps: ["Profile", "Research responsibility", "Methodology", "Ready"],
  },
  admin: {
    title: "Administrator onboarding",
    destination: "/admin",
    steps: [
      "Assignment",
      "MFA",
      "Role policy",
      "Research tools",
      "Methodology",
      "Configuration",
      "Audit",
      "Security",
      "Ready",
    ],
  },
};

export function OnboardingScreen({ role }: { role: ProductRole }) {
  const config = onboardingContent[role];
  const [step, setStep] = useState(0);
  const router = useRouter();
  const isLast = step === config.steps.length - 1;
  const profileStep = (
    <div key="profile" className="grid gap-3 sm:grid-cols-2">
      <TextField
        id="onboard-name"
        label="Full name"
        defaultValue={role === "resident" ? "Resident user" : "RiverGuard user"}
      />
      <TextField
        id="onboard-org"
        label="Organization"
        defaultValue={
          role === "lgu"
            ? "Marikina DRRMO"
            : role === "admin"
              ? "RiverGuard research"
              : "University research team"
        }
      />
    </div>
  );
  const coverageStep = (
    <Notice
      key="coverage"
      title={
        role === "lgu"
          ? "Review is not warning authority"
          : "Supported sample geography"
      }
      tone="warning"
    >
      {role === "lgu"
        ? "Use the review and escalation process. RiverGuard cannot issue official warnings."
        : "RiverGuard currently represents city-level views for four NCR cities, not barangay or street-level evidence."}
    </Notice>
  );
  const tourStep = (
    <div key="tour">
      <div className="grid gap-2 sm:grid-cols-2">
        {[
          "Role dashboard",
          "Map and locations",
          "Evidence and provenance",
          "Help and limitations",
        ].map((item) => (
          <div
            key={item}
            className="rounded-control border border-line bg-canvas-soft p-3"
          >
            <p className="text-button">{item}</p>
            <p className="text-metadata mt-1 text-muted">
              Available from your RiverGuard workspace.
            </p>
          </div>
        ))}
      </div>
      <Notice
        title="Ready to enter the workspace"
        tone="success"
        className="mt-3"
      >
        You can revisit methodology and limitations from every role shell.
      </Notice>
    </div>
  );
  const content =
    role === "resident"
      ? [
          <Notice key="welcome" title="Welcome to RiverGuard">
            Review experimental outlooks as decision-support information and
            confirm official advisories before taking action.
          </Notice>,
          <div key="locations" className="grid gap-3 sm:grid-cols-2">
            <SelectControl id="resident-primary-city" label="Primary city">
              <option>Marikina</option>
              <option>Quezon City</option>
              <option>Manila</option>
              <option>Pasig</option>
            </SelectControl>
            <SelectControl
              id="resident-additional-cities"
              label="Additional locations"
            >
              <option>None</option>
              <option>Quezon City</option>
              <option>Manila</option>
              <option>Pasig</option>
            </SelectControl>
          </div>,
          <div key="resident-preferences" className="grid gap-2">
            <CheckControl
              id="resident-notifications"
              label="Receive outlook notifications"
            />
            <CheckControl
              id="resident-accessibility"
              label="Prefer chart table alternatives"
            />
          </div>,
          <div key="resident-safety" className="grid gap-3">
            <Notice title="Official advisories remain primary" tone="warning">
              RiverGuard provides experimental research outputs. Check PAGASA
              and your LGU for official advisories and evacuation instructions.
            </Notice>
            <CheckControl
              id="resident-responsible-use"
              label="I understand the experimental-use limitations"
              required
            />
          </div>,
        ]
      : role === "researcher"
        ? [
            profileStep,
            <Notice key="researcher-responsibility" title="Research access">
              Researcher access is for inspecting experimental model inputs,
              outputs, evaluation evidence, and stored runs. It does not grant
              authority to issue official warnings.
            </Notice>,
            <Notice key="researcher-methodology" title="Read the limitations">
              RiverGuard currently validates the pipeline on derived dataset
              targets. Treat model results as research evidence, not operational
              flood warnings.
            </Notice>,
            <CheckControl
              key="researcher-safety"
              id="researcher-responsible-use"
              label="I understand the experimental-use limitations"
              required
            />,
          ]
        : role === "lgu"
          ? [
              profileStep,
              <Notice
                key="lgu-authority"
                title="Review is not warning authority"
                tone="warning"
              >
                RiverGuard cannot issue official warnings or evacuation
                instructions.
              </Notice>,
              <Surface key="lgu-review" title="Review workflow">
                <p className="text-body text-muted">
                  Inspect the latest outlook, review quality warnings, record an
                  internal assessment, and escalate for authorized action.
                </p>
              </Surface>,
              <CheckControl
                key="lgu-notes"
                id="lgu-notes"
                label="Enable internal review notes"
              />,
              <CheckControl
                key="lgu-notifications"
                id="lgu-notifications"
                label="Receive assigned-area review notifications"
              />,
              <CheckControl
                key="lgu-safety"
                id="lgu-authorized-use"
                label="I understand the authorized-use limitations"
                required
              />,
              <Notice key="lgu-ready" title="Ready for review" tone="success">
                Your assigned-area dashboard and review queue are ready.
              </Notice>,
            ]
          : [
              profileStep,
              <Notice key="admin-mfa" title="Secure administrator access">
                Complete multi-factor authentication before managing users or
                system configuration.
              </Notice>,
              <CheckControl
                key="admin-policy"
                id="admin-role-policy"
                label="I understand role and location assignment policy"
                required
              />,
              tourStep,
              coverageStep,
              <Surface
                key="admin-configuration"
                title="Configuration readiness"
              >
                <p className="text-body text-muted">
                  Review supported locations, provider status, model versions,
                  and data-source readiness.
                </p>
              </Surface>,
              <Surface key="admin-audit" title="Audit responsibilities">
                <p className="text-body text-muted">
                  Access changes and configuration updates are recorded for
                  authorized review.
                </p>
              </Surface>,
              <CheckControl
                key="admin-security"
                id="admin-security"
                label="I understand administrator security responsibilities"
                required
              />,
              <Notice
                key="admin-ready"
                title="Ready for administration"
                tone="success"
              >
                Research tools, user requests, configuration, and audit tools
                are ready.
              </Notice>,
            ];
  return (
    <PublicShell>
      <main className="mx-auto max-w-5xl px-5 py-8">
        <PageHeading
          title={config.title}
          eyebrow={`${role} workspace`}
          description="Complete the role-specific introduction before opening the workspace."
        />
        <Surface>
          <Stepper steps={config.steps} current={step} />
          <div className="my-6 min-h-48">{content[step]}</div>
          <div className="flex justify-between">
            <Button
              size="small"
              variant="quiet"
              disabled={step === 0}
              onClick={() => setStep((value) => value - 1)}
            >
              <ArrowLeft size={14} /> Back
            </Button>
            <Button
              size="small"
              onClick={() =>
                isLast
                  ? router.push(config.destination)
                  : setStep((value) => value + 1)
              }
            >
              {isLast ? "Go to workspace" : "Continue"} <ArrowRight size={14} />
            </Button>
          </div>
        </Surface>
      </main>
    </PublicShell>
  );
}

export function PublicInfoScreen({
  screen,
}: {
  screen: "about" | "methodology" | "official-sources";
}) {
  const params = useSearchParams();
  const requestedReturn = params.get("from");
  const preservedReturn = params.get("return");
  const validWorkspaceReturn =
    preservedReturn &&
    /^\/(resident|lgu|researcher|admin)(?:\/.*)?$/.test(preservedReturn)
      ? preservedReturn
      : null;
  const informationReturn =
    requestedReturn &&
    ["/about", "/methodology", "/official-sources"].includes(requestedReturn)
      ? `${requestedReturn}${validWorkspaceReturn ? `?from=${encodeURIComponent(validWorkspaceReturn)}` : ""}`
      : null;
  const returnHref =
    informationReturn ??
    (requestedReturn &&
    /^\/(resident|lgu|researcher|admin)(?:\/.*)?$/.test(requestedReturn)
      ? requestedReturn
      : "/welcome");
  const returnLabel =
    returnHref === "/welcome"
      ? "Back"
      : requestedReturn === "/methodology"
        ? "Back to methodology"
        : requestedReturn === "/about"
          ? "Back to About"
          : requestedReturn === "/official-sources"
            ? "Back to official sources"
            : "Back to dashboard";
  const content = {
    about: {
      title: "About RiverGuard",
      eyebrow: "Research platform",
      description:
        "An NCR decision-support research platform for traceable experimental flood-risk workflows.",
    },
    methodology: {
      title: "Methodology and limitations",
      eyebrow: "Help and definitions",
      description:
        "Understand data resolution, model responsibility, uncertainty, provenance, and unsupported claims.",
    },
    "official-sources": {
      title: "Official advisories and sources",
      eyebrow: "Authoritative information",
      description:
        "RiverGuard is not an official warning authority. Use recognized government channels for current guidance.",
    },
  }[screen];
  return (
    <PublicShell>
      <main className="mx-auto max-w-6xl px-5 py-8">
        <PageHeading
          {...content}
          actions={
            <ActionLink href={returnHref} variant="quiet">
              <ArrowLeft size={14} /> {returnLabel}
            </ActionLink>
          }
        />
        {screen === "about" ? (
          <div className="grid gap-3 lg:grid-cols-3">
            <Surface title="Purpose">
              <p className="text-body text-muted">
                Explore data, experimental forecasts, model evidence, and
                controlled human review.
              </p>
            </Surface>
            <Surface title="Current coverage">
              <p className="text-body text-muted">
                Sample city-level views for Quezon City, Marikina, Manila, and
                Pasig.
              </p>
            </Surface>
            <Surface title="Research scope">
              <p className="text-body text-muted">
                City-level research workflows with traceable sources, model
                evidence, and limitations.
              </p>
            </Surface>
          </div>
        ) : screen === "methodology" ? (
          <div className="grid gap-3 lg:grid-cols-2">
            <Surface title="Experimental forecast">
              <p className="text-body text-muted">
                A dated model output based on compatible forecast and historical
                features. It is not an exact flood probability.
              </p>
            </Surface>
            <Surface title="Static hazard context">
              <p className="text-body text-muted">
                Long-term susceptibility shown with a separate layer, legend,
                source, and timestamp.
              </p>
            </Surface>
            <Surface title="Missing and unsupported data">
              <p className="text-body text-muted">
                Missing values remain missing. Unsupported locations show no
                prediction rather than assumed low risk.
              </p>
            </Surface>
            <Surface title="Required evidence">
              <p className="text-body text-muted">
                Results expose location, valid time, source, model version,
                quality, and limitations when available.
              </p>
            </Surface>
          </div>
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            <Notice title="Check current official information" tone="warning">
              Use PAGASA and your local government unit for advisories and
              evacuation instructions.
            </Notice>
            <Surface title="Source links">
              <div className="grid gap-2">
                <a
                  className="text-body flex items-center justify-between rounded-control border border-line px-3 py-2 text-brand-primary"
                  href="https://www.pagasa.dost.gov.ph/"
                  target="_blank"
                  rel="noreferrer"
                >
                  PAGASA <ArrowRight size={14} />
                </a>
                <div className="text-body rounded-control border border-line px-3 py-2 text-muted">
                  Local LGU/DRRMO source · Configure verified link later
                </div>
              </div>
            </Surface>
          </div>
        )}
      </main>
    </PublicShell>
  );
}

/**
 * One settings page.
 *
 * This used to be four routes (`/settings/profile`, `/notifications`,
 * `/accessibility`, `/security`) reachable only through a hover menu in the
 * sidebar. Navigating between them felt like leaving the page, and any link
 * without the prefix fell back to Profile. The sections now live on a single
 * route and switch in place, grouped so the hierarchy is visible.
 */
const settingsGroups: Array<{
  label: string;
  items: Array<{ id: string; label: string; description: string }>;
}> = [
  {
    label: "Account",
    items: [
      {
        id: "profile",
        label: "Profile",
        description: "Identity and workspace assignment",
      },
    ],
  },
  {
    label: "Preferences",
    items: [
      {
        id: "notifications",
        label: "Notifications",
        description: "What needs your attention",
      },
      {
        id: "accessibility",
        label: "Accessibility",
        description: "Charts, maps, and motion",
      },
    ],
  },
  {
    label: "Access & security",
    items: [
      {
        id: "security",
        label: "Security, password & access",
        description: "Sign-in protection and sessions",
      },
    ],
  },
];

/**
 * Settings, rendered inside the workspace it was opened from.
 *
 * The route used to be gated to `admin`, so any non-administrator who followed
 * the sidebar link was redirected to their own workspace without ever seeing
 * settings.
 */
export function WorkspaceSettingsScreen({
  initialSection,
  role: roleOverride,
}: {
  initialSection?: string;
  role?: ProductRole;
}) {
  const params = useSearchParams();
  const role = roleOverride ?? roleFromParam(params.get("from"));
  return (
    <WorkspaceGate role={role}>
      <AppShell role={role}>
        <main className="workspace-page mx-auto min-h-screen max-w-[96rem] p-4 sm:p-5 lg:p-6">
          <SettingsScreen screen={initialSection} />
        </main>
      </AppShell>
    </WorkspaceGate>
  );
}

/**
 * Help & limitations, rendered inside the workspace shell.
 *
 * The sidebar used to send people to a standalone public page, which dropped
 * the navigation and left them somewhere that did not look like the product.
 * The content now uses the same hero + section structure as every other page.
 */
function roleFromParam(value: string | null): ProductRole {
  const matched = /^\/(lgu|resident|researcher|admin)(?:\/|$)/.exec(
    value ?? "",
  );
  return (matched?.[1] ?? "resident") as ProductRole;
}

export function WorkspaceMethodologyScreen({
  role: roleOverride,
}: {
  role?: ProductRole;
} = {}) {
  const params = useSearchParams();
  const role = roleOverride ?? roleFromParam(params.get("from"));

  return (
    <AppShell role={role}>
      <main className="workspace-page mx-auto min-h-screen max-w-[96rem] p-4 sm:p-5 lg:p-6">
        <PageHeading
          eyebrow="Help and definitions"
          title="Help & limitations"
          description="How RiverGuard produces a forecast, what each number means, and the claims it cannot support."
          actions={
            <ActionLink href={`/${role}`} variant="quiet">
              <ArrowLeft size={14} /> Back to workspace
            </ActionLink>
          }
          notice={
            <Notice title="Not an official warning service" tone="warning">
              RiverGuard does not replace PAGASA advisories, LGU instructions,
              or evacuation guidance. Always confirm with official sources.
            </Notice>
          }
        />

        <div className="grid gap-3 lg:grid-cols-2">
          <Surface
            title="What the forecast is"
            description="A dated model output, not a guarantee"
          >
            <p className="text-body text-muted">
              Each day carries a flood-probability score and a predicted water
              level derived from the weather forecast plus antecedent rainfall,
              soil moisture, and temperature. The value is a model output for a
              specific time and place — not an exact probability of flooding on
              your street.
            </p>
          </Surface>
          <Surface
            title="How to read the numbers"
            description="Probability, level, and threshold"
          >
            <ul className="text-body grid gap-1.5 text-muted">
              <li>
                <strong className="text-ink">Probability</strong> is the model
                score; the operating threshold marks where a day is counted as
                elevated.
              </li>
              <li>
                <strong className="text-ink">Predicted level</strong> is metres
                above the reference datum, compared against the city alarm
                levels where those are verified.
              </li>
              <li>
                <strong className="text-ink">Confidence</strong> comes from the
                weather source, not from the model alone — a degraded provider
                is shown as degraded.
              </li>
            </ul>
          </Surface>
          <Surface title="Data limits" description="Missing stays missing">
            <p className="text-body text-muted">
              Coverage is city-level for Quezon City, Marikina, Manila, and
              Pasig. Missing values remain missing and unsupported locations
              return no prediction rather than assumed low risk. Water level in
              the research dataset is a rainfall-derived proxy, not a gauge
              reading.
            </p>
          </Surface>
          <Surface
            title="Model limits"
            description="What the evidence does not prove"
          >
            <p className="text-body text-muted">
              The current model is a test-grade estimator. Its scores rank
              relative risk; they are not calibrated to the observed frequency
              of flooding. Static hazard layers describe long-term
              susceptibility and say nothing about today.
            </p>
          </Surface>
          <Surface
            title="Required evidence"
            description="Traceable on every result"
          >
            <p className="text-body text-muted">
              Results expose location, valid time, weather source, model
              version, data quality, and known limitations. A result without
              that record is treated as unreadable rather than trusted.
            </p>
          </Surface>
          <Surface title="Official sources" description="Where to confirm">
            <div className="grid gap-2">
              <a
                className="text-body flex items-center justify-between rounded-control border border-line px-3 py-2 text-brand-primary"
                href="https://www.pagasa.dost.gov.ph/"
                target="_blank"
                rel="noreferrer"
              >
                PAGASA <ArrowRight size={14} />
              </a>
              <p className="text-metadata text-muted">
                Plus your city DRRMO for local advisories and evacuation
                instructions.
              </p>
            </div>
          </Surface>
        </div>
      </main>
    </AppShell>
  );
}

export function SettingsScreen({ screen }: { screen?: string }) {
  if (!convexConfigured) {
    return (
      <SettingsScreenBody screen={screen} currentUser={null} user={null} />
    );
  }
  return <LiveSettingsScreen screen={screen} />;
}

function LiveSettingsScreen({ screen }: { screen?: string }) {
  const { user } = useFirebaseAuth();
  const currentUser = useQuery(api.users.getCurrent, {});
  const updateCurrentProfile = useMutation(api.users.updateCurrentProfile);
  return (
    <SettingsScreenBody
      screen={screen}
      currentUser={currentUser}
      user={user}
      updateCurrentProfile={updateCurrentProfile}
    />
  );
}

function SettingsScreenBody({
  screen,
  currentUser,
  user,
  updateCurrentProfile,
}: {
  screen?: string;
  /** The Convex `users` row for the signed-in person, once it has loaded. */
  currentUser?: {
    displayName?: string | null;
    email?: string | null;
    role?: string;
    roleProfile?: {
      organization?: string;
      city?: string;
      position?: string;
      requestedArea?: string;
      purpose?: string;
      researcherType?: "government" | "private" | "independent" | "other";
    };
  } | null;
  /** The Firebase account, which is what password reset and email need. */
  user?: User | null;
  updateCurrentProfile?: (args: {
    displayName: string;
    roleProfile?: {
      city?: string;
      organization?: string;
      position?: string;
      researcherType?: "government" | "private" | "independent" | "other";
      requestedArea?: string;
      purpose?: string;
    };
  }) => Promise<{ updated: boolean }>;
}) {
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [securityMessage, setSecurityMessage] = useState("");
  const [displayName, setDisplayName] = useState(
    currentUser?.displayName ?? user?.displayName ?? "",
  );
  const [organization, setOrganization] = useState(
    currentUser?.roleProfile?.organization ?? "",
  );
  const [city, setCity] = useState(currentUser?.roleProfile?.city ?? "");
  const [position, setPosition] = useState(
    currentUser?.roleProfile?.position ?? "",
  );
  /* eslint-disable react-hooks/set-state-in-effect --
     The account row arrives from Convex after mount, so these fields cannot be
     initialised during render without hydration mismatches. The values are
     written once per change of `currentUser`/`user`, not in a render loop. */
  useEffect(() => {
    if (currentUser === undefined) return;
    setDisplayName(currentUser?.displayName ?? user?.displayName ?? "");
    setOrganization(currentUser?.roleProfile?.organization ?? "");
    setCity(currentUser?.roleProfile?.city ?? "");
    setPosition(currentUser?.roleProfile?.position ?? "");
  }, [currentUser, user]);
  /* eslint-enable react-hooks/set-state-in-effect */
  const [activeScreen, setActiveScreen] = useState(screen || "profile");
  const settingsTitle =
    activeScreen === "notifications"
      ? "Notifications"
      : activeScreen === "accessibility"
        ? "Accessibility"
        : activeScreen === "security"
          ? "Security, password & access"
          : activeScreen === "password"
            ? "Security, password & access"
            : activeScreen === "account"
              ? "Security, password & access"
              : "Profile";

  let content: ReactNode;
  if (activeScreen === "profile") {
    const roleLabel: Record<string, string> = {
      resident: "Resident",
      lgu: "LGU operator",
      researcher: "Researcher",
      admin: "Administrator",
    };
    const nameParts = displayName.trim().split(/\s+/);
    const firstName = nameParts.shift() ?? "";
    const lastName = nameParts.join(" ");
    const assignedLocations =
      currentUser?.roleProfile?.city ??
      currentUser?.roleProfile?.requestedArea ??
      (currentUser?.role === "admin"
        ? "All supported locations"
        : currentUser?.role === "lgu"
          ? "Assigned by an administrator"
          : "Not assigned");

    async function saveProfile() {
      setSaveError("");
      if (!displayName.trim()) {
        setSaveError("Display name is required.");
        return;
      }
      try {
        if (user)
          await updateProfile(user, { displayName: displayName.trim() });
        await updateCurrentProfile?.({
          displayName: displayName.trim(),
          roleProfile: {
            ...(city ? { city } : {}),
            ...(organization ? { organization } : {}),
            ...(position ? { position } : {}),
            ...(currentUser?.roleProfile?.researcherType
              ? { researcherType: currentUser.roleProfile.researcherType }
              : {}),
            ...(currentUser?.roleProfile?.requestedArea
              ? { requestedArea: currentUser.roleProfile.requestedArea }
              : {}),
            ...(currentUser?.roleProfile?.purpose
              ? { purpose: currentUser.roleProfile.purpose }
              : {}),
          },
        });
        setSaved(true);
      } catch (error) {
        setSaveError(
          error instanceof Error
            ? error.message
            : "Profile could not be saved.",
        );
      }
    }

    content = (
      <div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
          <div>
            <h2 className="text-major-status">My profile</h2>
            <p className="text-body mt-1 text-muted">
              Personal details and workspace assignment.
            </p>
          </div>
          <Button
            size="small"
            loading={currentUser === undefined}
            loadingLabel="Loading account"
            onClick={() => void saveProfile()}
          >
            <FloppyDisk size={14} /> Save changes
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-3 py-4">
          <span className="inline-flex size-14 items-center justify-center rounded-full bg-brand-secondary-soft text-brand-primary">
            {user?.photoURL ? (
              <Image
                src={user.photoURL}
                alt=""
                width={56}
                height={56}
                className="size-14 rounded-full object-cover"
                unoptimized
              />
            ) : (
              <UserCircle size={32} weight="duotone" />
            )}
          </span>
          <div>
            <p className="text-button">Profile image</p>
            <p className="text-metadata mt-0.5 text-muted">
              Synced from your sign-in provider
            </p>
          </div>
        </div>

        <div className="grid gap-3 border-t border-line py-4 sm:grid-cols-2">
          <TextField
            id="profile-first-name"
            label="First name"
            value={firstName}
            onChange={(event) => {
              const nextFirst = event.target.value;
              setDisplayName([nextFirst, lastName].filter(Boolean).join(" "));
            }}
          />
          <TextField
            id="profile-last-name"
            label="Last name"
            value={lastName}
            onChange={(event) => {
              setDisplayName(
                [firstName, event.target.value].filter(Boolean).join(" "),
              );
            }}
          />
          <TextField
            id="profile-org"
            label="Organization"
            value={organization}
            onChange={(event) => setOrganization(event.target.value)}
          />
          {currentUser?.role === "resident" ? (
            <TextField
              id="profile-city"
              label="Saved city"
              value={city}
              onChange={(event) => setCity(event.target.value)}
            />
          ) : null}
          {currentUser?.role === "lgu" ? (
            <TextField
              id="profile-position"
              label="Position"
              value={position}
              onChange={(event) => setPosition(event.target.value)}
            />
          ) : null}
          <TextField
            id="profile-role"
            label="Role"
            value={
              currentUser?.role
                ? (roleLabel[currentUser.role] ?? currentUser.role)
                : "Unavailable"
            }
            readOnly
          />
          <TextField
            id="profile-email"
            label="Contact email"
            value={user?.email ?? currentUser?.email ?? ""}
            readOnly
          />
          <TextField
            id="profile-locations"
            label="Assigned locations"
            value={assignedLocations}
            readOnly
          />
        </div>

        <div className="border-t border-line pt-4">
          <h2 className="text-section">Account security</h2>
          <div className="mt-3 divide-y divide-line rounded-control border border-line">
            <div className="flex flex-wrap items-center gap-3 px-3 py-3">
              <div className="min-w-0 flex-1">
                <p className="text-button">Email address</p>
                <p className="text-body mt-0.5 text-muted">
                  {user?.email ?? currentUser?.email ?? "Unavailable"}
                </p>
              </div>
              <Button
                size="small"
                variant="quiet"
                disabled={!user?.email}
                onClick={() => {
                  if (!user?.email) return;
                  const auth = getFirebaseAuth();
                  if (!auth) {
                    setSaveError(
                      "Password reset is unavailable: this build has no Firebase configuration.",
                    );
                    return;
                  }
                  void sendPasswordResetEmail(auth, user.email)
                    .then(() => {
                      setSaved(false);
                      setSaveError("");
                      setSecurityMessage(
                        "Password reset email sent. Check your inbox.",
                      );
                    })
                    .catch((error: unknown) => {
                      setSaveError(
                        error instanceof Error
                          ? error.message
                          : "Password reset email could not be sent.",
                      );
                    });
                }}
              >
                Send reset email
              </Button>
            </div>
            <div className="flex flex-wrap items-center gap-3 px-3 py-3">
              <div className="min-w-0 flex-1">
                <p className="text-button">Password</p>
                <p className="text-body mt-0.5 tracking-[0.22em] text-muted">
                  ••••••••••••
                </p>
              </div>
              <Button
                size="small"
                variant="quiet"
                onClick={() => setActiveScreen("security")}
              >
                Change password
              </Button>
            </div>
            <div className="flex flex-wrap items-center gap-3 px-3 py-3">
              <div className="min-w-0 flex-1">
                <p className="text-button">Multi-factor authentication</p>
                <p className="text-body mt-0.5 text-muted">
                  Add an extra verification step when signing in.
                </p>
              </div>
              <Button
                size="small"
                variant="quiet"
                onClick={() => setActiveScreen("security")}
              >
                Set up
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  } else if (activeScreen === "notifications") {
    content = (
      <div>
        <h2 className="text-major-status">Notification preferences</h2>
        <p className="text-body mt-1 text-muted">
          Choose which workspace updates need your attention.
        </p>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <CheckControl
            id="notify-reviews"
            label="Review assignments"
            description="New items assigned to your account."
          />
          <CheckControl
            id="notify-status"
            label="System status"
            description="Provider or model availability changes."
          />
          <CheckControl
            id="notify-outlook"
            label="Forecast updates"
            description="New completed runs for followed locations."
          />
          <CheckControl
            id="notify-notes"
            label="Notes and mentions"
            description="Replies and follow-up assignments."
          />
        </div>
        <div className="mt-4 max-w-md">
          <SelectControl id="notify-channel" label="Delivery channel">
            <option>In application</option>
            <option>Email</option>
          </SelectControl>
        </div>
        <Button className="mt-4" size="small" disabled>
          Backend storage required
        </Button>
      </div>
    );
  } else if (activeScreen === "accessibility") {
    content = (
      <div>
        <h2 className="text-major-status">Accessibility preferences</h2>
        <p className="text-body mt-1 text-muted">
          Adjust how charts, maps, and motion are presented.
        </p>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <CheckControl
            id="high-contrast"
            label="Increase contrast"
            description="Strengthen borders and secondary text."
          />
          <CheckControl
            id="reduce-motion-setting"
            label="Reduce motion"
            description="Limit non-essential interface animation."
          />
          <CheckControl
            id="table-alternative"
            label="Prefer chart tables"
            description="Show accessible data tables with charts."
          />
          <CheckControl
            id="larger-targets"
            label="Larger control targets"
            description="Increase interactive control size."
          />
        </div>
        <div className="mt-4 max-w-md">
          <SelectControl id="spatial-view" label="Default spatial view">
            <option>Interactive map</option>
            <option>Location list</option>
          </SelectControl>
        </div>
        <Button className="mt-4" size="small" disabled>
          Backend storage required
        </Button>
      </div>
    );
  } else if (
    activeScreen === "security" ||
    activeScreen === "password" ||
    activeScreen === "account"
  ) {
    content = (
      <div className="mx-auto grid w-full max-w-none gap-5">
        <div>
          <h2 className="text-major-status">Security, password & access</h2>
          <p className="text-body mt-1 text-muted">
            Manage sign-in protection, password changes, active sessions, and
            workspace access in one place.
          </p>
        </div>
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(280px,0.85fr)] lg:items-start">
          <section
            className="grid gap-3"
            aria-labelledby="security-section-title"
          >
            <div>
              <h3 id="security-section-title" className="text-section">
                Security and sessions
              </h3>
              <p className="text-body mt-1 text-muted">
                Review sign-in protection and active devices.
              </p>
            </div>
            <div className="divide-y divide-line rounded-control border border-line">
              <div className="flex flex-wrap items-center gap-3 px-3 py-3">
                <div className="min-w-0 flex-1">
                  <p className="text-button">Multi-factor authentication</p>
                  <p className="text-body mt-0.5 text-muted">Not configured</p>
                </div>
                <Button
                  size="small"
                  variant="quiet"
                  disabled
                  title="MFA setup is not configured"
                >
                  Available after MFA setup
                </Button>
              </div>
              <div className="flex flex-wrap items-center gap-3 px-3 py-3">
                <div className="min-w-0 flex-1">
                  <p className="text-button">Current session</p>
                  <p className="text-body mt-0.5 text-muted">
                    This browser · Manila timezone
                  </p>
                </div>
                <StatusBadge tone="success">Active</StatusBadge>
              </div>
              <div className="flex flex-wrap items-center gap-3 px-3 py-3">
                <div className="min-w-0 flex-1">
                  <p className="text-button">Other sessions</p>
                  <p className="text-body mt-0.5 text-muted">
                    End access on other signed-in devices.
                  </p>
                </div>
                <Button size="small" variant="quiet">
                  Session management unavailable
                </Button>
              </div>
            </div>
          </section>
          <section
            className="grid gap-3"
            aria-labelledby="password-section-title"
          >
            <div>
              <h3 id="password-section-title" className="text-section">
                Change password
              </h3>
              <p className="text-body mt-1 text-muted">
                Choose a strong password that is not reused elsewhere.
              </p>
            </div>
            <div className="grid gap-3">
              <PasswordField
                id="combined-current-password"
                label="Current password"
                autoComplete="current-password"
              />
              <PasswordField
                id="combined-new-password"
                label="New password"
                autoComplete="new-password"
              />
              <PasswordField
                id="combined-confirm-password"
                label="Confirm new password"
                autoComplete="new-password"
              />
              <Button
                size="small"
                className="w-full sm:w-fit"
                disabled
                title="Password changes use the Send reset email action"
              >
                Use password reset
              </Button>
            </div>
          </section>
        </div>
        <section
          className="grid gap-3 border-t border-line pt-5"
          aria-labelledby="access-section-title"
        >
          <div>
            <h3 id="access-section-title" className="text-section">
              Account access
            </h3>
            <p className="text-body mt-1 text-muted">
              Manage role and workspace access requests.
            </p>
          </div>
          <div className="divide-y divide-line rounded-control border border-line">
            <div className="flex flex-wrap items-center gap-3 px-3 py-3">
              <div className="min-w-0 flex-1">
                <p className="text-button">Request an access change</p>
                <p className="text-body mt-0.5 text-muted">
                  Ask an administrator to review your role or assigned
                  locations.
                </p>
              </div>
              <Button size="small" variant="quiet" disabled>
                Backend review required
              </Button>
            </div>
            <div className="flex flex-wrap items-center gap-3 px-3 py-3">
              <div className="min-w-0 flex-1">
                <p className="text-button text-danger">
                  Deactivate account access
                </p>
                <p className="text-body mt-0.5 text-muted">
                  Staff access is deactivated by an authorized administrator to
                  preserve audit history.
                </p>
              </div>
              <Button size="small" variant="danger" disabled>
                Administrator action only
              </Button>
            </div>
          </div>
        </section>
      </div>
    );
  } else if (activeScreen === "password") {
    content = (
      <div className="mx-auto grid w-full max-w-4xl gap-6 lg:grid-cols-[minmax(220px,0.7fr)_minmax(0,1.3fr)] lg:gap-8">
        <div className="self-stretch rounded-control border border-line bg-canvas-soft p-4">
          <p className="text-metadata font-semibold uppercase tracking-[0.12em] text-muted">
            Security
          </p>
          <h2 className="text-section mt-2">Password security</h2>
          <p className="text-body mt-1 text-muted">
            Keep your RiverGuard account protected with a password that is
            unique to this workspace.
          </p>
          <ul className="text-body mt-4 grid gap-2 text-muted">
            <li>Use at least 12 characters.</li>
            <li>Do not reuse a password from another service.</li>
            <li>Never share your password or verification codes.</li>
          </ul>
        </div>
        <div className="min-w-0 max-w-2xl">
          <h2 className="text-major-status">Change password</h2>
          <p className="text-body mt-1 text-muted">
            Choose a strong password that is not reused elsewhere.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <PasswordField
                id="current-password"
                label="Current password"
                autoComplete="current-password"
              />
            </div>
            <PasswordField
              id="settings-new-password"
              label="New password"
              autoComplete="new-password"
            />
            <PasswordField
              id="settings-confirm-password"
              label="Confirm new password"
              autoComplete="new-password"
            />
            <div className="sm:col-span-2">
              <Button
                size="small"
                className="w-full"
                disabled
                title="Password changes use the Send reset email action"
              >
                Use password reset
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  } else {
    content = (
      <div>
        <h2 className="text-major-status">Account access</h2>
        <p className="text-body mt-1 text-muted">
          Manage session access and role-assignment requests.
        </p>
        <div className="mt-4 divide-y divide-line rounded-control border border-line">
          <div className="flex flex-wrap items-center gap-3 px-3 py-3">
            <div className="flex-1">
              <p className="text-button">Request an access change</p>
              <p className="text-body mt-0.5 text-muted">
                Ask an administrator to review your role or assigned locations.
              </p>
            </div>
            <Button size="small" variant="quiet">
              Request review
            </Button>
          </div>
          <div className="flex flex-wrap items-center gap-3 px-3 py-3">
            <div className="flex-1">
              <p className="text-button text-danger">
                Deactivate account access
              </p>
              <p className="text-body mt-0.5 text-muted">
                Staff access is deactivated by an authorized administrator to
                preserve audit history.
              </p>
            </div>
            <Button size="small" variant="danger">
              Request deactivation
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto grid w-full max-w-none gap-4">
      <PageHeading
        eyebrow="Workspace settings"
        title="Account settings"
        description="Manage your profile, preferences, security, and workspace access in one place."
      />
      <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(220px,264px)_minmax(0,1fr)] lg:items-start">
        <nav
          aria-label="Settings sections"
          className="role-surface grid gap-4 rounded-[1.35rem] border border-line bg-canvas p-4 lg:sticky lg:top-[5.5rem]"
        >
          {settingsGroups.map((group) => (
            <div key={group.label}>
              <p className="text-metadata font-semibold tracking-[0.12em] text-muted uppercase">
                {group.label}
              </p>
              <div className="mt-2 grid gap-1">
                {group.items.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    aria-current={activeScreen === item.id ? "true" : undefined}
                    onClick={() => {
                      setActiveScreen(item.id);
                      setSaved(false);
                    }}
                    className={`text-navigation grid gap-0.5 rounded-control px-3 py-2 text-left transition-colors ${
                      activeScreen === item.id
                        ? "bg-brand-secondary-soft text-ink"
                        : "text-muted hover:bg-canvas-soft hover:text-ink"
                    }`}
                  >
                    <span className="font-semibold">{item.label}</span>
                    <span className="text-metadata opacity-80">
                      {item.description}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </nav>
        <section
          aria-labelledby="settings-content-title"
          className="role-surface min-w-0 rounded-[1.35rem] border border-line bg-canvas p-4 sm:p-5 lg:p-6"
        >
          <h2 id="settings-content-title" className="sr-only">
            {settingsTitle}
          </h2>
          {content}
          {saved ? (
            <p className="text-metadata mt-3 text-success" role="status">
              Changes saved.
            </p>
          ) : securityMessage ? (
            <p className="text-metadata mt-3 text-success" role="status">
              {securityMessage}
            </p>
          ) : saveError ? (
            <p className="text-metadata mt-3 text-danger" role="alert">
              {saveError}
            </p>
          ) : null}
        </section>
      </div>
    </div>
  );
}
