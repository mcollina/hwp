'use strict'

const { test, describe } = require('node:test')
const assert = require('node:assert/strict')
const hwp = require('..')

describe('batchIterator tests', () => {
  test('accumulates items into batches of max size', async () => {
    async function * something () {
      for (let i = 0; i < 10; i++) {
        yield i
      }
    }

    const batches = []
    for await (const batch of hwp.batchIterator(something(), 4)) {
      batches.push(batch)
    }

    assert.deepEqual(batches, [[0, 1, 2, 3], [4, 5, 6, 7], [8, 9]])
  })

  test('releases an incomplete batch when the timeout passes', async () => {
    async function * something () {
      yield 'a'
      yield 'b'
      await new Promise(resolve => setTimeout(resolve, 100))
      yield 'c'
    }

    const batches = []
    for await (const batch of hwp.batchIterator(something(), 10, 20)) {
      batches.push(batch)
    }

    assert.deepEqual(batches, [['a', 'b'], ['c']])
  })

  test('releases a single item when the timeout passes', async () => {
    async function * something () {
      yield 'x'
      await new Promise(resolve => setTimeout(resolve, 100))
    }

    const batches = []
    for await (const batch of hwp.batchIterator(something(), 10, 20)) {
      batches.push(batch)
    }

    assert.deepEqual(batches, [['x']])
  })

  test('does not delay a full batch', async () => {
    async function * something () {
      yield 1
      yield 2
      await new Promise(resolve => setTimeout(resolve, 50))
      yield 3
      yield 4
    }

    const batches = []
    for await (const batch of hwp.batchIterator(something(), 2, 100)) {
      batches.push(batch)
    }

    assert.deepEqual(batches, [[1, 2], [3, 4]])
  })

  test('empty source produces no batches', async () => {
    async function * something () {
    }

    const batches = []
    for await (const batch of hwp.batchIterator(something(), 4, 100)) {
      batches.push(batch)
    }

    assert.deepEqual(batches, [])
  })

  test('batches never exceed the max size', async () => {
    async function * something () {
      for (let i = 0; i < 42; i++) {
        yield i
      }
    }

    const batches = []
    for await (const batch of hwp.batchIterator(something(), 5, 1000)) {
      assert.equal(batch.length <= 5, true)
      batches.push(batch)
    }

    assert.equal(batches.length, 9)
  })

  test('stops early without leaking the timer', async () => {
    async function * something () {
      for (let i = 0; i < 100; i++) {
        await new Promise(resolve => setTimeout(resolve, 5))
        yield i
      }
    }

    const batches = []
    for await (const batch of hwp.batchIterator(something(), 3, 30)) {
      batches.push(batch)
      if (batches.length >= 2) {
        break
      }
    }

    assert.deepEqual(batches, [[0, 1, 2], [3, 4, 5]])
  })

  test('batches synchronously yielded items until max without a timeout', async () => {
    async function * something () {
      for (let i = 0; i < 10; i++) {
        yield i
      }
    }

    const batches = []
    for await (const batch of hwp.batchIterator(something(), 4)) {
      batches.push(batch)
    }

    assert.deepEqual(batches, [[0, 1, 2, 3], [4, 5, 6, 7], [8, 9]])
  })

  test('releases an incomplete batch on the next setImmediate when no timeout is set', async () => {
    async function * something () {
      yield 'a'
      await new Promise(resolve => setImmediate(resolve))
      yield 'b'
    }

    const batches = []
    for await (const batch of hwp.batchIterator(something(), 10)) {
      batches.push(batch)
    }

    assert.deepEqual(batches, [['a'], ['b']])
  })

  test('batches everything yielded in the current turn without a timeout', async () => {
    async function * something () {
      yield 1
      yield 2
      yield 3
    }

    const batches = []
    for await (const batch of hwp.batchIterator(something(), 10)) {
      batches.push(batch)
    }

    assert.deepEqual(batches, [[1, 2, 3]])
  })
})

describe('batcher tests', () => {
  test('process an async iterator', async () => {
    async function * something () {
      yield 1
      yield 2
      yield 3
    }

    const batches = []
    for await (const batch of hwp.batcher(2)(something())) {
      batches.push(batch)
    }

    assert.deepEqual(batches, [[1, 2], [3]])
  })
})

describe('batch tests', () => {
  test('accumulates all batches', async () => {
    async function * something () {
      for (let i = 0; i < 5; i++) {
        yield i
      }
    }

    const res = await hwp.batch(something(), 2)

    assert.deepEqual(res, [[0, 1], [2, 3], [4]])
  })
})
