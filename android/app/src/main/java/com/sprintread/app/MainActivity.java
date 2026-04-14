package com.sprintread.app;

import android.os.Bundle;
import androidx.core.view.WindowCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // Force edge-to-edge so the WebView occupies the full screen width
        // and height on all Android devices, including those with display
        // cutouts, rounded corners, or gesture navigation bars.
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
    }
}
