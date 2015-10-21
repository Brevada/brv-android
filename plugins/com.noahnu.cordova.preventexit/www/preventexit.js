var exec = require('cordova/exec');

var PreventExit = {
	enable : function(){
		exec(null, null, "PreventExit", "enable", []);
	},
	disable : function(){
		exec(null, null, "PreventExit", "disable", []);
	}
};

module.exports = PreventExit;