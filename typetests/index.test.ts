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
