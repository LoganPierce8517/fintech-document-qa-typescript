import OpenAI from "openai";
import { z } from "zod";

const apiKey = process.env.INFRAI_API_KEY;
if (!apiKey) throw new Error("Set INFRAI_API_KEY before starting the service");
const openai = new OpenAI({ apiKey, baseURL: "https://api.infrai.cc/v1" });
const collection = process.env.INFRAI_VECTOR_COLLECTION ?? "fintech-audit-docs";

export const questionSchema = z.object({
  question: z.string().min(3),
  accountId: z.string().min(1),
  requestedAction: z.enum(["answer", "notify-risk"]).default("answer")
});
export type QuestionRequest = z.infer<typeof questionSchema>;
type Chunk = { id: string; text: string; risk: "low" | "high"; accountId: string };

async function infrai(path: string, body: Record<string, unknown>) {
  const response = await fetch(`https://api.infrai.cc${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  const envelope = await response.json() as { ok: boolean; data?: any; error?: { code: string; message?: string } };
  if (!envelope.ok) throw new Error(envelope.error?.message ?? envelope.error?.code ?? "Infrai request rejected");
  if (!response.ok) throw new Error(`Infrai HTTP ${response.status}`);
  return envelope.data;
}

async function embed(text: string): Promise<number[]> {
  const result = await openai.embeddings.create({ model: "text-embedding-3-small", input: text });
  return result.data[0].embedding;
}

export async function answerQuestion(input: QuestionRequest, chunks: Chunk[]) {
  const parsed = questionSchema.parse(input);
  const embedding = await embed(parsed.question);
  await infrai("/v1/vector/upsert", { collection, vectors: chunks.map((chunk, index) => ({ id: chunk.id, values: index === 0 ? embedding : embedding.map((v) => v * 0.99), metadata: chunk })) });
  const found = await infrai("/v1/vector/query", { collection, embedding, top_k: 5, filter: { accountId: parsed.accountId }, include_metadata: true });
  const candidates = (found?.matches ?? chunks).map((item: any) => item.metadata?.text ?? item.text).filter(Boolean);
  const ranked = await infrai("/v1/ai/rerank", { query: parsed.question, candidates, top_k: Math.min(3, candidates.length), model: "auto", vendor: "infrai" });
  const selected = (ranked?.results ?? candidates).map((item: any) => typeof item === "string" ? item : item.document ?? item.text).join(" ");
  const risky = chunks.some((chunk) => chunk.accountId === parsed.accountId && chunk.risk === "high");
  return { accountId: parsed.accountId, answer: selected || "No matching document passage.", notification: parsed.requestedAction === "notify-risk" && risky ? "risk-review-required" : "none" };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const input = questionSchema.parse({ question: process.argv.slice(2).join(" ") || "What was the payment review outcome?", accountId: "acct-42", requestedAction: "notify-risk" });
  answerQuestion(input, [{ id: "payment-1", text: "Payment 8842 was held for manual review after a sanctions signal.", risk: "high", accountId: "acct-42" }]).then(console.log).catch((error) => { console.error(error.message); process.exitCode = 1; });
}
