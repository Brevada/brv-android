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

        return brv.env.auth.require().then(access_token => (
            axios(Object.assign(opts, brv.env.auth.getHeaders(access_token)))
        )).catch(AxiosErrorWrapper);
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
