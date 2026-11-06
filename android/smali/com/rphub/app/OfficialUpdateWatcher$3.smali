.class Lcom/rphub/app/OfficialUpdateWatcher$3;
.super Ljava/lang/Object;
.source "OfficialUpdateWatcher.java"

# interfaces
.implements Ljava/lang/Runnable;


# annotations
.annotation system Ldalvik/annotation/EnclosingMethod;
    value = Lcom/rphub/app/OfficialUpdateWatcher;->showDialog(Landroid/app/Activity;Landroid/content/Context;Landroid/webkit/WebView;Landroid/content/SharedPreferences;ILcom/rphub/app/OfficialUpdateWatcher$RemoteAnnouncement;)V
.end annotation

.annotation system Ldalvik/annotation/InnerClass;
    accessFlags = 0x0
    name = null
.end annotation


# instance fields
.field private final synthetic val$activity:Landroid/app/Activity;

.field private final synthetic val$app:Landroid/content/Context;

.field private final synthetic val$messageText:Ljava/lang/String;

.field private final synthetic val$positiveLabel:Ljava/lang/String;

.field private final synthetic val$prefs:Landroid/content/SharedPreferences;

.field private final synthetic val$promoted:Z

.field private final synthetic val$remote:Lcom/rphub/app/OfficialUpdateWatcher$RemoteAnnouncement;

.field private final synthetic val$webView:Landroid/webkit/WebView;


# direct methods
.method constructor <init>(Landroid/app/Activity;Ljava/lang/String;Ljava/lang/String;ZLandroid/content/Context;Landroid/webkit/WebView;Landroid/content/SharedPreferences;Lcom/rphub/app/OfficialUpdateWatcher$RemoteAnnouncement;)V
    .locals 0

    .line 1
    iput-object p1, p0, Lcom/rphub/app/OfficialUpdateWatcher$3;->val$activity:Landroid/app/Activity;

    iput-object p2, p0, Lcom/rphub/app/OfficialUpdateWatcher$3;->val$messageText:Ljava/lang/String;

    iput-object p3, p0, Lcom/rphub/app/OfficialUpdateWatcher$3;->val$positiveLabel:Ljava/lang/String;

    iput-boolean p4, p0, Lcom/rphub/app/OfficialUpdateWatcher$3;->val$promoted:Z

    iput-object p5, p0, Lcom/rphub/app/OfficialUpdateWatcher$3;->val$app:Landroid/content/Context;

    iput-object p6, p0, Lcom/rphub/app/OfficialUpdateWatcher$3;->val$webView:Landroid/webkit/WebView;

    iput-object p7, p0, Lcom/rphub/app/OfficialUpdateWatcher$3;->val$prefs:Landroid/content/SharedPreferences;

    iput-object p8, p0, Lcom/rphub/app/OfficialUpdateWatcher$3;->val$remote:Lcom/rphub/app/OfficialUpdateWatcher$RemoteAnnouncement;

    .line 380
    invoke-direct {p0}, Ljava/lang/Object;-><init>()V

    return-void
.end method


