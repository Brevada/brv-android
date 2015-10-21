package com.noahnu.cordova.checksum;

import org.apache.cordova.CordovaPlugin;
import org.apache.cordova.CallbackContext;
import org.apache.cordova.CordovaResourceApi;
import org.apache.cordova.CordovaWebView;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.io.FileInputStream;
import java.io.File;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.io.FileNotFoundException;
import java.io.IOException;
import java.math.BigInteger;
import java.nio.charset.Charset;

import android.util.Log;
import android.net.Uri;

public class Checksum extends CordovaPlugin {

	private static final String LOG_TAG = "Checksum";

    @Override
    public boolean execute(String action, JSONArray args, CallbackContext callbackContext) throws JSONException {
        if (action.equals("forFile")) {
            String path = args.getString(0);
            this.checksumFile(path, callbackContext);
            return true;
        } else if (action.equals("forString")) {
            String str = args.getString(0);
            this.checksumString(str, callbackContext);
            return true;
        }
        return false;
    }

    private void checksumFile(final String path, final CallbackContext callbackContext) {
        Log.i(LOG_TAG, "Beginning checksum routine.");
		cordova.getThreadPool().execute(new Runnable(){
			public void run() {
				try {
					File file = webView.getResourceApi().mapUriToFile(Uri.parse(path));
					if(file != null && file.canRead() && file.isFile()){
						MessageDigest digest = MessageDigest.getInstance("SHA1");
						FileInputStream fis = new FileInputStream(file);
						
						byte[] buffer = new byte[1024];
						int n = 0;
						while((n = fis.read(buffer)) != -1){
							digest.update(buffer, 0, n);
						}
						
						byte[] digestBytes = digest.digest();
						BigInteger big = new BigInteger(1, digestBytes);
						String hexString = String.format("%0" + (digestBytes.length << 1) + "X", big);
						
						fis.close();
						
						Log.i(LOG_TAG, "SHA-1 for " + path + " = " + hexString);
						
						callbackContext.success(hexString);
					} else {
						throw new Exception("Invalid file.");
					}
				} catch (Exception ex) {
					callbackContext.error(ex.getMessage());
				}
			}
		});
    }
	
	private void checksumString(final String str, final CallbackContext callbackContext) {
        Log.i(LOG_TAG, "Beginning checksum routine.");
		cordova.getThreadPool().execute(new Runnable(){
			public void run() {
				try {
					if(str != null && !str.isEmpty()){
						MessageDigest digest = MessageDigest.getInstance("SHA1");
						digest.update(str.getBytes(Charset.forName("UTF-8")));
						
						byte[] digestBytes = digest.digest();
						BigInteger big = new BigInteger(1, digestBytes);
						String hexString = String.format("%0" + (digestBytes.length << 1) + "X", big);
						
						Log.i(LOG_TAG, "SHA-1 for " + str + " = " + hexString);
						
						callbackContext.success(hexString);
					} else {
						throw new Exception("Empty string.");
					}
				} catch (Exception ex) {
					callbackContext.error(ex.getMessage());
				}
			}
		});
    }
}