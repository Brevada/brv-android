/**
 * Updater
 */

import axios from 'axios';

const Updater = (function (undefined) {
    let updater = {};

    const DOMAIN = 'http://beta.brevada.com';
    const API_URL = DOMAIN + '/api/v1.1';

    /* Reference to environment. */
    let _env = undefined;

    /**
     * Gets the latest feedback software version.
     */
    updater.getMasterVersion = () => axios.get(API_URL + '/feedback/version');

    /**
     * Downloads an individual file from the bundle.
     */
    updater.downloadFile = (id, name) => (
        env.getDeviceId.then(deviceId => {
            let fileUrl = API_URL + '/feedback/bundle/' + id;
            let fileTransfer = new FileTransfer();
            return new Promise((resolve, reject) => {
                let fp = cordova.file.dataDirectory + 'latest/' + name;
                window.resolveLocalFileSystemURL(fp, entry => {
                    fileTransfer.download(fileUrl, fp, fileEntry => {
                        resolve(fileEntry.toURL());
                    }, reject);
                }, reject);
            });
        })
    );

    /**
     * Downloads the latest feedback system.
     */
    updater.download = env => (
        (_env = env) &&
        env.isOnline
        .then(env.getDeviceId)
        .then(deviceId => axios.get(API_URL + '/feedback/bundle', {
            params: { deviceId: deviceId }
        }))
        .then(response => {
            if (!response.data.files) return Promise.reject();

            return new Promise((resolve, reject) => {
                /* Create directory if it doesn't exist. */
                window.resolveLocalFileSystemURL(cordova.file.dataDirectory, dirEntry => {
                    dirEntry.getDirectory('latest', { create: true }, resolve, reject);
                }, reject);
            }).then(() => (
                Promise.all(response.data.files.map(
                    file => updater.downloadFile(file.id, file.name)
                ))
            ));
        })
    );

    /**
     * Updates system on version mismatch.
     *
     * @return string[] The files to load into the app container.
     */
    updater.update = env => (
        env.isOnline.then(() => (
            /* Connected. */
            updater.getMasterVersion.then(response => {
                let master = response.data.version || undefined;

                /* Check if we're up to date. */
                let localVersion = env.getDBConfig().get('version').value();
                if (localVersion === master) {
                    return Promise.resolve(localVersion);
                } else {
                    window.tablet && tablet.status("Update available...");
                    return Promise.reject({
                        local: localVersion,
                        master: master
                    });
                }
            }).catch(version => (
                /* Version mismatch. */
                updater.download(env)
            ))
        ), () => {
            /* No internet connection. Operate in offline mode. */
            window.tablet && tablet.status("No connection. Operating in offline mode...");
            // TODO: get cached files
            return Promise.resolve([]);
        })
    );
})();

export default Updater;