# virtual methods
.method public run()V
    .locals 6

    .line 384
    :try_start_0
    iget-object v0, p0, Lcom/rphub/app/OfficialUpdateWatcher$3;->val$activity:Landroid/app/Activity;

    invoke-virtual {v0}, Landroid/app/Activity;->isFinishing()Z

    move-result v0

    if-eqz v0, :cond_0

    return-void

    .line 387
    :cond_0
    new-instance v0, Landroid/app/AlertDialog$Builder;

    iget-object v1, p0, Lcom/rphub/app/OfficialUpdateWatcher$3;->val$activity:Landroid/app/Activity;

    invoke-direct {v0, v1}, Landroid/app/AlertDialog$Builder;-><init>(Landroid/content/Context;)V

    const-string v1, "\u5b98\u7f51\u5df2\u66f4\u65b0"

    .line 388
    invoke-virtual {v0, v1}, Landroid/app/AlertDialog$Builder;->setTitle(Ljava/lang/CharSequence;)Landroid/app/AlertDialog$Builder;

    move-result-object v0

    .line 389
    iget-object v1, p0, Lcom/rphub/app/OfficialUpdateWatcher$3;->val$messageText:Ljava/lang/String;

    invoke-virtual {v0, v1}, Landroid/app/AlertDialog$Builder;->setMessage(Ljava/lang/CharSequence;)Landroid/app/AlertDialog$Builder;

    move-result-object v0

    .line 390
    iget-object v1, p0, Lcom/rphub/app/OfficialUpdateWatcher$3;->val$positiveLabel:Ljava/lang/String;

    .line 391
    new-instance v2, Lcom/rphub/app/OfficialUpdateWatcher$3$1;

    iget-boolean v3, p0, Lcom/rphub/app/OfficialUpdateWatcher$3;->val$promoted:Z

    iget-object v4, p0, Lcom/rphub/app/OfficialUpdateWatcher$3;->val$app:Landroid/content/Context;

    iget-object v5, p0, Lcom/rphub/app/OfficialUpdateWatcher$3;->val$webView:Landroid/webkit/WebView;

    invoke-direct {v2, p0, v3, v4, v5}, Lcom/rphub/app/OfficialUpdateWatcher$3$1;-><init>(Lcom/rphub/app/OfficialUpdateWatcher$3;ZLandroid/content/Context;Landroid/webkit/WebView;)V

    .line 390
    invoke-virtual {v0, v1, v2}, Landroid/app/AlertDialog$Builder;->setPositiveButton(Ljava/lang/CharSequence;Landroid/content/DialogInterface$OnClickListener;)Landroid/app/AlertDialog$Builder;

    move-result-object v0

    const-string v1, "\u7a0d\u540e"

    const/4 v2, 0x0

    .line 411
    invoke-virtual {v0, v1, v2}, Landroid/app/AlertDialog$Builder;->setNegativeButton(Ljava/lang/CharSequence;Landroid/content/DialogInterface$OnClickListener;)Landroid/app/AlertDialog$Builder;

    move-result-object v0

    .line 412
    invoke-virtual {v0}, Landroid/app/AlertDialog$Builder;->create()Landroid/app/AlertDialog;

    move-result-object v0

    .line 415
    new-instance v1, Lcom/rphub/app/OfficialUpdateWatcher$3$2;

    iget-object v2, p0, Lcom/rphub/app/OfficialUpdateWatcher$3;->val$prefs:Landroid/content/SharedPreferences;

    iget-object v3, p0, Lcom/rphub/app/OfficialUpdateWatcher$3;->val$remote:Lcom/rphub/app/OfficialUpdateWatcher$RemoteAnnouncement;

    invoke-direct {v1, p0, v2, v3}, Lcom/rphub/app/OfficialUpdateWatcher$3$2;-><init>(Lcom/rphub/app/OfficialUpdateWatcher$3;Landroid/content/SharedPreferences;Lcom/rphub/app/OfficialUpdateWatcher$RemoteAnnouncement;)V

    invoke-virtual {v0, v1}, Landroid/app/AlertDialog;->setOnDismissListener(Landroid/content/DialogInterface$OnDismissListener;)V

    .line 424
    invoke-virtual {v0}, Landroid/app/AlertDialog;->show()V
    :try_end_0
    .catchall {:try_start_0 .. :try_end_0} :catchall_0

    goto :goto_0

    :catchall_0
    move-exception v0

    const-string v1, "RPHubOfficial"

    const-string v2, "show official update dialog failed"

    .line 426
    invoke-static {v1, v2, v0}, Landroid/util/Log;->w(Ljava/lang/String;Ljava/lang/String;Ljava/lang/Throwable;)I

    :goto_0
    return-void
.end method
