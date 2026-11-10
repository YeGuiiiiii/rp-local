package com.rphub.app;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.nio.file.Files;

public final class TextFileIOTest {
    public static void main(String[] args) throws Exception {
        File target = Files.createTempFile("rp-text-file-", ".json").toFile();
        try {
            String large = "x".repeat(64 * 1024 * 1024);
            try (FileOutputStream output = new FileOutputStream(target)) {
                TextFileIO.writeUtf8(large, output);
            }
            try (FileInputStream input = new FileInputStream(target)) {
                if (!TextFileIO.matches(input, large))
                    throw new AssertionError("Matching large content was reported as changed");
            }
            try (FileInputStream input = new FileInputStream(target)) {
                if (TextFileIO.matches(input, "different"))
                    throw new AssertionError("Different content was reported as unchanged");
            }
            String boundary = "x".repeat(8191) + "🐉";
            try (FileOutputStream output = new FileOutputStream(target)) {
                TextFileIO.writeUtf8(boundary, output);
            }
            try (FileInputStream input = new FileInputStream(target)) {
                if (!TextFileIO.matches(input, boundary))
                    throw new AssertionError("UTF-8 writer split a surrogate pair at its chunk boundary");
            }
        } finally {
            Files.deleteIfExists(target.toPath());
        }
        System.out.println("Large and Unicode text files were compared and written within a small heap.");
    }
}
