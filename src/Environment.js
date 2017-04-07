/**
 * Environment
 */

import dbStorage from 'lib/Storage';

 const Environment = (function (undefined) {
     let environment = {}; /* Environment namespace. */

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
             }, reject);
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
                 _dataDirectory = entry.toURL();
                 resolve(_dataDirectoryEntry);
             }, reject);
         }, reject);
     });

     /**
      * Tests internet connection (not connectivity to server).
      */
     environment.isOnline = () => new Promise((resolve, reject) => {
         if (navigator.connection.type != Connection.NONE && navigator.connection.type != Connection.UNKNOWN) {
             resolve();
         } else {
             reject(navigator.connection.type);
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

         _dbConfig = low('config.json', dbOptions);
         _dbData = low('offline_data.json', dbOptions);

         return Promise.all([
             _dbConfig.defaults({
                 'version': 0
             }).write(),
             _dbData.defaults({
                 payloads: []
             }).write()
         ]);
     };

     environment.getDBConfig = () => _dbConfig;
     environment.getDBData = () => _dbData;

     /**
      * Imports files into app container.
      * @TODO unimplemented
      */
     environment.render = files => {
         for (let file of files) {
             if (file.endsWith('.css')) {
                 tablet.status("Importing: " + file);
             } else if (file.endsWith('.js')) {
                 tablet.status("Importing: " + file);
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
         .then(() => Promise.resolve(environment))
     );

     return environment;
 })();

export default Environment;
