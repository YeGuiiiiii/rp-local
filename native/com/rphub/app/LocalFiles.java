package com.rphub.app;

import android.content.Context;
import android.content.pm.PackageInfo;
import android.net.Uri;
import android.util.AtomicFile;
import android.util.Base64;
import android.webkit.JavascriptInterface;
import android.webkit.MimeTypeMap;
import android.webkit.WebResourceResponse;
import java.io.*;
import java.nio.charset.StandardCharsets;
import org.json.JSONArray;
import org.json.JSONObject;

/** Files belong to a fixed app directory; callers cannot supply absolute paths. */
public final class LocalFiles {
    private final File personal;
    private final File shared;
    private Context context;

    public LocalFiles(Context context) {
        this(new File(context.getFilesDir(), "RP数据"),
            new File(context.getExternalFilesDir(null) != null
                ? context.getExternalFilesDir(null) : context.getFilesDir(), "RP数据"));
        this.context = context.getApplicationContext();
    }

    public LocalFiles(File privateRoot, File sharedRoot) {
        personal = new File(privateRoot, "个人数据");
        shared = sharedRoot;
    }

    private File file(String relative) throws IOException {
        return LocalPaths.resolve(personal, shared, relative);
    }

    private static String response(Object value, Exception error) {
        try {
            JSONObject result = new JSONObject();
            result.put("ok", error == null);
            if (error == null) result.put("value", value == null ? JSONObject.NULL : value);
            else result.put("error", error.getMessage());
            return result.toString();
        } catch (Exception ignored) { return "{\"ok\":false,\"error\":\"Storage error\"}"; }
    }

    private void write(String relative, byte[] bytes) throws IOException {
        File target = file(relative);
        if (!target.getParentFile().isDirectory() && !target.getParentFile().mkdirs())
            throw new IOException("Cannot create storage directory");
        AtomicFile atomic = new AtomicFile(target);
        FileOutputStream stream = null;
        try {
            stream = atomic.startWrite();
            stream.write(bytes);
            atomic.finishWrite(stream);
        } catch (IOException error) {
            atomic.failWrite(stream);
            throw error;
        }
    }

    @JavascriptInterface
    public synchronized String writeText(String relative, String text) {
        try {
            write(relative, text.getBytes(StandardCharsets.UTF_8));
            return response(true, null);
        } catch (Exception error) { return response(null, error); }
    }

    @JavascriptInterface
    public synchronized String writeImage(String relative, String encoded) {
        try {
            if (!relative.startsWith("图片/") || encoded.length() > 48 * 1024 * 1024)
                throw new IOException("Invalid image");
            write(relative, Base64.decode(encoded, Base64.DEFAULT));
            return response(true, null);
        } catch (Exception error) { return response(null, error); }
    }

    @JavascriptInterface
    public synchronized String readText(String relative) {
        try { return response(read(relative), null); }
        catch (Exception error) { return response(null, error); }
    }

    private String read(String relative) throws IOException {
        File target = file(relative);
        if (!target.isFile() && !new File(target + ".bak").isFile()) return null;
        try (InputStream input = new AtomicFile(target).openRead();
             ByteArrayOutputStream output = new ByteArrayOutputStream()) {
            byte[] buffer = new byte[16384];
            int count;
            while ((count = input.read(buffer)) != -1) output.write(buffer, 0, count);
            return new String(output.toByteArray(), StandardCharsets.UTF_8);
        }
    }

    @JavascriptInterface
    public synchronized String writeTextIfChanged(String relative, String text) {
        try {
            if (text.equals(read(relative))) return response(false, null);
            write(relative, text.getBytes(StandardCharsets.UTF_8));
            return response(true, null);
        } catch (Exception error) { return response(null, error); }
    }

    @JavascriptInterface
    @SuppressWarnings("deprecation")
    public synchronized String consumeReleaseNotice() {
        try {
            int version = context.getPackageManager().getPackageInfo(context.getPackageName(), 0).versionCode;
            android.content.SharedPreferences preferences = context.getSharedPreferences("local_release_notice", Context.MODE_PRIVATE);
            if (preferences.getInt("shown_version", 0) >= version) return response(false, null);
            if (!preferences.edit().putInt("shown_version", version).commit())
                throw new IOException("Cannot save announcement state");
            return response(true, null);
        } catch (Exception error) { return response(null, error); }
    }

