.class Lcom/rphub/app/MainActivity$17;
.super Landroid/webkit/WebChromeClient;
.source "MainActivity.java"


# annotations
.annotation system Ldalvik/annotation/EnclosingMethod;
    value = Lcom/rphub/app/MainActivity;->showLighthouseLayer(Ljava/lang/String;)V
.end annotation

.annotation system Ldalvik/annotation/InnerClass;
    accessFlags = 0x0
    name = null
.end annotation


# instance fields
.field final synthetic this$0:Lcom/rphub/app/MainActivity;

.field private final synthetic val$wv:Landroid/webkit/WebView;


# direct methods
.method constructor <init>(Lcom/rphub/app/MainActivity;Landroid/webkit/WebView;)V
    .locals 0

    .line 1
    iput-object p1, p0, Lcom/rphub/app/MainActivity$17;->this$0:Lcom/rphub/app/MainActivity;

    iput-object p2, p0, Lcom/rphub/app/MainActivity$17;->val$wv:Landroid/webkit/WebView;

    .line 2140
    invoke-direct {p0}, Landroid/webkit/WebChromeClient;-><init>()V

    return-void
.end method

.method static synthetic access$0(Lcom/rphub/app/MainActivity$17;)Lcom/rphub/app/MainActivity;
    .locals 0

    .line 2140
    iget-object p0, p0, Lcom/rphub/app/MainActivity$17;->this$0:Lcom/rphub/app/MainActivity;

    return-object p0
.end method


# virtual methods
.method public onCreateWindow(Landroid/webkit/WebView;ZZLandroid/os/Message;)Z
    .locals 1

    const/4 p2, 0x0

    .line 2145
    :try_start_0
    new-instance p3, Landroid/webkit/WebView;

    invoke-virtual {p1}, Landroid/webkit/WebView;->getContext()Landroid/content/Context;

    move-result-object p1

    invoke-direct {p3, p1}, Landroid/webkit/WebView;-><init>(Landroid/content/Context;)V

    .line 2146
    invoke-virtual {p3}, Landroid/webkit/WebView;->getSettings()Landroid/webkit/WebSettings;

    move-result-object p1

    invoke-virtual {p1, p2}, Landroid/webkit/WebSettings;->setJavaScriptEnabled(Z)V

    .line 2147
    new-instance p1, Lcom/rphub/app/MainActivity$17$1;

    iget-object v0, p0, Lcom/rphub/app/MainActivity$17;->val$wv:Landroid/webkit/WebView;

    invoke-direct {p1, p0, v0, p3}, Lcom/rphub/app/MainActivity$17$1;-><init>(Lcom/rphub/app/MainActivity$17;Landroid/webkit/WebView;Landroid/webkit/WebView;)V

    invoke-virtual {p3, p1}, Landroid/webkit/WebView;->setWebViewClient(Landroid/webkit/WebViewClient;)V

    .line 2181
    iget-object p1, p4, Landroid/os/Message;->obj:Ljava/lang/Object;

    check-cast p1, Landroid/webkit/WebView$WebViewTransport;

    .line 2182
    invoke-virtual {p1, p3}, Landroid/webkit/WebView$WebViewTransport;->setWebView(Landroid/webkit/WebView;)V

    .line 2183
    invoke-virtual {p4}, Landroid/os/Message;->sendToTarget()V
    :try_end_0
    .catchall {:try_start_0 .. :try_end_0} :catchall_0

    const/4 p1, 0x1

    return p1

    :catchall_0
    move-exception p1

    .line 2186
    iget-object p3, p0, Lcom/rphub/app/MainActivity$17;->this$0:Lcom/rphub/app/MainActivity;

    new-instance p4, Ljava/lang/StringBuilder;

    const-string v0, "onCreateWindow failed: "

    invoke-direct {p4, v0}, Ljava/lang/StringBuilder;-><init>(Ljava/lang/String;)V

    invoke-virtual {p4, p1}, Ljava/lang/StringBuilder;->append(Ljava/lang/Object;)Ljava/lang/StringBuilder;

    invoke-virtual {p4}, Ljava/lang/StringBuilder;->toString()Ljava/lang/String;

    move-result-object p1

    const-string p4, "lighthouse"

    const-string v0, ""

    invoke-static {p3, p4, p1, v0, p2}, Lcom/rphub/app/MainActivity;->access$11(Lcom/rphub/app/MainActivity;Ljava/lang/String;Ljava/lang/String;Ljava/lang/String;I)V

    return p2
.end method

