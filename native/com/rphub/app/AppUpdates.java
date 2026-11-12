package com.rphub.app;

import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.net.ConnectivityManager;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.Arrays;
import org.json.JSONObject;

/** Downloads never alter app data; the system installer confirms every upgrade. */
public final class AppUpdates {
    private static AppUpdates instance;
    private final Activity activity;
    private final File apk;
    private JSONObject release;
    private String phase = "idle", error = "";
    private int progress;

    private AppUpdates(Activity activity) {
        this.activity = activity;
        apk = new File(activity.getCacheDir(), "updates/update.apk");
    }

    public static void install(Activity activity, WebView webView) {
        if (instance == null || instance.activity != activity) instance = new AppUpdates(activity);
        webView.addJavascriptInterface(instance, "RPLocalUpdates");
    }

    @JavascriptInterface
    @SuppressWarnings("deprecation")
    public boolean isUnmetered() {
        ConnectivityManager network = (ConnectivityManager) activity.getSystemService(Context.CONNECTIVITY_SERVICE);
        return network != null && network.getActiveNetworkInfo() != null
            && network.getActiveNetworkInfo().isConnected() && !network.isActiveNetworkMetered();
    }

    @JavascriptInterface
    public synchronized String state() {
        try {
            JSONObject result = new JSONObject().put("phase", phase).put("progress", progress).put("error", error);
            if (release != null) result.put("latest", release);
            return result.toString();
        } catch (Exception ignored) { return "{\"phase\":\"error\",\"error\":\"无法读取更新状态\"}"; }
    }

    @JavascriptInterface
    @SuppressWarnings("deprecation")
    public synchronized void download(String json) {
        if ("downloading".equals(phase) || "verifying".equals(phase)) return;
        try {
            final JSONObject info = new JSONObject(json);
            int version = activity.getPackageManager().getPackageInfo(activity.getPackageName(), 0).versionCode;
            UpdatePolicy.validate(info, activity.getPackageName(), version);
            final boolean automatic = info.optBoolean("automatic");
            if (automatic && !isUnmetered()) throw new IOException("等待 Wi-Fi，或点击下载更新。");
            release = info;
            phase = "downloading"; error = ""; progress = 0;
            new Thread(() -> fetch(info, automatic), "rp-update-download").start();
        } catch (Exception failure) { fail(failure); }
    }

    private void fetch(JSONObject info, boolean automatic) {
        HttpURLConnection connection = null;
        File partial = new File(apk.getParentFile(), "update.part");
        try {
            if (!apk.getParentFile().isDirectory() && !apk.getParentFile().mkdirs())
                throw new IOException("无法创建更新目录。");
            connection = (HttpURLConnection) new URL(info.getString("url")).openConnection();
            connection.setConnectTimeout(15000); connection.setReadTimeout(30000);
            connection.setInstanceFollowRedirects(false);
            if (connection.getResponseCode() != 200) throw new IOException("下载失败，请稍后重试。");
            long size = info.getLong("size"), count = 0;
            byte[] buffer = new byte[65536];
            try (InputStream input = connection.getInputStream(); FileOutputStream output = new FileOutputStream(partial)) {
                int length;
                while ((length = input.read(buffer)) != -1) {
                    if (automatic && !isUnmetered()) throw new IOException("Wi-Fi 已断开，请重新下载更新。");
                    count += length;
                    if (count > size) throw new IOException("更新包大小不匹配。");
                    output.write(buffer, 0, length);
                    synchronized (this) { progress = (int) (count * 100 / size); }
                }
                output.getFD().sync();
            }
            synchronized (this) { phase = "verifying"; }
            try (InputStream input = new FileInputStream(partial)) {
                UpdatePolicy.verify(input, size, info.getString("sha256"));
            }
            verifyPackage(partial, info);
            if (apk.exists() && !apk.delete()) throw new IOException("无法替换旧更新包。");
            if (!partial.renameTo(apk)) throw new IOException("无法保存更新包。");
            synchronized (this) { phase = "ready"; progress = 100; }
        } catch (Exception failure) {
            partial.delete();
            synchronized (this) { fail(failure); }
        } finally { if (connection != null) connection.disconnect(); }
    }

    @SuppressWarnings("deprecation")
    private void verifyPackage(File file, JSONObject info) throws Exception {
        PackageManager manager = activity.getPackageManager();
        PackageInfo incoming = manager.getPackageArchiveInfo(file.getPath(), PackageManager.GET_SIGNATURES);
        PackageInfo current = manager.getPackageInfo(activity.getPackageName(), PackageManager.GET_SIGNATURES);
        if (incoming == null || !current.packageName.equals(incoming.packageName)
            || incoming.versionCode != info.getInt("versionCode") || incoming.versionCode <= current.versionCode
            || incoming.signatures == null || !Arrays.equals(current.signatures, incoming.signatures))
            throw new IOException("更新包的版本或签名不匹配，已停止安装。");
    }

    private void fail(Exception failure) {
        phase = "error";
        error = failure.getMessage() == null ? "更新失败，请稍后重试。" : failure.getMessage();
    }

    @JavascriptInterface
    public void install() {
        activity.runOnUiThread(() -> {
            synchronized (this) {
                try {
                    if (release == null || !apk.isFile()) throw new IOException("请先下载更新。");
                    if (Build.VERSION.SDK_INT >= 26 && !activity.getPackageManager().canRequestPackageInstalls()) {
                        phase = "permission";
                        activity.startActivity(new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES,
                            Uri.parse("package:" + activity.getPackageName())));
                        return;
                    }
                    verifyPackage(apk, release);
                    Intent intent = new Intent(Intent.ACTION_VIEW)
                        .setDataAndType(Uri.parse("content://" + activity.getPackageName() + ".updates/update.apk"),
                            "application/vnd.android.package-archive")
                        .addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                    activity.startActivity(intent);
                    phase = "ready";
                } catch (Exception failure) { fail(failure); }
            }
        });
    }
}
