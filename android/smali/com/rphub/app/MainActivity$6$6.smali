.class Lcom/rphub/app/MainActivity$6$6;
.super Ljava/lang/Object;
.source "MainActivity.java"

# interfaces
.implements Ljava/lang/Runnable;


# annotations
.annotation system Ldalvik/annotation/EnclosingMethod;
    value = Lcom/rphub/app/MainActivity$6;->chooseBackupFolder()V
.end annotation

.annotation system Ldalvik/annotation/InnerClass;
    accessFlags = 0x0
    name = null
.end annotation


# instance fields
.field final synthetic this$1:Lcom/rphub/app/MainActivity$6;


# direct methods
.method constructor <init>(Lcom/rphub/app/MainActivity$6;)V
    .locals 0

    .line 1
    iput-object p1, p0, Lcom/rphub/app/MainActivity$6$6;->this$1:Lcom/rphub/app/MainActivity$6;

    .line 916
    invoke-direct {p0}, Ljava/lang/Object;-><init>()V

    return-void
.end method


# virtual methods
.method public run()V
    .locals 4

    .line 920
    :try_start_0
    new-instance v0, Landroid/content/Intent;

    const-string v1, "android.intent.action.OPEN_DOCUMENT_TREE"

    invoke-direct {v0, v1}, Landroid/content/Intent;-><init>(Ljava/lang/String;)V

    const/16 v1, 0x43

    .line 921
    invoke-virtual {v0, v1}, Landroid/content/Intent;->addFlags(I)Landroid/content/Intent;

    .line 924
    iget-object v1, p0, Lcom/rphub/app/MainActivity$6$6;->this$1:Lcom/rphub/app/MainActivity$6;

    invoke-static {v1}, Lcom/rphub/app/MainActivity$6;->access$2(Lcom/rphub/app/MainActivity$6;)Lcom/rphub/app/MainActivity;

    move-result-object v1

    const/16 v2, 0x3eb

    invoke-virtual {v1, v0, v2}, Lcom/rphub/app/MainActivity;->startActivityForResult(Landroid/content/Intent;I)V
    :try_end_0
    .catchall {:try_start_0 .. :try_end_0} :catchall_0

    goto :goto_0

    :catchall_0
    move-exception v0

    .line 926
    iget-object v1, p0, Lcom/rphub/app/MainActivity$6$6;->this$1:Lcom/rphub/app/MainActivity$6;

    invoke-static {v1}, Lcom/rphub/app/MainActivity$6;->access$2(Lcom/rphub/app/MainActivity$6;)Lcom/rphub/app/MainActivity;

    move-result-object v1

    new-instance v2, Ljava/lang/StringBuilder;

    const-string v3, "\u65e0\u6cd5\u6253\u5f00\u6587\u4ef6\u5939\u9009\u62e9\u5668\uff1a"

    invoke-direct {v2, v3}, Ljava/lang/StringBuilder;-><init>(Ljava/lang/String;)V

    invoke-virtual {v0}, Ljava/lang/Throwable;->getMessage()Ljava/lang/String;

    move-result-object v0

    invoke-virtual {v2, v0}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    invoke-virtual {v2}, Ljava/lang/StringBuilder;->toString()Ljava/lang/String;

    move-result-object v0

    const/4 v2, 0x0

    invoke-static {v1, v0, v2}, Lcom/rphub/app/MainActivity;->access$14(Lcom/rphub/app/MainActivity;Ljava/lang/String;Z)V

    :goto_0
    return-void
.end method