.method public onShowFileChooser(Landroid/webkit/WebView;Landroid/webkit/ValueCallback;Landroid/webkit/WebChromeClient$FileChooserParams;)Z
    .locals 4
    .annotation system Ldalvik/annotation/Signature;
        value = {
            "(",
            "Landroid/webkit/WebView;",
            "Landroid/webkit/ValueCallback<",
            "[",
            "Landroid/net/Uri;",
            ">;",
            "Landroid/webkit/WebChromeClient$FileChooserParams;",
            ")Z"
        }
    .end annotation

    .line 2201
    iget-object p1, p0, Lcom/rphub/app/MainActivity$17;->this$0:Lcom/rphub/app/MainActivity;

    invoke-static {p1}, Lcom/rphub/app/MainActivity;->access$42(Lcom/rphub/app/MainActivity;)Landroid/webkit/ValueCallback;

    move-result-object p1

    const/4 v0, 0x0

    if-eqz p1, :cond_0

    .line 2203
    :try_start_0
    iget-object p1, p0, Lcom/rphub/app/MainActivity$17;->this$0:Lcom/rphub/app/MainActivity;

    invoke-static {p1}, Lcom/rphub/app/MainActivity;->access$42(Lcom/rphub/app/MainActivity;)Landroid/webkit/ValueCallback;

    move-result-object p1

    invoke-interface {p1, v0}, Landroid/webkit/ValueCallback;->onReceiveValue(Ljava/lang/Object;)V
    :try_end_0
    .catchall {:try_start_0 .. :try_end_0} :catchall_0

    .line 2206
    :catchall_0
    iget-object p1, p0, Lcom/rphub/app/MainActivity$17;->this$0:Lcom/rphub/app/MainActivity;

    invoke-static {p1, v0}, Lcom/rphub/app/MainActivity;->access$43(Lcom/rphub/app/MainActivity;Landroid/webkit/ValueCallback;)V

    .line 2208
    :cond_0
    iget-object p1, p0, Lcom/rphub/app/MainActivity$17;->this$0:Lcom/rphub/app/MainActivity;

    invoke-static {p1, p2}, Lcom/rphub/app/MainActivity;->access$43(Lcom/rphub/app/MainActivity;Landroid/webkit/ValueCallback;)V

    .line 2210
    :try_start_1
    iget-object p1, p0, Lcom/rphub/app/MainActivity$17;->this$0:Lcom/rphub/app/MainActivity;

    invoke-static {p1, p3}, Lcom/rphub/app/MainActivity;->access$36(Lcom/rphub/app/MainActivity;Landroid/webkit/WebChromeClient$FileChooserParams;)Landroid/content/Intent;

    move-result-object p1

    .line 2211
    iget-object p3, p0, Lcom/rphub/app/MainActivity$17;->this$0:Lcom/rphub/app/MainActivity;

    const/16 v1, 0x3ec

    invoke-virtual {p3, p1, v1}, Lcom/rphub/app/MainActivity;->startActivityForResult(Landroid/content/Intent;I)V
    :try_end_1
    .catchall {:try_start_1 .. :try_end_1} :catchall_1

    const/4 p1, 0x1

    return p1

    :catchall_1
    move-exception p1

    .line 2214
    iget-object p3, p0, Lcom/rphub/app/MainActivity$17;->this$0:Lcom/rphub/app/MainActivity;

    new-instance v1, Ljava/lang/StringBuilder;

    const-string v2, "fileChooser error: "

    invoke-direct {v1, v2}, Ljava/lang/StringBuilder;-><init>(Ljava/lang/String;)V

    invoke-virtual {v1, p1}, Ljava/lang/StringBuilder;->append(Ljava/lang/Object;)Ljava/lang/StringBuilder;

    invoke-virtual {v1}, Ljava/lang/StringBuilder;->toString()Ljava/lang/String;

    move-result-object p1

    const-string v1, "lighthouse"

    const-string v2, ""

    const/4 v3, 0x0

    invoke-static {p3, v1, p1, v2, v3}, Lcom/rphub/app/MainActivity;->access$11(Lcom/rphub/app/MainActivity;Ljava/lang/String;Ljava/lang/String;Ljava/lang/String;I)V

    .line 2215
    iget-object p1, p0, Lcom/rphub/app/MainActivity$17;->this$0:Lcom/rphub/app/MainActivity;

    invoke-static {p1, v0}, Lcom/rphub/app/MainActivity;->access$43(Lcom/rphub/app/MainActivity;Landroid/webkit/ValueCallback;)V

    .line 2217
    :try_start_2
    invoke-interface {p2, v0}, Landroid/webkit/ValueCallback;->onReceiveValue(Ljava/lang/Object;)V
    :try_end_2
    .catchall {:try_start_2 .. :try_end_2} :catchall_2

    :catchall_2
    return v3
.end method
