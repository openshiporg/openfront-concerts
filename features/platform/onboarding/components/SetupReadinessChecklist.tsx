import Link from "next/link";
import type { OnboardingSettingsReview } from "../hooks/useOnboardingState";

type ReadinessCheck = { title: string; detail: string; href: string; link: string; secondaryHref?: string; secondaryLink?: string };

const CHECKS: ReadinessCheck[] = [
  { title: "Pricing and fees", detail: "Review every price level, tier and service fee in the venue currency before announcing.", href: "/dashboard/platform/events", link: "Review events" },
  { title: "Deals and settlement terms", detail: "Confirm each artist deal's accepted terms, expense cap and deposit before the show.", href: "/dashboard/platform/deals", link: "Review deals" },
  { title: "Payment and refund flow", detail: "Configure credentials and complete provider test payment, refund, and webhook checks. Do not use live keys for setup tests.", href: "/dashboard/platform/payment-providers", link: "Review providers" },
  { title: "Staff permissions", detail: "Confirm each operator has only the permissions needed for their role, including refunds and settlement sign-off.", href: "/dashboard/platform/customers", link: "Review roles" },
];

export function SetupReadinessChecklist({ settingsReview }: { settingsReview: OnboardingSettingsReview | null }) {
  return <section className="space-y-5" aria-labelledby="setup-readiness-title">
    <div className="rounded-md border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100">
      <h3 id="setup-readiness-title" className="font-semibold">Setup records saved — operational readiness is not verified</h3>
      <p className="mt-1">Completing this setup only confirms record persistence. Finish these checks before accepting customer orders.</p>
    </div>

    <div className="rounded-md border p-4 text-sm">
      <h3 className="font-medium">Persisted settings review</h3>
      {!settingsReview ? <p className="mt-1 text-muted-foreground">No settings readback is available. Review the saved configuration manually.</p> : settingsReview.mismatchedFields.length > 0 ? (
        <p className="mt-1 text-amber-700 dark:text-amber-300">
          Existing settings were preserved without overwrite. These fields differ from the selected setup: {settingsReview.mismatchedFields.join(", ")}.
        </p>
      ) : (
        <p className="mt-1 text-muted-foreground">
          The persisted settings match the submitted setup values for {settingsReview.checkedFields.length} fields{settingsReview.reused ? " (existing record reused)" : ""}. This does not verify customer or provider behavior.
        </p>
      )}
    </div>

    <ol className="space-y-3">
      {CHECKS.map((check, index) => <li key={check.title} className="rounded-md border p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-medium">{index + 1}. {check.title} <span className="ml-1 text-xs font-normal text-amber-700 dark:text-amber-300">Not verified</span></p>
            <p className="mt-1 text-sm text-muted-foreground">{check.detail}</p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-3">
            <Link className="text-sm font-medium underline underline-offset-4" href={check.href}>{check.link}</Link>
            {check.secondaryHref && check.secondaryLink ? <Link className="text-sm font-medium underline underline-offset-4" href={check.secondaryHref}>{check.secondaryLink}</Link> : null}
          </div>
        </div>
      </li>)}
    </ol>
  </section>;
}
