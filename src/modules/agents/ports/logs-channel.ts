/** Structural slice of `us.rpc.streaming.create('agent-logs')`. */
export interface LogsStream {
  write(chunk: string): void
  close(): void
  error(err?: unknown): void
  signal: AbortSignal
}
export interface LogsChannel {
  start(opts?: { id?: string }): LogsStream
}
