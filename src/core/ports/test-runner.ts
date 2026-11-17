/** Port: run the project's test runner — implemented by `infra/process-test-runner`. */
export interface TestRunOutcome {
  file: string
  runner: string
  ok: boolean
  code: number
  durationMs: number
  output: string
}

export interface TestRunner {
  run(file: string): Promise<TestRunOutcome>
}
