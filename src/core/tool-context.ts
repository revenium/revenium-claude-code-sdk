import { AsyncLocalStorage } from "node:async_hooks";
import type { ToolContext } from "../types/tool-metering.js";

const toolContextStorage = new AsyncLocalStorage<ToolContext>();

export function setToolContext(context: ToolContext): void {
  toolContextStorage.enterWith(context);
}

export function getToolContext(): ToolContext {
  return toolContextStorage.getStore() ?? {};
}

export function clearToolContext(): void {
  toolContextStorage.enterWith({});
}

export function runWithToolContext<T>(
  context: ToolContext,
  fn: () => T,
): T {
  return toolContextStorage.run(context, fn);
}
