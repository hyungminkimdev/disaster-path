import type { ApplicationDraft } from "./recovery";

export type UserApproval = { approved: true; approvedAt: string };
export type ApplicationExecutionResult = {
  applicationId: string;
  status: "submitted";
  submittedAt: string;
  simulated: true;
};

export interface ApplicationExecutor {
  execute(
    draft: ApplicationDraft,
    approval: UserApproval,
  ): Promise<ApplicationExecutionResult>;
}

export class DemoApplicationExecutor implements ApplicationExecutor {
  async execute(
    draft: ApplicationDraft,
    approval: UserApproval,
  ): Promise<ApplicationExecutionResult> {
    const response = await fetch("/api/demo-government/application", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ draft, approval }),
    });
    if (!response.ok)
      throw new Error("Simulated portal rejected the application");
    return response.json();
  }
}

// Optional future adapter. It must only target the local simulated portal and
// must preserve the same explicit approval contract.
export class FoundryBrowserApplicationExecutor implements ApplicationExecutor {
  async execute(
    _draft: ApplicationDraft,
    _approval: UserApproval,
  ): Promise<ApplicationExecutionResult> {
    throw new Error("Foundry Browser Automation is not configured");
  }
}
