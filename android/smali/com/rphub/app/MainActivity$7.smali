.class Lcom/rphub/app/MainActivity$7;
.super Landroid/webkit/WebViewClient;
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
    iput-object p1, p0, Lcom/rphub/app/MainActivity$7;->this$0:Lcom/rphub/app/MainActivity;

    .line 1137
    invoke-direct {p0}, Landroid/webkit/WebViewClient;-><init>()V

    return-void
.end method


# virtual methods
.method public onPageFinished(Landroid/webkit/WebView;Ljava/lang/String;)V
    .locals 1

    .line 1189
    invoke-super {p0, p1, p2}, Landroid/webkit/WebViewClient;->onPageFinished(Landroid/webkit/WebView;Ljava/lang/String;)V

    .line 1200
    sget p1, Landroid/os/Build$VERSION;->SDK_INT:I

    const/16 p2, 0x1e

    if-lt p1, p2, :cond_0

    .line 1202
    :try_start_0
    iget-object p1, p0, Lcom/rphub/app/MainActivity$7;->this$0:Lcom/rphub/app/MainActivity;

    invoke-virtual {p1}, Lcom/rphub/app/MainActivity;->getWindow()Landroid/view/Window;

    move-result-object p1

    invoke-virtual {p1}, Landroid/view/Window;->getDecorView()Landroid/view/View;

    move-result-object p1

    invoke-virtual {p1}, Landroid/view/View;->getRootWindowInsets()Landroid/view/WindowInsets;

    move-result-object p1

    if-eqz p1, :cond_0

    .line 1204
    iget-object p2, p0, Lcom/rphub/app/MainActivity$7;->this$0:Lcom/rphub/app/MainActivity;

    invoke-static {}, Landroid/view/WindowInsets$Type;->ime()I

    move-result v0

    invoke-virtual {p1, v0}, Landroid/view/WindowInsets;->getInsets(I)Landroid/graphics/Insets;

    move-result-object p1

    iget p1, p1, Landroid/graphics/Insets;->bottom:I

    invoke-static {p2, p1}, Lcom/rphub/app/MainActivity;->access$6(Lcom/rphub/app/MainActivity;I)V
    :try_end_0
    .catchall {:try_start_0 .. :try_end_0} :catchall_0

    :catchall_0
    :cond_0
    return-void
.end method

.method public onPageStarted(Landroid/webkit/WebView;Ljava/lang/String;Landroid/graphics/Bitmap;)V
    .locals 0

    .line 1154
    invoke-super {p0, p1, p2, p3}, Landroid/webkit/WebViewClient;->onPageStarted(Landroid/webkit/WebView;Ljava/lang/String;Landroid/graphics/Bitmap;)V

    return-void
.end method

.method public onReceivedError(Landroid/webkit/WebView;ILjava/lang/String;Ljava/lang/String;)V
    .locals 1

    .line 1145
    invoke-super {p0, p1, p2, p3, p4}, Landroid/webkit/WebViewClient;->onReceivedError(Landroid/webkit/WebView;ILjava/lang/String;Ljava/lang/String;)V

    const-string p1, "https://sta1n156.github.io/RP-Hub/"

    .line 1146
    invoke-virtual {p1, p4}, Ljava/lang/String;->equals(Ljava/lang/Object;)Z

    move-result p1

    if-eqz p1, :cond_0

    .line 1147
    iget-object p1, p0, Lcom/rphub/app/MainActivity$7;->this$0:Lcom/rphub/app/MainActivity;

    new-instance p4, Ljava/lang/StringBuilder;

    const-string v0, "\u9875\u9762\u52a0\u8f7d\u5931\u8d25: "

    invoke-direct {p4, v0}, Ljava/lang/StringBuilder;-><init>(Ljava/lang/String;)V

    invoke-virtual {p4, p2}, Ljava/lang/StringBuilder;->append(I)Ljava/lang/StringBuilder;

    const-string p2, " "

    invoke-virtual {p4, p2}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    invoke-virtual {p4, p3}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    invoke-virtual {p4}, Ljava/lang/StringBuilder;->toString()Ljava/lang/String;

    move-result-object p2

    invoke-static {p1, p2}, Lcom/rphub/app/MainActivity;->access$23(Lcom/rphub/app/MainActivity;Ljava/lang/String;)V

    .line 1148
    iget-object p1, p0, Lcom/rphub/app/MainActivity$7;->this$0:Lcom/rphub/app/MainActivity;

    invoke-static {p1, p3}, Lcom/rphub/app/MainActivity;->access$24(Lcom/rphub/app/MainActivity;Ljava/lang/String;)V

    :cond_0
    return-void
.end method

