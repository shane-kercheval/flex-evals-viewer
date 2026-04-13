export interface CheckResult {
  check_type: string
  check_version: string
  status: 'completed' | 'error'
  results: {
    passed: boolean
    found?: string[]
    reasoning?: string
    judge_metadata?: {
      judge_model?: string
      input_tokens?: number
      output_tokens?: number
      total_cost?: number
      duration_seconds?: number
    }
    [key: string]: unknown
  }
  resolved_arguments: Record<string, unknown>
  evaluated_at: string
  metadata: {
    name?: string
    description?: string
  } | null
  error: unknown
}

export interface SampleSummary {
  total_checks: number
  completed_checks: number
  error_checks: number
}

export interface TestCase {
  id: string
  input: Record<string, unknown>
  expected: Record<string, unknown>
  metadata?: {
    description?: string
  }
}

export interface TestOutput {
  value: Record<string, unknown>
  id: string | null
  metadata: {
    duration_seconds?: number
  }
}

export interface ExecutionContext {
  test_case: TestCase
  output: TestOutput
}

export interface SampleResult {
  status: 'completed' | 'error'
  execution_context: ExecutionContext
  check_results: CheckResult[]
  summary: SampleSummary
  metadata: unknown
}

export interface RunSummary {
  total_test_cases: number
  completed_test_cases: number
  error_test_cases: number
}

export interface TestConfig {
  test_function: string
  test_module: string
  samples: number
  pass_threshold: number
  pass_mode: 'per_test_case' | 'sample'
  num_test_cases: number
}

export interface PerTestCaseResult {
  index: number
  id: string | null
  passed: number
  failed: number
  total: number
  rate: number
}

export interface TestResults {
  pass_mode: 'per_test_case' | 'sample'
  pass_threshold: number
  passed: boolean
  // Sample-level stats
  passed_samples: number
  failed_samples: number
  total_samples: number
  sample_pass_rate: number
  // Per-test-case stats (present when pass_mode is 'per_test_case')
  per_test_case?: PerTestCaseResult[]
  failed_test_cases?: Array<{
    index: number
    id: string | null
  }>
}

/** Whether a per-test-case entry meets the pass threshold. */
export function testCasePassed(tc: PerTestCaseResult, threshold: number): boolean {
  return tc.rate >= threshold
}

export interface RunMetadata {
  model_provider?: string
  model_name?: string
  _test_config: TestConfig
  _test_results: TestResults
  annotation?: string
  eval_name?: string
  eval_description?: string
  temperature?: number
}

export interface EvalRun {
  evaluation_id: string
  started_at: string
  completed_at: string
  status: 'completed' | 'error'
  summary: RunSummary
  results: SampleResult[]
  metadata: RunMetadata
  file_path?: string
}

export interface EvalRunListItem {
  evaluation_id: string
  started_at: string
  completed_at: string
  status: 'completed' | 'error'
  summary: RunSummary
  metadata: RunMetadata
  filename: string
  total_cost?: number
  total_input_tokens?: number
  total_output_tokens?: number
  avg_cost?: number
  avg_duration_seconds?: number
}
