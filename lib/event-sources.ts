import type { DisasterEvent } from "./recovery";

export interface DisasterEventSource {
  subscribe(handler: (event: DisasterEvent) => void): () => void;
}

export class DemoEventSource implements DisasterEventSource {
  private handlers = new Set<(event: DisasterEvent) => void>();
  subscribe(handler: (event: DisasterEvent) => void) {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }
  emit(event: DisasterEvent) {
    for (const handler of this.handlers) handler(event);
  }
}

// The existing NWS/OpenFEMA adapters normalize current public data. These source
// boundaries make polling, webhooks, or a future Fabric Eventstream replaceable
// without changing the Recovery Twin or Crisis Compiler.
export class NwsEventSource implements DisasterEventSource {
  subscribe(_handler: (event: DisasterEvent) => void) {
    return () => undefined;
  }
}
export class OpenFemaEventSource implements DisasterEventSource {
  subscribe(_handler: (event: DisasterEvent) => void) {
    return () => undefined;
  }
}
export class FabricEventSource implements DisasterEventSource {
  subscribe(_handler: (event: DisasterEvent) => void) {
    return () => undefined;
  }
}
