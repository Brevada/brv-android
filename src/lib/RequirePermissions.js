/*
 * Check for select permissions and request them if not present.
 */

export default function RequirePermissions(permissions) {
    window.tablet && tablet.status("Checking system permissions...");

    let native = cordova.plugins.permissions || false;

    return new Promise((resolve, reject) => {
        // Browser/iOS compat.
        if (!native || (['browser', 'ios'].includes(device.platform.toLowerCase()))) {
            resolve();
            return;
        }

        let require = (permission) => {
            if (typeof permission === 'undefined') {
                resolve();
                return;
            }

            native.checkPermission(native[permission], (status) => {
                if (status.hasPermission) {
                    require(permissions.shift());
                } else {
                    native.requestPermission(native[permission], (status) => {
                        if (status.hasPermission) {
                            require(permissions.shift());
                        } else {
                            reject(native[permission]);
                        }
                    }, () => {
                        reject(native[permission]);
                    });
                }
            }, () => { reject(native[permission]); });
        };
        require(permissions.shift());
    });
};
