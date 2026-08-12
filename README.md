# sse-stream-parser

Incremental Server-Sent Events parser for LLM streaming — spec-correct
multi-line fields, comments, CRLF/LF, chunk-boundary splits, `[DONE]`
convention, and JSON-delta accumulation. Zero runtime dependencies, strict
TypeScript.

## Quickstart

```ts
import { SSEParser, isDoneEvent, createDeltaAccumulator } from "sse-stream-parser";

const parser = new SSEParser();
const accumulator = createDeltaAccumulator(
  (parsed) => parsed?.choices?.[0]?.delta?.content ?? null
);

// Feed raw chunks as they arrive from your HTTP stream reader — any
// alignment, including split mid-event.
for await (const chunk of responseBodyChunks) {
  for (const event of parser.feed(chunk)) {
    if (isDoneEvent(event)) break;
    accumulator.feed(event);
  }
}

console.log(accumulator.text); // the fully reassembled text
```

## API

### `class SSEParser`

- `feed(chunk: string): SSEEvent[]` — feed one raw chunk, get back the
  event(s) that completed as a result.
- `flush(): SSEEvent[]` — flush any buffered partial event at stream end,
  for sources that don't send a trailing blank line.

### `SSEEvent`

```ts
interface SSEEvent {
  data: string;       // multi-line data: fields joined with "\n"
  event: string;       // defaults to "message" per spec
  id?: string;
  retry?: number;
}
```

### `isDoneEvent(event): boolean`

True if `event.data.trim() === "[DONE]"` — the OpenAI-style stream-end
sentinel.

### `createDeltaAccumulator(extract): DeltaAccumulator`

Builds a running-text accumulator for JSON-delta streams. `extract` pulls
the delta string out of the parsed JSON for one event (return
`null`/`undefined` for events with no text delta, e.g. role markers).
Malformed JSON in `data` is skipped rather than throwing.

```ts
interface DeltaAccumulator {
  feed(event: SSEEvent): string | null; // returns the delta appended, or null
  text: string;                          // full accumulated text
  reset(): void;
}
```

## Limits

- This is an SSE **parser**, not an HTTP client — you supply the chunks
  (e.g. from `fetch`'s `ReadableStream`, `EventSource` is not used since
  it doesn't expose raw chunk boundaries the way this library is designed
  to stress-test).
- `id:` fields containing a space are ignored, per the SSE spec (`id`
  must not contain U+0000 or whitespace in strict implementations — this
  parser is lenient elsewhere but enforces this one).
- `createDeltaAccumulator` assumes each event's `data` is a full JSON
  object; it does not reassemble JSON that itself spans multiple SSE
  events.

---
Part of the [ferrow-toolkit](https://github.com/FerrowAI/ferrow-toolkit) collection · Sponsored by [Ferrow](https://ferrow.ai)
