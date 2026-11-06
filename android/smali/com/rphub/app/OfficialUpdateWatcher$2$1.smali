.class Lcom/rphub/app/OfficialUpdateWatcher$2$1;
.super Ljava/lang/Object;
.source "OfficialUpdateWatcher.java"

# interfaces
.implements Landroid/content/DialogInterface$OnClickListener;


# annotations
.annotation system Ldalvik/annotation/EnclosingMethod;
    value = Lcom/rphub/app/OfficialUpdateWatcher$2;->run()V
.end annotation

.annotation system Ldalvik/annotation/InnerClass;
    accessFlags = 0x0
    name = null
.end annotation


# instance fields
.field final synthetic this$1:Lcom/rphub/app/OfficialUpdateWatcher$2;

.field private final synthetic val$app:Landroid/content/Context;

.field private final synthetic val$webView:Landroid/webkit/WebView;


# direct methods
.method constructor <init>(Lcom/rphub/app/OfficialUpdateWatcher$2;Landroid/content/Context;Landroid/webkit/WebView;)V
    .locals 0

    .line 1
    iput-object p1, p0, Lcom/rphub/app/OfficialUpdateWatcher$2$1;->this$1:Lcom/rphub/app/OfficialUpdateWatcher$2;

    iput-object p2, p0, Lcom/rphub/app/OfficialUpdateWatcher$2$1;->val$app:Landroid/content/Context;

    iput-object p3, p0, Lcom/rphub/app/OfficialUpdateWatcher$2$1;->val$webView:Landroid/webkit/WebView;

    .line 278
    invoke-direct {p0}, Ljava/lang/Object;-><init>()V

    return-void
.end method


# virtual methods
.method public onClick(Landroid/content/DialogInterface;I)V
    .locals 1

    .line 284
    :try_start_0
    iget-object p1, p0, Lcom/rphub/app/OfficialUpdateWatcher$2$1;->val$app:Landroid/content/Context;

    invoke-static {p1}, Lcom/rphub/app/PatchEngine;->clearPatchCache(Landroid/content/Context;)V

    .line 285
    iget-object p1, p0, Lcom/rphub/app/OfficialUpdateWatcher$2$1;->val$webView:Landroid/webkit/WebView;

    if-eqz p1, :cond_0

    .line 286
    iget-object p1, p0, Lcom/rphub/app/OfficialUpdateWatcher$2$1;->val$webView:Landroid/webkit/WebView;

    const-string p2, "https://sta1n156.github.io/RP-Hub/"

    invoke-virtual {p1, p2}, Landroid/webkit/WebView;->loadUrl(Ljava/lang/String;)V
    :try_end_0
    .catchall {:try_start_0 .. :try_end_0} :catchall_0

    goto :goto_0

    :catchall_0
    move-exception p1

    const-string p2, "RPHubOfficial"

    const-string v0, "retry after fail notice failed"

    .line 289
    invoke-static {p2, v0, p1}, Landroid/util/Log;->w(Ljava/lang/String;Ljava/lang/String;Ljava/lang/Throwable;)I

    :cond_0
    :goto_0
    return-void
.end method
