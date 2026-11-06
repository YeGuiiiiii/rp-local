package com.rphub.app;

import java.io.File;
import java.io.IOException;

public final class LocalPaths {
    private LocalPaths() {}

    public static File resolve(File personal, File shared, String relative) throws IOException {
        if (relative == null || relative.length() > 600 || relative.indexOf('\\') >= 0
            || relative.indexOf('\0') >= 0) throw new IOException("Invalid path");
        String[] parts = relative.split("/", -1);
        File root;
        if ("个人数据".equals(parts[0])) root = personal;
        else if ("角色卡数据".equals(parts[0]) || "图片".equals(parts[0])) root = new File(shared, parts[0]);
        else throw new IOException("Invalid category");
        File result = root;
        for (int i = 1; i < parts.length; i++) {
            if (parts[i].isEmpty() || ".".equals(parts[i]) || "..".equals(parts[i]))
                throw new IOException("Invalid path");
            result = new File(result, parts[i]);
        }
        String base = root.getCanonicalPath();
        String target = result.getCanonicalPath();
        if (!target.equals(base) && !target.startsWith(base + File.separator))
            throw new IOException("Path outside storage");
        return result;
    }
}
