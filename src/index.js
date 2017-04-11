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
import pathjs from 'path';

/* Necessary Permissions */
const NPermissions = ['ACCESS_COARSE_LOCATION', 'ACCESS_FINE_LOCATION'];

window.addEventListener('error', (e) => {
    let dir = Environment.getDataDirectory();
    if (dir) {
        dir = dir + Environment.DYNAMIC_APP_DIR;

        if (e.filename && e.filename.indexOf(dir) === 0) {
            /* From a dynamically loaded script. */
            console.error("Dynamically loaded script raised an error.");
            console.error("Faulty script: " + pathjs.basename(e.filename));
            console.error(e.error);
            return;
        }
    }

    throw e.error;
}, false);

docReady(() => {
    tablet.status("Preparing device...");

    /* Loading animation. el* = element. */
    var img = new Image();
    img.onload = () => {
        /* When the "loading" image has fully loaded, display it. */
        let elLoader = document.querySelector('#feedback-root div.cordova-loading');
        if (elLoader) elLoader.className = 'cordova-loading visible';
    };
    img.src = 'img/brevada.png';

    /* Initiate device and environment configuration when cordova signals all
     * libraries and plugins have been loaded. */
    document.addEventListener('deviceready', () => {
        /* Enter "kiosk" mode - assume control of Home Screen and Settings. */
        Environment.lock();

        RequirePermissions(NPermissions) /* Prompt user if required. */
        .catch(req => {
            /* Don't have necessary permissions to run properly. Exiting. */
            navigator
            .notification
            .alert("Permissions must be granted to this application: " + req, () => {
                /* Leave "kiosk" mode. Release control of Home/Settings. */
                Environment.exit();
            }, "Authentication Required", "Exit");
        })
        .then(Environment.expose) /* Exposes environment to global scope. */
        .then(Environment.setup) /* Configure network/storage/environment. */
        .then(Updater.update) /* Attempt to update "view". */
        .then(Environment.render) /* Render the latest view (freshly loaded or cached). */
        .catch(err => {
            tablet.status(
                "Failed to configure the Brevada Feedback System." +
                "<br /><br />" +
                "Please call 1-(844)-BREVADA." +
                "<br /><br />" +
                (err || '').toString()
            );
        });
    }, false);
});
