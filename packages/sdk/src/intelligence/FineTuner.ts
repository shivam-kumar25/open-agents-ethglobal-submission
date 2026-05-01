import { spawn } from 'node:child_process'

export type FineTuneStatus =
  | 'Init'
  | 'SettingUp'
  | 'SetUp'
  | 'Training'
  | 'Trained'
  | 'Delivering'
  | 'Delivered'
  | 'UserAcknowledged'
  | 'Finished'
  | 'Failed'

export interface FineTuneJob {
  id: string
  status: FineTuneStatus
  provider: string
  datasetRoot: string
  loraRoot?: string
  startedAt: number
  deliveredAt?: number
  finishedAt?: number
}

function run0gcm(args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const proc = spawn('0gcm', args, { shell: true })
    let stdout = ''
    let stderr = ''
    proc.stdout.on('data', (d: Buffer) => { stdout += d.toString() })
    proc.stderr.on('data', (d: Buffer) => { stderr += d.toString() })
    proc.on('close', (code) => {
      if (code !== 0) reject(new Error(`0gcm failed (${code}): ${stderr}`))
      else resolve(stdout.trim())
    })
  })
}

export class FineTuner {
  constructor(
    private config: { provider: string; privateKey: string; zgRpcUrl: string },
  ) {}

  async submit(params: {
    baseModel: string
    datasetRoot: string
    epochs?: number
  }): Promise<FineTuneJob> {
    const output = await run0gcm([
      'fine-tuning', 'create-task',
      '--model', params.baseModel,
      '--data', params.datasetRoot,
      '--provider', this.config.provider,
      ...(params.epochs ? ['--epochs', String(params.epochs)] : []),
    ])
    // Output is expected to be JSON or a job ID on first line
    let jobId: string
    try {
      const parsed = JSON.parse(output) as { id?: string; jobId?: string }
      jobId = parsed.id ?? parsed.jobId ?? output.split('\n')[0] ?? ''
    } catch {
      jobId = output.split('\n')[0] ?? ''
    }
    return {
      id: jobId,
      status: 'Init',
      provider: this.config.provider,
      datasetRoot: params.datasetRoot,
      startedAt: Date.now(),
    }
  }

  async getStatus(jobId: string): Promise<FineTuneStatus> {
    const output = await run0gcm(['fine-tuning', 'task-status', '--id', jobId])
    try {
      const parsed = JSON.parse(output) as { status?: string }
      return (parsed.status as FineTuneStatus) ?? 'Init'
    } catch {
      return output.trim() as FineTuneStatus
    }
  }

  async acknowledge(jobId: string): Promise<string> {
    const output = await run0gcm(['fine-tuning', 'acknowledge', '--id', jobId])
    try {
      const parsed = JSON.parse(output) as { loraRoot?: string; root?: string }
      return parsed.loraRoot ?? parsed.root ?? ''
    } catch {
      return output.trim()
    }
  }

  async runToCompletion(params: {
    baseModel: string
    datasetRoot: string
    onStatusChange?: (status: FineTuneStatus) => void
  }): Promise<{ loraRoot: string; jobId: string }> {
    const job = await this.submit(params)
    console.log(`[FineTuner] Job ${job.id} submitted. Polling status...`)

    let lastStatus: FineTuneStatus = 'Init'
    let deliveredAt: number | null = null

    // Poll every 30 seconds
    while (true) {
      await new Promise((r) => setTimeout(r, 30_000))
      const status = await this.getStatus(job.id)

      if (status !== lastStatus) {
        console.log(`[FineTuner] Job ${job.id}: ${lastStatus} → ${status}`)
        params.onStatusChange?.(status)
        lastStatus = status
      }

      if (status === 'Delivered') {
        if (!deliveredAt) {
          deliveredAt = Date.now()
          console.log(`[FineTuner] CRITICAL: Job ${job.id} delivered. Must acknowledge within 48h!`)
        }
        // Acknowledge immediately — never risk the 48h window
        const loraRoot = await this.acknowledge(job.id)
        console.log(`[FineTuner] Job ${job.id} acknowledged. LoRA root: ${loraRoot}`)
        params.onStatusChange?.('UserAcknowledged')
        // Wait for Finished
        continue
      }

      if (status === 'Finished') {
        return { loraRoot: job.loraRoot ?? '', jobId: job.id }
      }

      if (status === 'Failed') {
        throw new Error(`Fine-tuning job ${job.id} failed`)
      }

      // Check 48h deadline (if somehow we missed Delivered)
      if (deliveredAt && Date.now() - deliveredAt > 47 * 60 * 60 * 1000) {
        console.error(`[FineTuner] CRITICAL: 48h deadline approaching for job ${job.id}!`)
        await this.acknowledge(job.id)
      }
    }
  }
}
