/**
 * Groq chat completions (OpenAI-compatible endpoint). Free tier is plenty for
 * two short calls a day. Env: GROQ_API_KEY (required), GROQ_MODEL (optional).
 */
const DEFAULT_MODEL = "openai/gpt-oss-120b";

export async function complete(system: string, user: string, retried = false): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("GROQ_API_KEY not set");

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: process.env.GROQ_MODEL ?? DEFAULT_MODEL,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      reasoning_effort: "medium",
      include_reasoning: false,
      max_completion_tokens: 4000,
    }),
    signal: AbortSignal.timeout(60_000),
  });
  // Free tier is 8k tokens/minute, shared by the parallel summary calls: wait it out once.
  const wait = Number(res.headers.get("retry-after"));
  if (res.status === 429 && !retried && wait > 0 && wait <= 60) {
    console.warn(`Groq rate limited; retrying in ${wait}s`);
    await new Promise((r) => setTimeout(r, wait * 1000));
    return complete(system, user, true);
  }
  if (!res.ok) throw new Error(`Groq: HTTP ${res.status} ${(await res.text()).slice(0, 200)}`);
  const data: any = await res.json();
  const text: string | undefined = data.choices?.[0]?.message?.content;
  if (!text?.trim()) throw new Error("Groq returned an empty response");
  return text;
}
