import OpenAI from 'openai'

export class Compute {
  private client: OpenAI

  constructor(config: {
    apiKey?: string
    serviceUrl: string
    provider?: string
  }) {
    this.client = new OpenAI({
      apiKey: config.apiKey ?? 'placeholder',
      baseURL: config.serviceUrl,
    })
  }

  async complete(
    prompt: string,
    opts?: { model?: string; systemPrompt?: string; maxTokens?: number; temperature?: number },
  ): Promise<string> {
    const messages: OpenAI.ChatCompletionMessageParam[] = []
    if (opts?.systemPrompt) messages.push({ role: 'system', content: opts.systemPrompt })
    messages.push({ role: 'user', content: prompt })
    return this.chat(messages, opts)
  }

  async chat(
    messages: Array<{ role: string; content: string }> | OpenAI.ChatCompletionMessageParam[],
    opts?: { model?: string; maxTokens?: number; temperature?: number },
  ): Promise<string> {
    const res = await this.client.chat.completions.create({
      model: opts?.model ?? 'qwen/qwen-2.5-7b-instruct',
      messages: messages as OpenAI.ChatCompletionMessageParam[],
      max_tokens: opts?.maxTokens ?? 2048,
      temperature: opts?.temperature ?? 0.7,
    })
    const content = res.choices[0]?.message?.content
    if (!content) throw new Error('Empty response from 0G Compute')
    return content
  }

  async sealedInference(prompt: string): Promise<{ response: string; proof: string }> {
    // GLM-5-FP8 model supports sealed TEE inference with proof
    const res = await this.client.chat.completions.create({
      model: 'GLM-5-FP8',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 2048,
    })
    const response = res.choices[0]?.message?.content ?? ''
    // The proof is returned in a custom field on the response object
    const proof = (res as unknown as Record<string, unknown>).proof as string ?? ''
    return { response, proof }
  }
}
