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
