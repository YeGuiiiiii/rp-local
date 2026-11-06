package com.rphub.app;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.Context;
import android.content.DialogInterface;
import android.content.Intent;
import android.net.Uri;
import android.webkit.WebView;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public final class WebViewSupport {
    private static final String ENTRY = "https://sta1n156.github.io/RP-Hub/";

    private WebViewSupport() {}

    public static void loadEntry(final Activity activity, final WebView webView) {
        String agent = webView.getSettings().getUserAgentString();
        if (!WebViewVersion.tooOld(agent)) {
            webView.loadUrl(ENTRY);
            return;
        }
        new AlertDialog.Builder(activity)
            .setTitle("系统 WebView 版本过旧")
            .setMessage("当前网页内核较旧，可能出现白屏或功能不可用。请更新 Android System WebView 后重新打开软件。")
            .setPositiveButton("前往更新", new DialogInterface.OnClickListener() {
                @Override public void onClick(DialogInterface dialog, int which) {
                    try {
                        activity.startActivity(new Intent(Intent.ACTION_VIEW,
                            Uri.parse("market://details?id=com.google.android.webview")));
                    } catch (Exception unavailable) {
                        try {
                            activity.startActivity(new Intent(Intent.ACTION_VIEW,
                                Uri.parse("https://play.google.com/store/apps/details?id=com.google.android.webview")));
                        } catch (Exception noBrowser) {
                            webView.loadUrl(ENTRY);
                            return;
                        }
                    }
                    activity.finish();
                }
            })
            .setNegativeButton("仍然打开", new DialogInterface.OnClickListener() {
                @Override public void onClick(DialogInterface dialog, int which) { webView.loadUrl(ENTRY); }
            }).setCancelable(false).show();
    }

    public static boolean copyText(Context context, String text) {
        if (text == null) return false;
        try {
            ClipboardManager clipboard = (ClipboardManager) context.getSystemService(Context.CLIPBOARD_SERVICE);
            if (clipboard == null) return false;
            clipboard.setPrimaryClip(ClipData.newPlainText("RP-Hub", text));
            return true;
        } catch (RuntimeException failure) { return false; }
    }
}

final class WebViewVersion {
    private static final Pattern CHROME = Pattern.compile("Chrome/(\\d+)");

    static boolean tooOld(String agent) {
        Matcher version = CHROME.matcher(agent == null ? "" : agent);
        if (!version.find()) return false;
        try {
            int major = Integer.parseInt(version.group(1));
            return major > 0 && major < 85;
        } catch (NumberFormatException unknown) { return false; }
    }
}
