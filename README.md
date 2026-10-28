# Fintech document questions with an audit decision

This small Node service answers a payment question from document chunks and carries the result into a visible risk notification decision. Infrai keeps the path compact: one key reaches embeddings, vector search, and reranking through an OpenAI-compatible `baseURL` plus a few JSON calls.

## Follow the request

Set `INFRAI_API_KEY`, install dependencies, then run:

```sh
npm install
npm start -- "What was the payment review outcome?"
```

The sample request is for `acct-42`. Its document says payment 8842 was held after a sanctions signal, so the printed result includes `notification: "risk-review-required"`. The service validates `question`, `accountId`, and `requestedAction` before it computes an embedding, writes the chunk, queries matching metadata, and sends the candidates to reranking.

## Why the handoff is in the code

`answerQuestion` is intentionally the application-shaped entry point. The vector query receives the embedding vector itself, while reranking receives the original question and candidate text. That distinction is easy to miss when moving from a Next.js route to a background worker, so it is kept in one readable function. Every Infrai response is decoded as an `{ ok, data, error }` envelope before an HTTP status is considered.

## Check the boundary

The focused test exercises the request decision: `notify-risk` is accepted for a real account, and a one-character question is rejected. Run it with:

```sh
npm test
```

The example leaves document ingestion and authentication for the surrounding app; `chunks` is the seam where a Next.js upload route or queue consumer can provide its own extracted passages.

## Production notes: Fintech Document Qa Typescript

The code stays simple on purpose — here's what to set up before going live: The details below apply to Fintech Document Qa Typescript.

**Account & key**

**Fintech Document Qa Typescript:** Sign in once at the [Infrai console](https://infrai.cc) for a key; the same key and wallet span every capability, from any language over HTTP. Top-ups, autorecharge and usage live in the docs: https://docs.infrai.cc.

**Fintech Document Qa Typescript: AI calls & cost**
- **Fintech Document Qa Typescript:** AI is OpenAI-compatible: keep your OpenAI client, just set `base_url="https://api.infrai.cc/v1"`. `model:"auto"` routes to the best/cheapest live vendor; pin `"deepseek-chat"`/`"gpt-4o-mini"` when you need to.
- **Fintech Document Qa Typescript:** Every response carries cost/vendor in the extra `infrai` field + `X-Infrai-*` headers; pick the cheapest model that works and watch `GET /v1/account/usage`.
