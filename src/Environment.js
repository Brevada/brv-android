/**
 * Environment
 */

import dbStorage from 'lib/Storage';

 const Environment = (function (undefined) {
     let environment = {};

     let _appDirectory = undefined;
     let _dataDirectory = undefined;
     let _deviceId = undefined;

     let _dbConfig = undefined;
     let _dbData = undefined;

     let _exitStats = {
         lastClickTime: +new Date(),
         clickCount: 0,
         clickThreshold: 10,
         clickSpeed: 5000,
         password: 'Brevada123'
     };

     /**
      * Get unique device id.
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
         window.plugins.preventExit.enable();
         document.addEventListener('backbutton', environment.onBackButton, false);
     };

     /**
      * Exits the application.
      */
     environment.exit = () => {
         window.plugins.preventExit.disable();
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
      * Retrieve path to application directory.
      */
     environment.resolveFileSystem = () => new Promise((resolve, reject) => {
         window.tablet && tablet.status("Configuring file system...");

         window.resolveLocalFileSystemURL(cordova.file.applicationDirectory, entry => {
             _appDirectory = entry.toURL() + 'www/';
             window.resolveLocalFileSystemURL(cordova.file.dataDirectory, entry => {
                 _dataDirectory = entry.toURL();
                 resolve(_dataDirectoryEntry);
             }, reject);
         }, reject);
     });

     /**
      * Tests internet connection.
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
         environment.getDeviceId
         .then(environment.resolveFileSystem)
         .then(environment.setupDB)
         .then(() => Promise.resolve(environment))
     );

     return environment;
 })();

export default Environment;
