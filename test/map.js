'use strict'

const { test } = require('tap')
const { promisify } = require('util')
const hwp = require('..')

const immediate = promisify(setImmediate)

test('abort signal', async (t) => {
  t.plan(2)

  const uppercased = ['A']

  async function * something () {
    const toSend = ['a', 'b', 'c']
    yield * toSend
  }

  const res = hwp.mapIterator(something(), async function (item, { signal }) {
    if (item === 'b') {
      return new Promise((resolve) => {
        signal.addEventListener('abort', () => {
          resolve()
          t.pass()
        })
      })
    } else {
      return item.toUpperCase()
    }
  }, 32)

  // eslint-disable-next-line no-unreachable-loop
  for await (const item of res) {
    t.equal(item, uppercased.shift())
    break
  }
})

test('src errors', async (t) => {
  async function * something () {
    throw new Error('kaboom')
  }

  const res = hwp.mapIterator(something(), function (item) {
  })

  try {
    // eslint-disable-next-line no-unused-vars
    for await (const item of res) {
      // eslint-disable-next-line
    }
    t.fail('must throw')
  } catch (err) {
    t.equal(err.message, 'kaboom')
  }
})

test('sync func errors', async (t) => {
  async function * something () {
    yield null
  }

  const res = hwp.mapIterator(something(), function (item) {
    throw new Error('kaboom')
  })

  try {
    for await (const item of res) {
      console.log(item)
    }
    t.fail('must throw')
  } catch (err) {
    t.equal(err.message, 'kaboom')
  }
})

test('do not delay output', async (t) => {
  const expected = ['a', 'b', 'c']
  const uppercased = [...expected.map((s) => s.toUpperCase())]

  async function * something () {
    const toSend = [...expected]
    yield * toSend
  }

  const res = hwp.mapIterator(something(), async function (item) {
    t.equal(item, expected.shift())
    return item.toUpperCase()
  }, 32)

  for await (const item of res) {
    t.equal(item, uppercased.shift())
  }
})

test('process an async iterator mapper', async (t) => {
  const expected = ['a', 'b', 'c']
  const uppercased = [...expected.map((s) => s.toUpperCase())]

  async function * something () {
    const toSend = [...expected]
    yield * toSend
  }
  const res = hwp.mapper(async function (item) {
    t.equal(item, expected.shift())
    return item.toUpperCase()
  })(something())

  for await (const item of res) {
    t.equal(item, uppercased.shift())
  }
})

test('process an async iterator', async (t) => {
  const expected = ['a', 'b', 'c']
  const uppercased = [...expected.map((s) => s.toUpperCase())]

  async function * something () {
    const toSend = [...expected]
    yield * toSend
  }

  const res = hwp.mapIterator(something(), async function (item) {
    t.equal(item, expected.shift())
    return item.toUpperCase()
  })

  for await (const item of res) {
    t.equal(item, uppercased.shift())
  }
})

test('process an async iterator with a batch factor', async (t) => {
  const expected = []

  for (let i = 0; i < 42; i++) {
    expected.push(i)
  }

  const doubled = [...expected.map((s) => s * 2)]

  async function * something () {
    const toSend = [...expected]
    yield * toSend
  }

  let started = 0
  let finished = 0
  let max = 0

  const res = hwp.mapIterator(something(), async function (item) {
    started++
    // parallelism
    t.equal(started - finished <= 16, true)
    t.equal(item, expected.shift())
    await immediate()
    finished++
    max = Math.max(max, started - finished)
    return item * 2
  })

  for await (const item of res) {
    t.equal(item, doubled.shift())
  }

  t.equal(max > 1, true)
})

test('first element errors', async (t) => {
  const expected = []

  for (let i = 0; i < 42; i++) {
    expected.push(i)
  }

  const doubled = [...expected.map((s) => s * 2)]

  async function * something () {
    const toSend = [...expected]
    for (const chunk of toSend) {
      immediate()
      yield chunk
    }
  }

  let started = 0

  const res = hwp.mapIterator(something(), async function (item) {
    const first = started === 0
    started++
    if (first) {
      await immediate()
      throw new Error('kaboom')
    }
    return item * 2
  })

  try {
    for await (const item of res) {
      t.equal(item, doubled.shift())
    }
    t.fail('must throw')
  } catch (err) {
    // This is 3 in this example
    t.equal(started > 1, true)
  }
})

test('highwatermark', async (t) => {
  const expected = []

  for (let i = 0; i < 42; i++) {
    expected.push(i)
  }

  const doubled = [...expected.map((s) => s * 2)]

  async function * something () {
    const toSend = [...expected]
    yield * toSend
  }

  let started = 0
  let finished = 0
  let max = 0

  const res = hwp.mapIterator(something(), async function (item) {
    started++
    // parallelism
    t.equal(started - finished <= 5, true)
    t.equal(item, expected.shift())
    await immediate()
    finished++
    max = Math.max(max, started - finished)
    return item * 2
  }, 5)

  for await (const item of res) {
    t.equal(item, doubled.shift())
  }

  t.equal(max > 1, true)
})

test('accumulate result with an async iterator with a batch factor', async (t) => {
  const expected = []

  for (let i = 0; i < 42; i++) {
    expected.push(i)
  }

  const doubled = [...expected.map((s) => s * 2)]

  async function * something () {
    const toSend = [...expected]
    yield * toSend
  }

  let started = 0
  let finished = 0
  let max = 0

  const res = await hwp.map(something(), async function (item) {
    started++
    // parallelism
    t.equal(started - finished <= 16, true)
    t.equal(item, expected.shift())
    await immediate()
    finished++
    max = Math.max(max, started - finished)
    return item * 2
  })

  t.same(res, doubled)

  t.equal(max > 1, true)
})
