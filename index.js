'use strict'

const assert = require('assert')
const AbortController = require('abort-controller')

async function * mapIterator (iterator, func, n = 16) {
  // This works by creating two separate "processes" one that
  // reads from the source iterator and enqueues tasks into the
  // promises queue and another "process" that waits for tasks
  // in the queue to finish and yield them back to the caller.

  const promises = []
  const ac = new AbortController()

  let next
  let done = false
  let error

  // pump reads from the source and invokes the transform
  // func so that the promises queue always has n number
  // of items.
  async function pump () {
    try {
      for await (const item of iterator) {
        if (done) {
          return
        }

        let p
        try {
          p = func(item, { signal: ac.signal })
        } catch (err) {
          p = Promise.reject(err)
        }

        promises.push(p)
        p.catch(() => {
          done = true
        })

        if (next) {
          next()
          next = null
        }

        if (!done && promises.length >= n) {
          await new Promise(resolve => {
            next = resolve
          })
          assert(done || promises.length < n)
        }
      }
    } catch (err) {
      error = err
    } finally {
      done = true
      if (next) {
        next()
        next = null
      }
    }
  }

  pump()

  try {
    // sequentially read and resolve each item in
    // the promise list
    while (true) {
      while (promises.length > 0) {
        yield await promises[0]
        promises.shift()
        if (next) {
          next()
          next = null
        }
      }

      if (error) {
        throw error
      }

      if (done) {
        return
      }

      await new Promise(resolve => {
        next = resolve
      })
      assert(done || promises.length > 0)
    }
  } finally {
    ac.abort()

    done = true
    if (next) {
      next()
      next = null
    }
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
  iterator = mapIterator(iterator, func, n)
  // eslint-disable-next-line no-unused-vars
  for await (const item of iterator) {
    // Do nothing.
  }
}

module.exports.forEach = forEach
module.exports.mapIterator = mapIterator
module.exports.map = map
module.exports.mapper = (func, n = 16) => iterator => mapIterator(iterator, func, n)
