package com.rphub.app;

import android.content.Context;
import android.content.res.ColorStateList;
import android.graphics.Color;
import android.graphics.drawable.ColorDrawable;
import android.graphics.drawable.Drawable;
import android.graphics.drawable.RippleDrawable;
import android.view.Gravity;
import android.view.View;
import android.widget.FrameLayout;
import android.widget.ImageButton;
import android.widget.ImageView;
import android.widget.TextView;
import java.io.InputStream;
import java.io.IOException;

public final class OnlineReturn {
    private OnlineReturn() {}

    public static void attach(Context context, FrameLayout layer, View.OnClickListener listener) {
        float density = context.getResources().getDisplayMetrics().density;
        ImageButton button = new ImageButton(context);
        boolean dark = context.getSharedPreferences("rphub_theme", 0).getBoolean("dark", false);
        int barHeight = Math.round(60 * density);
        View content = layer.getChildAt(0);
        FrameLayout.LayoutParams contentParams = (FrameLayout.LayoutParams) content.getLayoutParams();
        contentParams.topMargin = barHeight;
        content.setLayoutParams(contentParams);
        layer.setBackgroundColor(dark ? 0xff2c2935 : 0xfffffefa);
        TextView title = new TextView(context);
        title.setText("\u706f\u5854");
        title.setTextSize(14);
        title.setTextColor(dark ? 0xffe4dbe9 : 0xff47414d);
        title.setGravity(Gravity.CENTER_VERTICAL);
        FrameLayout.LayoutParams titleParams = new FrameLayout.LayoutParams(-1, barHeight);
        titleParams.leftMargin = Math.round(72 * density);
        layer.addView(title, titleParams);
        String asset = "local-site/assets/images/chenyue/close" + (dark ? "-night" : "") + ".webp";
        try (InputStream stream = context.getAssets().open(asset)) {
            button.setImageDrawable(Drawable.createFromStream(stream, asset));
        } catch (IOException error) {
            button.setImageResource(android.R.drawable.ic_menu_close_clear_cancel);
        }
        button.setScaleType(ImageView.ScaleType.FIT_CENTER);
        int padding = Math.round(2 * density);
        button.setPadding(padding, padding, padding, padding);
        button.setBackground(new RippleDrawable(ColorStateList.valueOf(0x308e4e60), null, new ColorDrawable(Color.WHITE)));
        button.setContentDescription("\u8fd4\u56de\u672c\u5730\u7248");
        button.setOnClickListener(listener);
        FrameLayout.LayoutParams params = new FrameLayout.LayoutParams(
            Math.round(48 * density), Math.round(48 * density), Gravity.TOP | Gravity.LEFT);
        params.topMargin = Math.round(6 * density);
        params.leftMargin = Math.round(12 * density);
        layer.addView(button, params);
    }
}
