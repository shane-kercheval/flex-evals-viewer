import { Router, type Request, type Response } from 'express'
import { readFile, writeFile } from 'node:fs/promises'
import { join, dirname, basename, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { glob } from 'glob'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PROJECT_ROOT = join(__dirname, '..', '..', '..')
const RESULT_DIRS = [
  join(PROJECT_ROOT, 'evals', 'results'),
]

const router = Router()

interface ResultFile {
  path: string
  filename: string
}

async function findAllResultFiles(): Promise<ResultFile[]> {
  const files: ResultFile[] = []
  for (const dir of RESULT_DIRS) {
    const matches = await glob('*.json', { cwd: dir, absolute: true })
    for (const filePath of matches) {
      files.push({ path: filePath, filename: basename(filePath) })
    }
  }
  return files
}

async function findFileByEvaluationId(evaluationId: string): Promise<ResultFile | null> {
  const files = await findAllResultFiles()
  for (const file of files) {
    const raw = await readFile(file.path, 'utf-8')
    const data = JSON.parse(raw)
    if (data.evaluation_id === evaluationId) {
      return file
    }
  }
  return null
}

// Extract model info from first sample if not in top-level metadata
function enrichMetadataFromSamples(data: Record<string, unknown>): void {
  const metadata = data.metadata as Record<string, unknown> | undefined
  const results = data.results as Array<Record<string, unknown>> | undefined
  if (!metadata?.model_name && Array.isArray(results) && results.length > 0) {
    const firstValue = (results[0] as Record<string, unknown>)?.execution_context as Record<string, unknown> | undefined
    const outputValue = (firstValue?.output as Record<string, unknown>)?.value as Record<string, unknown> | undefined
    if (outputValue?.model_name) {
      (data.metadata as Record<string, unknown>).model_name = outputValue.model_name
    }
    if (outputValue?.model_provider) {
      (data.metadata as Record<string, unknown>).model_provider = outputValue.model_provider
    }
  }
}

// GET /api/runs — list all runs (without results array)
router.get('/', async (_req: Request, res: Response) => {
  try {
    const files = await findAllResultFiles()
    const runs = []
    for (const file of files) {
      const raw = await readFile(file.path, 'utf-8')
      const data = JSON.parse(raw)
      // Compute cost/token/duration totals from results before stripping them
      let total_cost = 0
      let total_input_tokens = 0
      let total_output_tokens = 0
      let total_duration = 0
      let sample_count = 0
      if (Array.isArray(data.results)) {
        sample_count = data.results.length
        for (const result of data.results) {
          const usage = result?.execution_context?.output?.value?.usage
          if (usage) {
            total_cost += usage.total_cost ?? 0
            total_input_tokens += usage.input_tokens ?? 0
            total_output_tokens += usage.output_tokens ?? 0
          }
          const duration = result?.execution_context?.output?.metadata?.duration_seconds
          if (typeof duration === 'number') {
            total_duration += duration
          }
        }
      }
      enrichMetadataFromSamples(data)
      const { results: _, ...rest } = data
      runs.push({
        ...rest,
        filename: file.filename,
        total_cost,
        total_input_tokens,
        total_output_tokens,
        avg_cost: sample_count > 0 ? total_cost / sample_count : 0,
        avg_duration_seconds: sample_count > 0 ? total_duration / sample_count : 0,
      })
    }
    runs.sort((a, b) => b.started_at.localeCompare(a.started_at))
    res.json(runs)
  } catch (err) {
    console.error('Error listing runs:', err)
    res.status(500).json({ error: 'Failed to list runs' })
  }
})

// GET /api/runs/:evaluationId — full run detail
router.get('/:evaluationId', async (req: Request<{ evaluationId: string }>, res: Response) => {
  try {
    const file = await findFileByEvaluationId(req.params.evaluationId)
    if (!file) {
      res.status(404).json({ error: 'Run not found' })
      return
    }
    const raw = await readFile(file.path, 'utf-8')
    const data = JSON.parse(raw)
    enrichMetadataFromSamples(data)
    res.json({ ...data, file_path: relative(PROJECT_ROOT, file.path) })
  } catch (err) {
    console.error('Error fetching run:', err)
    res.status(500).json({ error: 'Failed to fetch run' })
  }
})

// PATCH /api/runs/:evaluationId/annotations — update annotation
router.patch('/:evaluationId/annotations', async (req: Request<{ evaluationId: string }>, res: Response) => {
  try {
    const file = await findFileByEvaluationId(req.params.evaluationId)
    if (!file) {
      res.status(404).json({ error: 'Run not found' })
      return
    }
    const raw = await readFile(file.path, 'utf-8')
    const data = JSON.parse(raw)
    if (!data.metadata) {
      data.metadata = {}
    }
    data.metadata.annotation = req.body.annotation
    await writeFile(file.path, JSON.stringify(data, null, 2) + '\n')
    res.json({ ok: true })
  } catch (err) {
    console.error('Error updating annotation:', err)
    res.status(500).json({ error: 'Failed to update annotation' })
  }
})

export default router
