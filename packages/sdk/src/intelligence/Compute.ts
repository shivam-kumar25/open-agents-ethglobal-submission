import OpenAI from 'openai'

export class Compute {
  private client: OpenAI

  constructor(config?: { apiKey?: string; baseURL?: string }) {
    this.client = new OpenAI({
      apiKey: config?.apiKey ?? process.env['TOKENROUTER_API_KEY'] ?? 'placeholder',
      baseURL: config?.baseURL ?? process.env['TOKENROUTER_BASE_URL'] ?? 'https://api.tokenrouter.com/v1',
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
    const model = opts?.model
      ?? process.env['TOKENROUTER_MODEL']
      ?? 'meta-llama/Llama-3.1-8B-Instruct'

    const res = await this.client.chat.completions.create({
      model,
      messages: messages as OpenAI.ChatCompletionMessageParam[],
      max_tokens: opts?.maxTokens ?? 2048,
      temperature: opts?.temperature ?? 0.7,
    })
    const content = res.choices[0]?.message?.content
    if (!content) throw new Error('Empty response from TokenRouter')
    return content
  }
}
