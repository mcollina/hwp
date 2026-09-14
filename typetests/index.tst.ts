import { expect, test } from 'tstyche'
import * as hwp from '..'

test('mapIterator', () => {
  async function * generator () {
    yield 1
    yield 2
    yield 3
  }

  // Test the return type of mapIterator
  const iterator = hwp.mapIterator(generator(), async (item) => {
    return String(item)
  })

  expect(iterator).type.toBeAssignableTo<AsyncGenerator<string, void, unknown>>()

  // Test with options parameter
  const iteratorWithOptions = hwp.mapIterator(generator(), async (item, options) => {
    expect(options.signal).type.toBe<AbortSignal | undefined>()
    return String(item)
  }, 10)

  expect(iteratorWithOptions).type.toBeAssignableTo<AsyncGenerator<string, void, unknown>>()
})

test('map', () => {
  async function * generator () {
    yield 1
    yield 2
    yield 3
  }

  // Test return type of map
  const result = hwp.map(generator(), async (item) => {
    return String(item)
  })

  expect(result).type.toBe<Promise<string[]>>()

  // Test with custom watermark
  const resultWithWatermark = hwp.map(generator(), async (item) => {
    return String(item)
  }, 5)

  expect(resultWithWatermark).type.toBe<Promise<string[]>>()
})

test('forEach', () => {
  async function * generator () {
    yield 1
    yield 2
    yield 3
  }

  // Test return type of forEach
  const result = hwp.forEach(generator(), async (item) => {
    item.toFixed()
  })

  expect(result).type.toBe<Promise<void>>()

  // Test with options parameter
  const resultWithOptions = hwp.forEach(generator(), async (_item, options) => {
    expect(options.signal).type.toBe<AbortSignal | undefined>()
  }, 10)

  expect(resultWithOptions).type.toBe<Promise<void>>()
})

test('mapper', () => {
  async function * generator () {
    yield 1
    yield 2
    yield 3
  }

  // Test return type of mapper
  const mapperFn = hwp.mapper(async (item: number) => {
    return String(item)
  }, 10)

  // Check that mapperFn is a function type
  expect(mapperFn).type.toBeAssignableTo<(iterator: AsyncIterable<number>) => AsyncGenerator<string, void, unknown>>()

  // Test returned function
  const mappedIterator = mapperFn(generator())
  expect(mappedIterator).type.toBeAssignableTo<AsyncGenerator<string, void, unknown>>()
})

test('batchIterator', () => {
  async function * generator () {
    yield 1
    yield 2
    yield 3
  }

  // Test the return type of batchIterator
  const iterator = hwp.batchIterator(generator())

  expect(iterator).type.toBeAssignableTo<AsyncGenerator<number[], void, unknown>>()

  // Test with batch size and timeout
  const iteratorWithOptions = hwp.batchIterator(generator(), 2, 100)

  expect(iteratorWithOptions).type.toBeAssignableTo<AsyncGenerator<number[], void, unknown>>()

  // Test without a timeout (flushes on the next setImmediate)
  const iteratorImmediate = hwp.batchIterator(generator(), 2)

  expect(iteratorImmediate).type.toBeAssignableTo<AsyncGenerator<number[], void, unknown>>()
})

test('batch', () => {
  async function * generator () {
    yield 1
    yield 2
    yield 3
  }

  // Test return type of batch
  const result = hwp.batch(generator())

  expect(result).type.toBeAssignableTo<Promise<number[][]>>()

  // Test with batch size and timeout
  const resultWithOptions = hwp.batch(generator(), 2, 100)

  expect(resultWithOptions).type.toBeAssignableTo<Promise<number[][]>>()

  // Test without a timeout (flushes on the next setImmediate)
  const resultImmediate = hwp.batch(generator(), 2)

  expect(resultImmediate).type.toBeAssignableTo<Promise<number[][]>>()
})

test('batcher', () => {
  async function * generator () {
    yield 1
    yield 2
    yield 3
  }

  // Test return type of batcher
  const batcherFn = hwp.batcher(2, 100)

  // Check that batcherFn is a function type
  expect(batcherFn).type.toBeAssignableTo<(iterator: AsyncIterable<number>) => AsyncGenerator<number[], void, unknown>>()

  // Test returned function
  const batchedIterator = batcherFn(generator())
  expect(batchedIterator).type.toBeAssignableTo<AsyncGenerator<number[], void, unknown>>()

  // Test without a timeout (flushes on the next setImmediate)
  const batcherImmediate = hwp.batcher(2)
  const batchedImmediateIterator = batcherImmediate(generator())
  expect(batchedImmediateIterator).type.toBeAssignableTo<AsyncGenerator<number[], void, unknown>>()
})
