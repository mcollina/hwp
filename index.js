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

async function * batchIterator (iterator, max = 16, timeout) {
  // This accumulates items from the source into a batch and yields it
  // once the batch reaches `max` items, or when the flush signal fires.
  // The flush signal is `timeout` milliseconds elapsing since the first
  // item of the batch arrived, or the next `setImmediate` when `timeout`
  // is not set. In the latter case an incomplete batch is released as
  // soon as the current event-loop turn completes.
  //
  // A single pending `next()` is kept so we can race it against a timer
  // without stepping the async iterator twice concurrently.

  const useImmediate = timeout === undefined

  let batch = []
  let done = false
  let timer = null
  let timerResolve = null
  let pendingNext = null

  const flush = () => {
    timer = null
    if (timerResolve) {
      const r = timerResolve
      timerResolve = null
      r()
    }
  }

  const setTimer = () => {
    if (batch.length > 0 && timer === null) {
      timer = useImmediate ? setImmediate(flush) : setTimeout(flush, timeout)
    }
  }

  const clearTimer = () => {
    if (timer) {
      if (useImmediate) {
        clearImmediate(timer)
      } else {
        clearTimeout(timer)
      }
      timer = null
    }
    timerResolve = null
  }

  try {
    while (!done) {
      setTimer()
      if (pendingNext === null) {
        pendingNext = iterator.next()
      }
      const timerPromise = timer
        ? new Promise(resolve => {
          timerResolve = resolve
        })
        : null
      const result = timerPromise
        ? await Promise.race([pendingNext, timerPromise])
        : await pendingNext

      if (result === undefined) {
        // The flush signal fired: release whatever batch we have.
        if (batch.length > 0) {
          yield batch
          batch = []
          clearTimer()
        }
        continue
      }

      pendingNext = null
      if (result.done) {
        done = true
        if (batch.length > 0) {
          yield batch
        }
        return
      }

      batch.push(result.value)
      if (batch.length >= max) {
        yield batch
        batch = []
        clearTimer()
      }
    }
  } finally {
    clearTimer()
  }
}

async function batch (iterator, max = 16, timeout) {
  iterator = batchIterator(iterator, max, timeout)
  const results = []
  for await (const item of iterator) {
    results.push(item)
  }
  return results
}

module.exports.forEach = forEach
module.exports.mapIterator = mapIterator
module.exports.map = map
module.exports.mapper = (func, n = 16) => iterator => mapIterator(iterator, func, n)
module.exports.batchIterator = batchIterator
module.exports.batch = batch
module.exports.batcher = (max = 16, timeout) => iterator => batchIterator(iterator, max, timeout)
