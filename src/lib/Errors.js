/**
 * Brevada Device Custom Errors
 */

/**
 * No connection or unreachable host.
 */
class NetworkError extends Error {}

/**
 * Bad/missing credentials, HTTP 401, 403, 407
 */
class AuthenticationError extends Error {}

 /**
  * Server error, e.g. HTTP 500.
  */
class ServerError extends Error {}

/**
 * Rate limiting error, i.e. too many requests.
 */
class RateLimitingError extends Error {}

/**
 * Plugin error.
 */
class PluginError extends Error {}

/**
 * File system error.
 */
class FileSystemError extends Error {}

/**
 * Wraps axios error in a custom error type, rejects with custom
 * error.
 *
 * @param {object} error Axios error object
 */
const AxiosErrorWrapper = error => {
    if (!error || !error.response || !error.response.status) {
        /* Handling a non-axios error. */
        return Promise.reject(error);
    }

    throw new (status => {
        switch (status) {
            case 401:
            case 403:
                return AuthenticationError;
            case 429:
                return RateLimitingError;
            case 500:
                return ServerError;
            default:
                return NetworkError;
        }
    })(error.response.status)(error.response.data);
};

export {
    FileSystemError,
    PluginError,
    AxiosErrorWrapper,
    NetworkError,
    AuthenticationError,
    ServerError,
    RateLimitingError
};
