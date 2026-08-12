const { SSEParser, isDoneEvent, createDeltaAccumulator } = require("../dist/index.js");

// A realistic OpenAI-style SSE transcript.
const transcript =
  'event: message\n' +
  'data: {"choices":[{"delta":{"content":"Hel"}}]}\n\n' +
  'data: {"choices":[{"delta":{"content":"lo, "}}]}\n\n' +
  ': this is a comment line, should be ignored\n' +
  'id: evt-3\n' +
  'data: {"choices":[{"delta":{"content":"world!"}}]}\n\n' +
  'data: [DONE]\n\n';

const parser = new SSEParser();
const accumulator = createDeltaAccumulator((parsed) => parsed?.choices?.[0]?.delta?.content ?? null);

const allEvents = [];
// Feed in awkward 7-byte chunks to prove split-boundary handling.
for (let i = 0; i < transcript.length; i += 7) {
  const chunk = transcript.slice(i, i + 7);
  const events = parser.feed(chunk);
  for (const ev of events) {
    allEvents.push(ev);
    if (isDoneEvent(ev)) {
      console.log("[DONE] signal received");
    } else {
      accumulator.feed(ev);
    }
  }
}

console.log("total events parsed:", allEvents.length);
console.log("events:", JSON.stringify(allEvents, null, 2));
console.log("accumulated text:", JSON.stringify(accumulator.text));
