'use strict'

const { test } = require('tap')
const { promisify } = require('util')
const hwp = require('..')

const immediate = promisify(setImmediate)

test('process an async iterator', async (t) => {
  const expected = ['a', 'b', 'c']

  async function * something () {
    const toSend = [...expected]
    yield * toSend
  }

  await hwp.forEach(something(), async function (item) {
    t.equal(item, expected.shift())
  })
})

test('process an async iterator with a batch factor', async (t) => {
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
    t.equal(started - finished <= 16, true)
    t.equal(item, expected.shift())
    await immediate()
    finished++
    max = Math.max(max, started - finished)
  })

  t.equal(max > 1, true)
})

test('sets highwatermark', async (t) => {
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
    t.equal(started - finished <= 5, true)
    t.equal(item, expected.shift())
    await immediate()
    finished++
    max = Math.max(max, started - finished)
  }, 5)

  t.equal(max > 1, true)
})

test('errors with a batch', async (t) => {
  const expected = []

  for (let i = 0; i < 42; i++) {
    expected.push(i)
  }

  async function * something () {
    const toSend = [...expected]
    yield * toSend
  }

  let started = 0

  try {
    await hwp.forEach(something(), async function (item) {
      started++
      await immediate()
      throw new Error('kaboom')
    })
    t.fail('must throw')
  } catch (err) {
    t.equal(started === 16, true)
  }
})

test('errors with a batch lower the highwatermark', async (t) => {
  const expected = []

  for (let i = 0; i < 10; i++) {
    expected.push(i)
  }

  async function * something () {
    const toSend = [...expected]
    yield * toSend
  }

  let started = 0

  try {
    await hwp.forEach(something(), async function (item) {
      started++
      await immediate()
      throw new Error('kaboom')
    })
    t.fail('must throw')
  } catch (err) {
    t.equal(started, 10)
  }
})

test('first element errors', async (t) => {
  const expected = []

  for (let i = 0; i < 42; i++) {
    expected.push(i)
  }

  async function * something () {
    const toSend = [...expected]
    yield * toSend
  }

  let started = 0

  try {
    await hwp.forEach(something(), async function (item) {
      const first = started === 0
      started++
      await immediate()
      if (first) {
        throw new Error('kaboom')
      }
    })
    t.fail('must throw')
  } catch (err) {
    t.equal(started === 16, true)
  }
})
