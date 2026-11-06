.class Lcom/rphub/app/MainActivity$6$3;
.super Ljava/lang/Object;
.source "MainActivity.java"

# interfaces
.implements Ljava/lang/Runnable;


# annotations
.annotation system Ldalvik/annotation/EnclosingMethod;
    value = Lcom/rphub/app/MainActivity$6;->saveFileWithPicker(Ljava/lang/String;Ljava/lang/String;Ljava/lang/String;)V
.end annotation

.annotation system Ldalvik/annotation/InnerClass;
    accessFlags = 0x0
    name = null
.end annotation


# instance fields
.field final synthetic this$1:Lcom/rphub/app/MainActivity$6;

.field private final synthetic val$bytes:[B

.field private final synthetic val$safeMime:Ljava/lang/String;

.field private final synthetic val$safeName:Ljava/lang/String;


# direct methods
.method constructor <init>(Lcom/rphub/app/MainActivity$6;[BLjava/lang/String;Ljava/lang/String;)V
    .locals 0

    .line 1
    iput-object p1, p0, Lcom/rphub/app/MainActivity$6$3;->this$1:Lcom/rphub/app/MainActivity$6;

    iput-object p2, p0, Lcom/rphub/app/MainActivity$6$3;->val$bytes:[B

    iput-object p3, p0, Lcom/rphub/app/MainActivity$6$3;->val$safeMime:Ljava/lang/String;

    iput-object p4, p0, Lcom/rphub/app/MainActivity$6$3;->val$safeName:Ljava/lang/String;

    .line 526
    invoke-direct {p0}, Ljava/lang/Object;-><init>()V

    return-void
.end method


# virtual methods
.method public run()V
    .locals 4

    .line 530
    :try_start_0
    iget-object v0, p0, Lcom/rphub/app/MainActivity$6$3;->this$1:Lcom/rphub/app/MainActivity$6;

    invoke-static {v0}, Lcom/rphub/app/MainActivity$6;->access$2(Lcom/rphub/app/MainActivity$6;)Lcom/rphub/app/MainActivity;

    move-result-object v0

    iget-object v1, p0, Lcom/rphub/app/MainActivity$6$3;->val$bytes:[B

    invoke-static {v0, v1}, Lcom/rphub/app/MainActivity;->access$16(Lcom/rphub/app/MainActivity;[B)V

    .line 531
    iget-object v0, p0, Lcom/rphub/app/MainActivity$6$3;->this$1:Lcom/rphub/app/MainActivity$6;

    invoke-static {v0}, Lcom/rphub/app/MainActivity$6;->access$2(Lcom/rphub/app/MainActivity$6;)Lcom/rphub/app/MainActivity;

    move-result-object v0

    iget-object v1, p0, Lcom/rphub/app/MainActivity$6$3;->val$safeMime:Ljava/lang/String;

    invoke-static {v0, v1}, Lcom/rphub/app/MainActivity;->access$17(Lcom/rphub/app/MainActivity;Ljava/lang/String;)V

    .line 532
    iget-object v0, p0, Lcom/rphub/app/MainActivity$6$3;->this$1:Lcom/rphub/app/MainActivity$6;

    invoke-static {v0}, Lcom/rphub/app/MainActivity$6;->access$2(Lcom/rphub/app/MainActivity$6;)Lcom/rphub/app/MainActivity;

    move-result-object v0

    iget-object v1, p0, Lcom/rphub/app/MainActivity$6$3;->val$safeName:Ljava/lang/String;

    invoke-static {v0, v1}, Lcom/rphub/app/MainActivity;->access$18(Lcom/rphub/app/MainActivity;Ljava/lang/String;)V

    .line 533
    new-instance v0, Landroid/content/Intent;

    const-string v1, "android.intent.action.CREATE_DOCUMENT"

    invoke-direct {v0, v1}, Landroid/content/Intent;-><init>(Ljava/lang/String;)V

    const-string v1, "android.intent.category.OPENABLE"

    .line 534
    invoke-virtual {v0, v1}, Landroid/content/Intent;->addCategory(Ljava/lang/String;)Landroid/content/Intent;

    .line 535
    iget-object v1, p0, Lcom/rphub/app/MainActivity$6$3;->val$safeMime:Ljava/lang/String;

    invoke-virtual {v0, v1}, Landroid/content/Intent;->setType(Ljava/lang/String;)Landroid/content/Intent;

    const-string v1, "android.intent.extra.TITLE"

    .line 536
    iget-object v2, p0, Lcom/rphub/app/MainActivity$6$3;->val$safeName:Ljava/lang/String;

    invoke-virtual {v0, v1, v2}, Landroid/content/Intent;->putExtra(Ljava/lang/String;Ljava/lang/String;)Landroid/content/Intent;

    .line 537
    iget-object v1, p0, Lcom/rphub/app/MainActivity$6$3;->this$1:Lcom/rphub/app/MainActivity$6;

    invoke-static {v1}, Lcom/rphub/app/MainActivity$6;->access$2(Lcom/rphub/app/MainActivity$6;)Lcom/rphub/app/MainActivity;

    move-result-object v1

    const/16 v2, 0x3ea

    invoke-virtual {v1, v0, v2}, Lcom/rphub/app/MainActivity;->startActivityForResult(Landroid/content/Intent;I)V
    :try_end_0
    .catchall {:try_start_0 .. :try_end_0} :catchall_0

    goto :goto_0

    :catchall_0
    move-exception v0

    .line 539
    iget-object v1, p0, Lcom/rphub/app/MainActivity$6$3;->this$1:Lcom/rphub/app/MainActivity$6;

    invoke-static {v1}, Lcom/rphub/app/MainActivity$6;->access$2(Lcom/rphub/app/MainActivity$6;)Lcom/rphub/app/MainActivity;

    move-result-object v1

    const/4 v2, 0x0

    invoke-static {v1, v2}, Lcom/rphub/app/MainActivity;->access$16(Lcom/rphub/app/MainActivity;[B)V

    .line 540
    iget-object v1, p0, Lcom/rphub/app/MainActivity$6$3;->this$1:Lcom/rphub/app/MainActivity$6;

    invoke-static {v1}, Lcom/rphub/app/MainActivity$6;->access$2(Lcom/rphub/app/MainActivity$6;)Lcom/rphub/app/MainActivity;

    move-result-object v1

    new-instance v2, Ljava/lang/StringBuilder;

    const-string v3, "\u65e0\u6cd5\u6253\u5f00\u4fdd\u5b58\u4f4d\u7f6e\uff1a"

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
