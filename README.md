# hwp

Consume Async Iterators with a highwatermark, i.e. in batches.
This allows for multiple processing happening in parallel instead of one at a time.

The default highwatermark is `16`.

TypeScript type definitions are included.

## Install

```js
npm i hwp
```

## Usage

```js
import { forEach, map, mapIterator, mapper, batchIterator, batch, batcher } from 'hwp'
import { pipeline } from 'stream/promises'

const expected = ['a', 'b', 'c']

async function * something () {
  const toSend = [...expected]
  yield * toSend
}

await forEach(something(), async function (item, { signal }) {
  return someAsyncFunction(item, { signal })
}, 16)

const res = mapIterator(something(), async function (item, { signal }) {
  return someAsyncFunction(item, { signal })
}, 16)

for await (const item of res) {
  console.log(item)
}

console.log(await map(something(), async function (item, { signal }) {
  return someAsyncFunction(item, { signal })
}), 16)

await pipeline(
  something(),
  mapper((item, { signal }) => {
    return someAsyncFunction(item, { signal })
  }, 16),
  async function (source) {
    for await (const item of source) {
      console.log(item)
    }
  }
)
```

## Batching

The batch operators accumulate items from an async iterator into arrays and
release them as batches. A batch is released as soon as it reaches `max` items,
or when the flush signal fires since the first item of the batch arrived
(releasing an incomplete batch).

The flush signal is a `timeout` in milliseconds. When `timeout` is omitted the
batch is released on the next `setImmediate`, i.e. as soon as the current
event-loop turn completes.

```js
import { batchIterator, batch, batcher } from 'hwp'

async function * something () {
  const toSend = [1, 2, 3, 4, 5]
  yield * toSend
}

// no timeout: flushes on the next setImmediate
for await (const batch of batchIterator(something(), 3)) {
  console.log(batch)
}

// yields [1, 2, 3], [4, 5]
for await (const batch of batchIterator(something(), 3, 1000)) {
  console.log(batch)
}

// collects all batches into an array of arrays
console.log(await batch(something(), 3, 1000))

// creates a reusable batcher
const batcher = batcher(3, 1000)
for await (const batch of batcher(something())) {
  console.log(batch)
}
```

## License

MIT
