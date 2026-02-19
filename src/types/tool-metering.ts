export interface ToolContext {
  sessionId?: string;
  userId?: string;
  organizationName?: string;
  productName?: string;
  apiKey?: string;
  endpoint?: string;
}

export interface ToolMetadata {
  description?: string;
  category?: string;
  version?: string;
  tags?: string[];
  outputFields?: string[];
  usageMetadata?: Record<string, unknown>;
}

export interface ToolEventPayload {
  toolId: string;
  sessionId: string;
  startTime: number;
  endTime: number;
  durationMs: number;
  success: boolean;
  errorMessage?: string;
  metadata?: ToolMetadata;
  userId?: string;
  organizationName?: string;
  productName?: string;
}

export interface ToolCallReport {
  success: boolean;
  durationMs: number;
  errorMessage?: string;
  metadata?: ToolMetadata;
}
