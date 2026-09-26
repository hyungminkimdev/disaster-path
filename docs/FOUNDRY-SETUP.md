# Microsoft Foundry setup

DisasterPath implements the runtime call and the configured `gpt-4.1-mini` deployment has been verified through the full Crisis Compiler pipeline. This guide documents the configuration and recovery procedure without containing credentials.

## Azure resources to create

1. In Microsoft Foundry, create or select a Foundry resource with an Azure OpenAI-compatible resource endpoint.
2. Deploy a model that supports Chat Completions structured outputs. Recommended for this demo: **gpt-4.1-mini**, model version **2025-04-14**.
3. Record the **deployment name** you choose. The API `model` value is the deployment name, not the catalog model ID.
4. From the resource, copy the resource endpoint and one API key.

Use a resource endpoint in one of these forms:

```text
https://YOUR-RESOURCE.openai.azure.com
https://YOUR-RESOURCE.services.ai.azure.com
```

Do not use a project URL containing `/api/projects/...`; this application calls the resource-level OpenAI v1 endpoint.

## Configure the app

Create `.env.local` beside `package.json`:

```bash
AZURE_FOUNDRY_ENDPOINT=https://YOUR-RESOURCE.openai.azure.com
AZURE_FOUNDRY_DEPLOYMENT=YOUR-DEPLOYMENT-NAME
AZURE_FOUNDRY_API_KEY=YOUR-RESOURCE-KEY
NWS_USER_AGENT=DisasterPath-Hackathon/0.1-your-contact
```

Never commit `.env.local`. Restart the Next.js server after changing environment variables.

## What Foundry does

For each disaster or case event, the server sends Foundry:

- trusted facts already stored in the Recovery Twin;
- the current household and recovery state;
- the reducer-generated state diff;
- a deterministic catalog of allowed actions.

Foundry returns a strict structured result containing urgency, one to three allowed action IDs, the next action ID, a short explanation, and whether human escalation is required. The server rejects responses that fail the schema, name an action outside the catalog, omit the next action from the priority list, or change event-derived urgency.

Foundry cannot create official facts, eligibility decisions, deadlines, routes, or application statuses. Those remain deterministic inputs and state transitions.

## Verify before recording

1. Start with `npm run dev` or rebuild with `npm run build && npm start`.
2. Reset the demo.
3. Leave **Deterministic compiler** unchecked.
4. Trigger **Simulate flash flood**.
5. Expand **Why these actions?**
6. Confirm the computation card says **Microsoft Foundry** and the provider note begins with “Microsoft Foundry prioritized…”
7. Open **Technical proof** and confirm it says **Microsoft Foundry connected**.

If either panel says **Validated deterministic fallback**, inspect the server log. Common causes are an incorrect resource endpoint, a deployment name mismatch, a model that does not support structured outputs, key permissions, quota, or the 8.5-second timeout.

## Reliability behavior

The recorded flow never blocks on the cloud call. A timeout, non-2xx response, invalid JSON, schema violation, disallowed action, or urgency change activates the deterministic compiler and labels that fact in the UI. For prize eligibility, record only after the UI visibly confirms a successful Microsoft Foundry response.

Official references:

- [Microsoft Foundry structured outputs](https://learn.microsoft.com/en-us/azure/foundry/openai/how-to/structured-outputs)
- [Microsoft Foundry OpenAI v1 endpoint](https://learn.microsoft.com/en-us/azure/foundry/openai/latest)
