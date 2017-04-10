/**
 * Updater
 */

import axios from 'axios';

/**
 * Responsible for updating the software from the server, and managing
 * offline caching and fallbacks.
 */
const Updater = (function (undefined) {
    let updater = {};

    /**
     * Gets the latest feedback software version.
     */
    updater.getMasterVersion = () => (
        env.auth.require().then(() => (
            axios.get(brv.env.API_URL + '/feedback/version')
        ))
    );

    /**
     * Downloads an individual file from the bundle.
     */
    updater.downloadFile = (dir, id, name) => (
        brv.env.getDeviceId().then(deviceId => {
            let uri = brv.env.API_URL + '/feedback/bundle/' + id;
            let fileTransfer = new FileTransfer();
            return new Promise((resolve, reject) => {
                dir.getFile(name, { create: true }, entry => {
                    fileTransfer.download(uri, entry.toURL(), dlEntry => {
                        resolve(dlEntry.toURL());
                    }, (err) => { console.log(err); reject(err); });
                }, reject);
            });
        })
    );

    /**
     * Downloads the latest feedback system.
     */
    updater.download = () => (
        brv.env.isOnline()
        .then(env.auth.require)
        .then(brv.env.getDeviceId)
        .then(() => axios.get(brv.env.API_URL + '/feedback/bundle'))
        .then(response => {
            if (!response.data.files) return Promise.reject();

            return new Promise((resolve, reject) => {
                /* Create directory if it doesn't exist. */
                window.resolveLocalFileSystemURL(cordova.file.dataDirectory, dirEntry => {
                    dirEntry.getDirectory('latest', { create: true }, resolve, reject);
                }, reject);
            }).then(dir => (
                Promise.all(response.data.files.map(
                    file => updater.downloadFile(dir, file.id, file.name)
                ))
            ));
        })
    );

    /**
     * Updates system on version mismatch.
     *
     * @return string[] The files to load into the app container.
     */
    updater.update = () => (
        brv.env.isOnline().then(() => (
            /* Connected. */
            updater.getMasterVersion().then(response => {
                let master = response.data.version || undefined;

                /* Check if we're up to date. */
                let localVersion = brv.env.getDBConfig().get('version').value();
                if (localVersion === master) {
                    /* Up to date. */
                    return Promise.resolve(localVersion);
                } else {
                    window.tablet && tablet.status("Update available...");
                    return Promise.reject({
                        local: localVersion,
                        master: master
                    }).catch(() => updater.download(brv.env));
                }
            }, (err) => {
                console.debug("Unable to reach Brevada servers.");
                return Promise.reject();
            })
        )).catch(() => {
            /* No internet connection / cannot reach servers. Operate in offline mode. */
            window.tablet && tablet.status("Operating in offline mode...");
            // TODO: get cached files
            return Promise.resolve([]);
        })
    );

    return updater;
})();

export default Updater;
