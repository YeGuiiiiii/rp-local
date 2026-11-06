package com.rphub.app;

public final class RenderRecoveryTest {
    public static void main(String[] args) {
        long[] times = {1000, 2000, 3000, 4000, 64000, 65000};
        long[] expected = {0, 0, 0, 60000, 0, 0};
        for (int i = 0; i < times.length; i++) {
            if (RecoveryWindow.nextDelay(times[i]) != expected[i])
                throw new AssertionError("Wrong recovery delay at " + times[i]);
        }
        System.out.println("Renderer recovery stops repeated reloads and resumes after cooldown.");
    }
}
