package com.rphub.app;

import android.app.Activity;
import android.os.Build;
import android.webkit.JavascriptInterface;
import android.webkit.WebSettings;
import android.webkit.WebView;

public final class CardNight {
    private final Activity activity;
    private final WebView webView;

    private CardNight(Activity activity, WebView webView) {
        this.activity = activity;
        this.webView = webView;
        apply(false);
    }

    public static void install(Activity activity, WebView webView) {
        webView.addJavascriptInterface(new CardNight(activity, webView), "RPHubCardTheme");
    }

    @JavascriptInterface public void setEnabled(final boolean enabled) {
        activity.runOnUiThread(new Runnable() {
            @Override public void run() { apply(enabled); }
        });
    }

    private void apply(boolean enabled) {
        WebSettings settings = webView.getSettings();
        if (Build.VERSION.SDK_INT >= 33) settings.setAlgorithmicDarkeningAllowed(enabled);
        else if (Build.VERSION.SDK_INT >= 29)
            settings.setForceDark(enabled ? WebSettings.FORCE_DARK_ON : WebSettings.FORCE_DARK_OFF);
    }
}
