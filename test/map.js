'use strict'

const { test, describe } = require('node:test')
const assert = require('node:assert/strict')
const { promisify } = require('node:util')
const hwp = require('..')

const immediate = promisify(setImmediate)

describe('map and mapIterator tests', () => {
  test('abort signal', async () => {
    let abortHandlerCalled = false
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
            abortHandlerCalled = true
          })
        })
      } else {
        return item.toUpperCase()
      }
    }, 32)

    // eslint-disable-next-line no-unreachable-loop
    for await (const item of res) {
      assert.equal(item, uppercased.shift())
      break
    }

    // Wait for abort handler to be called
    await new Promise(resolve => setTimeout(resolve, 10))
    assert.equal(abortHandlerCalled, true)
  })

  test('src errors', async () => {
    async function * something () {
      throw new Error('kaboom')
    }

    const res = hwp.mapIterator(something(), function (item) {
    })

    await assert.rejects(
      async () => {
        // eslint-disable-next-line
        for await (const item of res) {
        }
      },
      { message: 'kaboom' }
    )
  })

  test('sync func errors', async () => {
    async function * something () {
      yield null
    }

    const res = hwp.mapIterator(something(), function (item) {
      throw new Error('kaboom')
    })

    await assert.rejects(
      async () => {
        for await (const item of res) {
          console.log(item)
        }
      },
      { message: 'kaboom' }
    )
  })

  test('do not delay output', async () => {
    const expected = ['a', 'b', 'c']
    const uppercased = [...expected.map((s) => s.toUpperCase())]

    async function * something () {
      const toSend = [...expected]
      yield * toSend
    }

    const res = hwp.mapIterator(something(), async function (item) {
      assert.equal(item, expected.shift())
      return item.toUpperCase()
    }, 32)

    for await (const item of res) {
      assert.equal(item, uppercased.shift())
    }
  })

  test('process an async iterator mapper', async () => {
    const expected = ['a', 'b', 'c']
    const uppercased = [...expected.map((s) => s.toUpperCase())]

    async function * something () {
      const toSend = [...expected]
      yield * toSend
    }
    const res = hwp.mapper(async function (item) {
      assert.equal(item, expected.shift())
      return item.toUpperCase()
    })(something())

    for await (const item of res) {
      assert.equal(item, uppercased.shift())
    }
  })

  test('process an async iterator', async () => {
    const expected = ['a', 'b', 'c']
    const uppercased = [...expected.map((s) => s.toUpperCase())]

    async function * something () {
      const toSend = [...expected]
      yield * toSend
    }

    const res = hwp.mapIterator(something(), async function (item) {
      assert.equal(item, expected.shift())
      return item.toUpperCase()
    })

    for await (const item of res) {
      assert.equal(item, uppercased.shift())
    }
  })

  test('process an async iterator with a batch factor', async () => {
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
      assert.equal(started - finished <= 16, true)
      assert.equal(item, expected.shift())
      await immediate()
      finished++
      max = Math.max(max, started - finished)
      return item * 2
    })

    for await (const item of res) {
      assert.equal(item, doubled.shift())
    }

    assert.equal(max > 1, true)
  })

  test('first element errors', async () => {
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

    await assert.rejects(
      async () => {
        for await (const item of res) {
          assert.equal(item, doubled.shift())
        }
      }
    )

    // This is 3 in this example
    assert.equal(started > 1, true)
  })

  test('highwatermark', async () => {
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
      assert.equal(started - finished <= 5, true)
      assert.equal(item, expected.shift())
      await immediate()
      finished++
      max = Math.max(max, started - finished)
      return item * 2
    }, 5)

    for await (const item of res) {
      assert.equal(item, doubled.shift())
    }

    assert.equal(max > 1, true)
  })

  test('accumulate result with an async iterator with a batch factor', async () => {
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
      assert.equal(started - finished <= 16, true)
      assert.equal(item, expected.shift())
      await immediate()
      finished++
      max = Math.max(max, started - finished)
      return item * 2
    })

    assert.deepEqual(res, doubled)

    assert.equal(max > 1, true)
  })
})
