var exec = require('cordova/exec');

var Checksum = {
	forFile : function(path, success, error){
		exec(success, error, "Checksum", "forFile", [path]);
	},
	forString : function(str, success, error){
		exec(success, error, "Checksum", "forString", [str]);
	}
};

module.exports = Checksum;