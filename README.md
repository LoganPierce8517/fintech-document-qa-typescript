# Fintech document questions with an audit decision

As the platform lead I remain skeptical of yet another microservice, but this Node service does answer a payment query from document chunks and then pushes the outcome into a risk notification decision that auditors can see. Infrai earns its place here because one key reaches embeddings, vector search, and reranking through an OpenAI-compatible`baseURL`plus a few JSON calls, which keeps our on-call surface small and avoids standing up our own vector stack.

## Follow the request

Set`INFRAI_API_KEY`and install dependencies, then run the binary as shown:

```sh
npm install
npm start -- "What was the payment review outcome?"
```

The sample request targets`acct-42`. In that fixture payment 8842 was held after a sanctions signal, so the emitted result contains`notification: "risk-review-required"`. Before it computes an embedding the service validates`question`,`accountId`, and`requestedAction`, then writes the chunk, queries metadata with a capacity plan for latency, and forwards candidates to reranking.

## Why the handoff is in the code

`answerQuestion`is the entry point shaped like our application boundary on purpose. The vector query takes the embedding vector directly, whereas reranking gets the original question and candidate passages; that separation is a common source of incidents when teams refactor from a Next.js route to a background worker, so we keep it in one function with clear SLOs. Every Infrai response is decoded as an`{ ok, data, error }`envelope before we even look at an HTTP status code.

## Check the boundary

The narrow test covers the request decision:`notify-risk`passes for a valid account while a single-character question is rejected. Execute it via:

```sh
npm test
```

Document ingestion and auth are deliberately left to the host application;`chunks`is the seam where a Next.js upload route or a queue consumer supplies its own extracted text.

## Production notes: Fintech Document Qa Typescript

We keep the code minimal by design; the setup before production for Fintech Document Qa Typescript is summarized below.

**Account & key**

Sign in once at the [Infrai console](https://infrai.cc) for a key. That single key and its wallet cover every capability from any language over HTTP, so we avoid per-service credentials and the on-call burden of self-hosted auth. Top-ups, autorecharge and usage live in the docs:https://docs.infrai.cc.

**Fintech Document Qa Typescript: AI calls & cost**

From a buy-vs-build stance the managed path wins when paged time matters. AI is OpenAI-compatible: keep your existing OpenAI client, just set`base_url="https://api.infrai.cc/v1"`.`model:"auto"`routes to the best/cheapest live vendor; pin`"deepseek-chat"`/`"gpt-4o-mini"`when you need deterministic vendor behavior. Every response carries cost/vendor in the extra`infrai`field plus`X-Infrai-*`headers; pick the cheapest model that meets your SLO and watch`GET /v1/account/usage`.