    @JavascriptInterface
    @SuppressWarnings("deprecation")
    public String runtimeInfo() {
        try {
            PackageInfo app = context.getPackageManager().getPackageInfo(context.getPackageName(), 0);
            JSONObject info = new JSONObject().put("packageName", app.packageName).put("version", app.versionName)
                .put("android", android.os.Build.VERSION.RELEASE);
            if (android.os.Build.VERSION.SDK_INT >= 26) {
                PackageInfo engine = android.webkit.WebView.getCurrentWebViewPackage();
                if (engine != null) info.put("webView", engine.packageName + " " + engine.versionName);
            }
            return response(info, null);
        } catch (Exception error) { return response(null, error); }
    }

    @JavascriptInterface
    public synchronized String readImage(String relative) {
        try {
            if (relative == null || !relative.startsWith("图片/") || relative.endsWith(".json"))
                throw new IOException("Not an image");
            File target = file(relative);
            if (!target.isFile() || target.length() > 32 * 1024 * 1024)
                throw new IOException("Image missing or too large");
            String extension = MimeTypeMap.getFileExtensionFromUrl(target.getName());
            String mime = MimeTypeMap.getSingleton().getMimeTypeFromExtension(extension);
            if (mime == null || !mime.startsWith("image/")) throw new IOException("Not an image");
            try (InputStream input = new FileInputStream(target);
                 ByteArrayOutputStream output = new ByteArrayOutputStream()) {
                byte[] buffer = new byte[16384];
                int count;
                while ((count = input.read(buffer)) != -1) output.write(buffer, 0, count);
                return response(new JSONObject().put("base64", Base64.encodeToString(output.toByteArray(), Base64.NO_WRAP))
                    .put("mime", mime), null);
            }
        } catch (Exception error) { return response(null, error); }
    }

    @JavascriptInterface
    public synchronized String exists(String relative) {
        try { return response(file(relative).isFile(), null); }
        catch (Exception error) { return response(null, error); }
    }

    @JavascriptInterface
    public synchronized String list(String relative) {
        try {
            JSONArray result = new JSONArray();
            File[] children = file(relative).listFiles();
            if (children != null) for (File child : children) {
                if (child.getName().endsWith(".bak") || child.getName().endsWith(".new")) continue;
                JSONObject item = new JSONObject();
                item.put("name", child.getName());
                item.put("directory", child.isDirectory());
                item.put("bytes", child.isFile() ? child.length() : 0);
                item.put("modified", child.lastModified());
                result.put(item);
            }
            return response(result, null);
        } catch (Exception error) { return response(null, error); }
    }

    @JavascriptInterface
    public synchronized String remove(String relative) {
        try {
            File target = file(relative);
            if (target.isDirectory()) throw new IOException("Only individual files may be removed");
            new AtomicFile(target).delete();
            return response(!target.exists(), null);
        } catch (Exception error) { return response(null, error); }
    }

    @JavascriptInterface
    public String locations() {
        try {
            return response(new JSONObject().put("personal", personal.getAbsolutePath())
                .put("characters", new File(shared, "角色卡数据").getAbsolutePath())
                .put("images", new File(shared, "图片").getAbsolutePath()), null);
        } catch (Exception error) { return response(null, error); }
    }

    public static WebResourceResponse imageResponse(Context context, String url) {
        String prefix = "https://sta1n156.github.io/RP-Hub/_files/";
        if (url == null || !url.startsWith(prefix)) return null;
        try {
            String relative = Uri.decode(Uri.parse(url).getEncodedPath().substring("/RP-Hub/_files/".length()));
            if (!relative.startsWith("图片/") || relative.endsWith(".json")) throw new IOException("Not an image");
            File target = new LocalFiles(context).file(relative);
            String extension = MimeTypeMap.getFileExtensionFromUrl(target.getName());
            String mime = MimeTypeMap.getSingleton().getMimeTypeFromExtension(extension);
            if (mime == null || !mime.startsWith("image/")) throw new IOException("Not an image");
            return new WebResourceResponse(mime, null, new FileInputStream(target));
        } catch (Exception error) {
            WebResourceResponse response = new WebResourceResponse("text/plain", "UTF-8",
                new ByteArrayInputStream(new byte[0]));
            response.setStatusCodeAndReasonPhrase(404, "Not Found");
            return response;
        }
    }
}
