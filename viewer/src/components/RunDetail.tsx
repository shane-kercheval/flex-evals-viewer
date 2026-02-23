import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useRun } from '../hooks/useRuns'
import SummaryMatrix from './SummaryMatrix'
import TestCaseTable from './TestCaseTable'
import AnnotationField from './AnnotationField'

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      onClick={(e) => {
        e.stopPropagation()
        navigator.clipboard.writeText(text).then(() => {
          setCopied(true)
          setTimeout(() => setCopied(false), 1500)
        })
      }}
      className="text-gray-300 hover:text-gray-500 transition-colors ml-1.5 shrink-0"
      title="Copy path"
    >
      {copied ? (
        <svg className="w-3.5 h-3.5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      ) : (
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
          <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
        </svg>
      )}
    </button>
  )
}

export default function RunDetail() {
  const { evaluationId } = useParams<{ evaluationId: string }>()
  const { run, loading, error } = useRun(evaluationId)

  if (loading) return <p className="text-gray-500">Loading...</p>
  if (error) return <p className="text-red-600">Error: {error}</p>
  if (!run) return <p className="text-gray-500">Run not found</p>

  const { metadata } = run
  const config = metadata._test_config
  const results = metadata._test_results
  const passed = results.passed

  // Compute cost/token totals from all samples (agent + judge)
  const usageTotals = run.results.reduce(
    (acc, r) => {
      const usage = (r.execution_context.output.value as Record<string, unknown>)?.usage as
        { input_tokens?: number; output_tokens?: number; total_cost?: number } | undefined
      if (usage) {
        acc.inputTokens += usage.input_tokens ?? 0
        acc.outputTokens += usage.output_tokens ?? 0
        acc.totalCost += usage.total_cost ?? 0
      }
      for (const check of r.check_results) {
        const judgeMeta = check.results.judge_metadata
        if (judgeMeta) {
          acc.inputTokens += judgeMeta.input_tokens ?? 0
          acc.outputTokens += judgeMeta.output_tokens ?? 0
          acc.totalCost += judgeMeta.total_cost ?? 0
        }
      }
      return acc
    },
    { inputTokens: 0, outputTokens: 0, totalCost: 0 },
  )

  return (
    <div>
      <Link to="/" className="text-sm text-blue-600 hover:underline mb-3 inline-block">
        &larr; Back to runs
      </Link>

      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 mb-4">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h2 className="text-base font-semibold text-gray-900">{metadata.eval_name || config.test_function}</h2>
            {metadata.eval_description && (
              <p className="text-sm text-gray-500 mt-1 whitespace-pre-line">{metadata.eval_description.trim()}</p>
            )}
            <p className="text-xs text-gray-400 font-mono mt-0.5">{run.evaluation_id}</p>
            {run.file_path && (
              <p className="text-xs text-gray-400 font-mono mt-0.5 flex items-center">
                <span className="truncate">{run.file_path}</span>
                <CopyButton text={run.file_path} />
              </p>
            )}
          </div>
          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
            passed ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
          }`}>
            {passed ? 'PASSED' : 'FAILED'}
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-2 text-sm">
          <div>
            <span className="text-xs text-gray-400">Model</span>
            <p className="font-medium text-gray-900">{metadata.model_name ?? 'unknown'}</p>
          </div>
          {metadata.temperature != null && (
            <div>
              <span className="text-xs text-gray-400">Temperature</span>
              <p className="font-medium text-gray-900 tabular-nums">{metadata.temperature}</p>
            </div>
          )}
          <div>
            <span className="text-xs text-gray-400">Success Rate</span>
            <p className="font-medium text-gray-900 tabular-nums">{(results.success_rate * 100).toFixed(1)}%</p>
          </div>
          <div>
            <span className="text-xs text-gray-400">Threshold</span>
            <p className="font-medium text-gray-900 tabular-nums">{(results.success_threshold * 100).toFixed(0)}%</p>
          </div>
          <div>
            <span className="text-xs text-gray-400">Samples</span>
            <p className="font-medium text-gray-900 tabular-nums">
              {results.passed_samples} passed / {results.total_samples} total
            </p>
          </div>
          <div>
            <span className="text-xs text-gray-400">Test Cases</span>
            <p className="font-medium text-gray-900 tabular-nums">{config.num_test_cases}</p>
          </div>
          <div>
            <span className="text-xs text-gray-400">Samples/Case</span>
            <p className="font-medium text-gray-900 tabular-nums">{config.samples}</p>
          </div>
          <div>
            <span className="text-xs text-gray-400">Started</span>
            <p className="font-medium text-gray-900">{new Date(run.started_at).toLocaleString()}</p>
          </div>
          <div>
            <span className="text-xs text-gray-400">Completed</span>
            <p className="font-medium text-gray-900">{new Date(run.completed_at).toLocaleString()}</p>
          </div>
          <div>
            <span className="text-xs text-gray-400">Test Function</span>
            <p className="font-medium text-gray-900 font-mono text-xs">{config.test_function}</p>
          </div>
          {usageTotals.totalCost > 0 && (
            <>
              <div>
                <span className="text-xs text-gray-400">Total Cost</span>
                <p className="font-medium text-gray-900 tabular-nums">${usageTotals.totalCost.toFixed(4)}</p>
              </div>
              <div>
                <span className="text-xs text-gray-400">Tokens</span>
                <p className="font-medium text-gray-900 tabular-nums">
                  {usageTotals.inputTokens.toLocaleString()} in / {usageTotals.outputTokens.toLocaleString()} out
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      <AnnotationField
        evaluationId={run.evaluation_id}
        initialValue={metadata.annotation ?? ''}
      />

      <SummaryMatrix results={run.results} />
      <TestCaseTable results={run.results} />

      <div className="mt-6 border-t border-gray-100 pt-4 space-y-1 text-[11px] text-gray-400">
        <p><span className="font-medium text-gray-500">Total Cost / Tokens</span> (header) includes both agent response costs and LLM judge costs across all samples.</p>
        <p><span className="font-medium text-gray-500">Per-sample duration</span> reflects the agent response time only; it does not include check execution or judge evaluation time.</p>
        <p><span className="font-medium text-gray-500">Per-sample cost</span> reflects the agent response only; judge cost is shown separately within the check detail.</p>
      </div>
    </div>
  )
}
