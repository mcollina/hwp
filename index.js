'use strict'

const pLimit = require('p-limit')

async function forEach (iterator, func, n = 16) {
  const limit = pLimit(n)
  const promises = new Set()
  let _err
  for await (const chunk of iterator) {
    if (_err) {
      throw _err
    }
    const p = limit(func, chunk)

    if (limit.pendingCount > 1) {
      await p
    } else {
      promises.add(p)
      // fork the promise chain
      p
        .catch((err) => { _err = err })
        .finally(() => {
          promises.delete(p)
        })
    }
  }

  await Promise.all(promises)
}

module.exports.forEach = forEach
