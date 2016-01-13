/*
	Brevada Tablet Framework
*/

var app = {
	opts : {
		connection : {
			api : 'http://brevada.com/api/v1/',
			key : 'inOkNRZSOayWOPy9vqYA',
			payloadTimeout : 5000
		},
		admin : {
			password : 'Brevada!23',
			backPushedTimes : 0,
			backPushedTime : 0
		},
		filesystem : {
			store : '',
			appDir : '',
			db : null
		},
		system : {
			uuid : '',
			device : null,
			battery : { level : 100, isPlugged : false }
		},
		polling : {
			polling : false,
			pollTmr : null,
			pollInterval : 60000*5
		}
	},
    initialize: function() {
        $(document).on('deviceready', this.onDeviceReady);
    },
	status : function(msg) {
		$('#deviceready > p').html(msg);
	},
    onDeviceReady: function() {
		app.log("Device is ready.");
		
		app.preventExit();
		
		window.addEventListener("batterystatus", function(info){
			app.opts.system.battery = info;
		}, false);
		
		app.log("Opening database...");
		app.opts.filesystem.db = window.sqlitePlugin.openDatabase({ name: "database.db", createFromLocation: 1 });
		
		app.configureEnv(function(){
			app.update(function(){
				app.start(function(){
					// All good.
					setTimeout(app.poll, 10000);
				}, function(){
					// Critical error.
					app.status("Sorry, something went wrong.<br/>Please call 1-(844)-BREVADA.<br /><br />#"+app.opts.system.uuid);
				});
			});
		}, function(){
			// Critical error. Failed to configure environment.
			app.status('Cannot configure environment!');
		});
    },
	preventExit : function(){
		app.log("Preventing exit...");
		PreventExit.enable();
		document.addEventListener('backbutton', function(e){
			var now = (new Date()).getTime();
			
			if(now - app.opts.backPushedTime > 3000){
				app.opts.backPushedTimes = 0;
			}
			
			app.opts.backPushedTimes++;
			app.opts.backPushedTime = now;
			
			if(app.opts.backPushedTimes > 10){
				app.log("Showing admin panel.");
				navigator.notification.prompt(
					"Please enter the password, click 'OK', then the 'Home' button.",
					function(results){
						if(results.buttonIndex == 2){
							app.opts.backPushedTimes = 0;
						} else if(results.buttonIndex == 1){
							if(results.input1 == app.opts.admin.password){
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
			app.opts.filesystem.store = cordova.file.dataDirectory;
			app.opts.system.device = document.getElementById('deviceProperties');
			app.opts.system.uuid = u;
			app.log("UUID = " + app.opts.system.uuid);
			
			window.resolveLocalFileSystemURL(cordova.file.applicationDirectory, function(entry){
				app.opts.filesystem.appDir = entry.toURL() + 'www/';
				app.log('AppDirURL: ' + app.opts.filesystem.appDir);
				success();
			}, function(){
				app.log('Failed resolving application directory.');
				fail();
			});
		}, function(){
			app.log('Failed.');
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
					app.log("Failed to load: " + style);
					app.status("Sorry, something went wrong.<br/>Please call 1-(844)-BREVADA.<br /><br />#"+app.opts.system.uuid);
				});
			}, function(){
				app.log("Failed to load: " + style);
				app.status("Sorry, something went wrong.<br/>Please call 1-(844)-BREVADA.<br /><br />#"+app.opts.system.uuid);
			});
		}
	},
	start : function(success, fail) {
		app.status("Starting...");
		
		var stylesPath = app.getStylesPath();
		if(stylesPath === false){
			stylesPath = [];
		}
		app.log('Loading styles...');
		app.loadStyles(stylesPath, function(){
			var markupPath = app.getMarkupPath();
			if(markupPath !== false){
				app.log('Loading markup: ' + markupPath);
				window.resolveLocalFileSystemURL(markupPath, function(entry){
					$.get(entry.toURL(), function(data){
						app.log('Loaded markup.');
						data = app.resolvePaths(data);
						$('#cordova-app').html(data);
						
						var scriptPath = app.getScriptPath();
						if(scriptPath !== false){
							app.log('Loading script...');
							window.resolveLocalFileSystemURL(scriptPath, function(en){
								$.getScript(en.toURL(), function(){
									app.log('Executing script...');
									success();
								});
							}, function(){
								app.log('Script failed to load.');
								fail();
							});
						}
					}, 'html').fail(function(){
						app.status("Sorry, something went wrong.<br/>Please call 1-(844)-BREVADA.<br /><br />#"+app.opts.system.uuid);
					});
				}, function(){
					app.log('Failed to load markup.');
					fail();
				});
			}
		});
	},
	update : function(done) {
		app.log("Entering update process..");
		
		if(!app.online()){
			app.log("Failed to check for updates: no internet connection.");
			done();
			return;
		}
		
		app.status("Checking for updates...");
		$.ajax({
			url : app.opts.connection.api+'resources',
			cache : false,
			dataType : 'json',
			timeout : 7500,
			data: {serial : app.opts.system.uuid},
			success : function(data){
				app.log(JSON.stringify(data));
				if(!data.hasOwnProperty('error') || data.error.length == 0){
					if(data.hasOwnProperty('download') && data.download.length > 0){
						app.downloadBatch(data.download, function(){
							done();
						});
					} else { done(); }
				} else { done(); }
			}
		}).fail(function(){
			app.log("Failed to check for updates.");
			done();
		});
	},
	downloadBatch : function(filesToDownload, done) {
		if(filesToDownload.length == 0){
			done();
		} else {
			var dl = filesToDownload.shift();
			
			window.resolveLocalFileSystemURL(app.opts.filesystem.store + dl.name, function(entry){
				Checksum.forFile(entry.toURL(), function(hex){
					if(hex != dl.sha1){
						app.log(dl.name + " is out of date.");
						app.downloadFile(dl, function(){
							app.downloadBatch(filesToDownload, done);
						});
					} else {
						app.log(dl.name + " is up-to-date.");
						app.downloadBatch(filesToDownload, done);
					}
				}, function(err){
					app.log("Checksum failed for "+entry.toURL()+" : " + err);
					app.downloadFile(dl, function(){
						app.downloadBatch(filesToDownload, done);
					});
				});
			}, function(){
				app.log("New file available.");
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
		
		app.log("Entering download process.");
		var fileTransfer = new FileTransfer();
		app.log("Beginning file transfer.");
		fileTransfer.download(dl.url, app.opts.filesystem.store + dl.name, function(entry){
			app.log('Downloaded to '+app.opts.filesystem.store + dl.name+'.');
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
			app.log('Error downloading.');
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
		content = content.replace("/images", app.opts.filesystem.appDir+"images");
		return content;
	},
	online : function(){
		return navigator.connection.type != Connection.NONE && navigator.connection.type != Connection.UNKNOWN;
	},
	iteratePayloads : function(rows, index, done){
		if(index < 0){
			done();
		} else {
			var row = rows.item(index);
			var payload = JSON.parse(row.data);
			app.opts.filesystem.db.executeSql("DELETE FROM payloads WHERE id = ?", [row.id], function(){
				app.log("Row deleted.");
				app.sendPayload(payload, function(){
					app.iteratePayloads(rows, index-1, done);
				});
			}, function(e){
				app.log("DB Critical Error: " + e.message);
				app.iteratePayloads(rows, index-1, done);
			});
		}
	},
	poll : function(){
		clearTimeout(app.opts.polling.pollTmr);
		if(app.opts.polling.polling){ return; }
		app.opts.polling.polling = true;
		
		if(app.online()){
			app.opts.filesystem.db.transaction(function(tx){
				tx.executeSql("SELECT id, data FROM payloads", [], function(tx,res){
					if(res.rows.length > 0){
						app.iteratePayloads(res.rows, res.rows.length-1, function(){
							app.opts.polling.polling = false;
							setTimeout(app.poll, app.opts.polling.pollInterval);
						});
					} else {
						app.opts.polling.polling = false;
						setTimeout(app.poll, app.opts.polling.pollInterval);
					}
				}, function(e){
					app.log("DB Error A: " + e.message);
					app.opts.polling.polling = false;
					setTimeout(app.poll, app.opts.polling.pollInterval);
				});
			}, function(e){
				app.log("DB Error B: " + e.message);
				app.opts.polling.polling = false;
				setTimeout(app.poll, app.opts.polling.pollInterval);
			});
		} else {
			app.opts.polling.polling = false;
			setTimeout(app.poll, app.opts.polling.pollInterval);
		}
	},
	failedSubmission : function(payload) {
		app.log("Failed to upload payload.");
		var payloadString = JSON.stringify(payload);
		
		app.opts.filesystem.db.transaction(function(tx){
			tx.executeSql("CREATE TABLE IF NOT EXISTS payloads (id integer primary key, data text)");
			tx.executeSql("INSERT INTO payloads (data) VALUES (?)", [payloadString], function(tx, res){
				if(res.rowsAffected == 1){
					app.log("Stored payload.");
				} else {
					app.log("Error. Unable to store payload.");
				}
			});
		}, function(e){
			app.log("DB Error C: " + e.message);
		});
	},
	sendPayload : function(payload, sent){
		if(!app.online()){ app.log("Not online...");
			app.failedSubmission(payload);
			return;
		}
		
		payload.time = Math.floor((new Date).getTime()/1000);
		
		var keys = Object.keys(payload);
		keys.sort();
		
		var dataString = app.opts.connection.key;
		for(var i = 0; i < keys.length; i++){
			if(keys[i] == 'signature'){ continue; }
			dataString += keys[i] + "=" + payload[keys[i]];
		}
		dataString = dataString.toLowerCase();
		app.log("Data String: "+dataString);
		
		Checksum.forString(dataString, function(hex){
			payload.signature = hex;
			app.log("Signature: "+hex);
			
			$.ajax({
				url : app.opts.connection.api+'feedback',
				cache : false,
				dataType : 'json',
				timeout : app.opts.connection.payloadTimeout,
				method : 'POST',
				data: payload,
				success : function(data){
					app.log(JSON.stringify(data));
					if(!data.hasOwnProperty('error') || data.error.length == 0){
						app.log("Rating submitted.");
						if(typeof sent === 'function'){
							sent();
						}
					} else {
						app.failedSubmission(payload);
					}
				}
			}).fail(function(j, textStatus){
				app.log("Failed to post feedback: " + textStatus + " - " + j.responseText);
				app.failedSubmission(payload);
			});
		}, function(err){
			app.log("Failed to generate hash for feedback.");
			app.failedSubmission(payload);
		});
	},
	log : function(msg){
		console.log(msg);
	},
	custom : { }
};

app.initialize();