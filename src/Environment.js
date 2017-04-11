/**
 * Environment
 */

import dbStorage from 'lib/Storage';
import low from 'lowdb';
import axios from 'axios';
import path from 'path';
import { AxiosErrorWrapper, PluginError, FileSystemError } from 'lib/Errors';

 const Environment = (function (undefined) {
     let environment = {}; /* Environment namespace. */
     environment.auth = {}; /* Authentication namespace. */

     environment.DOMAIN = 'http://192.168.1.115';//'http://beta.brevada.com';
     environment.API_URL = environment.DOMAIN + '/api/v1.1';

     let _appDirectory = undefined; /* Resolved path to www dir. */
     let _dataDirectory = undefined; /* Private & persistant data storage dir. */
     let _deviceId = undefined; /* Unique device identifier. */

     let _dbConfig = undefined; /* lowDb options. */
     let _dbData = undefined; /* lowDb object for "data" storage. */

     /* Conditions & stats for administrative exit procedure. */
     let _exitStats = {
         lastClickTime: +new Date(), /* Last time user clicked back button. */
         clickCount: 0, /* Num of back button clicks in clickSpeed duration. */
         clickThreshold: 10, /* Number of clicks in duration before acknowledging
                              * exit intent. */
         clickSpeed: 5000, /* Timeout before clickCount is reset; recorded from
                            * time of last click. */
         password: 'Brevada123' /* Admin password required to perform action. */
     };

     /**
      * Get a unique device id which persists between device restarts.
      */
     environment.getDeviceId = () => new Promise((resolve, reject) => {
         if (_deviceId) {
             resolve(_deviceId);
         } else {
             window.plugins.uniqueDeviceID.get(u => {
                 resolve(_deviceId = u)
             }, err => reject(new PluginError(err)));
         }
     });

     /**
      * Locks application, preventing unauthorized user exit.
      */
     environment.lock = () => {
         /* The preventExit plugin requests to be the default Home and
          * Settings screen. This way, the user cannot exit the app by
          * going "back" to the home screen or accessing system settings. */
         window.plugins.preventExit.enable();
         document.addEventListener('backbutton', environment.onBackButton, false);
     };

     /**
      * Unlocks application, restoring ability to exit.
      */
     environment.unlock = () => {
         window.plugins.preventExit.disable();
         document.removeEventListener('backbutton', environment.onBackButton);
     };

     /**
      * Exits the application.
      */
     environment.exit = () => {
         environment.unlock();
         navigator.app.exitApp();
     };

     /**
      * Restarts the application.
      */
     environment.restart = () => {
         document.location.href = 'index.html?var='+(new Date).getTime();
     };

     /**
      * onBackButton event handler.
      */
     environment.onBackButton = e => {
         let now = +new Date();

         /* Reset counter if more than clickSpeed elapses. */
         if (now - _exitStats.lastClickTime >= _exitStats.clickSpeed) {
             _exitStats.clickCount = 0;
         }

         _exitStats.lastClickTime = now;
         _exitStats.clickCount++;

         if (_exitStats.clickCount >= _exitStats.clickThreshold) {
            navigator.notification.prompt(
                "A password is required.", r => {
                     if (r.input1 === _exitStats.password) {
                         window.plugins.toast.showShortBottom("Access granted.");
                         if (r.buttonIndex == 1) {
                             environment.exit();
                         } else if (r.buttonIndex == 2) {
                             environment.restart();
                         }
                     } else {
                         window.plugins.toast.showShortBottom("Access denied.");
                     }
                },
                "Admin: " + (_deviceId || 'Unconfigured'),
                ['Exit', 'Reload', 'Cancel'],
                ''
            );
         }
     };

     /**
      * Retrieve path to application directory and data directory.
      * Resolves to data directory entry.
      */
     environment.resolveFileSystem = () => new Promise((resolve, reject) => {
         window.tablet && tablet.status("Configuring file system...");

         window.resolveLocalFileSystemURL(cordova.file.applicationDirectory, entry => {
             _appDirectory = entry.toURL() + 'www/';
             window.resolveLocalFileSystemURL(cordova.file.dataDirectory, _dataDirectoryEntry => {
                 _dataDirectory = _dataDirectoryEntry.toURL();
                 resolve(_dataDirectoryEntry);
             }, err => reject(new FileSystemError(err)));
         }, err => reject(new FileSystemError(err)));
     });

     /**
      * Tests internet connection (not connectivity to server).
      */
     environment.isOnline = () => new Promise((resolve, reject) => {
         if (navigator.connection.type != Connection.NONE && navigator.connection.type != Connection.UNKNOWN) {
             resolve();
         } else {
             reject();
         }
     });

     /**
      * Gets the request token from the user.
      */
     environment.auth.getRequestToken = () => new Promise((resolve, reject) => {
         navigator.notification.prompt(
            "Please enter the 'request token' to register the device.",
            res => {
                if (res.buttonIndex === 1) {
                    resolve(res.input1);
                } else {
                    reject();
                }
            },
            "Register",
            ['Register'],
            ''
         );
     });

     /**
      * Get access token. Does not register or renew, just accesses cache.
      */
     environment.auth.getAccessToken = () => {
         return Promise.resolve(_dbConfig.get('credentials.access_token', null).value())
     };

     /**
      * Registers for an access token using a user supplied request token.
      */
     environment.auth.register = () => (
         environment.getDeviceId().then(deviceId => (
             environment.auth.getRequestToken().then(requestToken => (
                 axios.post(brv.env.API_URL + '/device/register', {
                     device_id: deviceId,
                     request_token: requestToken
                 })
                 .catch(AxiosErrorWrapper)
                 .then(res => Promise.resolve(
                     _dbConfig
                     .set('credentials.access_token', res.data.access_token)
                     .set('credentials.expiry_date', res.data.expiry_date)
                     .set('credentials.renewal_date', res.data.renewal_date)
                     .write()
                 ))
             )).catch(err => {
                 /* User did not provide request token or token invalid. */
                 return environment.auth.getRequestToken();
             })
         )).then(environment.auth.getAccessToken)
     );

     /**
      * Renews an access token.
      */
     environment.auth.renew = () => (
         environment.getDeviceId().then(deviceId => (
             environment.auth.getAccessToken().then(accessToken => (
                 axios.post(brv.env.API_URL + '/device/renew', {
                     device_id: deviceId,
                     access_token: accessToken
                 })
                 .catch(AxiosErrorWrapper)
                 .then(res => Promise.resolve(
                     _dbConfig
                     .set('credentials.access_token', res.data.access_token)
                     .set('credentials.expiry_date', res.data.expiry_date)
                     .set('credentials.renewal_date', res.data.renewal_date)
                     .write()
                 )).catch(() => {
                     /* Renewal failed. Delay an additional 2 hours. */
                     let cred = _dbConfig.get('credentials').value();
                     return Promise.resolve(_dbConfig.set(
                         'credentials.renewal_date',
                         /* Force the renewal date to be at least an hour before
                          * expiry. */
                         Math.min(cred.expiry_date - 3600, cred.renewal_date + (2*3600))
                     ).write());
                 })
             ))
         )).then(environment.auth.getAccessToken)
     );

     /**
      * Asserts unexpired authentication credentials, initiating register or
      * renewal process if required. Resolves access token.
      */
     environment.auth.require = () => {
         let cred = _dbConfig.get('credentials').value();
         let now = (+new Date())/1000;
         if (cred.expiry_date < now) {
             /* Expired. */
             window.tablet && tablet.status("Registering device...");
             return environment.auth.register();
         } else if (cred.renewal_date < now) {
             /* Time for renewal, but don't fail if not successful. */
             window.tablet && tablet.status("Renewing credentials...");
             return environment.auth.renew();
         } else {
             /* Acquired the token "recently". */
             if (cred.access_token) {
                 return Promise.resolve(cred.access_token);
             } else {
                 /* Unknown error. This scenario should not have happened. */
                 console.error("No access token, but not expired.");
                 return environment.auth.register();
             }
         }
     };

     environment.auth.getHeaders = access_token => ({
         headers: {
             'Authorization': 'Bearer ' + access_token
         }
     });

     /**
      * Initializes databases.
      */
     environment.setupDB = dataEntry => {
         window.tablet && tablet.status("Configuring device storage...");

         let dbOptions = {
             storage: dbStorage(dataEntry)
         };

         /* Load and save each storage device. */

         return low('config.json', dbOptions)
         .then(db => _dbConfig = db)
         .then(() => low('offline_data.json', dbOptions))
         .then(db => _dbData = db)
         .then(() => Promise.all([
             /* Ensure defaults. */
             _dbConfig.defaults({
                 'version': 0,
                 'credentials': {
                     'access_token': null,
                     'expiry_date': 0,
                     'renewal_date': 0
                 }
             }).write(),
             _dbData.defaults({
                 payloads: []
             }).write()
         ]));
     };

     environment.getDBConfig = () => _dbConfig;
     environment.getDBData = () => _dbData;

     /**
      * Imports files into app container.
      * @TODO unimplemented
      */
     environment.render = files => {
         for (let file of files) {
             let basename = path.basename(file);
             if (file.endsWith('.css')) {
                 tablet.status("Importing: " + basename);
             } else if (file.endsWith('.js')) {
                 tablet.status("Importing: " + basename);
             }
         }
     };

     /**
      * Initial environment configuration.
      */
     environment.setup = () => (
         environment.getDeviceId()
         .then(environment.resolveFileSystem)
         .then(environment.setupDB)
         .then(() => Promise.resolve())
     );

     /**
      * Exposes environment to global scope.
      */
      environment.expose = () => {
          window.brv = window.brv || {};
          window.brv.environment = environment;
          window.brv.env = window.brv.environment;
          return Promise.resolve(window.brv.env);
      };

     return environment;
 })();

export default Environment;
