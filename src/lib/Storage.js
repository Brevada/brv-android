/**
 * Low db storage.
 */

const dbStorage = function (dirEntry) {
    let storage = {};

    storage.read = (source, deserialize = JSON.parse) => new Promise((resolve, reject) => {
        dirEntry.getFile(source, { create: true, exclusive: false }, fileEntry => {
            fileEntry.file(file => {
                let reader = new FileReader();

                reader.onloadend = function() {
                    if (this.result) {
                        resolve(deserialize(this.result));
                    } else {
                        resolve({});
                    }
                };

                reader.readAsText(file);
            });
        }, reject);
    });

    storage.write = (dest, obj, serialize = JSON.stringify) => new Promise((resolve, reject) => {
        dirEntry.getFile(dest, { create: true, exclusive: false }, fileEntry => {
            fileEntry.createWriter(writer => {
                writer.onerror = err => reject(err);
                writer.write(new Blob([serialize(obj)], { type: 'application/json' }));
                resolve();
            });
        }, reject);
    });

    return storage;
};

export default dbStorage;
