.class Lcom/rphub/app/MainActivity$8;
.super Landroid/webkit/WebChromeClient;
.source "MainActivity.java"


# annotations
.annotation system Ldalvik/annotation/EnclosingMethod;
    value = Lcom/rphub/app/MainActivity;->onCreate(Landroid/os/Bundle;)V
.end annotation

.annotation system Ldalvik/annotation/InnerClass;
    accessFlags = 0x0
    name = null
.end annotation


# instance fields
.field final synthetic this$0:Lcom/rphub/app/MainActivity;


# direct methods
.method constructor <init>(Lcom/rphub/app/MainActivity;)V
    .locals 0

    .line 1
    iput-object p1, p0, Lcom/rphub/app/MainActivity$8;->this$0:Lcom/rphub/app/MainActivity;

    .line 1241
    invoke-direct {p0}, Landroid/webkit/WebChromeClient;-><init>()V

    return-void
.end method

.method static synthetic access$0(Lcom/rphub/app/MainActivity$8;)Lcom/rphub/app/MainActivity;
    .locals 0

    .line 1241
    iget-object p0, p0, Lcom/rphub/app/MainActivity$8;->this$0:Lcom/rphub/app/MainActivity;

    return-object p0
.end method


# virtual methods
.method public onConsoleMessage(Landroid/webkit/ConsoleMessage;)Z
    .locals 4

    if-eqz p1, :cond_0

    .line 1282
    invoke-virtual {p1}, Landroid/webkit/ConsoleMessage;->messageLevel()Landroid/webkit/ConsoleMessage$MessageLevel;

    move-result-object v0

    sget-object v1, Landroid/webkit/ConsoleMessage$MessageLevel;->ERROR:Landroid/webkit/ConsoleMessage$MessageLevel;

    if-ne v0, v1, :cond_0

    .line 1283
    iget-object v0, p0, Lcom/rphub/app/MainActivity$8;->this$0:Lcom/rphub/app/MainActivity;

    invoke-virtual {p1}, Landroid/webkit/ConsoleMessage;->message()Ljava/lang/String;

    move-result-object v1

    invoke-virtual {p1}, Landroid/webkit/ConsoleMessage;->sourceId()Ljava/lang/String;

    move-result-object v2

    invoke-virtual {p1}, Landroid/webkit/ConsoleMessage;->lineNumber()I

    move-result p1

    const-string v3, "console"

    invoke-static {v0, v3, v1, v2, p1}, Lcom/rphub/app/MainActivity;->access$11(Lcom/rphub/app/MainActivity;Ljava/lang/String;Ljava/lang/String;Ljava/lang/String;I)V

    :cond_0
    const/4 p1, 0x0

    return p1
.end method

.method public onCreateWindow(Landroid/webkit/WebView;ZZLandroid/os/Message;)Z
    .locals 1

    const/4 p2, 0x0

    .line 1249
    :try_start_0
    new-instance p3, Landroid/webkit/WebView;

    invoke-virtual {p1}, Landroid/webkit/WebView;->getContext()Landroid/content/Context;

    move-result-object p1

    invoke-direct {p3, p1}, Landroid/webkit/WebView;-><init>(Landroid/content/Context;)V

    .line 1250
    invoke-virtual {p3}, Landroid/webkit/WebView;->getSettings()Landroid/webkit/WebSettings;

    move-result-object p1

    invoke-virtual {p1, p2}, Landroid/webkit/WebSettings;->setJavaScriptEnabled(Z)V

    .line 1251
    new-instance p1, Lcom/rphub/app/MainActivity$8$1;

    invoke-direct {p1, p0, p3}, Lcom/rphub/app/MainActivity$8$1;-><init>(Lcom/rphub/app/MainActivity$8;Landroid/webkit/WebView;)V

    invoke-virtual {p3, p1}, Landroid/webkit/WebView;->setWebViewClient(Landroid/webkit/WebViewClient;)V

    .line 1270
    iget-object p1, p4, Landroid/os/Message;->obj:Ljava/lang/Object;

    check-cast p1, Landroid/webkit/WebView$WebViewTransport;

    .line 1271
    invoke-virtual {p1, p3}, Landroid/webkit/WebView$WebViewTransport;->setWebView(Landroid/webkit/WebView;)V

    .line 1272
    invoke-virtual {p4}, Landroid/os/Message;->sendToTarget()V
    :try_end_0
    .catchall {:try_start_0 .. :try_end_0} :catchall_0

    const/4 p1, 0x1

    return p1

    :catchall_0
    move-exception p1

    .line 1275
    iget-object p3, p0, Lcom/rphub/app/MainActivity$8;->this$0:Lcom/rphub/app/MainActivity;

    new-instance p4, Ljava/lang/StringBuilder;

    const-string v0, "onCreateWindow failed: "

    invoke-direct {p4, v0}, Ljava/lang/StringBuilder;-><init>(Ljava/lang/String;)V

    invoke-virtual {p4, p1}, Ljava/lang/StringBuilder;->append(Ljava/lang/Object;)Ljava/lang/StringBuilder;

    invoke-virtual {p4}, Ljava/lang/StringBuilder;->toString()Ljava/lang/String;

    move-result-object p1

    const-string p4, "newWindow"

    const-string v0, ""

    invoke-static {p3, p4, p1, v0, p2}, Lcom/rphub/app/MainActivity;->access$11(Lcom/rphub/app/MainActivity;Ljava/lang/String;Ljava/lang/String;Ljava/lang/String;I)V

    return p2
.end method

