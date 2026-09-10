/**
 * Options for HWP functions
 */
export interface HwpOptions {
  signal?: AbortSignal;
}

/**
 * Maps an async iterator with a high watermark to control concurrency.
 * @param iterator The source async iterator
 * @param func The mapping function
 * @param n The high watermark limit (concurrency)
 * @returns A new async iterator with the mapped values
 */
export function mapIterator<T, R> (
  iterator: AsyncIterable<T>,
  func: (item: T, options: HwpOptions) => Promise<R> | R,
  n?: number
): AsyncGenerator<R, void, unknown>

/**
 * Maps all items in an async iterator with a high watermark to control concurrency.
 * Returns an array of all results.
 * @param iterator The source async iterator
 * @param func The mapping function
 * @param n The high watermark limit (concurrency)
 * @returns A promise that resolves to an array of all mapped values
 */
export function map<T, R> (
  iterator: AsyncIterable<T>,
  func: (item: T, options: HwpOptions) => Promise<R> | R,
  n?: number
): Promise<R[]>

/**
 * Processes each item in an async iterator with a high watermark to control concurrency.
 * @param iterator The source async iterator
 * @param func The function to process each item
 * @param n The high watermark limit (concurrency)
 * @returns A promise that resolves when processing is complete
 */
export function forEach<T> (
  iterator: AsyncIterable<T>,
  func: (item: T, options: HwpOptions) => Promise<void> | void,
  n?: number
): Promise<void>

/**
 * Creates a mapper function with a fixed transform function and high watermark.
 * @param func The mapping function
 * @param n The high watermark limit (concurrency)
 * @returns A function that takes an async iterator and returns a new async iterator
 */
export function mapper<T, R> (
  func: (item: T, options: HwpOptions) => Promise<R> | R,
  n?: number
): (iterator: AsyncIterable<T>) => AsyncGenerator<R, void, unknown>

/**
 * Batches items from an async iterator into arrays of up to `max` items.
 * A batch is released as soon as it reaches `max` items, or when the flush
 * signal fires since the first item of the batch arrived, releasing an
 * incomplete batch. If `timeout` is omitted the batch is released on the
 * next `setImmediate` (i.e. as soon as the current event-loop turn ends).
 * @param iterator The source async iterator
 * @param max The maximum batch size
 * @param timeout Milliseconds to wait, or nothing to flush on the next `setImmediate`
 * @returns A new async iterator that yields arrays of items
 */
export function batchIterator<T> (
  iterator: AsyncIterable<T>,
  max?: number,
  timeout?: number
): AsyncGenerator<T[], void, unknown>

/**
 * Collects all batches from an async iterator into an array of arrays.
 * @param iterator The source async iterator
 * @param max The maximum batch size
 * @param timeout Milliseconds to wait, or nothing to flush on the next `setImmediate`
 * @returns A promise that resolves to an array of batches
 */
export function batch<T> (
  iterator: AsyncIterable<T>,
  max?: number,
  timeout?: number
): Promise<T[][]>

/**
 * Creates a batcher function with a fixed batch size and timeout.
 * @param max The maximum batch size
 * @param timeout Milliseconds to wait, or nothing to flush on the next `setImmediate`
 * @returns A function that takes an async iterator and returns a new async iterator of batches
 */
export function batcher (
  max?: number,
  timeout?: number
): <T>(iterator: AsyncIterable<T>) => AsyncGenerator<T[], void, unknown>
