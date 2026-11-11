package com.rphub.app;

import android.content.ContentValues;
import android.content.Context;
import android.database.Cursor;
import android.media.MediaScannerConnection;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.provider.MediaStore;
import java.io.*;

/** A download's location comes from its created row or file, never a translated folder name. */
public final class DownloadFiles {
    public static final String EXPORTS = "Download/RP本地版/导出文件";
    public static final String BACKUPS = "Download/RP本地版/数据备份";
    public static final class Target {
        public OutputStream output;
        public File file;
        public Uri uri;
    }
    private DownloadFiles() {}

    public static String directory(String relative) {
        return Build.VERSION.SDK_INT >= 29 ? "手机存储/" + relative
            : Environment.getExternalStoragePublicDirectory(relative).getAbsolutePath();
    }

    public static Target open(Context context, String name, String mime, String relative) throws IOException {
        Target target = new Target();
        try {
            if (Build.VERSION.SDK_INT >= 29) {
                ContentValues row = new ContentValues();
                row.put(MediaStore.MediaColumns.DISPLAY_NAME, name);
                row.put(MediaStore.MediaColumns.MIME_TYPE, mime);
                row.put(MediaStore.MediaColumns.RELATIVE_PATH, relative);
                row.put(MediaStore.MediaColumns.IS_PENDING, 1);
                target.uri = context.getContentResolver().insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, row);
                if (target.uri == null) throw new IOException("无法创建下载文件");
                target.output = context.getContentResolver().openOutputStream(target.uri);
                if (target.output == null) throw new IOException("无法打开下载文件");
            } else {
                File dir = Environment.getExternalStoragePublicDirectory(relative);
                if (!dir.isDirectory() && !dir.mkdirs()) throw new IOException("无法创建下载目录");
                int dot = name.lastIndexOf('.');
                String stem = dot > 0 ? name.substring(0, dot) : name, ext = dot > 0 ? name.substring(dot) : "";
                File candidate = new File(dir, name);
                int suffix = 1;
                // Reserve a new file so failure cleanup can never delete an earlier export.
                while (!candidate.createNewFile()) candidate = new File(dir, stem + "-" + suffix++ + ext);
                target.file = candidate;
                target.output = new FileOutputStream(target.file);
            }
            return target;
        } catch (IOException | RuntimeException error) {
            discard(context, target);
            throw error;
        }
    }

    public static String location(Context context, Uri uri, File file) {
        if (file != null) return file.getAbsolutePath();
        try (Cursor cursor = context.getContentResolver().query(uri,
                new String[] {MediaStore.MediaColumns.RELATIVE_PATH, MediaStore.MediaColumns.DISPLAY_NAME},
                null, null, null)) {
            if (cursor != null && cursor.moveToFirst()) {
                String relative = cursor.getString(0), name = cursor.getString(1);
                if (relative != null && name != null)
                    return "手机存储/" + relative + (relative.endsWith("/") ? "" : "/") + name;
            }
        } catch (RuntimeException ignored) {}
        return uri.toString();
    }

    public static String finish(Context context, OutputStream output, File file, Uri uri, String mime) throws IOException {
        Target target = new Target();
        target.output = output; target.file = file; target.uri = uri;
        try {
            output.flush();
            if (output instanceof FileOutputStream) ((FileOutputStream) output).getFD().sync();
            output.close();
            if (uri != null && Build.VERSION.SDK_INT >= 29) {
                ContentValues row = new ContentValues();
                row.put(MediaStore.MediaColumns.IS_PENDING, 0);
                if (context.getContentResolver().update(uri, row, null, null) != 1)
                    throw new IOException("下载文件发布未完成");
            }
            String saved = location(context, uri, file);
            if (file != null) {
                try { MediaScannerConnection.scanFile(context, new String[] {saved}, new String[] {mime}, null); }
                catch (RuntimeException ignored) { /* The complete file still exists at the reported path. */ }
            }
            return saved;
        } catch (IOException | RuntimeException error) {
            discard(context, target);
            throw error;
        }
    }

    public static void discard(Context context, Target target) {
        try { if (target.output != null) target.output.close(); } catch (IOException ignored) {}
        if (target.file != null) target.file.delete();
        if (target.uri != null) {
            try { context.getContentResolver().delete(target.uri, null, null); } catch (RuntimeException ignored) {}
        }
    }

    public static String save(Context context, byte[] bytes, String name, String mime) throws IOException {
        if (bytes.length == 0) throw new IOException("文件内容为空");
        Target target = open(context, name, mime, EXPORTS);
        try {
            target.output.write(bytes);
        } catch (IOException | RuntimeException error) {
            discard(context, target);
            throw error;
        }
        return finish(context, target.output, target.file, target.uri, mime);
    }
}
