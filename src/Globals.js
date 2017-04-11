let tablet = {};

/**
 * Output a status message to user.
 *
 * Exposed to global scope.
 *
 * @param  {string} msg
 */
tablet.status = msg => {
    let p = document.querySelector(
        '#feedback-root > .cordova-loading > .deviceready > p'
    );

    if (p) {
        p.innerHTML = msg;
    }
};

/* Create global tablet namespace. */
module.exports = (window.tablet = tablet);
