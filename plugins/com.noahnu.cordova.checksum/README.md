# cordova-checksum
Calculate SHA-1 checksum for file with Cordova.

Checksum of a local file:
```
window.resolveLocalFileSystemURL(myPath, function(entry){
	Checksum.forFile(entry.toURL(), function(hex){
		console.log("Checksum: " + hex);
	}, function(err){ console.log(err); });
);
```

Checksum of a String:
```
Checksum.forString("example", function(hex){
	console.log("Checksum: " + hex);
}, function(err){ console.log(err); });
```