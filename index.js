'use strict'

const pLimit = require('p-limit')

async function * mapIterator (iterator, func, n = 16) {
  const promises = []

  let next
  let done = false

  async function pump () {
    const limit = pLimit(n)

    for await (const item of iterator) {
      if (done) {
        return
      }

      const p = limit(func, item)
      promises.push(p)
      p.catch(() => {
        done = true
      })

      if (next) {
        next()
        next = null
      }

      if (promises.length >= n) {
        await new Promise(resolve => {
          next = resolve
        })
      }
    }

    done = true
    if (next) {
      next()
      next = null
    }
  }

  pump()

  while (true) {
    while (promises.length > 0) {
      yield await promises.shift()
      if (next) {
        next()
        next = null
      }
    }

    if (done) {
      return
    }

    await new Promise(resolve => {
      next = resolve
    })
  }
}

async function map (iterator, func, n = 16) {
  iterator = mapIterator(iterator, func, n)
  const results = []
  for await (const item of iterator) {
    results.push(item)
  }
  return results
}

async function forEach (iterator, func, n = 16) {
  await map(iterator, func, n)
}

module.exports.forEach = forEach
module.exports.mapIterator = mapIterator
module.exports.map = map
