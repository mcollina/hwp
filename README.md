# hwp

Consume Async Interators with a highwatermark, i.e. in batches.
This allow for multiple processing happening in parallel instead of one at a time.

The default highwatermark is `16`.

## Install

```js
npm i hwp
```

## Usage

```js
import { forEach, map, mapIterator, mapper } from 'hwp'
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

## License

MIT
