.class Lcom/rphub/app/OfficialUpdateWatcher$2;
.super Ljava/lang/Object;
.source "OfficialUpdateWatcher.java"

# interfaces
.implements Ljava/lang/Runnable;


# annotations
.annotation system Ldalvik/annotation/EnclosingMethod;
    value = Lcom/rphub/app/OfficialUpdateWatcher;->notifyPromoteFailure(Landroid/app/Activity;Landroid/content/Context;Landroid/content/SharedPreferences;Landroid/webkit/WebView;)Z
.end annotation

.annotation system Ldalvik/annotation/InnerClass;
    accessFlags = 0x0
    name = null
.end annotation


# instance fields
.field private final synthetic val$activity:Landroid/app/Activity;

.field private final synthetic val$app:Landroid/content/Context;

.field private final synthetic val$message:Ljava/lang/String;

.field private final synthetic val$prefs:Landroid/content/SharedPreferences;

.field private final synthetic val$versionCode:I

.field private final synthetic val$webView:Landroid/webkit/WebView;


# direct methods
.method constructor <init>(Landroid/app/Activity;Ljava/lang/String;Landroid/content/Context;Landroid/webkit/WebView;Landroid/content/SharedPreferences;I)V
    .locals 0

    .line 1
    iput-object p1, p0, Lcom/rphub/app/OfficialUpdateWatcher$2;->val$activity:Landroid/app/Activity;

    iput-object p2, p0, Lcom/rphub/app/OfficialUpdateWatcher$2;->val$message:Ljava/lang/String;

    iput-object p3, p0, Lcom/rphub/app/OfficialUpdateWatcher$2;->val$app:Landroid/content/Context;

    iput-object p4, p0, Lcom/rphub/app/OfficialUpdateWatcher$2;->val$webView:Landroid/webkit/WebView;

    iput-object p5, p0, Lcom/rphub/app/OfficialUpdateWatcher$2;->val$prefs:Landroid/content/SharedPreferences;

    iput p6, p0, Lcom/rphub/app/OfficialUpdateWatcher$2;->val$versionCode:I

    .line 268
    invoke-direct {p0}, Ljava/lang/Object;-><init>()V

    return-void
.end method


# virtual methods
.method public run()V
    .locals 5

    .line 272
    :try_start_0
    iget-object v0, p0, Lcom/rphub/app/OfficialUpdateWatcher$2;->val$activity:Landroid/app/Activity;

    invoke-virtual {v0}, Landroid/app/Activity;->isFinishing()Z

    move-result v0

    if-eqz v0, :cond_0

    return-void

    .line 275
    :cond_0
    new-instance v0, Landroid/app/AlertDialog$Builder;

    iget-object v1, p0, Lcom/rphub/app/OfficialUpdateWatcher$2;->val$activity:Landroid/app/Activity;

    invoke-direct {v0, v1}, Landroid/app/AlertDialog$Builder;-><init>(Landroid/content/Context;)V

    const-string v1, "\u5b98\u7f51\u5df2\u66f4\u65b0\uff0c\u4f46\u672c\u7248\u9002\u914d\u4e0d\u4e0a"

    .line 276
    invoke-virtual {v0, v1}, Landroid/app/AlertDialog$Builder;->setTitle(Ljava/lang/CharSequence;)Landroid/app/AlertDialog$Builder;

    move-result-object v0

    .line 277
    iget-object v1, p0, Lcom/rphub/app/OfficialUpdateWatcher$2;->val$message:Ljava/lang/String;

    invoke-virtual {v0, v1}, Landroid/app/AlertDialog$Builder;->setMessage(Ljava/lang/CharSequence;)Landroid/app/AlertDialog$Builder;

    move-result-object v0

    const-string v1, "\u91cd\u8bd5\u4e00\u6b21"

    .line 278
    new-instance v2, Lcom/rphub/app/OfficialUpdateWatcher$2$1;

    iget-object v3, p0, Lcom/rphub/app/OfficialUpdateWatcher$2;->val$app:Landroid/content/Context;

    iget-object v4, p0, Lcom/rphub/app/OfficialUpdateWatcher$2;->val$webView:Landroid/webkit/WebView;

    invoke-direct {v2, p0, v3, v4}, Lcom/rphub/app/OfficialUpdateWatcher$2$1;-><init>(Lcom/rphub/app/OfficialUpdateWatcher$2;Landroid/content/Context;Landroid/webkit/WebView;)V

    invoke-virtual {v0, v1, v2}, Landroid/app/AlertDialog$Builder;->setPositiveButton(Ljava/lang/CharSequence;Landroid/content/DialogInterface$OnClickListener;)Landroid/app/AlertDialog$Builder;

    move-result-object v0

    const-string v1, "\u4e0d\u518d\u63d0\u793a\u672c\u7248"

    .line 293
    new-instance v2, Lcom/rphub/app/OfficialUpdateWatcher$2$2;

    iget-object v3, p0, Lcom/rphub/app/OfficialUpdateWatcher$2;->val$prefs:Landroid/content/SharedPreferences;

    iget v4, p0, Lcom/rphub/app/OfficialUpdateWatcher$2;->val$versionCode:I

    invoke-direct {v2, p0, v3, v4}, Lcom/rphub/app/OfficialUpdateWatcher$2$2;-><init>(Lcom/rphub/app/OfficialUpdateWatcher$2;Landroid/content/SharedPreferences;I)V

    invoke-virtual {v0, v1, v2}, Landroid/app/AlertDialog$Builder;->setNeutralButton(Ljava/lang/CharSequence;Landroid/content/DialogInterface$OnClickListener;)Landroid/app/AlertDialog$Builder;

    move-result-object v0

    const-string v1, "\u77e5\u9053\u4e86"

    const/4 v2, 0x0

    .line 306
    invoke-virtual {v0, v1, v2}, Landroid/app/AlertDialog$Builder;->setNegativeButton(Ljava/lang/CharSequence;Landroid/content/DialogInterface$OnClickListener;)Landroid/app/AlertDialog$Builder;

    move-result-object v0

    .line 307
    invoke-virtual {v0}, Landroid/app/AlertDialog$Builder;->create()Landroid/app/AlertDialog;

    move-result-object v0

    .line 308
    new-instance v1, Lcom/rphub/app/OfficialUpdateWatcher$2$3;

    iget-object v2, p0, Lcom/rphub/app/OfficialUpdateWatcher$2;->val$prefs:Landroid/content/SharedPreferences;

    invoke-direct {v1, p0, v2}, Lcom/rphub/app/OfficialUpdateWatcher$2$3;-><init>(Lcom/rphub/app/OfficialUpdateWatcher$2;Landroid/content/SharedPreferences;)V

    invoke-virtual {v0, v1}, Landroid/app/AlertDialog;->setOnDismissListener(Landroid/content/DialogInterface$OnDismissListener;)V

    .line 319
    invoke-virtual {v0}, Landroid/app/AlertDialog;->show()V
    :try_end_0
    .catchall {:try_start_0 .. :try_end_0} :catchall_0

    goto :goto_0

    :catchall_0
    move-exception v0

    const-string v1, "RPHubOfficial"

    const-string v2, "show promote failure dialog failed"

    .line 321
    invoke-static {v1, v2, v0}, Landroid/util/Log;->w(Ljava/lang/String;Ljava/lang/String;Ljava/lang/Throwable;)I

    :goto_0
    return-void
.end method
