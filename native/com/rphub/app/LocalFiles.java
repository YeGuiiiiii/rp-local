package com.rphub.app;

import android.content.Context;
import android.content.pm.PackageInfo;
import android.net.Uri;
import android.provider.DocumentsContract;
import android.util.AtomicFile;
import android.util.Base64;
import android.webkit.JavascriptInterface;
import android.webkit.MimeTypeMap;
import android.webkit.WebResourceResponse;
import java.io.*;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Collections;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import org.json.JSONArray;
import org.json.JSONObject;

/** Files belong to a fixed app directory; callers cannot supply absolute paths. */
public final class LocalFiles {
    private final File personal;
    private final File shared;
    private Context context;
    private static final ConcurrentHashMap<String, Uri> backupReads = new ConcurrentHashMap<>();
    private static final String BACKUP_READ_URL = "https://sta1n156.github.io/RP-Hub/__rphub_backup_read__";
    private final Map<String, TextWriteSession> textWrites = new HashMap<>();

    private static final class TextWriteSession {
        final AtomicFile atomic;
        final FileOutputStream output;

        TextWriteSession(AtomicFile atomic, FileOutputStream output) {
            this.atomic = atomic;
            this.output = output;
        }
    }

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

    private void writeTextFile(String relative, String text) throws IOException {
        File target = file(relative);
        if (!target.getParentFile().isDirectory() && !target.getParentFile().mkdirs())
            throw new IOException("Cannot create storage directory");
        AtomicFile atomic = new AtomicFile(target);
        FileOutputStream stream = null;
        try {
            stream = atomic.startWrite();
            TextFileIO.writeUtf8(text, stream);
            atomic.finishWrite(stream);
        } catch (IOException error) {
            atomic.failWrite(stream);
            throw error;
        }
    }

    private boolean textMatches(String relative, String text) throws IOException {
        File target = file(relative);
        if (!target.isFile() && !new File(target + ".bak").isFile()) return false;
        return TextFileIO.matches(new AtomicFile(target).openRead(), text);
    }

    @JavascriptInterface
    public synchronized String beginTextWrite(String relative) {
        AtomicFile atomic = null;
        FileOutputStream output = null;
        try {
            File target = file(relative);
            if (!target.getParentFile().isDirectory() && !target.getParentFile().mkdirs())
                throw new IOException("Cannot create storage directory");
            atomic = new AtomicFile(target);
            output = atomic.startWrite();
            String token = UUID.randomUUID().toString();
            textWrites.put(token, new TextWriteSession(atomic, output));
            return response(token, null);
        } catch (Exception error) {
            if (atomic != null) atomic.failWrite(output);
            return response(null, error);
        }
    }

    @JavascriptInterface
    public synchronized String appendTextWrite(String token, String text) {
        TextWriteSession session = textWrites.get(token);
        if (session == null) return response(null, new IOException("Text write session expired"));
        try {
            TextFileIO.writeUtf8(text, session.output);
            return response(true, null);
        } catch (Exception error) {
            abortTextWrite(token);
            return response(null, error);
        }
    }

    @JavascriptInterface
    public synchronized String finishTextWrite(String token) {
        TextWriteSession session = textWrites.remove(token);
        if (session == null) return response(null, new IOException("Text write session expired"));
        try {
            session.atomic.finishWrite(session.output);
            return response(true, null);
        } catch (Exception error) {
            session.atomic.failWrite(session.output);
            return response(null, error);
        }
    }

    @JavascriptInterface
    public synchronized String abortTextWrite(String token) {
        TextWriteSession session = textWrites.remove(token);
        if (session == null) return response(false, null);
        session.atomic.failWrite(session.output);
        return response(true, null);
    }

    @JavascriptInterface
    public synchronized String writeText(String relative, String text) {
        try { writeTextFile(relative, text); return response(true, null); }
        catch (Exception error) { return response(null, error); }
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
            if (textMatches(relative, text)) return response(false, null);
            writeTextFile(relative, text);
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
    public String downloadDirectory() {
        return DownloadFiles.directory(DownloadFiles.BACKUPS);
    }

    @JavascriptInterface
    public String locations() {
        try {
            return response(new JSONObject().put("personal", personal.getAbsolutePath())
                .put("characters", new File(shared, "角色卡数据").getAbsolutePath())
                .put("images", new File(shared, "图片").getAbsolutePath()), null);
        } catch (Exception error) { return response(null, error); }
    }

    @JavascriptInterface
    public String prepareBackupFileRead(String id, boolean treeDocument) {
        try {
            Uri uri;
            if (treeDocument) {
                String folder = context.getSharedPreferences("rphub_settings", 0).getString("backup_folder", "");
                if (folder.isEmpty()) throw new IOException("Backup folder unavailable");
                Uri tree = Uri.parse(folder);
                uri = DocumentsContract.buildDocumentUriUsingTree(tree, id);
            } else {
                File root = new File(context.getExternalFilesDir(null), "backups").getCanonicalFile();
                File target = new File(id).getCanonicalFile();
                if (!target.getPath().startsWith(root.getPath() + File.separator) || !target.isFile())
                    throw new IOException("Backup unavailable");
                uri = Uri.fromFile(target);
            }
            String token = UUID.randomUUID().toString();
            if (backupReads.size() >= 8) backupReads.clear();
            backupReads.put(token, uri);
            return token;
        } catch (Exception error) { return "ERR:" + error.getMessage(); }
    }

    public static WebResourceResponse backupResponse(Context context, String url) {
        if (url == null || !url.startsWith(BACKUP_READ_URL + "?")) return null;
        try {
            Uri uri = backupReads.remove(Uri.parse(url).getQueryParameter("t"));
            if (uri == null) throw new IOException("Backup read expired");
            InputStream stream = context.getContentResolver().openInputStream(uri);
            if (stream == null) throw new IOException("Backup unavailable");
            WebResourceResponse result = new WebResourceResponse("application/json", "UTF-8", stream);
            result.setResponseHeaders(Collections.singletonMap("Cache-Control", "no-store"));
            return result;
        } catch (Exception error) {
            WebResourceResponse result = new WebResourceResponse("application/json", "UTF-8",
                new ByteArrayInputStream("{\"error\":\"Backup unavailable\"}".getBytes(StandardCharsets.UTF_8)));
            result.setStatusCodeAndReasonPhrase(404, "Not Found");
            return result;
        }
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