.method public onJsAlert(Landroid/webkit/WebView;Ljava/lang/String;Ljava/lang/String;Landroid/webkit/JsResult;)Z
    .locals 0

    .line 1290
    invoke-virtual {p4}, Landroid/webkit/JsResult;->confirm()V

    const/4 p1, 0x1

    return p1
.end method

.method public onJsConfirm(Landroid/webkit/WebView;Ljava/lang/String;Ljava/lang/String;Landroid/webkit/JsResult;)Z
    .locals 0

    .line 1295
    invoke-virtual {p4}, Landroid/webkit/JsResult;->confirm()V

    const/4 p1, 0x1

    return p1
.end method

.method public onJsPrompt(Landroid/webkit/WebView;Ljava/lang/String;Ljava/lang/String;Ljava/lang/String;Landroid/webkit/JsPromptResult;)Z
    .locals 0

    .line 1300
    invoke-virtual {p5}, Landroid/webkit/JsPromptResult;->confirm()V

    const/4 p1, 0x1

    return p1
.end method

.method public onShowFileChooser(Landroid/webkit/WebView;Landroid/webkit/ValueCallback;Landroid/webkit/WebChromeClient$FileChooserParams;)Z
    .locals 3
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

    .line 1305
    iget-object p1, p0, Lcom/rphub/app/MainActivity$8;->this$0:Lcom/rphub/app/MainActivity;

    invoke-static {p1}, Lcom/rphub/app/MainActivity;->access$34(Lcom/rphub/app/MainActivity;)Landroid/webkit/ValueCallback;

    move-result-object p1

    const/4 v0, 0x0

    if-eqz p1, :cond_0

    .line 1308
    :try_start_0
    iget-object p1, p0, Lcom/rphub/app/MainActivity$8;->this$0:Lcom/rphub/app/MainActivity;

    invoke-static {p1}, Lcom/rphub/app/MainActivity;->access$34(Lcom/rphub/app/MainActivity;)Landroid/webkit/ValueCallback;

    move-result-object p1

    invoke-interface {p1, v0}, Landroid/webkit/ValueCallback;->onReceiveValue(Ljava/lang/Object;)V
    :try_end_0
    .catchall {:try_start_0 .. :try_end_0} :catchall_0

    .line 1311
    :catchall_0
    iget-object p1, p0, Lcom/rphub/app/MainActivity$8;->this$0:Lcom/rphub/app/MainActivity;

    invoke-static {p1, v0}, Lcom/rphub/app/MainActivity;->access$35(Lcom/rphub/app/MainActivity;Landroid/webkit/ValueCallback;)V

    .line 1313
    :cond_0
    iget-object p1, p0, Lcom/rphub/app/MainActivity$8;->this$0:Lcom/rphub/app/MainActivity;

    invoke-static {p1, p2}, Lcom/rphub/app/MainActivity;->access$35(Lcom/rphub/app/MainActivity;Landroid/webkit/ValueCallback;)V

    .line 1315
    :try_start_1
    iget-object p1, p0, Lcom/rphub/app/MainActivity$8;->this$0:Lcom/rphub/app/MainActivity;

    invoke-static {p1, p3}, Lcom/rphub/app/MainActivity;->access$36(Lcom/rphub/app/MainActivity;Landroid/webkit/WebChromeClient$FileChooserParams;)Landroid/content/Intent;

    move-result-object p1

    .line 1316
    iget-object p3, p0, Lcom/rphub/app/MainActivity$8;->this$0:Lcom/rphub/app/MainActivity;

    const/16 v1, 0x3e9

    invoke-virtual {p3, p1, v1}, Lcom/rphub/app/MainActivity;->startActivityForResult(Landroid/content/Intent;I)V
    :try_end_1
    .catchall {:try_start_1 .. :try_end_1} :catchall_1

    const/4 p1, 0x1

    return p1

    :catchall_1
    move-exception p1

    .line 1321
    iget-object p3, p0, Lcom/rphub/app/MainActivity$8;->this$0:Lcom/rphub/app/MainActivity;

    new-instance v1, Ljava/lang/StringBuilder;

    const-string v2, "fileChooser error: "

    invoke-direct {v1, v2}, Ljava/lang/StringBuilder;-><init>(Ljava/lang/String;)V

    invoke-virtual {p1}, Ljava/lang/Throwable;->getMessage()Ljava/lang/String;

    move-result-object v2

    if-nez v2, :cond_1

    invoke-virtual {p1}, Ljava/lang/Throwable;->toString()Ljava/lang/String;

    move-result-object p1

    goto :goto_0

    :cond_1
    invoke-virtual {p1}, Ljava/lang/Throwable;->getMessage()Ljava/lang/String;

    move-result-object p1

    :goto_0
    invoke-virtual {v1, p1}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    invoke-virtual {v1}, Ljava/lang/StringBuilder;->toString()Ljava/lang/String;

    move-result-object p1

    invoke-static {p3, p1}, Lcom/rphub/app/MainActivity;->access$5(Lcom/rphub/app/MainActivity;Ljava/lang/String;)V

    .line 1322
    iget-object p1, p0, Lcom/rphub/app/MainActivity$8;->this$0:Lcom/rphub/app/MainActivity;

    invoke-static {p1, v0}, Lcom/rphub/app/MainActivity;->access$35(Lcom/rphub/app/MainActivity;Landroid/webkit/ValueCallback;)V

    .line 1324
    :try_start_2
    invoke-interface {p2, v0}, Landroid/webkit/ValueCallback;->onReceiveValue(Ljava/lang/Object;)V
    :try_end_2
    .catchall {:try_start_2 .. :try_end_2} :catchall_2

    :catchall_2
    const/4 p1, 0x0

    return p1
.end method
