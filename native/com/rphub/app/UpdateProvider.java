package com.rphub.app;

import android.content.ContentProvider;
import android.content.ContentValues;
import android.database.Cursor;
import android.database.MatrixCursor;
import android.net.Uri;
import android.os.ParcelFileDescriptor;
import android.provider.OpenableColumns;
import java.io.File;
import java.io.FileNotFoundException;

/** A single read-only APK, shared only by an explicit URI grant. */
public final class UpdateProvider extends ContentProvider {
    public boolean onCreate() { return true; }
    private File file(Uri uri) throws FileNotFoundException {
        File target = new File(getContext().getCacheDir(), "updates/update.apk");
        if (!"/update.apk".equals(uri.getPath()) || !target.isFile())
            throw new FileNotFoundException("Update unavailable");
        return target;
    }
    public String getType(Uri uri) { return "application/vnd.android.package-archive"; }
    public ParcelFileDescriptor openFile(Uri uri, String mode) throws FileNotFoundException {
        if (!"r".equals(mode)) throw new FileNotFoundException("Read only");
        return ParcelFileDescriptor.open(file(uri), ParcelFileDescriptor.MODE_READ_ONLY);
    }
    public Cursor query(Uri uri, String[] projection, String selection, String[] arguments, String order) {
        try {
            File target = file(uri);
            String[] columns = projection == null ? new String[]{OpenableColumns.DISPLAY_NAME, OpenableColumns.SIZE} : projection;
            MatrixCursor cursor = new MatrixCursor(columns);
            Object[] row = new Object[columns.length];
            for (int i = 0; i < columns.length; i++) {
                if (OpenableColumns.DISPLAY_NAME.equals(columns[i])) row[i] = "RP-local-update.apk";
                if (OpenableColumns.SIZE.equals(columns[i])) row[i] = target.length();
            }
            cursor.addRow(row);
            return cursor;
        } catch (FileNotFoundException ignored) { return null; }
    }
    public Uri insert(Uri uri, ContentValues values) { throw new UnsupportedOperationException(); }
    public int update(Uri uri, ContentValues values, String where, String[] args) { throw new UnsupportedOperationException(); }
    public int delete(Uri uri, String where, String[] args) { throw new UnsupportedOperationException(); }
}
