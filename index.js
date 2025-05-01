'use strict'

const assert = require('assert')

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

async function * batchIterator (iterator, opts) {
  const count = opts && opts.count ? opts.count : 16
  const buffer = []
  let next
  let error
  let done

  function flush () {
    if (next) {
      next()
      next = null
    }
  }

  const timeout = opts.timeout ? setTimeout(flush, opts.timeout) : null

  async function pump () {
    try {
      for await (const item of iterator) {
        buffer.push(item)
        if (buffer.length >= count) {
          await new Promise(resolve => {
            flush()
            next = resolve
          })
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

  queueMicrotask(pump)

  try {
    while (true) {
      await new Promise(resolve => {
        next = resolve
      })

      do {
        yield buffer.splice(0, count)
      } while (buffer.length > count)

      if (error) {
        throw error
      }

      if (done) {
        if (buffer.length) {
          yield buffer
        }
        return
      }

      if (timeout) {
        timeout.refresh()
      }
    }
  } finally {
    done = true
    if (next) {
      next()
      next = null
    }
  }
}

async function * flatIterator (iterator, depth = 1) {
  if (depth === 0) {
    return yield * iterator
  }

  for await (const value of iterator) {
    const innerIterator = value[Symbol.iterator] || value[Symbol.asyncIterator]
    if (!innerIterator) {
      yield value
    } else if (depth === 1) {
      yield * innerIterator
    } else {
      yield * flatIterator(innerIterator, depth - 1)
    }
  }
}

module.exports.operators = {
  map: (...args) => iterator => mapIterator(iterator, ...args),
  batch: (...args) => iterator => batchIterator(iterator, ...args),
  flat: (...args) => iterator => flatIterator(iterator, ...args)
}

module.exports.forEach = forEach
module.exports.mapIterator = mapIterator
module.exports.batchIterator = batchIterator
module.exports.flatIterator = flatIterator
module.exports.map = map
module.exports.mapper = (func, n = 16) => iterator => mapIterator(iterator, func, n)