.method public onRenderProcessGone(Landroid/webkit/WebView;Landroid/webkit/RenderProcessGoneDetail;)Z
    .locals 3

    if-eqz p2, :cond_0

    .line 1216
    invoke-virtual {p2}, Ljava/lang/Object;->toString()Ljava/lang/String;

    move-result-object p2

    goto :goto_0

    :cond_0
    const-string p2, "unknown"

    .line 1217
    :goto_0
    iget-object v0, p0, Lcom/rphub/app/MainActivity$7;->this$0:Lcom/rphub/app/MainActivity;

    new-instance v1, Ljava/lang/StringBuilder;

    const-string v2, "WebView \u6e32\u67d3\u8fdb\u7a0b\u5d29\u6e83\uff0c\u81ea\u52a8\u6062\u590d: "

    invoke-direct {v1, v2}, Ljava/lang/StringBuilder;-><init>(Ljava/lang/String;)V

    invoke-virtual {v1, p2}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    invoke-virtual {v1}, Ljava/lang/StringBuilder;->toString()Ljava/lang/String;

    move-result-object p2

    invoke-static {v0, p2}, Lcom/rphub/app/MainActivity;->access$23(Lcom/rphub/app/MainActivity;Ljava/lang/String;)V

    .line 1222
    iget-object p2, p0, Lcom/rphub/app/MainActivity$7;->this$0:Lcom/rphub/app/MainActivity;

    invoke-static {p2}, Lcom/rphub/app/MainActivity;->access$21(Lcom/rphub/app/MainActivity;)Ljava/util/HashMap;

    move-result-object p2

    monitor-enter p2

    .line 1223
    :try_start_0
    iget-object v0, p0, Lcom/rphub/app/MainActivity$7;->this$0:Lcom/rphub/app/MainActivity;

    invoke-static {v0}, Lcom/rphub/app/MainActivity;->access$21(Lcom/rphub/app/MainActivity;)Ljava/util/HashMap;

    move-result-object v0

    invoke-virtual {v0}, Ljava/util/HashMap;->values()Ljava/util/Collection;

    move-result-object v0

    invoke-interface {v0}, Ljava/util/Collection;->iterator()Ljava/util/Iterator;

    move-result-object v0

    :goto_1
    invoke-interface {v0}, Ljava/util/Iterator;->hasNext()Z

    move-result v1

    if-nez v1, :cond_1

    .line 1226
    iget-object v0, p0, Lcom/rphub/app/MainActivity$7;->this$0:Lcom/rphub/app/MainActivity;

    invoke-static {v0}, Lcom/rphub/app/MainActivity;->access$21(Lcom/rphub/app/MainActivity;)Ljava/util/HashMap;

    move-result-object v0

    invoke-virtual {v0}, Ljava/util/HashMap;->clear()V

    .line 1222
    monitor-exit p2
    :try_end_0
    .catchall {:try_start_0 .. :try_end_0} :catchall_0

    .line 1229
    new-instance p2, Lcom/rphub/app/MainActivity$7$1;

    invoke-direct {p2, p0, p1}, Lcom/rphub/app/MainActivity$7$1;-><init>(Lcom/rphub/app/MainActivity$7;Landroid/webkit/WebView;)V

    const-wide/16 v0, 0x258

    invoke-virtual {p1, p2, v0, v1}, Landroid/webkit/WebView;->postDelayed(Ljava/lang/Runnable;J)Z

    const/4 p1, 0x1

    return p1

    .line 1223
    :cond_1
    :try_start_1
    invoke-interface {v0}, Ljava/util/Iterator;->next()Ljava/lang/Object;

    move-result-object v1

    check-cast v1, Lcom/rphub/app/MainActivity$BackupWriteSession;

    .line 1224
    iget-object v2, p0, Lcom/rphub/app/MainActivity$7;->this$0:Lcom/rphub/app/MainActivity;

    invoke-static {v2, v1}, Lcom/rphub/app/MainActivity;->access$22(Lcom/rphub/app/MainActivity;Lcom/rphub/app/MainActivity$BackupWriteSession;)V

    goto :goto_1

    :catchall_0
    move-exception p1

    .line 1222
    monitor-exit p2
    :try_end_1
    .catchall {:try_start_1 .. :try_end_1} :catchall_0

    goto :goto_3

    :goto_2
    throw p1

    :goto_3
    goto :goto_2
.end method

.method public shouldInterceptRequest(Landroid/webkit/WebView;Landroid/webkit/WebResourceRequest;)Landroid/webkit/WebResourceResponse;
    .locals 0

    .line 1140
    iget-object p1, p0, Lcom/rphub/app/MainActivity$7;->this$0:Lcom/rphub/app/MainActivity;

    invoke-interface {p2}, Landroid/webkit/WebResourceRequest;->getUrl()Landroid/net/Uri;

    move-result-object p2

    invoke-virtual {p2}, Landroid/net/Uri;->toString()Ljava/lang/String;

    move-result-object p2

    invoke-static {p1, p2}, Lcom/rphub/app/PatchEngine;->intercept(Landroid/content/Context;Ljava/lang/String;)Landroid/webkit/WebResourceResponse;

    move-result-object p1

    return-object p1
.end method
