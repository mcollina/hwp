'use strict'

const { test, describe } = require('node:test')
const assert = require('node:assert/strict')
const { promisify } = require('node:util')
const hwp = require('..')

const immediate = promisify(setImmediate)

describe('forEach tests', () => {
  test('process an async iterator', async () => {
    const expected = ['a', 'b', 'c']

    async function * something () {
      const toSend = [...expected]
      yield * toSend
    }

    await hwp.forEach(something(), async function (item) {
      assert.equal(item, expected.shift())
    })
  })

  test('process an async iterator with a batch factor', async () => {
    const expected = []

    for (let i = 0; i < 42; i++) {
      expected.push(i)
    }

    async function * something () {
      const toSend = [...expected]
      yield * toSend
    }

    let started = 0
    let finished = 0
    let max = 0

    await hwp.forEach(something(), async function (item) {
      started++
      // parallelism
      assert.equal(started - finished <= 16, true)
      assert.equal(item, expected.shift())
      await immediate()
      finished++
      max = Math.max(max, started - finished)
    })

    assert.equal(max > 1, true)
  })

  test('sets highwatermark', async () => {
    const expected = []

    for (let i = 0; i < 42; i++) {
      expected.push(i)
    }

    async function * something () {
      const toSend = [...expected]
      yield * toSend
    }

    let started = 0
    let finished = 0
    let max = 0

    await hwp.forEach(something(), async function (item) {
      started++
      // parallelism
      assert.equal(started - finished <= 5, true)
      assert.equal(item, expected.shift())
      await immediate()
      finished++
      max = Math.max(max, started - finished)
    }, 5)

    assert.equal(max > 1, true)
  })

  test('errors with a batch', async () => {
    const expected = []

    for (let i = 0; i < 42; i++) {
      expected.push(i)
    }

    async function * something () {
      const toSend = [...expected]
      yield * toSend
    }

    let started = 0

    await assert.rejects(async () => {
      await hwp.forEach(something(), async function (item) {
        started++
        await immediate()
        throw new Error('kaboom')
      })
    })

    assert.equal(started === 16, true)
  })

  test('errors with a batch lower the highwatermark', async () => {
    const expected = []

    for (let i = 0; i < 10; i++) {
      expected.push(i)
    }

    async function * something () {
      const toSend = [...expected]
      yield * toSend
    }

    let started = 0

    await assert.rejects(async () => {
      await hwp.forEach(something(), async function (item) {
        started++
        await immediate()
        throw new Error('kaboom')
      })
    })

    assert.equal(started, 10)
  })

  test('first element errors', async () => {
    const expected = []

    for (let i = 0; i < 42; i++) {
      expected.push(i)
    }

    async function * something () {
      const toSend = [...expected]
      yield * toSend
    }

    let started = 0

    await assert.rejects(async () => {
      await hwp.forEach(something(), async function (item) {
        const first = started === 0
        started++
        await immediate()
        if (first) {
          throw new Error('kaboom')
        }
      })
    })

    assert.equal(started === 16, true)
  })
})
