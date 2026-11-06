package com.rphub.app;

public final class WebViewVersionTest {
    public static void main(String[] args) {
        if (!WebViewVersion.tooOld("Mozilla Chrome/84.0.4147.125 Mobile")) throw new AssertionError("84 must warn");
        if (WebViewVersion.tooOld("Mozilla Chrome/85.0.4183.81 Mobile")) throw new AssertionError("85 must load");
        if (WebViewVersion.tooOld("Mozilla Chrome/130.0.0.0 Mobile")) throw new AssertionError("Modern engine");
        if (WebViewVersion.tooOld(null) || WebViewVersion.tooOld("Unknown")) throw new AssertionError("Unknown must not block");
        System.out.println("WebView version boundary 84/85, modern and unknown cases passed.");
    }
}
