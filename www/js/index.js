/*
	TODO
	- Finish app.failedSubmission(payload)
	- Implement background task to upload local saves w/o affecting UI.
	- Implement API authentication.
	- Implement 'customizable' error messages.
	- Delete unnecessary files (during Update).
*/

var globals = {
	api : 'http://brevada.com/api/v1/',
	key : 'dev',
	store : '',
	uuid : '',
	device : null,
	appDirURL : '',
	battery : { level : 100, isPlugged : false },
	adminPassword : 'Brevada!23'
};

var backPushedTimes = 0;
var backPushedTime = 0;

var app = {
    initialize: function() {
        $(document).on('deviceready', this.onDeviceReady);
    },
	status : function(msg) {
		$('#deviceready > p').html(msg);
	},
    onDeviceReady: function() {
		console.log("Device is ready.");
		
		app.preventExit();
		
		window.addEventListener("batterystatus", function(info){
			globals.battery = info;
		}, false);
		
		app.configureEnv(function(){
			app.update(function(){
				app.start(function(){
					// All good.
				}, function(){
					// Critical error.
					app.status("Sorry, something went wrong.<br/>Please call 1-(844)-BREVADA.<br /><br />#"+globals.uuid);
				});
			});
		}, function(){
			// Critical error. Failed to configure environment.
			app.status('Cannot configure environment!');
		});
    },
	preventExit : function(){
		console.log("Preventing exit...");
		PreventExit.enable();
		document.addEventListener('backbutton', function(e){
			var now = (new Date()).getTime();
			
			if(now - backPushedTime > 3000){
				backPushedTimes = 0;
			}
			
			backPushedTimes++;
			backPushedTime = now;
			
			if(backPushedTimes > 10){
				console.log("Showing admin panel.");
				navigator.notification.prompt(
					"Please enter the password, click 'OK', then the 'Home' button.",
					function(results){
						if(results.buttonIndex == 2){
							backPushedTimes = 0;
						} else if(results.buttonIndex == 1){
							if(results.input1 == globals.adminPassword){
								PreventExit.disable();
								window.plugins.toast.showShortBottom("Access granted.");
							} else {
								window.plugins.toast.showShortBottom("Access denied.");
							}
						}
					},
					'Admin',
					['Ok', 'Cancel'],
					''
				);
			}
			
			return false;
		}, false);
	},
	configureEnv : function(success, fail) {
		app.status("Configuring environment.");
		window.plugins.uniqueDeviceID.get(function(u){
			globals.store = cordova.file.dataDirectory;
			globals.device = document.getElementById('deviceProperties');
			globals.uuid = u;
			console.log("UUID = " + globals.uuid);
			
			window.resolveLocalFileSystemURL(cordova.file.applicationDirectory, function(entry){
				globals.appDirURL = entry.toURL() + 'www/';
				console.log('AppDirURL: ' + globals.appDirURL);
				success();
			}, function(){
				console.log('Failed resolving application directory.');
				fail();
			});
		}, function(){
			console.log('Failed.');
			fail();
		});
	},
	loadStyles : function(styles, done, css) {
		if(styles.length == 0){
			if(typeof css !== 'undefined'){
				$('head').append($('<style type="text/css"></style>').html(css));
			}
			done();
		} else {
			var style = styles.shift();
			window.resolveLocalFileSystemURL(style, function(entry){
				$.get(entry.toURL(), function(data){
					css += app.resolvePaths(data);
					app.loadStyles(styles, done, css);
				}).fail(function(){
					console.log("Failed to load: " + style);
					app.status("Sorry, something went wrong.<br/>Please call 1-(844)-BREVADA.<br /><br />#"+globals.uuid);
				});
			}, function(){
				console.log("Failed to load: " + style);
				app.status("Sorry, something went wrong.<br/>Please call 1-(844)-BREVADA.<br /><br />#"+globals.uuid);
			});
		}
	},
	start : function(success, fail) {
		app.status("Starting...");
		
		var stylesPath = app.getStylesPath();
		if(stylesPath === false){
			stylesPath = [];
		}
		console.log('Loading styles...');
		app.loadStyles(stylesPath, function(){
			var markupPath = app.getMarkupPath();
			if(markupPath !== false){
				console.log('Loading markup: ' + markupPath);
				window.resolveLocalFileSystemURL(markupPath, function(entry){
					$.get(entry.toURL(), function(data){
						console.log('Loaded markup.');
						data = app.resolvePaths(data);
						$('#cordova-app').html(data);
						
						var scriptPath = app.getScriptPath();
						if(scriptPath !== false){
							console.log('Loading script...');
							window.resolveLocalFileSystemURL(scriptPath, function(en){
								$.getScript(en.toURL(), function(){
									console.log('Executing script...');
									success();
								});
							}, function(){
								console.log('Script failed to load.');
								fail();
							});
						}
					}, 'html').fail(function(){
						app.status("Sorry, something went wrong.<br/>Please call 1-(844)-BREVADA.<br /><br />#"+globals.uuid);
					});
				}, function(){
					console.log('Failed to load markup.');
					fail();
				});
			}
		});
	},
	update : function(done) {
		console.log("Entering update process..");
		app.status("Checking for updates...");
		$.ajax({
			url : globals.api+'resources',
			cache : false,
			dataType : 'json',
			timeout : 7500,
			data: {k : globals.key, serial : globals.uuid},
			success : function(data){
				console.log(JSON.stringify(data));
				if(!data.hasOwnProperty('error') || data.error.length == 0){
					if(data.hasOwnProperty('download') && data.download.length > 0){
						app.downloadBatch(data.download, function(){
							done();
						});
					} else { done(); }
				} else { done(); }
			}
		}).fail(function(){
			console.log("Failed to check for updates.");
			done();
		});
	},
	downloadBatch : function(filesToDownload, done) {
		if(filesToDownload.length == 0){
			done();
		} else {
			var dl = filesToDownload.shift();
			
			window.resolveLocalFileSystemURL(globals.store + dl.name, function(entry){
				Checksum.forFile(entry.toURL(), function(hex){
					if(hex != dl.sha1){
						console.log(dl.name + " is out of date.");
						app.downloadFile(dl, function(){
							app.downloadBatch(filesToDownload, done);
						});
					} else {
						console.log(dl.name + " is up-to-date.");
						app.downloadBatch(filesToDownload, done);
					}
				}, function(err){
					console.log("Checksum failed for "+entry.toURL()+" : " + err);
					app.downloadFile(dl, function(){
						app.downloadBatch(filesToDownload, done);
					});
				});
			}, function(){
				console.log("New file available.");
				app.status("Update found. Downloading...");
				app.downloadFile(dl, function(){
					app.downloadBatch(filesToDownload, done);
				});
			});
			
		}
	},
	downloadFile : function(dl, done) {
		if(dl.role == 'styles'){
			app.status("Downloading new graphics...");
		} else if(dl.role == 'script'){
			app.status("Downloading new scripts...");
		} else if(dl.role == 'markup'){
			app.status("Downloading new interface...");
		}
		
		console.log("Entering download process.");
		var fileTransfer = new FileTransfer();
		console.log("Beginning file transfer.");
		fileTransfer.download(dl.url, globals.store + dl.name, function(entry){
			console.log('Downloaded to '+globals.store + dl.name+'.');
			if(dl.role == 'markup' || dl.role == 'script'){
				localStorage.setItem(dl.role, entry.toURL());
			} else if(dl.role == 'styles') {
				if(!localStorage.hasOwnProperty('styles')){
					localStorage.setItem('styles', entry.toURL());
				} else {
					var ar = localStorage.getItem('styles').split(',');
					ar.push(entry.toURL());
					localStorage.setItem('styles', ar.join(','));
				}
			}
			
			done();
		}, function(err){
			console.log('Error downloading.');
			done();
		}, true);
	},
	getMarkupPath : function() {
		if(localStorage.hasOwnProperty('markup')){
			return localStorage.getItem('markup');
		}
		return false;
	},
	getScriptPath : function() {
		if(localStorage.hasOwnProperty('script')){
			return localStorage.getItem('script');
		}
		return false;
	},
	getStylesPath : function() {
		if(localStorage.hasOwnProperty('styles')){
			return localStorage.getItem('styles').split(',');
		}
		return false;
	},
	resolvePaths : function(content) {
		content = content.replace(/(^[.])\/images/g, "/images");
		content = content.replace("/images", globals.appDirURL+"images");
		return content;
	},
	failedSubmission : function(payload) {
		/*
			TODO
			- Log what happened.
			- Save the failed submission to be sent at later datetime.
		*/
	}
};

app.initialize();