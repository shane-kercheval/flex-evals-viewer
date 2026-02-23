import type { CheckResult } from '../types'

function resolvedValue(arg: unknown): unknown {
  if (arg && typeof arg === 'object' && 'value' in arg) return (arg as Record<string, unknown>).value
  return arg
}

function resolvedJsonpath(arg: unknown): string | undefined {
  if (arg && typeof arg === 'object' && 'jsonpath' in arg) return (arg as Record<string, string>).jsonpath
  return undefined
}

interface Flag {
  label: string
  isDefault: boolean
}

function Flags({ items }: { items: Flag[] }) {
  if (items.length === 0) return null
  return (
    <div className="flex flex-wrap gap-1">
      {items.map((flag) => (
        <span
          key={flag.label}
          className={`text-[11px] px-1.5 py-0.5 rounded font-mono ${
            flag.isDefault
              ? 'bg-gray-100 text-gray-500'
              : 'bg-amber-100 text-amber-800'
          }`}
        >
          {flag.label}
        </span>
      ))}
    </div>
  )
}

function formatValue(val: unknown): string {
  if (val === null || val === undefined) return String(val)
  if (typeof val === 'object') return JSON.stringify(val, null, 2)
  return String(val)
}

function FieldLabel({ label, jsonpath }: { label: string; jsonpath?: string }) {
  return (
    <h6 className="text-[11px] text-gray-400 mb-0.5">
      {label}
      {jsonpath && <span className="font-mono text-gray-300 ml-1.5">{jsonpath}</span>}
    </h6>
  )
}

function ValueCell({ label, value, jsonpath }: { label: string; value: unknown; jsonpath?: string }) {
  return (
    <div className="flex-1 min-w-0">
      <FieldLabel label={label} jsonpath={jsonpath} />
      <pre className="text-xs bg-gray-50 p-2 rounded overflow-x-auto whitespace-pre-wrap break-all text-blue-700">
        {formatValue(value)}
      </pre>
    </div>
  )
}

function ExactMatchView({ check }: { check: CheckResult }) {
  const args = check.resolved_arguments
  const actual = resolvedValue(args.actual)
  const expected = resolvedValue(args.expected)
  const caseSensitive = resolvedValue(args.case_sensitive)
  const negate = resolvedValue(args.negate)
  const flags: Flag[] = []
  if (caseSensitive !== undefined) flags.push({ label: `case_sensitive=${caseSensitive}`, isDefault: caseSensitive === true })
  if (negate !== undefined) flags.push({ label: `negate=${negate}`, isDefault: negate === false })

  return (
    <div className="space-y-2">
      <Flags items={flags} />
      <div className="flex gap-3">
        <ValueCell label="Expected" value={expected} jsonpath={resolvedJsonpath(args.expected)} />
        <ValueCell label="Actual" value={actual} jsonpath={resolvedJsonpath(args.actual)} />
      </div>
    </div>
  )
}

function ContainsView({ check }: { check: CheckResult }) {
  const args = check.resolved_arguments
  const phrases = resolvedValue(args.phrases)
  const found = check.results.found
  const negate = resolvedValue(args.negate)
  const matchAll = resolvedValue(args.match_all)
  const caseSensitive = resolvedValue(args.case_sensitive)
  const flags: Flag[] = []
  if (caseSensitive !== undefined) flags.push({ label: `case_sensitive=${caseSensitive}`, isDefault: caseSensitive === true })
  if (matchAll !== undefined) flags.push({ label: `match_all=${matchAll}`, isDefault: matchAll === true })
  if (negate !== undefined) flags.push({ label: `negate=${negate}`, isDefault: negate === false })

  const text = resolvedValue(args.text)

  return (
    <div className="space-y-2">
      <Flags items={flags} />
      <div className="flex gap-3">
        <div className="flex-1 min-w-0">
          <FieldLabel label="Phrases Searched" jsonpath={resolvedJsonpath(args.phrases)} />
          <pre className="text-xs bg-gray-50 p-2 rounded overflow-x-auto whitespace-pre-wrap break-all text-blue-700">
            {formatValue(phrases)}
          </pre>
        </div>
        {found && (
          <div className="flex-1 min-w-0">
            <FieldLabel label="Phrases Found" />
            <pre className="text-xs bg-gray-50 p-2 rounded overflow-x-auto whitespace-pre-wrap break-all text-blue-700">
              {formatValue(found)}
            </pre>
          </div>
        )}
      </div>
      {text != null && (
        <div>
          <FieldLabel label="Text Searched" jsonpath={resolvedJsonpath(args.text)} />
          <pre className="text-xs bg-gray-50 p-2 rounded overflow-x-auto whitespace-pre-wrap break-all text-blue-700 max-h-60 overflow-y-auto">
            {formatValue(text)}
          </pre>
        </div>
      )}
    </div>
  )
}

