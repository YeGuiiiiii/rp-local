package com.rphub.app;

import android.app.Activity;
import android.os.Handler;
import android.os.Looper;
import android.os.SystemClock;
import android.widget.Toast;

public final class RenderRecovery {
    private RenderRecovery() {}

    public static void recreate(final Activity activity) {
        long delay = RecoveryWindow.nextDelay(SystemClock.elapsedRealtime());
        if (activity.isFinishing() || activity.isDestroyed()) return;
        if (delay > 0) Toast.makeText(activity, "内存紧张，稍后自动恢复", Toast.LENGTH_LONG).show();
        new Handler(Looper.getMainLooper()).postDelayed(new Runnable() {
            @Override public void run() {
                if (!activity.isFinishing() && !activity.isDestroyed()) activity.recreate();
            }
        }, delay);
    }
}

final class RecoveryWindow {
    private static long lastCrash;
    private static int crashCount;

    static synchronized long nextDelay(long now) {
        if (now - lastCrash >= 60000) crashCount = 0;
        lastCrash = now;
        return ++crashCount > 3 ? 60000 : 0;
    }
}
