.class Lcom/rphub/app/OfficialUpdateWatcher$1;
.super Ljava/lang/Object;
.source "OfficialUpdateWatcher.java"

# interfaces
.implements Ljava/lang/Runnable;


# annotations
.annotation system Ldalvik/annotation/EnclosingMethod;
    value = Lcom/rphub/app/OfficialUpdateWatcher;->checkOnColdStart(Landroid/app/Activity;Landroid/webkit/WebView;)V
.end annotation

.annotation system Ldalvik/annotation/InnerClass;
    accessFlags = 0x0
    name = null
.end annotation


# instance fields
.field private final synthetic val$activity:Landroid/app/Activity;

.field private final synthetic val$app:Landroid/content/Context;

.field private final synthetic val$webView:Landroid/webkit/WebView;


# direct methods
.method constructor <init>(Landroid/app/Activity;Landroid/content/Context;Landroid/webkit/WebView;)V
    .locals 0

    .line 1
    iput-object p1, p0, Lcom/rphub/app/OfficialUpdateWatcher$1;->val$activity:Landroid/app/Activity;

    iput-object p2, p0, Lcom/rphub/app/OfficialUpdateWatcher$1;->val$app:Landroid/content/Context;

    iput-object p3, p0, Lcom/rphub/app/OfficialUpdateWatcher$1;->val$webView:Landroid/webkit/WebView;

    .line 156
    invoke-direct {p0}, Ljava/lang/Object;-><init>()V

    return-void
.end method


# virtual methods
.method public run()V
    .locals 3

    const-wide/16 v0, 0xfa0

    .line 160
    :try_start_0
    invoke-static {v0, v1}, Ljava/lang/Thread;->sleep(J)V
    :try_end_0
    .catch Ljava/lang/InterruptedException; {:try_start_0 .. :try_end_0} :catch_0

    .line 165
    :try_start_1
    iget-object v0, p0, Lcom/rphub/app/OfficialUpdateWatcher$1;->val$activity:Landroid/app/Activity;

    iget-object v1, p0, Lcom/rphub/app/OfficialUpdateWatcher$1;->val$app:Landroid/content/Context;

    iget-object v2, p0, Lcom/rphub/app/OfficialUpdateWatcher$1;->val$webView:Landroid/webkit/WebView;

    invoke-static {v0, v1, v2}, Lcom/rphub/app/OfficialUpdateWatcher;->access$0(Landroid/app/Activity;Landroid/content/Context;Landroid/webkit/WebView;)V
    :try_end_1
    .catchall {:try_start_1 .. :try_end_1} :catchall_0

    goto :goto_0

    :catchall_0
    move-exception v0

    const-string v1, "RPHubOfficial"

    const-string v2, "official update check failed"

    .line 167
    invoke-static {v1, v2, v0}, Landroid/util/Log;->w(Ljava/lang/String;Ljava/lang/String;Ljava/lang/Throwable;)I

    :catch_0
    :goto_0
    return-void
.end method
