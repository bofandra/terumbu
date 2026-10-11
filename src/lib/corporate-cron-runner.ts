/**
 * Keep the authenticated cron's independent maintenance jobs running even if
 * another stage fails. A failed response still causes the scheduler to report
 * a problem; successful stages are not rolled back or run a second time here.
 */
export type CorporateCronStage = "reports" | "emails" | "deliveryEvents" | "prune";

type StageResult<T> = { ok: true; value: T } | { ok: false };

type CronTasks<Reports, Emails, DeliveryEvents> = {
  reports: () => Promise<Reports>;
  emails: () => Promise<Emails>;
  deliveryEvents: () => Promise<DeliveryEvents>;
  prune: () => Promise<number>;
};

type SuccessfulCron<Reports, Emails, DeliveryEvents> = {
  ok: true;
  reports: Reports;
  emails: Emails;
  deliveryEvents: DeliveryEvents;
  removedEvents: number;
};

type FailedCron = {
  ok: false;
  failedStages: CorporateCronStage[];
  stages: Record<CorporateCronStage, "ok" | "failed">;
};

async function attempt<T>(
  stage: CorporateCronStage,
  task: () => Promise<T>,
  onFailure: (stage: CorporateCronStage) => void
): Promise<StageResult<T>> {
  try {
    return { ok: true, value: await task() };
  } catch {
    // Do not expose DB/provider exception details in HTTP responses or logs.
    onFailure(stage);
    return { ok: false };
  }
}

export async function runCorporateCronStages<Reports, Emails, DeliveryEvents>(
  tasks: CronTasks<Reports, Emails, DeliveryEvents>,
  onFailure: (stage: CorporateCronStage) => void = () => {}
): Promise<SuccessfulCron<Reports, Emails, DeliveryEvents> | FailedCron> {
  // Keep the original stage order, but do not skip recovery and retention when
  // report generation or email delivery is temporarily unavailable.
  const reports = await attempt("reports", tasks.reports, onFailure);
  const emails = await attempt("emails", tasks.emails, onFailure);
  const deliveryEvents = await attempt("deliveryEvents", tasks.deliveryEvents, onFailure);
  const prune = await attempt("prune", tasks.prune, onFailure);

  if (reports.ok && emails.ok && deliveryEvents.ok && prune.ok) {
    return {
      ok: true,
      reports: reports.value,
      emails: emails.value,
      deliveryEvents: deliveryEvents.value,
      removedEvents: prune.value
    };
  }

  const stages: FailedCron["stages"] = {
    reports: reports.ok ? "ok" : "failed",
    emails: emails.ok ? "ok" : "failed",
    deliveryEvents: deliveryEvents.ok ? "ok" : "failed",
    prune: prune.ok ? "ok" : "failed"
  };
  const failedStages = (["reports", "emails", "deliveryEvents", "prune"] as const)
    .filter((stage) => stages[stage] === "failed");
  return { ok: false, failedStages, stages };
}
