package com.bukki.app;

import android.os.Bundle;
import android.util.Log;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private static final String TAG = "BUKKiMainActivity";

    @Override
    public void onCreate(Bundle savedInstanceState) {
        try {
            Log.d(TAG, "MainActivity onCreate called");
            super.onCreate(savedInstanceState);
            Log.d(TAG, "MainActivity onCreate completed successfully");
        } catch (Exception e) {
            Log.e(TAG, "Error in MainActivity onCreate", e);
            throw e;
        }
    }

    @Override
    public void onStart() {
        try {
            Log.d(TAG, "MainActivity onStart called");
            super.onStart();
        } catch (Exception e) {
            Log.e(TAG, "Error in MainActivity onStart", e);
        }
    }
}
