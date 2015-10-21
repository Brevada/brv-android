package com.noahnu.cordova.preventexit;

import org.apache.cordova.CordovaPlugin;
import org.apache.cordova.CallbackContext;
import org.apache.cordova.CordovaWebView;
import org.apache.cordova.PluginResult;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import android.util.Log;
import android.view.WindowManager;

import android.app.Activity;
import android.content.Context;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.content.ComponentName;

public class PreventExit extends CordovaPlugin {

	private static final String LOG_TAG = "PreventExit";

    @Override
    public boolean execute(String action, JSONArray args, CallbackContext callbackContext) throws JSONException {
        if (action.equals("enable")) {
			this.enableKeepAwake(callbackContext);
            return true;
        } else if (action.equals("disable")) {
            this.disableKeepAwake(callbackContext);
			cordova.getActivity().runOnUiThread(new Runnable(){
				public void run() {
					cordova.getActivity().getPackageManager().clearPackagePreferredActivities(cordova.getActivity().getApplicationContext().getPackageName());
				}
			});
            return true;
        }
        return false;
    }
	
	private void enableKeepAwake(final CallbackContext callbackContext)
	{
		cordova.getActivity().runOnUiThread(new Runnable(){
			public void run() {
				cordova.getActivity().getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
                callbackContext.sendPluginResult(new PluginResult(PluginResult.Status.OK));
			}
		});
	}
	
	private void disableKeepAwake(final CallbackContext callbackContext)
	{
		cordova.getActivity().runOnUiThread(new Runnable(){
			public void run() {
				cordova.getActivity().getWindow().clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
                callbackContext.sendPluginResult(new PluginResult(PluginResult.Status.OK));
			}
		});
	}
	
}