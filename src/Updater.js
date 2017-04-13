/**
 * Updater
 */

import axios from 'axios';
import { AxiosErrorWrapper, FileSystemError } from 'lib/Errors';

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
        brv.env.auth.require().then(access_token => (
            axios.get(
                brv.env.API_URL + '/feedback/version',
                brv.env.auth.getHeaders(access_token)
            )
        )).catch(AxiosErrorWrapper)
    );

    /**
     * Downloads an individual file from the bundle.
     */
    updater.downloadFile = (dir, id, name) => (
        brv.env.auth.require().then(access_token => {
            let uri = brv.env.API_URL + '/feedback/bundle/' + id;
            let fileTransfer = new FileTransfer();
            return new Promise((resolve, reject) => {
                dir.getFile(name, { create: true }, entry => {
                    fileTransfer.download(uri, entry.toURL(), dlEntry => {
                        resolve(dlEntry.toURL());
                    }, reject, false, brv.env.auth.getHeaders(access_token));
                }, reject);
            });
        })
    );

    /**
     * Downloads the latest feedback system.
     */
    updater.download = () => (
        brv.env.isOnline()
        .then(brv.env.auth.require)
        .then(access_token => (
            axios.get(
                brv.env.API_URL + '/feedback/bundle',
                brv.env.auth.getHeaders(access_token)
            )
            .catch(AxiosErrorWrapper)
        ))
        .then(response => {
            if (!response.data.files) return Promise.reject();
            return new Promise((resolve, reject) => {
                /* Create directory if it doesn't exist. */
                window.resolveLocalFileSystemURL(cordova.file.dataDirectory, dirEntry => {
                    dirEntry.getDirectory(brv.env.DYNAMIC_APP_DIR, { create: true }, resolve, reject);
                }, err => reject(new FileSystemError(err)));
            }).then(dir => updater.removeCachedFiles().then(() => (
                Promise.all(response.data.files.map(
                    file => updater.downloadFile(dir, file.id, file.name)
                ))
            )));
        })
    );

    /**
     * Resolves an array of the "cached" files, i.e. the contents of
     * "latest/".
     */
    updater.getCachedFiles = () => (new Promise ((resolve, reject) => {
        window.resolveLocalFileSystemURL(cordova.file.dataDirectory, dirEntry => {
            dirEntry.getDirectory(brv.env.DYNAMIC_APP_DIR, { create: false }, (latestEntry) => {
                let reader = latestEntry.createReader();
                reader.readEntries(entries => {
                    /* Filter out .* (hidden files) and directories. */
                    resolve(
                        entries.filter(e => e.isFile && e.name.indexOf('.') !== 0)
                               .map(e => e.toURL())
                    );
                }, () => resolve([]));
            }, () => resolve([]));
        }, err => reject(new FileSystemError(err)));
    }));

    /**
     * Removes all files from "latest/"
     */
    updater.removeCachedFiles = () => (new Promise ((resolve, reject) => {
        window.resolveLocalFileSystemURL(cordova.file.dataDirectory, dirEntry => {
            dirEntry.getDirectory(brv.env.DYNAMIC_APP_DIR, { create: false }, (latestEntry) => {
                let reader = latestEntry.createReader();
                reader.readEntries(entries => {
                    /* Filter out .* (hidden files) and directories. */
                    resolve(Promise.all(
                        entries.filter(e => e.isFile && e.name.indexOf('.') !== 0)
                        .map(e => {
                            return new Promise((resolve, reject) => {
                                e.remove(resolve, err => reject(err));
                            });
                        })
                    ));
                }, reject);
            }, resolve); /* If directory doesn't exist, ignore. */
        }, err => reject(new FileSystemError(err)));
    }));

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
                console.debug(`Version: Local(${localVersion}) - Master(${master})`);

                if (localVersion === master) {
                    /* Up to date. */
                    return updater.getCachedFiles();
                } else {
                    tablet.status("Update available...");
                    return updater.download().then(() => Promise.resolve(
                        /* On success, update local version. */
                        brv.env.getDBConfig().set('version', master).write()
                    ).then(updater.getCachedFiles));
                }
            }, (err) => {
                console.debug("Unable to reach Brevada servers.");
                return Promise.reject();
            })
        )).catch(() => {
            /* No internet connection / cannot reach servers. Operate in offline mode. */
            tablet.status("Operating in offline mode...");
            return updater.getCachedFiles();
        })
    );

    return updater;
})();

export default Updater;
