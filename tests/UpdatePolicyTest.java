package com.rphub.app;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import org.json.JSONObject;

public final class UpdatePolicyTest {
    private static JSONObject release() throws Exception {
        return new JSONObject().put("schema", 1).put("channel", "stable")
            .put("packageName", "com.rphub.local").put("versionName", "2.9.027")
            .put("versionCode", 291).put("size", 3)
            .put("sha256", "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad")
            .put("url", "https://121.40.147.125/updates/stable/RP-local-2.9.027.apk");
    }

    public static void main(String[] args) throws Exception {
        UpdatePolicy.validate(release(), "com.rphub.local", 290);
        for (String field : new String[]{"packageName", "channel", "sha256", "url", "versionCode", "size"}) {
            JSONObject item = release();
            item.put(field, field.equals("versionCode") ? 289 : field.equals("size") ? -1 : "wrong");
            try { UpdatePolicy.validate(item, "com.rphub.local", 290); throw new AssertionError(field); }
            catch (IOException expected) { }
        }
        UpdatePolicy.verify(new ByteArrayInputStream("abc".getBytes("UTF-8")), 3, release().getString("sha256"));
        try {
            UpdatePolicy.verify(new ByteArrayInputStream("abd".getBytes("UTF-8")), 3, release().getString("sha256"));
            throw new AssertionError("Corrupt package accepted");
        } catch (IOException expected) { }
        try {
            UpdatePolicy.verify(new ByteArrayInputStream("abc".getBytes("UTF-8")), 4, release().getString("sha256"));
            throw new AssertionError("Truncated package accepted");
        } catch (IOException expected) { }
        System.out.println("Update policy: channel, package, version, source, length and SHA256 passed");
    }
}
