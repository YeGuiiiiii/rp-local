package com.rphub.app;

import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.io.OutputStreamWriter;
import java.io.Reader;
import java.io.Writer;
import java.nio.charset.StandardCharsets;

public final class TextFileIO {
    private TextFileIO() {}

    public static boolean matches(InputStream input, String expected) throws IOException {
        try (Reader reader = new InputStreamReader(input, StandardCharsets.UTF_8)) {
            char[] buffer = new char[8192];
            int offset = 0;
            for (int count; (count = reader.read(buffer)) != -1;) {
                if (offset + count > expected.length()) return false;
                for (int i = 0; i < count; i++) {
                    if (buffer[i] != expected.charAt(offset + i)) return false;
                }
                offset += count;
            }
            return offset == expected.length();
        }
    }

    public static void writeUtf8(String value, OutputStream output) throws IOException {
        Writer writer = new OutputStreamWriter(output, StandardCharsets.UTF_8);
        for (int offset = 0; offset < value.length(); offset += 8192)
            writer.write(value, offset, Math.min(8192, value.length() - offset));
        writer.flush();
    }
}
