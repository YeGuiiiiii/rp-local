.class Lcom/rphub/app/MainActivity$5;
.super Ljava/lang/Object;
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
    iput-object p1, p0, Lcom/rphub/app/MainActivity$5;->this$0:Lcom/rphub/app/MainActivity;

    .line 350
    invoke-direct {p0}, Ljava/lang/Object;-><init>()V

    return-void
.end method

.method static synthetic access$0(Lcom/rphub/app/MainActivity$5;)Lcom/rphub/app/MainActivity;
    .locals 0

    .line 350
    iget-object p0, p0, Lcom/rphub/app/MainActivity$5;->this$0:Lcom/rphub/app/MainActivity;

    return-object p0
.end method


# virtual methods
.method public setBackground(Z)V
    .locals 3
    .annotation runtime Landroid/webkit/JavascriptInterface;
    .end annotation

    .line 354
    :try_start_0
    iget-object v0, p0, Lcom/rphub/app/MainActivity$5;->this$0:Lcom/rphub/app/MainActivity;

    const-string v1, "rphub_theme"

    const/4 v2, 0x0

    invoke-virtual {v0, v1, v2}, Lcom/rphub/app/MainActivity;->getSharedPreferences(Ljava/lang/String;I)Landroid/content/SharedPreferences;

    move-result-object v0

    invoke-interface {v0}, Landroid/content/SharedPreferences;->edit()Landroid/content/SharedPreferences$Editor;

    move-result-object v0

    const-string v1, "dark"

    .line 355
    invoke-interface {v0, v1, p1}, Landroid/content/SharedPreferences$Editor;->putBoolean(Ljava/lang/String;Z)Landroid/content/SharedPreferences$Editor;

    move-result-object v0

    invoke-interface {v0}, Landroid/content/SharedPreferences$Editor;->apply()V
    :try_end_0
    .catchall {:try_start_0 .. :try_end_0} :catchall_0

    .line 359
    :catchall_0
    :try_start_1
    iget-object v0, p0, Lcom/rphub/app/MainActivity$5;->this$0:Lcom/rphub/app/MainActivity;

    new-instance v1, Lcom/rphub/app/MainActivity$5$1;

    invoke-direct {v1, p0, p1}, Lcom/rphub/app/MainActivity$5$1;-><init>(Lcom/rphub/app/MainActivity$5;Z)V

    invoke-virtual {v0, v1}, Lcom/rphub/app/MainActivity;->runOnUiThread(Ljava/lang/Runnable;)V
    :try_end_1
    .catchall {:try_start_1 .. :try_end_1} :catchall_1

    :catchall_1
    return-void
.end method