function EqualsView({ check }: { check: CheckResult }) {
  const args = check.resolved_arguments
  const actual = resolvedValue(args.actual)
  const expected = resolvedValue(args.expected)
  const negate = resolvedValue(args.negate)
  const flags: Flag[] = []
  if (negate !== undefined) flags.push({ label: `negate=${negate}`, isDefault: negate === false })

  return (
    <div className="space-y-2">
      <Flags items={flags} />
      <div className="flex gap-3">
        <ValueCell label="Expected" value={expected} jsonpath={resolvedJsonpath(args.expected)} />
        <ValueCell label="Actual" value={actual} jsonpath={resolvedJsonpath(args.actual)} />
      </div>
    </div>
  )
}

function LLMJudgeView({ check }: { check: CheckResult }) {
  const args = check.resolved_arguments
  const prompt = resolvedValue(args.prompt)
  const reasoning = check.results.reasoning
  const meta = check.results.judge_metadata

  return (
    <div className="space-y-2">
      {reasoning && (
        <div>
          <FieldLabel label="Reasoning" />
          <pre className="text-xs bg-gray-50 p-2 rounded overflow-x-auto whitespace-pre-wrap">
            {reasoning}
          </pre>
        </div>
      )}
      {meta && (
        <div className="flex flex-wrap gap-2">
          {meta.judge_model && (
            <span className="text-[11px] px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 font-mono">
              {meta.judge_model}
            </span>
          )}
          {meta.total_cost != null && (
            <span className="text-[11px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 font-mono">
              ${meta.total_cost.toFixed(5)}
            </span>
          )}
          {meta.input_tokens != null && (
            <span className="text-[11px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 font-mono">
              {meta.input_tokens} in / {meta.output_tokens ?? '?'} out
            </span>
          )}
        </div>
      )}
      {prompt != null && (
        <details>
          <summary className="text-[11px] text-gray-400 cursor-pointer">Prompt</summary>
          <pre className="text-xs bg-gray-50 p-2 rounded overflow-x-auto whitespace-pre-wrap mt-1 max-h-60 overflow-y-auto">
            {formatValue(prompt)}
          </pre>
        </details>
      )}
    </div>
  )
}

function ResultsView({ check }: { check: CheckResult }) {
  const { passed, ...rest } = check.results
  if (Object.keys(rest).length === 0) return null
  return (
    <div>
      <h6 className="text-[11px] text-gray-400 mb-0.5">Results</h6>
      <pre className="text-xs bg-gray-50 p-2 rounded overflow-x-auto whitespace-pre-wrap">
        {JSON.stringify(rest, null, 2)}
      </pre>
    </div>
  )
}

function FallbackView({ check }: { check: CheckResult }) {
  return (
    <div className="space-y-2">
      <ResultsView check={check} />
      <div>
        <h6 className="text-[11px] text-gray-400 mb-0.5">Resolved Arguments</h6>
        <pre className="text-xs bg-gray-50 p-2 rounded overflow-x-auto whitespace-pre-wrap">
          {JSON.stringify(check.resolved_arguments, null, 2)}
        </pre>
      </div>
    </div>
  )
}

export default function CheckBody({ check }: { check: CheckResult }) {
  switch (check.check_type) {
    case 'exact_match':
      return <ExactMatchView check={check} />
    case 'contains':
      return <ContainsView check={check} />
    case 'equals':
      return <EqualsView check={check} />
    case 'llm_judge':
      return <LLMJudgeView check={check} />
    default:
      return <FallbackView check={check} />
  }
}
