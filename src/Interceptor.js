/**
 * Interceptor
 */

import axios from 'axios';
import { AxiosErrorWrapper } from 'lib/Errors';

/**
 * Intercepts AJAX calls to augment with required header information.
 * Remaps URLs if required.
 */
const Interceptor = (function (undefined) {
    let interceptor = function (options) {
        let opts = Object.assign({
            method: 'GET'
        }, options);

        if (!opts.url) return Promise.reject();

        if (opts.url.indexOf(brv.env.DOMAIN) !== 0) {
            /* Prepend DOMAIN URL. */
            opts.url = brv.env.DOMAIN + opts.url;
        }

        /* Add timestamp. */
        let store = ['get', 'request', 'delete']
                    .includes(opts.method.toLowerCase()) ? 'params' :
                    (['post', 'put', 'patch']
                    .includes(opts.method.toLowerCase()) ? 'data' : null);

        if (store) {
            opts[store] = Object.assign({}, opts[store] || {}, {
                _timestamp: (+new Date())/1000
            });
        }

        return brv.env.auth.require().then(access_token => (
            axios(Object.assign(opts, brv.env.auth.getHeaders(access_token)))
        ))
        .catch(AxiosErrorWrapper)
        .catch(err => {
            if (!err.status) return Promise.reject(err); /* shouldn't happen */

            /* "Repeatable" if we're not at fault. I.e. if it's a server issue
             * which is most likely to be temporary. If we are at fault, then
             * it will probably fail the second time as well.
             *
             * 404 is interesting case. Most likely, server is actually "down",
             * otherwise numerous requests would fail. This is a case where
             * the error would best be manually examined.
             * */
            let repeatableStatus = err.status >= 500 || err.status === 401 ||
                                   err.status === 403 || err.status === 404 ||
                                   err.status === 408 || err.status === 409 ||
                                   err.status === 421 || err.status === 423 ||
                                   err.status === 426 || err.status === 429 ||
                                   err.status === 440 || err.status === 451;

            if (['post', 'put', 'patch', 'delete']
                .includes(opts.method.toLowerCase()) && repeatableStatus) {
                console.log("Failed to send payload.");
                console.error(err);
                return Promise.resolve(
                    brv.env.getDBData().get('payloads').push(opts).write()
                );
            } else {
                return Promise.reject(err);
            }
        });
    };

    /**
     * Exposes interceptor to global scope.
     */
     interceptor.expose = () => {
         window.brv = window.brv || {};
         window.brv.interceptor = interceptor;
         return Promise.resolve(window.brv.interceptor);
     };

    return interceptor;
})();

export default Interceptor;
