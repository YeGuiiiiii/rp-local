.class Lcom/rphub/app/MainActivity$6$7;
.super Ljava/lang/Object;
.source "MainActivity.java"

# interfaces
.implements Ljava/lang/Runnable;


# annotations
.annotation system Ldalvik/annotation/EnclosingMethod;
    value = Lcom/rphub/app/MainActivity$6;->saveBackupToFolder(Ljava/lang/String;Ljava/lang/String;Ljava/lang/String;)V
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
.method constructor <init>(Lcom/rphub/app/MainActivity$6;Ljava/lang/String;Ljava/lang/String;[B)V
    .locals 0

    .line 1
    iput-object p1, p0, Lcom/rphub/app/MainActivity$6$7;->this$1:Lcom/rphub/app/MainActivity$6;

    iput-object p2, p0, Lcom/rphub/app/MainActivity$6$7;->val$safeMime:Ljava/lang/String;

    iput-object p3, p0, Lcom/rphub/app/MainActivity$6$7;->val$safeName:Ljava/lang/String;

    iput-object p4, p0, Lcom/rphub/app/MainActivity$6$7;->val$bytes:[B

    .line 1106
    invoke-direct {p0}, Ljava/lang/Object;-><init>()V

    return-void
.end method


# virtual methods
.method public run()V
    .locals 5

    const/4 v0, 0x0

    .line 1110
    :try_start_0
    iget-object v1, p0, Lcom/rphub/app/MainActivity$6$7;->this$1:Lcom/rphub/app/MainActivity$6;

    invoke-virtual {v1}, Lcom/rphub/app/MainActivity$6;->getBackupFolder()Ljava/lang/String;

    move-result-object v1

    if-eqz v1, :cond_6

    .line 1111
    invoke-virtual {v1}, Ljava/lang/String;->isEmpty()Z

    move-result v2

    if-eqz v2, :cond_0

    goto/16 :goto_1

    .line 1115
    :cond_0
    invoke-static {v1}, Landroid/net/Uri;->parse(Ljava/lang/String;)Landroid/net/Uri;

    move-result-object v1

    .line 1117
    invoke-static {v1}, Landroid/provider/DocumentsContract;->getTreeDocumentId(Landroid/net/Uri;)Ljava/lang/String;

    move-result-object v2

    .line 1116
    invoke-static {v1, v2}, Landroid/provider/DocumentsContract;->buildDocumentUriUsingTree(Landroid/net/Uri;Ljava/lang/String;)Landroid/net/Uri;

    move-result-object v1

    .line 1119
    iget-object v2, p0, Lcom/rphub/app/MainActivity$6$7;->this$1:Lcom/rphub/app/MainActivity$6;

    invoke-static {v2}, Lcom/rphub/app/MainActivity$6;->access$2(Lcom/rphub/app/MainActivity$6;)Lcom/rphub/app/MainActivity;

    move-result-object v2

    invoke-virtual {v2}, Lcom/rphub/app/MainActivity;->getContentResolver()Landroid/content/ContentResolver;

    move-result-object v2

    iget-object v3, p0, Lcom/rphub/app/MainActivity$6$7;->val$safeMime:Ljava/lang/String;

    iget-object v4, p0, Lcom/rphub/app/MainActivity$6$7;->val$safeName:Ljava/lang/String;

    .line 1118
    invoke-static {v2, v1, v3, v4}, Landroid/provider/DocumentsContract;->createDocument(Landroid/content/ContentResolver;Landroid/net/Uri;Ljava/lang/String;Ljava/lang/String;)Landroid/net/Uri;

    move-result-object v1
    :try_end_0
    .catchall {:try_start_0 .. :try_end_0} :catchall_2

    if-eqz v1, :cond_5

    const/4 v2, 0x0

    .line 1121
    :try_start_1
    iget-object v3, p0, Lcom/rphub/app/MainActivity$6$7;->this$1:Lcom/rphub/app/MainActivity$6;

    invoke-static {v3}, Lcom/rphub/app/MainActivity$6;->access$2(Lcom/rphub/app/MainActivity$6;)Lcom/rphub/app/MainActivity;

    move-result-object v3

    invoke-virtual {v3}, Lcom/rphub/app/MainActivity;->getContentResolver()Landroid/content/ContentResolver;

    move-result-object v3

    invoke-virtual {v3, v1}, Landroid/content/ContentResolver;->openOutputStream(Landroid/net/Uri;)Ljava/io/OutputStream;

    move-result-object v1
    :try_end_1
    .catchall {:try_start_1 .. :try_end_1} :catchall_1

    if-eqz v1, :cond_2

    .line 1123
    :try_start_2
    iget-object v3, p0, Lcom/rphub/app/MainActivity$6$7;->val$bytes:[B

    invoke-virtual {v1, v3}, Ljava/io/OutputStream;->write([B)V

    .line 1124
    invoke-virtual {v1}, Ljava/io/OutputStream;->flush()V
    :try_end_2
    .catchall {:try_start_2 .. :try_end_2} :catchall_0

    if-eqz v1, :cond_1

    .line 1125
    :try_start_3
    invoke-virtual {v1}, Ljava/io/OutputStream;->close()V
    :try_end_3
    .catchall {:try_start_3 .. :try_end_3} :catchall_1

    .line 1126
    :cond_1
    :try_start_4
    iget-object v1, p0, Lcom/rphub/app/MainActivity$6$7;->this$1:Lcom/rphub/app/MainActivity$6;

    invoke-static {v1}, Lcom/rphub/app/MainActivity$6;->access$2(Lcom/rphub/app/MainActivity$6;)Lcom/rphub/app/MainActivity;

    move-result-object v1

    new-instance v2, Ljava/lang/StringBuilder;

    const-string v3, "\u5df2\u4fdd\u5b58\u5230\u9ed8\u8ba4\u5907\u4efd\u6587\u4ef6\u5939\uff1a"

    invoke-direct {v2, v3}, Ljava/lang/StringBuilder;-><init>(Ljava/lang/String;)V

    iget-object v3, p0, Lcom/rphub/app/MainActivity$6$7;->val$safeName:Ljava/lang/String;

    invoke-virtual {v2, v3}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    invoke-virtual {v2}, Ljava/lang/StringBuilder;->toString()Ljava/lang/String;

    move-result-object v2

    const/4 v3, 0x1

    invoke-static {v1, v2, v3}, Lcom/rphub/app/MainActivity;->access$14(Lcom/rphub/app/MainActivity;Ljava/lang/String;Z)V
    :try_end_4
    .catchall {:try_start_4 .. :try_end_4} :catchall_2

    goto :goto_2

    :catchall_0
    move-exception v2

    goto :goto_0

    .line 1122
    :cond_2
    :try_start_5
    new-instance v2, Ljava/lang/IllegalStateException;

    const-string v3, "\u65e0\u6cd5\u5199\u5165\u5907\u4efd\u6587\u4ef6"

    invoke-direct {v2, v3}, Ljava/lang/IllegalStateException;-><init>(Ljava/lang/String;)V

    throw v2
    :try_end_5
    .catchall {:try_start_5 .. :try_end_5} :catchall_0

    :goto_0
    if-eqz v1, :cond_3

    .line 1125
    :try_start_6
    invoke-virtual {v1}, Ljava/io/OutputStream;->close()V

    :cond_3
    throw v2
    :try_end_6
    .catchall {:try_start_6 .. :try_end_6} :catchall_1

    :catchall_1
    move-exception v1

    if-eqz v2, :cond_4

    move-object v1, v2

    :cond_4
    :try_start_7
    throw v1

    .line 1120
    :cond_5
    new-instance v1, Ljava/lang/IllegalStateException;

    const-string v2, "\u65e0\u6cd5\u521b\u5efa\u5907\u4efd\u6587\u4ef6"

    invoke-direct {v1, v2}, Ljava/lang/IllegalStateException;-><init>(Ljava/lang/String;)V

    throw v1

    .line 1112
    :cond_6
    :goto_1
    iget-object v1, p0, Lcom/rphub/app/MainActivity$6$7;->this$1:Lcom/rphub/app/MainActivity$6;

    invoke-static {v1}, Lcom/rphub/app/MainActivity$6;->access$2(Lcom/rphub/app/MainActivity$6;)Lcom/rphub/app/MainActivity;

    move-result-object v1

    const-string v2, "\u8bf7\u5148\u8bbe\u7f6e\u9ed8\u8ba4\u5907\u4efd\u6587\u4ef6\u5939"

    invoke-static {v1, v2, v0}, Lcom/rphub/app/MainActivity;->access$14(Lcom/rphub/app/MainActivity;Ljava/lang/String;Z)V
    :try_end_7
    .catchall {:try_start_7 .. :try_end_7} :catchall_2

    return-void

    :catchall_2
    move-exception v1

    .line 1128
    iget-object v2, p0, Lcom/rphub/app/MainActivity$6$7;->this$1:Lcom/rphub/app/MainActivity$6;

    invoke-static {v2}, Lcom/rphub/app/MainActivity$6;->access$2(Lcom/rphub/app/MainActivity$6;)Lcom/rphub/app/MainActivity;

    move-result-object v2

    new-instance v3, Ljava/lang/StringBuilder;

    const-string v4, "\u5907\u4efd\u5931\u8d25\uff1a"

    invoke-direct {v3, v4}, Ljava/lang/StringBuilder;-><init>(Ljava/lang/String;)V

    invoke-virtual {v1}, Ljava/lang/Throwable;->getMessage()Ljava/lang/String;

    move-result-object v1

    invoke-virtual {v3, v1}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    invoke-virtual {v3}, Ljava/lang/StringBuilder;->toString()Ljava/lang/String;

    move-result-object v1

    invoke-static {v2, v1, v0}, Lcom/rphub/app/MainActivity;->access$14(Lcom/rphub/app/MainActivity;Ljava/lang/String;Z)V

    :goto_2
    return-void
.end method
