/**
 * Entry to application.
 *
 * The brv-android app essentially acts as a self-contained auto-updater,
 * retrieving "updates" from the Brevada server.
 */

import docReady from 'doc-ready';
import RequirePermissions from 'lib/RequirePermissions';
import Globals from 'Globals';

import Environment from 'Environment';
import Updater from 'Updater';

/* Necessary Permissions */
const NPermissions = ['ACCESS_COARSE_LOCATION', 'ACCESS_FINE_LOCATION'];

docReady(() => {
    /* Loading animation. */
    var img = new Image();
    img.onload = () => {
        let elImg = document.querySelector('#cordova-app div.cordova-loading > img');
        if (elImg) {
            let loader = document.querySelector('#cordova-app div.cordova-loading');
            if (loader) {
                loader.className = 'cordova-loading visible';
            }
        }
    };
    img.src = 'img/brevada.png';

    Environment.lock();

    RequirePermissions(NPermissions)
    .catch(req => {
        navigator
        .notification
        .alert("Permissions must be granted to this application: " + req, () => {
            navigator.app.exitApp();
        }, "Permission Required", "Exit");
    })
    .then(Environment.setup)
    .then(Updater.update)
    .then(Environment.render)
    .catch(err => {
        tablet.status("Failed to configure the Brevada Feedback System.");
    });
});
