package com.rphub.app;

import java.io.IOException;
import java.io.InputStream;
import java.net.URI;
import java.security.MessageDigest;
import org.json.JSONObject;

final class UpdatePolicy {
    static final String ORIGIN = "https://121.40.147.125";

    static void validate(JSONObject info, String packageName, int currentCode) throws Exception {
        URI url = new URI(info.getString("url"));
        if (info.getInt("schema") != 1 || !"stable".equals(info.getString("channel"))
            || !packageName.equals(info.getString("packageName"))
            || info.getInt("versionCode") <= currentCode
            || info.getLong("size") <= 0 || info.getLong("size") > 256L * 1024 * 1024
            || !info.getString("sha256").matches("[a-f0-9]{64}")
            || !info.getString("versionName").matches("\\d+\\.\\d+(\\.\\d+)?")
            || !"https".equals(url.getScheme()) || !"121.40.147.125".equals(url.getHost())
            || url.getPort() != -1 || url.getUserInfo() != null || url.getQuery() != null
            || url.getFragment() != null || !url.getPath().matches("/updates/stable/RP-local-[0-9.]+\\.apk"))
            throw new IOException("更新包信息不匹配，请重新检查更新。");
    }

    static void verify(InputStream input, long expectedSize, String expectedHash) throws Exception {
        MessageDigest digest = MessageDigest.getInstance("SHA-256");
        byte[] buffer = new byte[65536];
        long count = 0;
        int length;
        while ((length = input.read(buffer)) != -1) {
            count += length;
            if (count > expectedSize) throw new IOException("更新包大小不匹配，请重新下载。");
            digest.update(buffer, 0, length);
        }
        StringBuilder actual = new StringBuilder();
        for (byte value : digest.digest()) actual.append(String.format("%02x", value & 255));
        if (count != expectedSize || !actual.toString().equals(expectedHash))
            throw new IOException("更新包校验失败，请重新下载。");
    }
}
