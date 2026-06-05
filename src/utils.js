
// ─────────────────────────────────────────────────────────────────────────────
// withRetry — backoff exponencial com jitter
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @template T
 * @param {() => Promise<T>} fn
 * @param {{
 *   maxAttempts?: number,
 *   baseDelayMs?: number,
 *   maxDelayMs?: number,
 *   retryIf?: (err: Error) => boolean,
 *   onRetry?: (info: { attempt: number, delay: number, error: Error }) => void
 * }} opts
 * @returns {Promise<T>}
 */
async function withRetry(fn, {
    maxAttempts = 3,
    baseDelayMs = 900,
    maxDelayMs = 9_000,
    retryIf = () => true,
    onRetry,
} = {}) {
    let attempt = 0;
    while (true) {
        try {
            return await fn();
        } catch (err) {
            attempt++;

            const shouldRetry =
                attempt < maxAttempts &&
                retryIf(err);

            if (!shouldRetry) {
                throw err;
            }

            const exponential = baseDelayMs * (2 ** (attempt - 1));
            const jitter = Math.random() * baseDelayMs * 0.5;
            const delay = Math.min(exponential + jitter, maxDelayMs);

            onRetry?.({
                attempt,
                delay,
                error: err,
            });

            await new Promise(r => setTimeout(r, delay));
        }
    }
}

module.exports = { withRetry };