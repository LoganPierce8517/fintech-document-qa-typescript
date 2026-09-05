import assert from "node:assert/strict";
import { questionSchema } from "./fintech_document_qa.js";

const request = questionSchema.parse({ question: "Was payment 8842 reviewed?", accountId: "acct-42", requestedAction: "notify-risk" });
assert.equal(request.requestedAction, "notify-risk");
assert.throws(() => questionSchema.parse({ question: "?", accountId: "acct-42" }));
console.log("request boundary behaves as expected");
