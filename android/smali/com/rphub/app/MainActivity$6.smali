.class Lcom/rphub/app/MainActivity$6;
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
.method public copyText(Ljava/lang/String;)Z
    .locals 1
    .annotation runtime Landroid/webkit/JavascriptInterface;
    .end annotation

    iget-object v0, p0, Lcom/rphub/app/MainActivity$6;->this$0:Lcom/rphub/app/MainActivity;
    invoke-static {v0, p1}, Lcom/rphub/app/WebViewSupport;->copyText(Landroid/content/Context;Ljava/lang/String;)Z
    move-result v0
    return v0
.end method

.method constructor <init>(Lcom/rphub/app/MainActivity;)V
    .locals 0

    .line 1
    iput-object p1, p0, Lcom/rphub/app/MainActivity$6;->this$0:Lcom/rphub/app/MainActivity;

    .line 382
    invoke-direct {p0}, Ljava/lang/Object;-><init>()V

    return-void
.end method

.method static synthetic access$0(Lcom/rphub/app/MainActivity$6;Ljava/io/InputStream;)[B
    .locals 0
    .annotation system Ldalvik/annotation/Throws;
        value = {
            Ljava/lang/Exception;
        }
    .end annotation

    .line 645
    invoke-direct {p0, p1}, Lcom/rphub/app/MainActivity$6;->readBytes(Ljava/io/InputStream;)[B

    move-result-object p0

    return-object p0
.end method

.method static synthetic access$1(Lcom/rphub/app/MainActivity$6;[BLjava/lang/String;Ljava/lang/String;)V
    .locals 0
    .annotation system Ldalvik/annotation/Throws;
        value = {
            Ljava/lang/Exception;
        }
    .end annotation

    .line 655
    invoke-direct {p0, p1, p2, p3}, Lcom/rphub/app/MainActivity$6;->saveImageBytesToGallery([BLjava/lang/String;Ljava/lang/String;)V

    return-void
.end method

.method static synthetic access$2(Lcom/rphub/app/MainActivity$6;)Lcom/rphub/app/MainActivity;
    .locals 0

    .line 382
    iget-object p0, p0, Lcom/rphub/app/MainActivity$6;->this$0:Lcom/rphub/app/MainActivity;

    return-object p0
.end method

.method private ensureImageFileName(Ljava/lang/String;Ljava/lang/String;)Ljava/lang/String;
    .locals 1

    if-eqz p1, :cond_1

    .line 727
    invoke-virtual {p1}, Ljava/lang/String;->trim()Ljava/lang/String;

    move-result-object v0

    invoke-virtual {v0}, Ljava/lang/String;->isEmpty()Z

    move-result v0

    if-eqz v0, :cond_0

    goto :goto_0

    :cond_0
    invoke-virtual {p1}, Ljava/lang/String;->trim()Ljava/lang/String;

    move-result-object p1

    goto :goto_1

    :cond_1
    :goto_0
    const-string p1, "rp-hub-image"

    :goto_1
    const-string v0, "(?i).+\\.(png|jpe?g|gif|webp|bmp)$"

    .line 728
    invoke-virtual {p1, v0}, Ljava/lang/String;->matches(Ljava/lang/String;)Z

    move-result v0

    if-eqz v0, :cond_2

    return-object p1

    :cond_2
    if-nez p2, :cond_3

    const-string p2, ""

    goto :goto_2

    .line 729
    :cond_3
    sget-object v0, Ljava/util/Locale;->ROOT:Ljava/util/Locale;

    invoke-virtual {p2, v0}, Ljava/lang/String;->toLowerCase(Ljava/util/Locale;)Ljava/lang/String;

    move-result-object p2

    :goto_2
    const-string v0, "jpeg"

    .line 730
    invoke-virtual {p2, v0}, Ljava/lang/String;->contains(Ljava/lang/CharSequence;)Z

    move-result v0

    if-nez v0, :cond_8

    const-string v0, "jpg"

    invoke-virtual {p2, v0}, Ljava/lang/String;->contains(Ljava/lang/CharSequence;)Z

    move-result v0

    if-eqz v0, :cond_4

    goto :goto_3

    :cond_4
    const-string v0, "webp"

    .line 731
    invoke-virtual {p2, v0}, Ljava/lang/String;->contains(Ljava/lang/CharSequence;)Z

    move-result v0

    if-eqz v0, :cond_5

    new-instance p2, Ljava/lang/StringBuilder;

    invoke-static {p1}, Ljava/lang/String;->valueOf(Ljava/lang/Object;)Ljava/lang/String;

    move-result-object p1

    invoke-direct {p2, p1}, Ljava/lang/StringBuilder;-><init>(Ljava/lang/String;)V

    const-string p1, ".webp"

    invoke-virtual {p2, p1}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    invoke-virtual {p2}, Ljava/lang/StringBuilder;->toString()Ljava/lang/String;

    move-result-object p1

    return-object p1

    :cond_5
    const-string v0, "gif"

    .line 732
    invoke-virtual {p2, v0}, Ljava/lang/String;->contains(Ljava/lang/CharSequence;)Z

    move-result v0

    if-eqz v0, :cond_6

    new-instance p2, Ljava/lang/StringBuilder;

    invoke-static {p1}, Ljava/lang/String;->valueOf(Ljava/lang/Object;)Ljava/lang/String;

    move-result-object p1

    invoke-direct {p2, p1}, Ljava/lang/StringBuilder;-><init>(Ljava/lang/String;)V

    const-string p1, ".gif"

    invoke-virtual {p2, p1}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    invoke-virtual {p2}, Ljava/lang/StringBuilder;->toString()Ljava/lang/String;

    move-result-object p1

    return-object p1

    :cond_6
    const-string v0, "bmp"

    .line 733
    invoke-virtual {p2, v0}, Ljava/lang/String;->contains(Ljava/lang/CharSequence;)Z

    move-result p2

    if-eqz p2, :cond_7

    new-instance p2, Ljava/lang/StringBuilder;

    invoke-static {p1}, Ljava/lang/String;->valueOf(Ljava/lang/Object;)Ljava/lang/String;

    move-result-object p1

    invoke-direct {p2, p1}, Ljava/lang/StringBuilder;-><init>(Ljava/lang/String;)V

    const-string p1, ".bmp"

    invoke-virtual {p2, p1}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    invoke-virtual {p2}, Ljava/lang/StringBuilder;->toString()Ljava/lang/String;

    move-result-object p1

    return-object p1

    .line 734
    :cond_7
    new-instance p2, Ljava/lang/StringBuilder;

    invoke-static {p1}, Ljava/lang/String;->valueOf(Ljava/lang/Object;)Ljava/lang/String;

    move-result-object p1

    invoke-direct {p2, p1}, Ljava/lang/StringBuilder;-><init>(Ljava/lang/String;)V

    const-string p1, ".png"

    invoke-virtual {p2, p1}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    invoke-virtual {p2}, Ljava/lang/StringBuilder;->toString()Ljava/lang/String;

    move-result-object p1

    return-object p1

    .line 730
    :cond_8
    :goto_3
    new-instance p2, Ljava/lang/StringBuilder;

    invoke-static {p1}, Ljava/lang/String;->valueOf(Ljava/lang/Object;)Ljava/lang/String;

    move-result-object p1

    invoke-direct {p2, p1}, Ljava/lang/StringBuilder;-><init>(Ljava/lang/String;)V

    const-string p1, ".jpg"

    invoke-virtual {p2, p1}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    invoke-virtual {p2}, Ljava/lang/StringBuilder;->toString()Ljava/lang/String;

    move-result-object p1

    return-object p1
.end method

.method private getDefaultBackupDir()Ljava/io/File;
    .locals 3

    .line 749
    new-instance v0, Ljava/io/File;

    iget-object v1, p0, Lcom/rphub/app/MainActivity$6;->this$0:Lcom/rphub/app/MainActivity;

    const/4 v2, 0x0

    invoke-virtual {v1, v2}, Lcom/rphub/app/MainActivity;->getExternalFilesDir(Ljava/lang/String;)Ljava/io/File;

    move-result-object v1

    const-string v2, "backups"

    invoke-direct {v0, v1, v2}, Ljava/io/File;-><init>(Ljava/io/File;Ljava/lang/String;)V

    .line 750
    invoke-virtual {v0}, Ljava/io/File;->exists()Z

    move-result v1

    if-nez v1, :cond_0

    .line 751
    invoke-virtual {v0}, Ljava/io/File;->mkdirs()Z

    :cond_0
    return-object v0
.end method

.method private insertImageRow(Ljava/lang/String;Ljava/lang/String;Ljava/lang/String;)Landroid/net/Uri;
    .locals 2

    .line 705
    new-instance v0, Landroid/content/ContentValues;

    invoke-direct {v0}, Landroid/content/ContentValues;-><init>()V

    const-string v1, "_display_name"

    .line 706
    invoke-virtual {v0, v1, p1}, Landroid/content/ContentValues;->put(Ljava/lang/String;Ljava/lang/String;)V

    const-string p1, "mime_type"

    .line 707
    invoke-virtual {v0, p1, p2}, Landroid/content/ContentValues;->put(Ljava/lang/String;Ljava/lang/String;)V

    const-string p1, "relative_path"

    .line 708
    invoke-virtual {v0, p1, p3}, Landroid/content/ContentValues;->put(Ljava/lang/String;Ljava/lang/String;)V

    .line 709
    iget-object p1, p0, Lcom/rphub/app/MainActivity$6;->this$0:Lcom/rphub/app/MainActivity;

    invoke-virtual {p1}, Lcom/rphub/app/MainActivity;->getContentResolver()Landroid/content/ContentResolver;

    move-result-object p1

    sget-object p2, Landroid/provider/MediaStore$Images$Media;->EXTERNAL_CONTENT_URI:Landroid/net/Uri;

    invoke-virtual {p1, p2, v0}, Landroid/content/ContentResolver;->insert(Landroid/net/Uri;Landroid/content/ContentValues;)Landroid/net/Uri;

    move-result-object p1

    return-object p1
.end method

.method private normalizeImageMime(Ljava/lang/String;Ljava/lang/String;)Ljava/lang/String;
    .locals 2

    const-string v0, ""

    if-nez p1, :cond_0

    move-object p1, v0

    goto :goto_0

    .line 738
    :cond_0
    invoke-virtual {p1}, Ljava/lang/String;->trim()Ljava/lang/String;

    move-result-object p1

    sget-object v1, Ljava/util/Locale;->ROOT:Ljava/util/Locale;

    invoke-virtual {p1, v1}, Ljava/lang/String;->toLowerCase(Ljava/util/Locale;)Ljava/lang/String;

    move-result-object p1

    :goto_0
    const-string v1, "image/"

    .line 739
    invoke-virtual {p1, v1}, Ljava/lang/String;->startsWith(Ljava/lang/String;)Z

    move-result v1

    if-eqz v1, :cond_1

    return-object p1

    :cond_1
    if-nez p2, :cond_2

    goto :goto_1

    .line 740
    :cond_2
    sget-object p1, Ljava/util/Locale;->ROOT:Ljava/util/Locale;

    invoke-virtual {p2, p1}, Ljava/lang/String;->toLowerCase(Ljava/util/Locale;)Ljava/lang/String;

    move-result-object v0

    :goto_1
    const-string p1, ".jpg"

    .line 741
    invoke-virtual {v0, p1}, Ljava/lang/String;->endsWith(Ljava/lang/String;)Z

    move-result p1

    if-nez p1, :cond_7

    const-string p1, ".jpeg"

    invoke-virtual {v0, p1}, Ljava/lang/String;->endsWith(Ljava/lang/String;)Z

    move-result p1

    if-eqz p1, :cond_3

    goto :goto_2

    :cond_3
    const-string p1, ".webp"

    .line 742
    invoke-virtual {v0, p1}, Ljava/lang/String;->endsWith(Ljava/lang/String;)Z

    move-result p1

    if-eqz p1, :cond_4

    const-string p1, "image/webp"

    return-object p1

    :cond_4
    const-string p1, ".gif"

    .line 743
    invoke-virtual {v0, p1}, Ljava/lang/String;->endsWith(Ljava/lang/String;)Z

    move-result p1

    if-eqz p1, :cond_5

    const-string p1, "image/gif"

    return-object p1

    :cond_5
    const-string p1, ".bmp"

    .line 744
    invoke-virtual {v0, p1}, Ljava/lang/String;->endsWith(Ljava/lang/String;)Z

    move-result p1

    if-eqz p1, :cond_6

    const-string p1, "image/bmp"

    return-object p1

    :cond_6
    const-string p1, "image/png"

    return-object p1

    :cond_7
    :goto_2
    const-string p1, "image/jpeg"

    return-object p1
.end method

.method private openBackupWriteTarget(Ljava/lang/String;Ljava/lang/String;)Lcom/rphub/app/MainActivity$BackupWriteSession;
    .locals 3
    .annotation system Ldalvik/annotation/Throws;
        value = {
            Ljava/lang/Exception;
        }
    .end annotation

    .line 796
    invoke-virtual {p0}, Lcom/rphub/app/MainActivity$6;->getBackupFolder()Ljava/lang/String;

    move-result-object v0

    const/4 v1, 0x0

    if-eqz v0, :cond_0

    .line 797
    invoke-virtual {v0}, Ljava/lang/String;->trim()Ljava/lang/String;

    move-result-object v2

    invoke-virtual {v2}, Ljava/lang/String;->isEmpty()Z

    move-result v2

    if-nez v2, :cond_0

    .line 799
    :try_start_0
    invoke-virtual {v0}, Ljava/lang/String;->trim()Ljava/lang/String;

    move-result-object v0

    invoke-static {v0}, Landroid/net/Uri;->parse(Ljava/lang/String;)Landroid/net/Uri;

    move-result-object v0

    .line 801
    invoke-static {v0}, Landroid/provider/DocumentsContract;->getTreeDocumentId(Landroid/net/Uri;)Ljava/lang/String;

    move-result-object v2

    .line 800
    invoke-static {v0, v2}, Landroid/provider/DocumentsContract;->buildDocumentUriUsingTree(Landroid/net/Uri;Ljava/lang/String;)Landroid/net/Uri;

    move-result-object v0

    .line 803
    iget-object v2, p0, Lcom/rphub/app/MainActivity$6;->this$0:Lcom/rphub/app/MainActivity;

    invoke-virtual {v2}, Lcom/rphub/app/MainActivity;->getContentResolver()Landroid/content/ContentResolver;

    move-result-object v2

    .line 802
    invoke-static {v2, v0, p2, p1}, Landroid/provider/DocumentsContract;->createDocument(Landroid/content/ContentResolver;Landroid/net/Uri;Ljava/lang/String;Ljava/lang/String;)Landroid/net/Uri;

    move-result-object p2

    if-eqz p2, :cond_0

    .line 805
    iget-object v0, p0, Lcom/rphub/app/MainActivity$6;->this$0:Lcom/rphub/app/MainActivity;

    invoke-virtual {v0}, Lcom/rphub/app/MainActivity;->getContentResolver()Landroid/content/ContentResolver;

    move-result-object v0

    invoke-virtual {v0, p2}, Landroid/content/ContentResolver;->openOutputStream(Landroid/net/Uri;)Ljava/io/OutputStream;

    move-result-object v0

    if-eqz v0, :cond_0

    .line 806
    new-instance v2, Lcom/rphub/app/MainActivity$BackupWriteSession;

    invoke-direct {v2, v0, v1, p2}, Lcom/rphub/app/MainActivity$BackupWriteSession;-><init>(Ljava/io/OutputStream;Ljava/io/File;Landroid/net/Uri;)V
    :try_end_0
    .catchall {:try_start_0 .. :try_end_0} :catchall_0

    return-object v2

    :catchall_0
    move-exception p2

    .line 809
    new-instance v0, Ljava/lang/StringBuilder;

    const-string v2, "\u7528\u6237\u81ea\u5b9a\u4e49\u5907\u4efd\u76ee\u5f55\u6253\u5f00\u5931\u8d25\uff0c\u56de\u9000\u9ed8\u8ba4\u76ee\u5f55: "

    invoke-direct {v0, v2}, Ljava/lang/StringBuilder;-><init>(Ljava/lang/String;)V

    invoke-virtual {p2}, Ljava/lang/Throwable;->getMessage()Ljava/lang/String;

    move-result-object p2

    invoke-virtual {v0, p2}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    invoke-virtual {v0}, Ljava/lang/StringBuilder;->toString()Ljava/lang/String;

    move-result-object p2

    const-string v0, "RPHub"

    invoke-static {v0, p2}, Landroid/util/Log;->w(Ljava/lang/String;Ljava/lang/String;)I

    .line 813
    :cond_0
    new-instance p2, Ljava/io/File;

    invoke-direct {p0}, Lcom/rphub/app/MainActivity$6;->getDefaultBackupDir()Ljava/io/File;

    move-result-object v0

    invoke-direct {p2, v0, p1}, Ljava/io/File;-><init>(Ljava/io/File;Ljava/lang/String;)V

    .line 814
    new-instance p1, Lcom/rphub/app/MainActivity$BackupWriteSession;

    new-instance v0, Ljava/io/FileOutputStream;

    invoke-direct {v0, p2}, Ljava/io/FileOutputStream;-><init>(Ljava/io/File;)V

    invoke-direct {p1, v0, p2, v1}, Lcom/rphub/app/MainActivity$BackupWriteSession;-><init>(Ljava/io/OutputStream;Ljava/io/File;Landroid/net/Uri;)V

    return-object p1
.end method

.method private openDownloadsWriteTarget(Ljava/lang/String;Ljava/lang/String;)Lcom/rphub/app/MainActivity$BackupWriteSession;
    .locals 3
    .annotation system Ldalvik/annotation/Throws;
        value = {
            Ljava/lang/Exception;
        }
    .end annotation

    .line 770
    sget v0, Landroid/os/Build$VERSION;->SDK_INT:I

    const/4 v1, 0x0

    const/16 v2, 0x1d

    if-lt v0, v2, :cond_2

    .line 771
    new-instance v0, Landroid/content/ContentValues;

    invoke-direct {v0}, Landroid/content/ContentValues;-><init>()V

    const-string v2, "_display_name"

    .line 772
    invoke-virtual {v0, v2, p1}, Landroid/content/ContentValues;->put(Ljava/lang/String;Ljava/lang/String;)V

    const-string p1, "mime_type"

    .line 773
    invoke-virtual {v0, p1, p2}, Landroid/content/ContentValues;->put(Ljava/lang/String;Ljava/lang/String;)V

    .line 774
    const-string p1, "Download/RP\u672c\u5730\u7248/\u6570\u636e\u5907\u4efd"

    const-string p2, "relative_path"

    invoke-virtual {v0, p2, p1}, Landroid/content/ContentValues;->put(Ljava/lang/String;Ljava/lang/String;)V

    .line 775
    iget-object p1, p0, Lcom/rphub/app/MainActivity$6;->this$0:Lcom/rphub/app/MainActivity;

    invoke-virtual {p1}, Lcom/rphub/app/MainActivity;->getContentResolver()Landroid/content/ContentResolver;

    move-result-object p1

    sget-object p2, Landroid/provider/MediaStore$Downloads;->EXTERNAL_CONTENT_URI:Landroid/net/Uri;

    invoke-virtual {p1, p2, v0}, Landroid/content/ContentResolver;->insert(Landroid/net/Uri;Landroid/content/ContentValues;)Landroid/net/Uri;

    move-result-object p1

    if-eqz p1, :cond_1

    .line 777
    iget-object p2, p0, Lcom/rphub/app/MainActivity$6;->this$0:Lcom/rphub/app/MainActivity;

    invoke-virtual {p2}, Lcom/rphub/app/MainActivity;->getContentResolver()Landroid/content/ContentResolver;

    move-result-object p2

    invoke-virtual {p2, p1}, Landroid/content/ContentResolver;->openOutputStream(Landroid/net/Uri;)Ljava/io/OutputStream;

    move-result-object p2

    if-eqz p2, :cond_0

    .line 785
    new-instance v0, Lcom/rphub/app/MainActivity$BackupWriteSession;

    invoke-direct {v0, p2, v1, p1}, Lcom/rphub/app/MainActivity$BackupWriteSession;-><init>(Ljava/io/OutputStream;Ljava/io/File;Landroid/net/Uri;)V

    return-object v0

    .line 780
    :cond_0
    :try_start_0
    iget-object p2, p0, Lcom/rphub/app/MainActivity$6;->this$0:Lcom/rphub/app/MainActivity;

    invoke-virtual {p2}, Lcom/rphub/app/MainActivity;->getContentResolver()Landroid/content/ContentResolver;

    move-result-object p2

    invoke-virtual {p2, p1, v1, v1}, Landroid/content/ContentResolver;->delete(Landroid/net/Uri;Ljava/lang/String;[Ljava/lang/String;)I
    :try_end_0
    .catchall {:try_start_0 .. :try_end_0} :catchall_0

    .line 783
    :catchall_0
    new-instance p1, Ljava/lang/IllegalStateException;

    const-string p2, "\u65e0\u6cd5\u6253\u5f00\u4e0b\u8f7d\u76ee\u5f55\u6587\u4ef6"

    invoke-direct {p1, p2}, Ljava/lang/IllegalStateException;-><init>(Ljava/lang/String;)V

    throw p1

    .line 776
    :cond_1
    new-instance p1, Ljava/lang/IllegalStateException;

    const-string p2, "\u65e0\u6cd5\u5728\u4e0b\u8f7d\u76ee\u5f55\u521b\u5efa\u6587\u4ef6"

    invoke-direct {p1, p2}, Ljava/lang/IllegalStateException;-><init>(Ljava/lang/String;)V

    throw p1

    .line 787
    :cond_2
    const-string v0, "Download/RP\u672c\u5730\u7248/\u6570\u636e\u5907\u4efd"

    invoke-static {v0}, Landroid/os/Environment;->getExternalStoragePublicDirectory(Ljava/lang/String;)Ljava/io/File;

    move-result-object v0

    .line 788
    invoke-virtual {v0}, Ljava/io/File;->exists()Z

    move-result v2

    if-nez v2, :cond_4

    invoke-virtual {v0}, Ljava/io/File;->mkdirs()Z

    move-result v2

    if-eqz v2, :cond_3

    goto :goto_0

    .line 789
    :cond_3
    new-instance p1, Ljava/lang/IllegalStateException;

    const-string p2, "\u65e0\u6cd5\u521b\u5efa\u4e0b\u8f7d\u76ee\u5f55"

    invoke-direct {p1, p2}, Ljava/lang/IllegalStateException;-><init>(Ljava/lang/String;)V

    throw p1

    .line 791
    :cond_4
    :goto_0
    new-instance v2, Ljava/io/File;

    invoke-direct {v2, v0, p1}, Ljava/io/File;-><init>(Ljava/io/File;Ljava/lang/String;)V

    .line 792
    new-instance p1, Lcom/rphub/app/MainActivity$BackupWriteSession;

    new-instance v0, Ljava/io/FileOutputStream;

    invoke-direct {v0, v2}, Ljava/io/FileOutputStream;-><init>(Ljava/io/File;)V

    invoke-direct {p1, v0, v2, v1, p2}, Lcom/rphub/app/MainActivity$BackupWriteSession;-><init>(Ljava/io/OutputStream;Ljava/io/File;Landroid/net/Uri;Ljava/lang/String;)V

    return-object p1
.end method

.method private readBytes(Ljava/io/InputStream;)[B
    .locals 4
    .annotation system Ldalvik/annotation/Throws;
        value = {
            Ljava/lang/Exception;
        }
    .end annotation

    .line 646
    new-instance v0, Ljava/io/ByteArrayOutputStream;

    invoke-direct {v0}, Ljava/io/ByteArrayOutputStream;-><init>()V

    const/16 v1, 0x2000

    new-array v1, v1, [B

    .line 649
    :goto_0
    invoke-virtual {p1, v1}, Ljava/io/InputStream;->read([B)I

    move-result v2

    const/4 v3, -0x1

    if-ne v2, v3, :cond_0

    .line 652
    invoke-virtual {v0}, Ljava/io/ByteArrayOutputStream;->toByteArray()[B

    move-result-object p1

    return-object p1

    :cond_0
    const/4 v3, 0x0

    .line 650
    invoke-virtual {v0, v1, v3, v2}, Ljava/io/ByteArrayOutputStream;->write([BII)V

    goto :goto_0
.end method

.method private saveImageBytesToGallery([BLjava/lang/String;Ljava/lang/String;)V
    .locals 6
    .annotation system Ldalvik/annotation/Throws;
        value = {
            Ljava/lang/Exception;
        }
    .end annotation

    if-eqz p1, :cond_a

    .line 656
    array-length v0, p1

    if-eqz v0, :cond_a

    .line 657
    sget v0, Landroid/os/Build$VERSION;->SDK_INT:I

    const/16 v1, 0x1d

    const-string v2, "\u5df2\u4fdd\u5b58\u5230\u76f8\u518c\uff1aRP-Hub/"

    const/4 v3, 0x1

    const/4 v4, 0x0

    if-lt v0, v1, :cond_6

    .line 658
    new-instance v0, Ljava/lang/StringBuilder;

    sget-object v1, Landroid/os/Environment;->DIRECTORY_PICTURES:Ljava/lang/String;

    invoke-static {v1}, Ljava/lang/String;->valueOf(Ljava/lang/Object;)Ljava/lang/String;

    move-result-object v1

    invoke-direct {v0, v1}, Ljava/lang/StringBuilder;-><init>(Ljava/lang/String;)V

    const-string v1, "/RP-Hub"

    invoke-virtual {v0, v1}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    invoke-virtual {v0}, Ljava/lang/StringBuilder;->toString()Ljava/lang/String;

    move-result-object v0

    .line 663
    :try_start_0
    invoke-direct {p0, p2, p3, v0}, Lcom/rphub/app/MainActivity$6;->insertImageRow(Ljava/lang/String;Ljava/lang/String;Ljava/lang/String;)Landroid/net/Uri;

    move-result-object v1
    :try_end_0
    .catchall {:try_start_0 .. :try_end_0} :catchall_0

    move-object v5, v4

    goto :goto_0

    :catchall_0
    move-exception v1

    move-object v5, v1

    move-object v1, v4

    :goto_0
    if-nez v1, :cond_0

    .line 673
    invoke-direct {p0, p2}, Lcom/rphub/app/MainActivity$6;->uniquifyImageName(Ljava/lang/String;)Ljava/lang/String;

    move-result-object p2

    .line 675
    :try_start_1
    invoke-direct {p0, p2, p3, v0}, Lcom/rphub/app/MainActivity$6;->insertImageRow(Ljava/lang/String;Ljava/lang/String;Ljava/lang/String;)Landroid/net/Uri;

    move-result-object v1
    :try_end_1
    .catchall {:try_start_1 .. :try_end_1} :catchall_1

    goto :goto_1

    :catchall_1
    move-exception p1

    .line 678
    throw p1

    :cond_0
    :goto_1
    if-eqz v1, :cond_5

    .line 682
    :try_start_2
    iget-object p3, p0, Lcom/rphub/app/MainActivity$6;->this$0:Lcom/rphub/app/MainActivity;

    invoke-virtual {p3}, Lcom/rphub/app/MainActivity;->getContentResolver()Landroid/content/ContentResolver;

    move-result-object p3

    invoke-virtual {p3, v1}, Landroid/content/ContentResolver;->openOutputStream(Landroid/net/Uri;)Ljava/io/OutputStream;

    move-result-object p3
    :try_end_2
    .catchall {:try_start_2 .. :try_end_2} :catchall_3

    if-eqz p3, :cond_2

    .line 684
    :try_start_3
    invoke-virtual {p3, p1}, Ljava/io/OutputStream;->write([B)V

    .line 685
    invoke-virtual {p3}, Ljava/io/OutputStream;->flush()V
    :try_end_3
    .catchall {:try_start_3 .. :try_end_3} :catchall_2

    if-eqz p3, :cond_1

    .line 686
    :try_start_4
    invoke-virtual {p3}, Ljava/io/OutputStream;->close()V
    :try_end_4
    .catchall {:try_start_4 .. :try_end_4} :catchall_3

    .line 687
    :cond_1
    iget-object p1, p0, Lcom/rphub/app/MainActivity$6;->this$0:Lcom/rphub/app/MainActivity;

    new-instance p3, Ljava/lang/StringBuilder;

    invoke-direct {p3, v2}, Ljava/lang/StringBuilder;-><init>(Ljava/lang/String;)V

    invoke-virtual {p3, p2}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    invoke-virtual {p3}, Ljava/lang/StringBuilder;->toString()Ljava/lang/String;

    move-result-object p2

    invoke-static {p1, p2, v3}, Lcom/rphub/app/MainActivity;->access$14(Lcom/rphub/app/MainActivity;Ljava/lang/String;Z)V

    return-void

    :catchall_2
    move-exception p1

    move-object v4, p1

    goto :goto_2

    .line 683
    :cond_2
    :try_start_5
    new-instance p1, Ljava/lang/IllegalStateException;

    const-string p2, "\u65e0\u6cd5\u5199\u5165\u76f8\u518c\u6587\u4ef6"

    invoke-direct {p1, p2}, Ljava/lang/IllegalStateException;-><init>(Ljava/lang/String;)V

    throw p1
    :try_end_5
    .catchall {:try_start_5 .. :try_end_5} :catchall_2

    :goto_2
    if-eqz p3, :cond_3

    .line 686
    :try_start_6
    invoke-virtual {p3}, Ljava/io/OutputStream;->close()V

    :cond_3
    throw v4
    :try_end_6
    .catchall {:try_start_6 .. :try_end_6} :catchall_3

    :catchall_3
    move-exception p1

    if-eqz v4, :cond_4

    move-object p1, v4

    :cond_4
    throw p1

    .line 681
    :cond_5
    new-instance p1, Ljava/lang/IllegalStateException;

    const-string p2, "\u65e0\u6cd5\u521b\u5efa\u76f8\u518c\u6587\u4ef6"

    invoke-direct {p1, p2}, Ljava/lang/IllegalStateException;-><init>(Ljava/lang/String;)V

    throw p1

    .line 690
    :cond_6
    new-instance v0, Ljava/io/File;

    .line 691
    sget-object v1, Landroid/os/Environment;->DIRECTORY_PICTURES:Ljava/lang/String;

    invoke-static {v1}, Landroid/os/Environment;->getExternalStoragePublicDirectory(Ljava/lang/String;)Ljava/io/File;

    move-result-object v1

    const-string v5, "RP-Hub"

    .line 690
    invoke-direct {v0, v1, v5}, Ljava/io/File;-><init>(Ljava/io/File;Ljava/lang/String;)V

    .line 693
    invoke-virtual {v0}, Ljava/io/File;->exists()Z

    move-result v1

    if-nez v1, :cond_8

    invoke-virtual {v0}, Ljava/io/File;->mkdirs()Z

    move-result v1

    if-eqz v1, :cond_7

    goto :goto_3

    :cond_7
    new-instance p1, Ljava/lang/IllegalStateException;

    const-string p2, "\u65e0\u6cd5\u521b\u5efa\u76f8\u518c\u76ee\u5f55"

    invoke-direct {p1, p2}, Ljava/lang/IllegalStateException;-><init>(Ljava/lang/String;)V

    throw p1

    .line 694
    :cond_8
    :goto_3
    new-instance v1, Ljava/io/File;

    invoke-direct {v1, v0, p2}, Ljava/io/File;-><init>(Ljava/io/File;Ljava/lang/String;)V

    .line 695
    :try_start_7
    new-instance v0, Ljava/io/FileOutputStream;

    invoke-direct {v0, v1}, Ljava/io/FileOutputStream;-><init>(Ljava/io/File;)V
    :try_end_7
    .catchall {:try_start_7 .. :try_end_7} :catchall_5

    .line 696
    :try_start_8
    invoke-virtual {v0, p1}, Ljava/io/FileOutputStream;->write([B)V

    .line 697
    invoke-virtual {v0}, Ljava/io/FileOutputStream;->flush()V
    :try_end_8
    .catchall {:try_start_8 .. :try_end_8} :catchall_4

    .line 698
    :try_start_9
    invoke-virtual {v0}, Ljava/io/FileOutputStream;->close()V
    :try_end_9
    .catchall {:try_start_9 .. :try_end_9} :catchall_5

    .line 699
    iget-object p1, p0, Lcom/rphub/app/MainActivity$6;->this$0:Lcom/rphub/app/MainActivity;

    new-array v0, v3, [Ljava/lang/String;

    invoke-virtual {v1}, Ljava/io/File;->getAbsolutePath()Ljava/lang/String;

    move-result-object v1

    const/4 v5, 0x0

    aput-object v1, v0, v5

    new-array v1, v3, [Ljava/lang/String;

    aput-object p3, v1, v5

    invoke-static {p1, v0, v1, v4}, Landroid/media/MediaScannerConnection;->scanFile(Landroid/content/Context;[Ljava/lang/String;[Ljava/lang/String;Landroid/media/MediaScannerConnection$OnScanCompletedListener;)V

    .line 700
    iget-object p1, p0, Lcom/rphub/app/MainActivity$6;->this$0:Lcom/rphub/app/MainActivity;

    new-instance p3, Ljava/lang/StringBuilder;

    invoke-direct {p3, v2}, Ljava/lang/StringBuilder;-><init>(Ljava/lang/String;)V

    invoke-virtual {p3, p2}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    invoke-virtual {p3}, Ljava/lang/StringBuilder;->toString()Ljava/lang/String;

    move-result-object p2

    invoke-static {p1, p2, v3}, Lcom/rphub/app/MainActivity;->access$14(Lcom/rphub/app/MainActivity;Ljava/lang/String;Z)V

    return-void

    :catchall_4
    move-exception p1

    move-object v4, p1

    .line 698
    :try_start_a
    invoke-virtual {v0}, Ljava/io/FileOutputStream;->close()V

    throw v4
    :try_end_a
    .catchall {:try_start_a .. :try_end_a} :catchall_5

    :catchall_5
    move-exception p1

    if-eqz v4, :cond_9

    move-object p1, v4

    :cond_9
    throw p1

    .line 656
    :cond_a
    new-instance p1, Ljava/lang/IllegalStateException;

    const-string p2, "\u56fe\u7247\u5185\u5bb9\u4e3a\u7a7a"

    invoke-direct {p1, p2}, Ljava/lang/IllegalStateException;-><init>(Ljava/lang/String;)V

    throw p1
.end method

.method private uniquifyImageName(Ljava/lang/String;)Ljava/lang/String;
    .locals 4

    if-eqz p1, :cond_1

    .line 714
    invoke-virtual {p1}, Ljava/lang/String;->trim()Ljava/lang/String;

    move-result-object v0

    invoke-virtual {v0}, Ljava/lang/String;->isEmpty()Z

    move-result v0

    if-eqz v0, :cond_0

    goto :goto_0

    :cond_0
    invoke-virtual {p1}, Ljava/lang/String;->trim()Ljava/lang/String;

    move-result-object p1

    goto :goto_1

    :cond_1
    :goto_0
    const-string p1, "rp-hub-image"

    :goto_1
    const/16 v0, 0x2e

    .line 716
    invoke-virtual {p1, v0}, Ljava/lang/String;->lastIndexOf(I)I

    move-result v0

    if-lez v0, :cond_2

    .line 718
    invoke-virtual {p1, v0}, Ljava/lang/String;->substring(I)Ljava/lang/String;

    move-result-object v1

    const/4 v2, 0x0

    .line 719
    invoke-virtual {p1, v2, v0}, Ljava/lang/String;->substring(II)Ljava/lang/String;

    move-result-object p1

    goto :goto_2

    :cond_2
    const-string v1, ""

    .line 721
    :goto_2
    new-instance v0, Ljava/text/SimpleDateFormat;

    sget-object v2, Ljava/util/Locale;->US:Ljava/util/Locale;

    const-string v3, "yyyyMMdd-HHmmss"

    invoke-direct {v0, v3, v2}, Ljava/text/SimpleDateFormat;-><init>(Ljava/lang/String;Ljava/util/Locale;)V

    .line 722
    new-instance v2, Ljava/util/Date;

    invoke-direct {v2}, Ljava/util/Date;-><init>()V

    invoke-virtual {v0, v2}, Ljava/text/SimpleDateFormat;->format(Ljava/util/Date;)Ljava/lang/String;

    move-result-object v0

    .line 723
    new-instance v2, Ljava/lang/StringBuilder;

    invoke-static {p1}, Ljava/lang/String;->valueOf(Ljava/lang/Object;)Ljava/lang/String;

    move-result-object p1

    invoke-direct {v2, p1}, Ljava/lang/StringBuilder;-><init>(Ljava/lang/String;)V

    const-string p1, "_"

    invoke-virtual {v2, p1}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    invoke-virtual {v2, v0}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    invoke-virtual {v2, v1}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    invoke-virtual {v2}, Ljava/lang/StringBuilder;->toString()Ljava/lang/String;

    move-result-object p1

    return-object p1
.end method


# virtual methods
.method public abortBackupWrite(Ljava/lang/String;)V
    .locals 2
    .annotation runtime Landroid/webkit/JavascriptInterface;
    .end annotation

    .line 906
    iget-object v0, p0, Lcom/rphub/app/MainActivity$6;->this$0:Lcom/rphub/app/MainActivity;

    invoke-static {v0}, Lcom/rphub/app/MainActivity;->access$21(Lcom/rphub/app/MainActivity;)Ljava/util/HashMap;

    move-result-object v0

    monitor-enter v0

    .line 907
    :try_start_0
    iget-object v1, p0, Lcom/rphub/app/MainActivity$6;->this$0:Lcom/rphub/app/MainActivity;

    invoke-static {v1}, Lcom/rphub/app/MainActivity;->access$21(Lcom/rphub/app/MainActivity;)Ljava/util/HashMap;

    move-result-object v1

    invoke-virtual {v1, p1}, Ljava/util/HashMap;->remove(Ljava/lang/Object;)Ljava/lang/Object;

    move-result-object p1

    check-cast p1, Lcom/rphub/app/MainActivity$BackupWriteSession;

    .line 906
    monitor-exit v0
    :try_end_0
    .catchall {:try_start_0 .. :try_end_0} :catchall_0

    .line 911
    iget-object v0, p0, Lcom/rphub/app/MainActivity$6;->this$0:Lcom/rphub/app/MainActivity;

    invoke-static {v0, p1}, Lcom/rphub/app/MainActivity;->access$22(Lcom/rphub/app/MainActivity;Lcom/rphub/app/MainActivity$BackupWriteSession;)V

    return-void

    :catchall_0
    move-exception p1

    .line 906
    :try_start_1
    monitor-exit v0
    :try_end_1
    .catchall {:try_start_1 .. :try_end_1} :catchall_0

    throw p1
.end method

.method public beginPickerSave(Ljava/lang/String;Ljava/lang/String;)V
    .locals 2
    .annotation runtime Landroid/webkit/JavascriptInterface;
    .end annotation

    .line 556
    :try_start_0
    iget-object v0, p0, Lcom/rphub/app/MainActivity$6;->this$0:Lcom/rphub/app/MainActivity;

    invoke-static {v0, p1}, Lcom/rphub/app/MainActivity;->access$15(Lcom/rphub/app/MainActivity;Ljava/lang/String;)Ljava/lang/String;

    move-result-object p1

    if-eqz p2, :cond_1

    .line 557
    invoke-virtual {p2}, Ljava/lang/String;->trim()Ljava/lang/String;

    move-result-object v0

    invoke-virtual {v0}, Ljava/lang/String;->isEmpty()Z

    move-result v0

    if-eqz v0, :cond_0

    goto :goto_0

    .line 558
    :cond_0
    invoke-virtual {p2}, Ljava/lang/String;->trim()Ljava/lang/String;

    move-result-object p2

    goto :goto_1

    :cond_1
    :goto_0
    const-string p2, "application/octet-stream"

    .line 559
    :goto_1
    iget-object v0, p0, Lcom/rphub/app/MainActivity$6;->this$0:Lcom/rphub/app/MainActivity;

    new-instance v1, Lcom/rphub/app/MainActivity$6$4;

    invoke-direct {v1, p0, p2, p1}, Lcom/rphub/app/MainActivity$6$4;-><init>(Lcom/rphub/app/MainActivity$6;Ljava/lang/String;Ljava/lang/String;)V

    invoke-virtual {v0, v1}, Lcom/rphub/app/MainActivity;->runOnUiThread(Ljava/lang/Runnable;)V
    :try_end_0
    .catchall {:try_start_0 .. :try_end_0} :catchall_0

    goto :goto_2

    .line 580
    :catchall_0
    iget-object p1, p0, Lcom/rphub/app/MainActivity$6;->this$0:Lcom/rphub/app/MainActivity;

    invoke-static {p1}, Lcom/rphub/app/MainActivity;->access$20(Lcom/rphub/app/MainActivity;)V

    :goto_2
    return-void
.end method

.method public chooseBackupFolder()V
    .locals 2
    .annotation runtime Landroid/webkit/JavascriptInterface;
    .end annotation

    .line 916
    iget-object v0, p0, Lcom/rphub/app/MainActivity$6;->this$0:Lcom/rphub/app/MainActivity;

    new-instance v1, Lcom/rphub/app/MainActivity$6$6;

    invoke-direct {v1, p0}, Lcom/rphub/app/MainActivity$6$6;-><init>(Lcom/rphub/app/MainActivity$6;)V

    invoke-virtual {v0, v1}, Lcom/rphub/app/MainActivity;->runOnUiThread(Ljava/lang/Runnable;)V

    return-void
.end method

.method public clearPatchCacheBeforeReload()V
    .locals 3
    .annotation runtime Landroid/webkit/JavascriptInterface;
    .end annotation

    .line 450
    :try_start_0
    iget-object v0, p0, Lcom/rphub/app/MainActivity$6;->this$0:Lcom/rphub/app/MainActivity;

    invoke-virtual {v0}, Lcom/rphub/app/MainActivity;->getApplicationContext()Landroid/content/Context;

    move-result-object v0

    invoke-static {v0}, Lcom/rphub/app/PatchEngine;->clearPatchCache(Landroid/content/Context;)V
    :try_end_0
    .catchall {:try_start_0 .. :try_end_0} :catchall_0

    goto :goto_0

    :catchall_0
    move-exception v0

    const-string v1, "RPHubPatch"

    const-string v2, "bridge clearPatchCache failed"

    .line 452
    invoke-static {v1, v2, v0}, Landroid/util/Log;->w(Ljava/lang/String;Ljava/lang/String;Ljava/lang/Throwable;)I

    :goto_0
    return-void
.end method

.method public createBackupFile(Ljava/lang/String;Ljava/lang/String;)Ljava/lang/String;
    .locals 3
    .annotation runtime Landroid/webkit/JavascriptInterface;
    .end annotation

    .line 820
    :try_start_0
    iget-object v0, p0, Lcom/rphub/app/MainActivity$6;->this$0:Lcom/rphub/app/MainActivity;

    invoke-static {v0, p1}, Lcom/rphub/app/MainActivity;->access$15(Lcom/rphub/app/MainActivity;Ljava/lang/String;)Ljava/lang/String;

    move-result-object p1

    if-eqz p2, :cond_1

    .line 821
    invoke-virtual {p2}, Ljava/lang/String;->trim()Ljava/lang/String;

    move-result-object v0

    invoke-virtual {v0}, Ljava/lang/String;->isEmpty()Z

    move-result v0

    if-eqz v0, :cond_0

    goto :goto_0

    .line 822
    :cond_0
    invoke-virtual {p2}, Ljava/lang/String;->trim()Ljava/lang/String;

    move-result-object p2

    goto :goto_1

    :cond_1
    :goto_0
    const-string p2, "application/octet-stream"

    .line 823
    :goto_1
    new-instance v0, Ljava/lang/StringBuilder;

    const-string v1, "backup-"

    invoke-direct {v0, v1}, Ljava/lang/StringBuilder;-><init>(Ljava/lang/String;)V

    invoke-static {}, Ljava/lang/System;->nanoTime()J

    move-result-wide v1

    invoke-virtual {v0, v1, v2}, Ljava/lang/StringBuilder;->append(J)Ljava/lang/StringBuilder;

    invoke-virtual {v0}, Ljava/lang/StringBuilder;->toString()Ljava/lang/String;

    move-result-object v0

    .line 824
    invoke-direct {p0, p1, p2}, Lcom/rphub/app/MainActivity$6;->openBackupWriteTarget(Ljava/lang/String;Ljava/lang/String;)Lcom/rphub/app/MainActivity$BackupWriteSession;

    move-result-object p1

    .line 825
    iget-object p2, p0, Lcom/rphub/app/MainActivity$6;->this$0:Lcom/rphub/app/MainActivity;

    invoke-static {p2}, Lcom/rphub/app/MainActivity;->access$21(Lcom/rphub/app/MainActivity;)Ljava/util/HashMap;

    move-result-object p2

    monitor-enter p2
    :try_end_0
    .catchall {:try_start_0 .. :try_end_0} :catchall_1

    .line 826
    :try_start_1
    iget-object v1, p0, Lcom/rphub/app/MainActivity$6;->this$0:Lcom/rphub/app/MainActivity;

    invoke-static {v1}, Lcom/rphub/app/MainActivity;->access$21(Lcom/rphub/app/MainActivity;)Ljava/util/HashMap;

    move-result-object v1

    invoke-virtual {v1, v0, p1}, Ljava/util/HashMap;->put(Ljava/lang/Object;Ljava/lang/Object;)Ljava/lang/Object;

    .line 825
    monitor-exit p2
    :try_end_1
    .catchall {:try_start_1 .. :try_end_1} :catchall_0

    .line 828
    :try_start_2
    new-instance p1, Ljava/lang/StringBuilder;

    const-string p2, "OK:"

    invoke-direct {p1, p2}, Ljava/lang/StringBuilder;-><init>(Ljava/lang/String;)V

    invoke-virtual {p1, v0}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    invoke-virtual {p1}, Ljava/lang/StringBuilder;->toString()Ljava/lang/String;

    move-result-object p1
    :try_end_2
    .catchall {:try_start_2 .. :try_end_2} :catchall_1

    return-object p1

    :catchall_0
    move-exception p1

    .line 825
    :try_start_3
    monitor-exit p2
    :try_end_3
    .catchall {:try_start_3 .. :try_end_3} :catchall_0

    :try_start_4
    throw p1
    :try_end_4
    .catchall {:try_start_4 .. :try_end_4} :catchall_1

    :catchall_1
    move-exception p1

    .line 830
    new-instance p2, Ljava/lang/StringBuilder;

    const-string v0, "ERR:"

    invoke-direct {p2, v0}, Ljava/lang/StringBuilder;-><init>(Ljava/lang/String;)V

    invoke-virtual {p1}, Ljava/lang/Throwable;->getMessage()Ljava/lang/String;

    move-result-object v0

    if-nez v0, :cond_2

    invoke-virtual {p1}, Ljava/lang/Throwable;->toString()Ljava/lang/String;

    move-result-object p1

    goto :goto_2

    :cond_2
    invoke-virtual {p1}, Ljava/lang/Throwable;->getMessage()Ljava/lang/String;

    move-result-object p1

    :goto_2
    invoke-virtual {p2, p1}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    invoke-virtual {p2}, Ljava/lang/StringBuilder;->toString()Ljava/lang/String;

    move-result-object p1

    return-object p1
.end method

.method public createBackupFileToDownloads(Ljava/lang/String;Ljava/lang/String;)Ljava/lang/String;
    .locals 3
    .annotation runtime Landroid/webkit/JavascriptInterface;
    .end annotation

    .line 841
    :try_start_0
    iget-object v0, p0, Lcom/rphub/app/MainActivity$6;->this$0:Lcom/rphub/app/MainActivity;

    invoke-static {v0, p1}, Lcom/rphub/app/MainActivity;->access$15(Lcom/rphub/app/MainActivity;Ljava/lang/String;)Ljava/lang/String;

    move-result-object p1

    if-eqz p2, :cond_1

    .line 842
    invoke-virtual {p2}, Ljava/lang/String;->trim()Ljava/lang/String;

    move-result-object v0

    invoke-virtual {v0}, Ljava/lang/String;->isEmpty()Z

    move-result v0

    if-eqz v0, :cond_0

    goto :goto_0

    .line 843
    :cond_0
    invoke-virtual {p2}, Ljava/lang/String;->trim()Ljava/lang/String;

    move-result-object p2

    goto :goto_1

    :cond_1
    :goto_0
    const-string p2, "application/octet-stream"

    .line 844
    :goto_1
    new-instance v0, Ljava/lang/StringBuilder;

    const-string v1, "backup-"

    invoke-direct {v0, v1}, Ljava/lang/StringBuilder;-><init>(Ljava/lang/String;)V

    invoke-static {}, Ljava/lang/System;->nanoTime()J

    move-result-wide v1

    invoke-virtual {v0, v1, v2}, Ljava/lang/StringBuilder;->append(J)Ljava/lang/StringBuilder;

    invoke-virtual {v0}, Ljava/lang/StringBuilder;->toString()Ljava/lang/String;

    move-result-object v0

    .line 845
    invoke-direct {p0, p1, p2}, Lcom/rphub/app/MainActivity$6;->openDownloadsWriteTarget(Ljava/lang/String;Ljava/lang/String;)Lcom/rphub/app/MainActivity$BackupWriteSession;

    move-result-object p1

    .line 846
    iget-object p2, p0, Lcom/rphub/app/MainActivity$6;->this$0:Lcom/rphub/app/MainActivity;

    invoke-static {p2}, Lcom/rphub/app/MainActivity;->access$21(Lcom/rphub/app/MainActivity;)Ljava/util/HashMap;

    move-result-object p2

    monitor-enter p2
    :try_end_0
    .catchall {:try_start_0 .. :try_end_0} :catchall_1

    .line 847
    :try_start_1
    iget-object v1, p0, Lcom/rphub/app/MainActivity$6;->this$0:Lcom/rphub/app/MainActivity;

    invoke-static {v1}, Lcom/rphub/app/MainActivity;->access$21(Lcom/rphub/app/MainActivity;)Ljava/util/HashMap;

    move-result-object v1

    invoke-virtual {v1, v0, p1}, Ljava/util/HashMap;->put(Ljava/lang/Object;Ljava/lang/Object;)Ljava/lang/Object;

    .line 846
    monitor-exit p2
    :try_end_1
    .catchall {:try_start_1 .. :try_end_1} :catchall_0

    .line 849
    :try_start_2
    new-instance p1, Ljava/lang/StringBuilder;

    const-string p2, "OK:"

    invoke-direct {p1, p2}, Ljava/lang/StringBuilder;-><init>(Ljava/lang/String;)V

    invoke-virtual {p1, v0}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    invoke-virtual {p1}, Ljava/lang/StringBuilder;->toString()Ljava/lang/String;

    move-result-object p1
    :try_end_2
    .catchall {:try_start_2 .. :try_end_2} :catchall_1

    return-object p1

    :catchall_0
    move-exception p1

    .line 846
    :try_start_3
    monitor-exit p2
    :try_end_3
    .catchall {:try_start_3 .. :try_end_3} :catchall_0

    :try_start_4
    throw p1
    :try_end_4
    .catchall {:try_start_4 .. :try_end_4} :catchall_1

    :catchall_1
    move-exception p1

    .line 851
    new-instance p2, Ljava/lang/StringBuilder;

    const-string v0, "ERR:"

    invoke-direct {p2, v0}, Ljava/lang/StringBuilder;-><init>(Ljava/lang/String;)V

    invoke-virtual {p1}, Ljava/lang/Throwable;->getMessage()Ljava/lang/String;

    move-result-object v0

    if-nez v0, :cond_2

    invoke-virtual {p1}, Ljava/lang/Throwable;->toString()Ljava/lang/String;

    move-result-object p1

    goto :goto_2

    :cond_2
    invoke-virtual {p1}, Ljava/lang/Throwable;->getMessage()Ljava/lang/String;

    move-result-object p1

    :goto_2
    invoke-virtual {p2, p1}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    invoke-virtual {p2}, Ljava/lang/StringBuilder;->toString()Ljava/lang/String;

    move-result-object p1

    return-object p1
.end method

.method public deleteBackupFile(Ljava/lang/String;Z)Z
    .locals 2
    .annotation runtime Landroid/webkit/JavascriptInterface;
    .end annotation

    const/4 v0, 0x0

    if-eqz p2, :cond_0

    .line 1015
    :try_start_0
    invoke-virtual {p0}, Lcom/rphub/app/MainActivity$6;->getBackupFolder()Ljava/lang/String;

    move-result-object p2

    if-eqz p2, :cond_1

    .line 1016
    invoke-virtual {p2}, Ljava/lang/String;->trim()Ljava/lang/String;

    move-result-object v1

    invoke-virtual {v1}, Ljava/lang/String;->isEmpty()Z

    move-result v1

    if-nez v1, :cond_1

    .line 1017
    invoke-virtual {p2}, Ljava/lang/String;->trim()Ljava/lang/String;

    move-result-object p2

    invoke-static {p2}, Landroid/net/Uri;->parse(Ljava/lang/String;)Landroid/net/Uri;

    move-result-object p2

    .line 1018
    invoke-static {p2, p1}, Landroid/provider/DocumentsContract;->buildDocumentUriUsingTree(Landroid/net/Uri;Ljava/lang/String;)Landroid/net/Uri;

    move-result-object p1

    .line 1019
    iget-object p2, p0, Lcom/rphub/app/MainActivity$6;->this$0:Lcom/rphub/app/MainActivity;

    invoke-virtual {p2}, Lcom/rphub/app/MainActivity;->getContentResolver()Landroid/content/ContentResolver;

    move-result-object p2

    invoke-static {p2, p1}, Landroid/provider/DocumentsContract;->deleteDocument(Landroid/content/ContentResolver;Landroid/net/Uri;)Z

    move-result p1

    return p1

    .line 1022
    :cond_0
    new-instance p2, Ljava/io/File;

    invoke-direct {p2, p1}, Ljava/io/File;-><init>(Ljava/lang/String;)V

    .line 1023
    invoke-virtual {p2}, Ljava/io/File;->exists()Z

    move-result p1

    if-eqz p1, :cond_1

    invoke-virtual {p2}, Ljava/io/File;->delete()Z

    move-result p1
    :try_end_0
    .catchall {:try_start_0 .. :try_end_0} :catchall_0

    return p1

    :cond_1
    return v0

    :catchall_0
    move-exception p1

    .line 1027
    new-instance p2, Ljava/lang/StringBuilder;

    const-string v1, "\u5220\u9664\u5907\u4efd\u6587\u4ef6\u5f02\u5e38: "

    invoke-direct {p2, v1}, Ljava/lang/StringBuilder;-><init>(Ljava/lang/String;)V

    invoke-virtual {p1}, Ljava/lang/Throwable;->getMessage()Ljava/lang/String;

    move-result-object p1

    invoke-virtual {p2, p1}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    invoke-virtual {p2}, Ljava/lang/StringBuilder;->toString()Ljava/lang/String;

    move-result-object p1

    const-string p2, "RPHub"

    invoke-static {p2, p1}, Landroid/util/Log;->w(Ljava/lang/String;Ljava/lang/String;)I

    return v0
.end method

.method public finishBackupWrite(Ljava/lang/String;)Ljava/lang/String;
    .locals 5
    .annotation runtime Landroid/webkit/JavascriptInterface;
    .end annotation

    .line 879
    iget-object v0, p0, Lcom/rphub/app/MainActivity$6;->this$0:Lcom/rphub/app/MainActivity;

    invoke-static {v0}, Lcom/rphub/app/MainActivity;->access$21(Lcom/rphub/app/MainActivity;)Ljava/util/HashMap;

    move-result-object v0

    monitor-enter v0

    .line 880
    :try_start_0
    iget-object v1, p0, Lcom/rphub/app/MainActivity$6;->this$0:Lcom/rphub/app/MainActivity;

    invoke-static {v1}, Lcom/rphub/app/MainActivity;->access$21(Lcom/rphub/app/MainActivity;)Ljava/util/HashMap;

    move-result-object v1

    invoke-virtual {v1, p1}, Ljava/util/HashMap;->remove(Ljava/lang/Object;)Ljava/lang/Object;

    move-result-object p1

    check-cast p1, Lcom/rphub/app/MainActivity$BackupWriteSession;

    .line 879
    monitor-exit v0
    :try_end_0
    .catchall {:try_start_0 .. :try_end_0} :catchall_2

    if-nez p1, :cond_0

    const-string p1, "ERR:\u5907\u4efd\u5199\u5165\u4f1a\u8bdd\u4e0d\u5b58\u5728"

    return-object p1

    .line 884
    :cond_0
    :try_start_1
    iget-object v0, p1, Lcom/rphub/app/MainActivity$BackupWriteSession;->output:Ljava/io/OutputStream;

    invoke-virtual {v0}, Ljava/io/OutputStream;->flush()V

    .line 885
    iget-object v0, p1, Lcom/rphub/app/MainActivity$BackupWriteSession;->output:Ljava/io/OutputStream;

    invoke-virtual {v0}, Ljava/io/OutputStream;->close()V

    .line 888
    iget-object v0, p1, Lcom/rphub/app/MainActivity$BackupWriteSession;->scanMime:Ljava/lang/String;

    if-eqz v0, :cond_1

    iget-object v0, p1, Lcom/rphub/app/MainActivity$BackupWriteSession;->targetFile:Ljava/io/File;
    :try_end_1
    .catchall {:try_start_1 .. :try_end_1} :catchall_1

    if-eqz v0, :cond_1

    .line 890
    :try_start_2
    iget-object v0, p0, Lcom/rphub/app/MainActivity$6;->this$0:Lcom/rphub/app/MainActivity;

    const/4 v1, 0x1

    new-array v2, v1, [Ljava/lang/String;

    .line 891
    iget-object v3, p1, Lcom/rphub/app/MainActivity$BackupWriteSession;->targetFile:Ljava/io/File;

    invoke-virtual {v3}, Ljava/io/File;->getAbsolutePath()Ljava/lang/String;

    move-result-object v3

    const/4 v4, 0x0

    aput-object v3, v2, v4

    new-array v1, v1, [Ljava/lang/String;

    .line 892
    iget-object p1, p1, Lcom/rphub/app/MainActivity$BackupWriteSession;->scanMime:Ljava/lang/String;

    aput-object p1, v1, v4

    const/4 p1, 0x0

    .line 890
    invoke-static {v0, v2, v1, p1}, Landroid/media/MediaScannerConnection;->scanFile(Landroid/content/Context;[Ljava/lang/String;[Ljava/lang/String;Landroid/media/MediaScannerConnection$OnScanCompletedListener;)V
    :try_end_2
    .catchall {:try_start_2 .. :try_end_2} :catchall_0

    goto :goto_0

    :catchall_0
    move-exception p1

    :try_start_3
    const-string v0, "RPHub"

    .line 894
    new-instance v1, Ljava/lang/StringBuilder;

    const-string v2, "\u4e0b\u8f7d\u76ee\u5f55\u5907\u4efd\u626b\u63cf\u5931\u8d25: "

    invoke-direct {v1, v2}, Ljava/lang/StringBuilder;-><init>(Ljava/lang/String;)V

    invoke-virtual {p1}, Ljava/lang/Throwable;->getMessage()Ljava/lang/String;

    move-result-object p1

    invoke-virtual {v1, p1}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    invoke-virtual {v1}, Ljava/lang/StringBuilder;->toString()Ljava/lang/String;

    move-result-object p1

    invoke-static {v0, p1}, Landroid/util/Log;->w(Ljava/lang/String;Ljava/lang/String;)I
    :try_end_3
    .catchall {:try_start_3 .. :try_end_3} :catchall_1

    :cond_1
    :goto_0
    const-string p1, "OK"

    return-object p1

    :catchall_1
    move-exception p1

    .line 899
    new-instance v0, Ljava/lang/StringBuilder;

    const-string v1, "ERR:"

    invoke-direct {v0, v1}, Ljava/lang/StringBuilder;-><init>(Ljava/lang/String;)V

    invoke-virtual {p1}, Ljava/lang/Throwable;->getMessage()Ljava/lang/String;

    move-result-object v1

    if-nez v1, :cond_2

    invoke-virtual {p1}, Ljava/lang/Throwable;->toString()Ljava/lang/String;

    move-result-object p1

    goto :goto_1

    :cond_2
    invoke-virtual {p1}, Ljava/lang/Throwable;->getMessage()Ljava/lang/String;

    move-result-object p1

    :goto_1
    invoke-virtual {v0, p1}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    invoke-virtual {v0}, Ljava/lang/StringBuilder;->toString()Ljava/lang/String;

    move-result-object p1

    return-object p1

    :catchall_2
    move-exception p1

    .line 879
    :try_start_4
    monitor-exit v0
    :try_end_4
    .catchall {:try_start_4 .. :try_end_4} :catchall_2

    throw p1
.end method

.method public getBackupFolder()Ljava/lang/String;
    .locals 4
    .annotation runtime Landroid/webkit/JavascriptInterface;
    .end annotation

    const-string v0, ""

    .line 935
    :try_start_0
    iget-object v1, p0, Lcom/rphub/app/MainActivity$6;->this$0:Lcom/rphub/app/MainActivity;

    const-string v2, "rphub_settings"

    const/4 v3, 0x0

    invoke-virtual {v1, v2, v3}, Lcom/rphub/app/MainActivity;->getSharedPreferences(Ljava/lang/String;I)Landroid/content/SharedPreferences;

    move-result-object v1

    const-string v2, "backup_folder"

    .line 936
    invoke-interface {v1, v2, v0}, Landroid/content/SharedPreferences;->getString(Ljava/lang/String;Ljava/lang/String;)Ljava/lang/String;

    move-result-object v0
    :try_end_0
    .catchall {:try_start_0 .. :try_end_0} :catchall_0

    :catchall_0
    return-object v0
.end method

.method public getDefaultBackupFolderPath()Ljava/lang/String;
    .locals 1
    .annotation runtime Landroid/webkit/JavascriptInterface;
    .end annotation

    .line 945
    :try_start_0
    invoke-direct {p0}, Lcom/rphub/app/MainActivity$6;->getDefaultBackupDir()Ljava/io/File;

    move-result-object v0

    invoke-virtual {v0}, Ljava/io/File;->getAbsolutePath()Ljava/lang/String;

    move-result-object v0
    :try_end_0
    .catchall {:try_start_0 .. :try_end_0} :catchall_0

    return-object v0

    :catchall_0
    const-string v0, ""

    return-object v0
.end method

.method public getPatchGeneration()I
    .locals 1
    .annotation runtime Landroid/webkit/JavascriptInterface;
    .end annotation

    .line 462
    invoke-static {}, Lcom/rphub/app/PatchEngine;->getActiveGeneration()I

    move-result v0

    return v0
.end method

.method public getStatusBarHeight()I
    .locals 3
    .annotation runtime Landroid/webkit/JavascriptInterface;
    .end annotation

    .line 493
    :try_start_0
    iget-object v0, p0, Lcom/rphub/app/MainActivity$6;->this$0:Lcom/rphub/app/MainActivity;

    invoke-virtual {v0}, Lcom/rphub/app/MainActivity;->getWindow()Landroid/view/Window;

    move-result-object v0

    invoke-virtual {v0}, Landroid/view/Window;->getDecorView()Landroid/view/View;

    move-result-object v0

    invoke-virtual {v0}, Landroid/view/View;->getRootWindowInsets()Landroid/view/WindowInsets;

    move-result-object v0

    if-eqz v0, :cond_1

    .line 496
    sget v1, Landroid/os/Build$VERSION;->SDK_INT:I

    const/16 v2, 0x1c

    if-lt v1, v2, :cond_0

    invoke-virtual {v0}, Landroid/view/WindowInsets;->getDisplayCutout()Landroid/view/DisplayCutout;

    move-result-object v1

    if-eqz v1, :cond_0

    .line 497
    invoke-virtual {v0}, Landroid/view/WindowInsets;->getDisplayCutout()Landroid/view/DisplayCutout;

    move-result-object v0

    invoke-virtual {v0}, Landroid/view/DisplayCutout;->getSafeInsetTop()I

    move-result v0

    return v0

    .line 500
    :cond_0
    invoke-virtual {v0}, Landroid/view/WindowInsets;->getSystemWindowInsetTop()I

    move-result v0
    :try_end_0
    .catchall {:try_start_0 .. :try_end_0} :catchall_0

    return v0

    :catchall_0
    :cond_1
    const/4 v0, 0x0

    return v0
.end method

.method public isNativeApp()Z
    .locals 1
    .annotation runtime Landroid/webkit/JavascriptInterface;
    .end annotation

    const/4 v0, 0x1

    return v0
.end method

.method public lighthouseDiag()Ljava/lang/String;
    .locals 4
    .annotation runtime Landroid/webkit/JavascriptInterface;
    .end annotation

    :try_start_0
    const-string v0, "?"
    :try_end_0
    .catchall {:try_start_0 .. :try_end_0} :catchall_1

    const/4 v1, 0x0

    .line 425
    :try_start_1
    iget-object v2, p0, Lcom/rphub/app/MainActivity$6;->this$0:Lcom/rphub/app/MainActivity;

    invoke-virtual {v2}, Lcom/rphub/app/MainActivity;->getPackageManager()Landroid/content/pm/PackageManager;

    move-result-object v2

    iget-object v3, p0, Lcom/rphub/app/MainActivity$6;->this$0:Lcom/rphub/app/MainActivity;

    invoke-virtual {v3}, Lcom/rphub/app/MainActivity;->getPackageName()Ljava/lang/String;

    move-result-object v3

    invoke-virtual {v2, v3, v1}, Landroid/content/pm/PackageManager;->getPackageInfo(Ljava/lang/String;I)Landroid/content/pm/PackageInfo;

    move-result-object v2

    iget-object v0, v2, Landroid/content/pm/PackageInfo;->versionName:Ljava/lang/String;
    :try_end_1
    .catchall {:try_start_1 .. :try_end_1} :catchall_0

    .line 428
    :catchall_0
    :try_start_2
    invoke-static {}, Landroid/webkit/CookieManager;->getInstance()Landroid/webkit/CookieManager;

    move-result-object v2

    const-string v3, "https://wxdt.duckdns.org/"

    invoke-virtual {v2, v3}, Landroid/webkit/CookieManager;->getCookie(Ljava/lang/String;)Ljava/lang/String;

    move-result-object v2

    if-eqz v2, :cond_0

    .line 429
    invoke-virtual {v2}, Ljava/lang/String;->length()I

    move-result v2

    if-lez v2, :cond_0

    const/4 v1, 0x1

    .line 430
    :cond_0
    new-instance v2, Ljava/lang/StringBuilder;

    const-string v3, "v"

    invoke-direct {v2, v3}, Ljava/lang/StringBuilder;-><init>(Ljava/lang/String;)V

    invoke-virtual {v2, v0}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    const-string v0, " \u00b7 Cookie:"

    invoke-virtual {v2, v0}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    if-eqz v1, :cond_1

    const-string v0, "\u6709"

    goto :goto_0

    :cond_1
    const-string v0, "\u65e0"

    :goto_0
    invoke-virtual {v2, v0}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    invoke-virtual {v2}, Ljava/lang/StringBuilder;->toString()Ljava/lang/String;

    move-result-object v0
    :try_end_2
    .catchall {:try_start_2 .. :try_end_2} :catchall_1

    return-object v0

    :catchall_1
    const-string v0, "\u8bca\u65ad\u4e0d\u53ef\u7528"

    return-object v0
.end method

.method public listBackupFiles()Ljava/lang/String;
    .locals 19
    .annotation runtime Landroid/webkit/JavascriptInterface;
    .end annotation

    .line 954
    :try_start_0
    new-instance v1, Lorg/json/JSONArray;

    invoke-direct {v1}, Lorg/json/JSONArray;-><init>()V

    .line 955
    invoke-virtual/range {p0 .. p0}, Lcom/rphub/app/MainActivity$6;->getBackupFolder()Ljava/lang/String;

    move-result-object v0
    :try_end_0
    .catchall {:try_start_0 .. :try_end_0} :catchall_4

    const-string v2, "isTreeDoc"

    const-string v3, "time"

    const-string v4, "size"

    const-string v5, "name"

    const-string v6, "id"

    const-string v7, ".json"

    const/4 v8, 0x0

    if-eqz v0, :cond_5

    .line 956
    :try_start_1
    invoke-virtual {v0}, Ljava/lang/String;->trim()Ljava/lang/String;

    move-result-object v9

    invoke-virtual {v9}, Ljava/lang/String;->isEmpty()Z

    move-result v9
    :try_end_1
    .catchall {:try_start_1 .. :try_end_1} :catchall_4

    if-nez v9, :cond_5

    .line 958
    :try_start_2
    invoke-virtual {v0}, Ljava/lang/String;->trim()Ljava/lang/String;

    move-result-object v0

    invoke-static {v0}, Landroid/net/Uri;->parse(Ljava/lang/String;)Landroid/net/Uri;

    move-result-object v0

    .line 960
    invoke-static {v0}, Landroid/provider/DocumentsContract;->getTreeDocumentId(Landroid/net/Uri;)Ljava/lang/String;

    move-result-object v9

    .line 959
    invoke-static {v0, v9}, Landroid/provider/DocumentsContract;->buildChildDocumentsUriUsingTree(Landroid/net/Uri;Ljava/lang/String;)Landroid/net/Uri;

    move-result-object v11

    const/4 v0, 0x4

    new-array v12, v0, [Ljava/lang/String;

    const-string v0, "document_id"

    aput-object v0, v12, v8

    const-string v0, "_display_name"

    const/4 v9, 0x1

    aput-object v0, v12, v9

    const-string v0, "_size"

    const/4 v15, 0x2

    aput-object v0, v12, v15

    const-string v0, "last_modified"

    const/4 v14, 0x3

    aput-object v0, v12, v14
    :try_end_2
    .catchall {:try_start_2 .. :try_end_2} :catchall_3

    const/16 v16, 0x0

    move-object/from16 v13, p0

    .line 967
    :try_start_3
    iget-object v0, v13, Lcom/rphub/app/MainActivity$6;->this$0:Lcom/rphub/app/MainActivity;

    invoke-virtual {v0}, Lcom/rphub/app/MainActivity;->getContentResolver()Landroid/content/ContentResolver;

    move-result-object v10

    const/4 v0, 0x0

    const/16 v17, 0x0

    const/16 v18, 0x0

    move-object v13, v0

    const/4 v0, 0x3

    move-object/from16 v14, v17

    const/4 v0, 0x2

    move-object/from16 v15, v18

    invoke-virtual/range {v10 .. v15}, Landroid/content/ContentResolver;->query(Landroid/net/Uri;[Ljava/lang/String;Ljava/lang/String;[Ljava/lang/String;Ljava/lang/String;)Landroid/database/Cursor;

    move-result-object v10
    :try_end_3
    .catchall {:try_start_3 .. :try_end_3} :catchall_2

    if-eqz v10, :cond_3

    .line 969
    :goto_0
    :try_start_4
    invoke-interface {v10}, Landroid/database/Cursor;->moveToNext()Z

    move-result v11

    if-nez v11, :cond_0

    goto :goto_3

    .line 970
    :cond_0
    invoke-interface {v10, v8}, Landroid/database/Cursor;->getString(I)Ljava/lang/String;

    move-result-object v11

    .line 971
    invoke-interface {v10, v9}, Landroid/database/Cursor;->getString(I)Ljava/lang/String;

    move-result-object v12

    .line 972
    invoke-interface {v10, v0}, Landroid/database/Cursor;->getLong(I)J

    move-result-wide v13
    :try_end_4
    .catchall {:try_start_4 .. :try_end_4} :catchall_1

    move-object/from16 v17, v1

    const/4 v15, 0x3

    .line 973
    :try_start_5
    invoke-interface {v10, v15}, Landroid/database/Cursor;->getLong(I)J

    move-result-wide v0

    if-eqz v12, :cond_1

    .line 974
    sget-object v15, Ljava/util/Locale;->ROOT:Ljava/util/Locale;

    invoke-virtual {v12, v15}, Ljava/lang/String;->toLowerCase(Ljava/util/Locale;)Ljava/lang/String;

    move-result-object v15

    invoke-virtual {v15, v7}, Ljava/lang/String;->endsWith(Ljava/lang/String;)Z

    move-result v15

    if-eqz v15, :cond_1

    .line 975
    new-instance v15, Lorg/json/JSONObject;

    invoke-direct {v15}, Lorg/json/JSONObject;-><init>()V

    .line 976
    invoke-virtual {v15, v6, v11}, Lorg/json/JSONObject;->put(Ljava/lang/String;Ljava/lang/Object;)Lorg/json/JSONObject;

    .line 977
    invoke-virtual {v15, v5, v12}, Lorg/json/JSONObject;->put(Ljava/lang/String;Ljava/lang/Object;)Lorg/json/JSONObject;

    .line 978
    invoke-virtual {v15, v4, v13, v14}, Lorg/json/JSONObject;->put(Ljava/lang/String;J)Lorg/json/JSONObject;

    .line 979
    invoke-virtual {v15, v3, v0, v1}, Lorg/json/JSONObject;->put(Ljava/lang/String;J)Lorg/json/JSONObject;

    .line 980
    invoke-virtual {v15, v2, v9}, Lorg/json/JSONObject;->put(Ljava/lang/String;Z)Lorg/json/JSONObject;
    :try_end_5
    .catchall {:try_start_5 .. :try_end_5} :catchall_0

    move-object/from16 v1, v17

    .line 981
    :try_start_6
    invoke-virtual {v1, v15}, Lorg/json/JSONArray;->put(Ljava/lang/Object;)Lorg/json/JSONArray;
    :try_end_6
    .catchall {:try_start_6 .. :try_end_6} :catchall_1

    goto :goto_1

    :cond_1
    move-object/from16 v1, v17

    :goto_1
    const/4 v0, 0x2

    goto :goto_0

    :catchall_0
    move-exception v0

    move-object/from16 v1, v17

    goto :goto_2

    :catchall_1
    move-exception v0

    :goto_2
    move-object/from16 v16, v0

    if-eqz v10, :cond_2

    .line 985
    :try_start_7
    invoke-interface {v10}, Landroid/database/Cursor;->close()V

    :cond_2
    throw v16

    :cond_3
    :goto_3
    if-eqz v10, :cond_5

    invoke-interface {v10}, Landroid/database/Cursor;->close()V
    :try_end_7
    .catchall {:try_start_7 .. :try_end_7} :catchall_2

    goto :goto_5

    :catchall_2
    move-exception v0

    move-object v9, v0

    move-object/from16 v0, v16

    if-eqz v0, :cond_4

    goto :goto_4

    :cond_4
    move-object v0, v9

    :goto_4
    :try_start_8
    throw v0
    :try_end_8
    .catchall {:try_start_8 .. :try_end_8} :catchall_3

    :catchall_3
    move-exception v0

    :try_start_9
    const-string v9, "RPHub"

    .line 987
    new-instance v10, Ljava/lang/StringBuilder;

    const-string v11, "\u67e5\u8be2\u7528\u6237SAF\u76ee\u5f55\u6587\u4ef6\u5931\u8d25: "

    invoke-direct {v10, v11}, Ljava/lang/StringBuilder;-><init>(Ljava/lang/String;)V

    invoke-virtual {v0}, Ljava/lang/Throwable;->getMessage()Ljava/lang/String;

    move-result-object v0

    invoke-virtual {v10, v0}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    invoke-virtual {v10}, Ljava/lang/StringBuilder;->toString()Ljava/lang/String;

    move-result-object v0

    invoke-static {v9, v0}, Landroid/util/Log;->w(Ljava/lang/String;Ljava/lang/String;)I

    .line 991
    :cond_5
    :goto_5
    invoke-direct/range {p0 .. p0}, Lcom/rphub/app/MainActivity$6;->getDefaultBackupDir()Ljava/io/File;

    move-result-object v0

    invoke-virtual {v0}, Ljava/io/File;->listFiles()[Ljava/io/File;

    move-result-object v0

    if-eqz v0, :cond_8

    .line 993
    array-length v9, v0

    const/4 v10, 0x0

    :goto_6
    if-lt v10, v9, :cond_6

    goto :goto_7

    :cond_6
    aget-object v11, v0, v10

    .line 994
    invoke-virtual {v11}, Ljava/io/File;->isFile()Z

    move-result v12

    if-eqz v12, :cond_7

    invoke-virtual {v11}, Ljava/io/File;->getName()Ljava/lang/String;

    move-result-object v12

    sget-object v13, Ljava/util/Locale;->ROOT:Ljava/util/Locale;

    invoke-virtual {v12, v13}, Ljava/lang/String;->toLowerCase(Ljava/util/Locale;)Ljava/lang/String;

    move-result-object v12

    invoke-virtual {v12, v7}, Ljava/lang/String;->endsWith(Ljava/lang/String;)Z

    move-result v12

    if-eqz v12, :cond_7

    .line 995
    new-instance v12, Lorg/json/JSONObject;

    invoke-direct {v12}, Lorg/json/JSONObject;-><init>()V

    .line 996
    invoke-virtual {v11}, Ljava/io/File;->getAbsolutePath()Ljava/lang/String;

    move-result-object v13

    invoke-virtual {v12, v6, v13}, Lorg/json/JSONObject;->put(Ljava/lang/String;Ljava/lang/Object;)Lorg/json/JSONObject;

    .line 997
    invoke-virtual {v11}, Ljava/io/File;->getName()Ljava/lang/String;

    move-result-object v13

    invoke-virtual {v12, v5, v13}, Lorg/json/JSONObject;->put(Ljava/lang/String;Ljava/lang/Object;)Lorg/json/JSONObject;

    .line 998
    invoke-virtual {v11}, Ljava/io/File;->length()J

    move-result-wide v13

    invoke-virtual {v12, v4, v13, v14}, Lorg/json/JSONObject;->put(Ljava/lang/String;J)Lorg/json/JSONObject;

    .line 999
    invoke-virtual {v11}, Ljava/io/File;->lastModified()J

    move-result-wide v13

    invoke-virtual {v12, v3, v13, v14}, Lorg/json/JSONObject;->put(Ljava/lang/String;J)Lorg/json/JSONObject;

    .line 1000
    invoke-virtual {v12, v2, v8}, Lorg/json/JSONObject;->put(Ljava/lang/String;Z)Lorg/json/JSONObject;

    .line 1001
    invoke-virtual {v1, v12}, Lorg/json/JSONArray;->put(Ljava/lang/Object;)Lorg/json/JSONArray;

    :cond_7
    add-int/lit8 v10, v10, 0x1

    goto :goto_6

    .line 1005
    :cond_8
    :goto_7
    invoke-virtual {v1}, Lorg/json/JSONArray;->toString()Ljava/lang/String;

    move-result-object v0
    :try_end_9
    .catchall {:try_start_9 .. :try_end_9} :catchall_4

    return-object v0

    :catchall_4
    const-string v0, "[]"

    return-object v0
.end method

.method public log(Ljava/lang/String;)V
    .locals 3
    .annotation runtime Landroid/webkit/JavascriptInterface;
    .end annotation

    .line 468
    iget-object v0, p0, Lcom/rphub/app/MainActivity$6;->this$0:Lcom/rphub/app/MainActivity;

    new-instance v1, Ljava/lang/StringBuilder;

    const-string v2, "js "

    invoke-direct {v1, v2}, Ljava/lang/StringBuilder;-><init>(Ljava/lang/String;)V

    if-nez p1, :cond_0

    const-string p1, ""

    :cond_0
    invoke-virtual {v1, p1}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    invoke-virtual {v1}, Ljava/lang/StringBuilder;->toString()Ljava/lang/String;

    move-result-object p1

    invoke-static {v0, p1}, Lcom/rphub/app/MainActivity;->access$5(Lcom/rphub/app/MainActivity;Ljava/lang/String;)V

    return-void
.end method

.method public logJsError(Ljava/lang/String;Ljava/lang/String;Ljava/lang/String;I)V
    .locals 2
    .annotation runtime Landroid/webkit/JavascriptInterface;
    .end annotation

    .line 475
    iget-object v0, p0, Lcom/rphub/app/MainActivity$6;->this$0:Lcom/rphub/app/MainActivity;

    if-nez p1, :cond_0

    const-string p1, "js"

    :cond_0
    const-string v1, ""

    if-nez p2, :cond_1

    move-object p2, v1

    :cond_1
    if-nez p3, :cond_2

    move-object p3, v1

    :cond_2
    invoke-static {v0, p1, p2, p3, p4}, Lcom/rphub/app/MainActivity;->access$11(Lcom/rphub/app/MainActivity;Ljava/lang/String;Ljava/lang/String;Ljava/lang/String;I)V

    return-void
.end method

.method public openLighthouse(Ljava/lang/String;)V
    .locals 2
    .annotation runtime Landroid/webkit/JavascriptInterface;
    .end annotation

    .line 402
    iget-object v0, p0, Lcom/rphub/app/MainActivity$6;->this$0:Lcom/rphub/app/MainActivity;

    new-instance v1, Lcom/rphub/app/MainActivity$6$1;

    invoke-direct {v1, p0, p1}, Lcom/rphub/app/MainActivity$6$1;-><init>(Lcom/rphub/app/MainActivity$6;Ljava/lang/String;)V

    invoke-virtual {v0, v1}, Lcom/rphub/app/MainActivity;->runOnUiThread(Ljava/lang/Runnable;)V

    return-void
.end method

.method public readBackupFileText(Ljava/lang/String;Z)Ljava/lang/String;
    .locals 2
    .annotation runtime Landroid/webkit/JavascriptInterface;
    .end annotation

    const/4 v0, 0x0

    if-eqz p2, :cond_0

    .line 1076
    :try_start_0
    invoke-virtual {p0}, Lcom/rphub/app/MainActivity$6;->getBackupFolder()Ljava/lang/String;

    move-result-object p2

    if-eqz p2, :cond_1

    .line 1077
    invoke-virtual {p2}, Ljava/lang/String;->trim()Ljava/lang/String;

    move-result-object v1

    invoke-virtual {v1}, Ljava/lang/String;->isEmpty()Z

    move-result v1

    if-nez v1, :cond_1

    .line 1078
    invoke-virtual {p2}, Ljava/lang/String;->trim()Ljava/lang/String;

    move-result-object p2

    invoke-static {p2}, Landroid/net/Uri;->parse(Ljava/lang/String;)Landroid/net/Uri;

    move-result-object p2

    .line 1079
    invoke-static {p2, p1}, Landroid/provider/DocumentsContract;->buildDocumentUriUsingTree(Landroid/net/Uri;Ljava/lang/String;)Landroid/net/Uri;

    move-result-object p1

    .line 1080
    iget-object p2, p0, Lcom/rphub/app/MainActivity$6;->this$0:Lcom/rphub/app/MainActivity;

    invoke-virtual {p2}, Lcom/rphub/app/MainActivity;->getContentResolver()Landroid/content/ContentResolver;

    move-result-object p2

    invoke-virtual {p2, p1}, Landroid/content/ContentResolver;->openInputStream(Landroid/net/Uri;)Ljava/io/InputStream;

    move-result-object v0

    goto :goto_0

    .line 1083
    :cond_0
    new-instance p2, Ljava/io/File;

    invoke-direct {p2, p1}, Ljava/io/File;-><init>(Ljava/lang/String;)V

    .line 1084
    invoke-virtual {p2}, Ljava/io/File;->exists()Z

    move-result p1

    if-eqz p1, :cond_1

    new-instance v0, Ljava/io/FileInputStream;

    invoke-direct {v0, p2}, Ljava/io/FileInputStream;-><init>(Ljava/io/File;)V
    :try_end_0
    .catchall {:try_start_0 .. :try_end_0} :catchall_0

    :cond_1
    :goto_0
    if-nez v0, :cond_2

    const-string p1, "ERR:\u65e0\u6cd5\u6253\u5f00\u6587\u4ef6"

    return-object p1

    .line 1087
    :cond_2
    :try_start_1
    invoke-direct {p0, v0}, Lcom/rphub/app/MainActivity$6;->readBytes(Ljava/io/InputStream;)[B

    move-result-object p1

    .line 1088
    invoke-virtual {v0}, Ljava/io/InputStream;->close()V

    .line 1089
    new-instance p2, Ljava/lang/String;

    const-string v0, "UTF-8"

    invoke-direct {p2, p1, v0}, Ljava/lang/String;-><init>([BLjava/lang/String;)V
    :try_end_1
    .catchall {:try_start_1 .. :try_end_1} :catchall_0

    return-object p2

    :catchall_0
    move-exception p1

    .line 1091
    new-instance p2, Ljava/lang/StringBuilder;

    const-string v0, "ERR:"

    invoke-direct {p2, v0}, Ljava/lang/StringBuilder;-><init>(Ljava/lang/String;)V

    invoke-virtual {p1}, Ljava/lang/Throwable;->getMessage()Ljava/lang/String;

    move-result-object p1

    invoke-virtual {p2, p1}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    invoke-virtual {p2}, Ljava/lang/StringBuilder;->toString()Ljava/lang/String;

    move-result-object p1

    return-object p1
.end method

.method public renameBackupFile(Ljava/lang/String;ZLjava/lang/String;)Ljava/lang/String;
    .locals 2
    .annotation runtime Landroid/webkit/JavascriptInterface;
    .end annotation

    if-nez p3, :cond_0

    :try_start_0
    const-string p3, ""

    goto :goto_0

    .line 1041
    :cond_0
    invoke-virtual {p3}, Ljava/lang/String;->trim()Ljava/lang/String;

    move-result-object p3

    .line 1042
    :goto_0
    invoke-virtual {p3}, Ljava/lang/String;->isEmpty()Z

    move-result v0
    :try_end_0
    .catchall {:try_start_0 .. :try_end_0} :catchall_0

    if-eqz v0, :cond_1

    const-string p1, "ERR:\u6587\u4ef6\u540d\u4e0d\u80fd\u4e3a\u7a7a"

    return-object p1

    :cond_1
    const/16 v0, 0x2f

    .line 1043
    :try_start_1
    invoke-virtual {p3, v0}, Ljava/lang/String;->indexOf(I)I

    move-result v0

    if-gez v0, :cond_e

    const/16 v0, 0x5c

    invoke-virtual {p3, v0}, Ljava/lang/String;->indexOf(I)I

    move-result v0

    if-ltz v0, :cond_2

    goto/16 :goto_4

    .line 1044
    :cond_2
    invoke-virtual {p3}, Ljava/lang/String;->length()I

    move-result v0
    :try_end_1
    .catchall {:try_start_1 .. :try_end_1} :catchall_0

    const/16 v1, 0x60

    if-le v0, v1, :cond_3

    const-string p1, "ERR:\u6587\u4ef6\u540d\u8fc7\u957f\uff08\u6700\u591a 96 \u5b57\u7b26\uff09"

    return-object p1

    :cond_3
    :try_start_2
    const-string v0, "."

    .line 1045
    invoke-virtual {p3, v0}, Ljava/lang/String;->startsWith(Ljava/lang/String;)Z

    move-result v0
    :try_end_2
    .catchall {:try_start_2 .. :try_end_2} :catchall_0

    if-eqz v0, :cond_4

    const-string p1, "ERR:\u6587\u4ef6\u540d\u4e0d\u80fd\u4ee5\u70b9\u5f00\u5934"

    return-object p1

    .line 1046
    :cond_4
    :try_start_3
    sget-object v0, Ljava/util/Locale;->ROOT:Ljava/util/Locale;

    invoke-virtual {p3, v0}, Ljava/lang/String;->toLowerCase(Ljava/util/Locale;)Ljava/lang/String;

    move-result-object v0

    const-string v1, ".json"

    invoke-virtual {v0, v1}, Ljava/lang/String;->endsWith(Ljava/lang/String;)Z

    move-result v0
    :try_end_3
    .catchall {:try_start_3 .. :try_end_3} :catchall_0

    if-nez v0, :cond_5

    const-string p1, "ERR:\u6587\u4ef6\u540d\u5fc5\u987b\u4ee5 .json \u7ed3\u5c3e"

    return-object p1

    :cond_5
    const-string v0, "OK"

    if-eqz p2, :cond_9

    .line 1049
    :try_start_4
    invoke-virtual {p0}, Lcom/rphub/app/MainActivity$6;->getBackupFolder()Ljava/lang/String;

    move-result-object p2

    if-eqz p2, :cond_8

    .line 1050
    invoke-virtual {p2}, Ljava/lang/String;->trim()Ljava/lang/String;

    move-result-object v1

    invoke-virtual {v1}, Ljava/lang/String;->isEmpty()Z

    move-result v1

    if-eqz v1, :cond_6

    goto :goto_2

    .line 1051
    :cond_6
    invoke-virtual {p2}, Ljava/lang/String;->trim()Ljava/lang/String;

    move-result-object p2

    invoke-static {p2}, Landroid/net/Uri;->parse(Ljava/lang/String;)Landroid/net/Uri;

    move-result-object p2

    .line 1052
    invoke-static {p2, p1}, Landroid/provider/DocumentsContract;->buildDocumentUriUsingTree(Landroid/net/Uri;Ljava/lang/String;)Landroid/net/Uri;

    move-result-object p1

    .line 1053
    iget-object p2, p0, Lcom/rphub/app/MainActivity$6;->this$0:Lcom/rphub/app/MainActivity;

    invoke-virtual {p2}, Lcom/rphub/app/MainActivity;->getContentResolver()Landroid/content/ContentResolver;

    move-result-object p2

    invoke-static {p2, p1, p3}, Landroid/provider/DocumentsContract;->renameDocument(Landroid/content/ContentResolver;Landroid/net/Uri;Ljava/lang/String;)Landroid/net/Uri;

    move-result-object p1

    if-eqz p1, :cond_7

    goto :goto_1

    :cond_7
    const-string v0, "ERR:\u91cd\u547d\u540d\u672a\u751f\u6548\uff08\u53ef\u80fd\u5df2\u5b58\u5728\u540c\u540d\u6587\u4ef6\uff09"
    :try_end_4
    .catchall {:try_start_4 .. :try_end_4} :catchall_0

    :goto_1
    return-object v0

    :cond_8
    :goto_2
    const-string p1, "ERR:\u5c1a\u672a\u8bbe\u7f6e\u5907\u4efd\u6587\u4ef6\u5939"

    return-object p1

    .line 1056
    :cond_9
    :try_start_5
    new-instance p2, Ljava/io/File;

    invoke-direct {p2, p1}, Ljava/io/File;-><init>(Ljava/lang/String;)V

    .line 1057
    invoke-virtual {p2}, Ljava/io/File;->exists()Z

    move-result p1
    :try_end_5
    .catchall {:try_start_5 .. :try_end_5} :catchall_0

    if-nez p1, :cond_a

    const-string p1, "ERR:\u539f\u6587\u4ef6\u4e0d\u5b58\u5728"

    return-object p1

    .line 1058
    :cond_a
    :try_start_6
    invoke-virtual {p2}, Ljava/io/File;->getParentFile()Ljava/io/File;

    move-result-object p1
    :try_end_6
    .catchall {:try_start_6 .. :try_end_6} :catchall_0

    if-nez p1, :cond_b

    const-string p1, "ERR:\u65e0\u6cd5\u5b9a\u4f4d\u6240\u5728\u76ee\u5f55"

    return-object p1

    .line 1060
    :cond_b
    :try_start_7
    new-instance v1, Ljava/io/File;

    invoke-direct {v1, p1, p3}, Ljava/io/File;-><init>(Ljava/io/File;Ljava/lang/String;)V

    .line 1061
    invoke-virtual {v1}, Ljava/io/File;->exists()Z

    move-result p1

    if-eqz p1, :cond_c

    invoke-virtual {v1}, Ljava/io/File;->getAbsolutePath()Ljava/lang/String;

    move-result-object p1

    invoke-virtual {p2}, Ljava/io/File;->getAbsolutePath()Ljava/lang/String;

    move-result-object p3

    invoke-virtual {p1, p3}, Ljava/lang/String;->equals(Ljava/lang/Object;)Z

    move-result p1
    :try_end_7
    .catchall {:try_start_7 .. :try_end_7} :catchall_0

    if-nez p1, :cond_c

    const-string p1, "ERR:\u8be5\u76ee\u5f55\u4e0b\u5df2\u5b58\u5728\u540c\u540d\u6587\u4ef6"

    return-object p1

    .line 1064
    :cond_c
    :try_start_8
    invoke-virtual {p2, v1}, Ljava/io/File;->renameTo(Ljava/io/File;)Z

    move-result p1

    if-eqz p1, :cond_d

    goto :goto_3

    :cond_d
    const-string v0, "ERR:\u91cd\u547d\u540d\u5931\u8d25"
    :try_end_8
    .catchall {:try_start_8 .. :try_end_8} :catchall_0

    :goto_3
    return-object v0

    :cond_e
    :goto_4
    const-string p1, "ERR:\u6587\u4ef6\u540d\u4e0d\u80fd\u5305\u542b\u8def\u5f84\u5206\u9694\u7b26"

    return-object p1

    :catchall_0
    move-exception p1

    .line 1066
    new-instance p2, Ljava/lang/StringBuilder;

    const-string p3, "\u91cd\u547d\u540d\u5907\u4efd\u6587\u4ef6\u5f02\u5e38: "

    invoke-direct {p2, p3}, Ljava/lang/StringBuilder;-><init>(Ljava/lang/String;)V

    invoke-virtual {p1}, Ljava/lang/Throwable;->getMessage()Ljava/lang/String;

    move-result-object p3

    invoke-virtual {p2, p3}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    invoke-virtual {p2}, Ljava/lang/StringBuilder;->toString()Ljava/lang/String;

    move-result-object p2

    const-string p3, "RPHub"

    invoke-static {p3, p2}, Landroid/util/Log;->w(Ljava/lang/String;Ljava/lang/String;)I

    .line 1067
    new-instance p2, Ljava/lang/StringBuilder;

    const-string p3, "ERR:"

    invoke-direct {p2, p3}, Ljava/lang/StringBuilder;-><init>(Ljava/lang/String;)V

    invoke-virtual {p1}, Ljava/lang/Throwable;->getMessage()Ljava/lang/String;

    move-result-object p1

    invoke-virtual {p2, p1}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    invoke-virtual {p2}, Ljava/lang/StringBuilder;->toString()Ljava/lang/String;

    move-result-object p1

    return-object p1
.end method

.method public reportWhiteScreenFailure(Ljava/lang/String;)V
    .locals 2
    .annotation runtime Landroid/webkit/JavascriptInterface;
    .end annotation

    .line 482
    iget-object v0, p0, Lcom/rphub/app/MainActivity$6;->this$0:Lcom/rphub/app/MainActivity;

    new-instance v1, Lcom/rphub/app/MainActivity$6$2;

    invoke-direct {v1, p0, p1}, Lcom/rphub/app/MainActivity$6$2;-><init>(Lcom/rphub/app/MainActivity$6;Ljava/lang/String;)V

    invoke-virtual {v0, v1}, Lcom/rphub/app/MainActivity;->runOnUiThread(Ljava/lang/Runnable;)V

    return-void
.end method

.method public saveBackupToFolder(Ljava/lang/String;Ljava/lang/String;Ljava/lang/String;)V
    .locals 3
    .annotation runtime Landroid/webkit/JavascriptInterface;
    .end annotation

    const/4 v0, 0x0

    if-eqz p1, :cond_3

    .line 1098
    :try_start_0
    invoke-virtual {p1}, Ljava/lang/String;->isEmpty()Z

    move-result v1

    if-eqz v1, :cond_0

    goto :goto_2

    .line 1102
    :cond_0
    invoke-static {p1, v0}, Landroid/util/Base64;->decode(Ljava/lang/String;I)[B

    move-result-object p1

    .line 1103
    iget-object v1, p0, Lcom/rphub/app/MainActivity$6;->this$0:Lcom/rphub/app/MainActivity;

    invoke-static {v1, p2}, Lcom/rphub/app/MainActivity;->access$15(Lcom/rphub/app/MainActivity;Ljava/lang/String;)Ljava/lang/String;

    move-result-object p2

    if-eqz p3, :cond_2

    .line 1104
    invoke-virtual {p3}, Ljava/lang/String;->trim()Ljava/lang/String;

    move-result-object v1

    invoke-virtual {v1}, Ljava/lang/String;->isEmpty()Z

    move-result v1

    if-eqz v1, :cond_1

    goto :goto_0

    .line 1105
    :cond_1
    invoke-virtual {p3}, Ljava/lang/String;->trim()Ljava/lang/String;

    move-result-object p3

    goto :goto_1

    :cond_2
    :goto_0
    const-string p3, "application/octet-stream"

    .line 1106
    :goto_1
    iget-object v1, p0, Lcom/rphub/app/MainActivity$6;->this$0:Lcom/rphub/app/MainActivity;

    new-instance v2, Lcom/rphub/app/MainActivity$6$7;

    invoke-direct {v2, p0, p3, p2, p1}, Lcom/rphub/app/MainActivity$6$7;-><init>(Lcom/rphub/app/MainActivity$6;Ljava/lang/String;Ljava/lang/String;[B)V

    invoke-virtual {v1, v2}, Lcom/rphub/app/MainActivity;->runOnUiThread(Ljava/lang/Runnable;)V

    goto :goto_3

    .line 1099
    :cond_3
    :goto_2
    iget-object p1, p0, Lcom/rphub/app/MainActivity$6;->this$0:Lcom/rphub/app/MainActivity;

    const-string p2, "\u4fdd\u5b58\u5931\u8d25\uff1a\u6570\u636e\u4e3a\u7a7a"

    invoke-static {p1, p2, v0}, Lcom/rphub/app/MainActivity;->access$14(Lcom/rphub/app/MainActivity;Ljava/lang/String;Z)V
    :try_end_0
    .catchall {:try_start_0 .. :try_end_0} :catchall_0

    return-void

    :catchall_0
    move-exception p1

    .line 1133
    iget-object p2, p0, Lcom/rphub/app/MainActivity$6;->this$0:Lcom/rphub/app/MainActivity;

    new-instance p3, Ljava/lang/StringBuilder;

    const-string v1, "\u5907\u4efd\u5931\u8d25\uff1a"

    invoke-direct {p3, v1}, Ljava/lang/StringBuilder;-><init>(Ljava/lang/String;)V

    invoke-virtual {p1}, Ljava/lang/Throwable;->getMessage()Ljava/lang/String;

    move-result-object p1

    invoke-virtual {p3, p1}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    invoke-virtual {p3}, Ljava/lang/StringBuilder;->toString()Ljava/lang/String;

    move-result-object p1

    invoke-static {p2, p1, v0}, Lcom/rphub/app/MainActivity;->access$14(Lcom/rphub/app/MainActivity;Ljava/lang/String;Z)V

    :goto_3
    return-void
.end method

.method public saveFile(Ljava/lang/String;Ljava/lang/String;Ljava/lang/String;)V
    .locals 1
    .annotation runtime Landroid/webkit/JavascriptInterface;
    .end annotation

    .line 512
    iget-object v0, p0, Lcom/rphub/app/MainActivity$6;->this$0:Lcom/rphub/app/MainActivity;

    invoke-static {v0, p1, p2, p3}, Lcom/rphub/app/MainActivity;->access$13(Lcom/rphub/app/MainActivity;Ljava/lang/String;Ljava/lang/String;Ljava/lang/String;)V

    return-void
.end method

.method public saveFileWithPicker(Ljava/lang/String;Ljava/lang/String;Ljava/lang/String;)V
    .locals 2
    .annotation runtime Landroid/webkit/JavascriptInterface;
    .end annotation

    const/4 v0, 0x0

    if-eqz p1, :cond_3

    .line 518
    :try_start_0
    invoke-virtual {p1}, Ljava/lang/String;->isEmpty()Z

    move-result v1

    if-eqz v1, :cond_0

    goto :goto_2

    .line 522
    :cond_0
    invoke-static {p1, v0}, Landroid/util/Base64;->decode(Ljava/lang/String;I)[B

    move-result-object p1

    .line 523
    iget-object v0, p0, Lcom/rphub/app/MainActivity$6;->this$0:Lcom/rphub/app/MainActivity;

    invoke-static {v0, p2}, Lcom/rphub/app/MainActivity;->access$15(Lcom/rphub/app/MainActivity;Ljava/lang/String;)Ljava/lang/String;

    move-result-object p2

    if-eqz p3, :cond_2

    .line 524
    invoke-virtual {p3}, Ljava/lang/String;->trim()Ljava/lang/String;

    move-result-object v0

    invoke-virtual {v0}, Ljava/lang/String;->isEmpty()Z

    move-result v0

    if-eqz v0, :cond_1

    goto :goto_0

    .line 525
    :cond_1
    invoke-virtual {p3}, Ljava/lang/String;->trim()Ljava/lang/String;

    move-result-object p3

    goto :goto_1

    :cond_2
    :goto_0
    const-string p3, "application/octet-stream"

    .line 526
    :goto_1
    iget-object v0, p0, Lcom/rphub/app/MainActivity$6;->this$0:Lcom/rphub/app/MainActivity;

    new-instance v1, Lcom/rphub/app/MainActivity$6$3;

    invoke-direct {v1, p0, p1, p3, p2}, Lcom/rphub/app/MainActivity$6$3;-><init>(Lcom/rphub/app/MainActivity$6;[BLjava/lang/String;Ljava/lang/String;)V

    invoke-virtual {v0, v1}, Lcom/rphub/app/MainActivity;->runOnUiThread(Ljava/lang/Runnable;)V

    goto :goto_3

    .line 519
    :cond_3
    :goto_2
    iget-object p1, p0, Lcom/rphub/app/MainActivity$6;->this$0:Lcom/rphub/app/MainActivity;

    const-string p2, "\u4fdd\u5b58\u5931\u8d25\uff1a\u6570\u636e\u4e3a\u7a7a"

    invoke-static {p1, p2, v0}, Lcom/rphub/app/MainActivity;->access$14(Lcom/rphub/app/MainActivity;Ljava/lang/String;Z)V
    :try_end_0
    .catchall {:try_start_0 .. :try_end_0} :catchall_0

    return-void

    :catchall_0
    move-exception p1

    .line 545
    iget-object p2, p0, Lcom/rphub/app/MainActivity$6;->this$0:Lcom/rphub/app/MainActivity;

    new-instance p3, Ljava/lang/StringBuilder;

    const-string v0, "\u4fdd\u5b58\u5931\u8d25\uff1a"

    invoke-direct {p3, v0}, Ljava/lang/StringBuilder;-><init>(Ljava/lang/String;)V

    invoke-virtual {p1}, Ljava/lang/Throwable;->getMessage()Ljava/lang/String;

    move-result-object p1

    invoke-virtual {p3, p1}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    invoke-virtual {p3}, Ljava/lang/StringBuilder;->toString()Ljava/lang/String;

    move-result-object p1

    const/4 p3, 0x1

    invoke-static {p2, p1, p3}, Landroid/widget/Toast;->makeText(Landroid/content/Context;Ljava/lang/CharSequence;I)Landroid/widget/Toast;

    move-result-object p1

    invoke-virtual {p1}, Landroid/widget/Toast;->show()V

    :goto_3
    return-void
.end method

.method public saveImageFromUrl(Ljava/lang/String;Ljava/lang/String;Ljava/lang/String;)V
    .locals 2
    .annotation runtime Landroid/webkit/JavascriptInterface;
    .end annotation

    if-eqz p1, :cond_1

    .line 587
    invoke-virtual {p1}, Ljava/lang/String;->trim()Ljava/lang/String;

    move-result-object v0

    invoke-virtual {v0}, Ljava/lang/String;->isEmpty()Z

    move-result v0

    if-eqz v0, :cond_0

    goto :goto_0

    .line 591
    :cond_0
    iget-object v0, p0, Lcom/rphub/app/MainActivity$6;->this$0:Lcom/rphub/app/MainActivity;

    invoke-static {v0, p2}, Lcom/rphub/app/MainActivity;->access$15(Lcom/rphub/app/MainActivity;Ljava/lang/String;)Ljava/lang/String;

    move-result-object p2

    invoke-direct {p0, p2, p3}, Lcom/rphub/app/MainActivity$6;->ensureImageFileName(Ljava/lang/String;Ljava/lang/String;)Ljava/lang/String;

    move-result-object p2

    .line 592
    invoke-direct {p0, p3, p2}, Lcom/rphub/app/MainActivity$6;->normalizeImageMime(Ljava/lang/String;Ljava/lang/String;)Ljava/lang/String;

    move-result-object p3

    .line 593
    new-instance v0, Ljava/lang/Thread;

    new-instance v1, Lcom/rphub/app/MainActivity$6$5;

    invoke-direct {v1, p0, p1, p2, p3}, Lcom/rphub/app/MainActivity$6$5;-><init>(Lcom/rphub/app/MainActivity$6;Ljava/lang/String;Ljava/lang/String;Ljava/lang/String;)V

    invoke-direct {v0, v1}, Ljava/lang/Thread;-><init>(Ljava/lang/Runnable;)V

    .line 624
    invoke-virtual {v0}, Ljava/lang/Thread;->start()V

    return-void

    .line 588
    :cond_1
    :goto_0
    iget-object p1, p0, Lcom/rphub/app/MainActivity$6;->this$0:Lcom/rphub/app/MainActivity;

    const/4 p2, 0x0

    const-string p3, "\u4fdd\u5b58\u5931\u8d25\uff1a\u56fe\u7247\u5730\u5740\u4e3a\u7a7a"

    invoke-static {p1, p3, p2}, Lcom/rphub/app/MainActivity;->access$14(Lcom/rphub/app/MainActivity;Ljava/lang/String;Z)V

    return-void
.end method

.method public saveImageToGallery(Ljava/lang/String;Ljava/lang/String;Ljava/lang/String;)V
    .locals 3
    .annotation runtime Landroid/webkit/JavascriptInterface;
    .end annotation

    const/4 v0, 0x0

    if-eqz p1, :cond_1

    .line 631
    :try_start_0
    invoke-virtual {p1}, Ljava/lang/String;->isEmpty()Z

    move-result v1

    if-eqz v1, :cond_0

    goto :goto_0

    .line 635
    :cond_0
    invoke-static {p1, v0}, Landroid/util/Base64;->decode(Ljava/lang/String;I)[B

    move-result-object p1

    .line 636
    iget-object v1, p0, Lcom/rphub/app/MainActivity$6;->this$0:Lcom/rphub/app/MainActivity;

    invoke-static {v1, p2}, Lcom/rphub/app/MainActivity;->access$15(Lcom/rphub/app/MainActivity;Ljava/lang/String;)Ljava/lang/String;

    move-result-object p2

    invoke-direct {p0, p2, p3}, Lcom/rphub/app/MainActivity$6;->ensureImageFileName(Ljava/lang/String;Ljava/lang/String;)Ljava/lang/String;

    move-result-object p2

    .line 637
    invoke-direct {p0, p3, p2}, Lcom/rphub/app/MainActivity$6;->normalizeImageMime(Ljava/lang/String;Ljava/lang/String;)Ljava/lang/String;

    move-result-object p3

    .line 638
    invoke-direct {p0, p1, p2, p3}, Lcom/rphub/app/MainActivity$6;->saveImageBytesToGallery([BLjava/lang/String;Ljava/lang/String;)V

    goto :goto_3

    .line 632
    :cond_1
    :goto_0
    iget-object p1, p0, Lcom/rphub/app/MainActivity$6;->this$0:Lcom/rphub/app/MainActivity;

    const-string p2, "\u4fdd\u5b58\u5931\u8d25\uff1a\u56fe\u7247\u6570\u636e\u4e3a\u7a7a"

    invoke-static {p1, p2, v0}, Lcom/rphub/app/MainActivity;->access$14(Lcom/rphub/app/MainActivity;Ljava/lang/String;Z)V
    :try_end_0
    .catchall {:try_start_0 .. :try_end_0} :catchall_0

    return-void

    :catchall_0
    move-exception p1

    .line 640
    iget-object p2, p0, Lcom/rphub/app/MainActivity$6;->this$0:Lcom/rphub/app/MainActivity;

    new-instance p3, Ljava/lang/StringBuilder;

    const-string v1, "saveImageToGallery error: "

    invoke-direct {p3, v1}, Ljava/lang/StringBuilder;-><init>(Ljava/lang/String;)V

    invoke-virtual {p1}, Ljava/lang/Throwable;->getMessage()Ljava/lang/String;

    move-result-object v1

    const-string v2, ""

    if-nez v1, :cond_2

    move-object v1, v2

    goto :goto_1

    :cond_2
    invoke-virtual {p1}, Ljava/lang/Throwable;->getMessage()Ljava/lang/String;

    move-result-object v1

    :goto_1
    invoke-virtual {p3, v1}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    invoke-virtual {p3}, Ljava/lang/StringBuilder;->toString()Ljava/lang/String;

    move-result-object p3

    invoke-static {p2, p3}, Lcom/rphub/app/MainActivity;->access$5(Lcom/rphub/app/MainActivity;Ljava/lang/String;)V

    .line 641
    iget-object p2, p0, Lcom/rphub/app/MainActivity$6;->this$0:Lcom/rphub/app/MainActivity;

    new-instance p3, Ljava/lang/StringBuilder;

    const-string v1, "\u4fdd\u5b58\u5931\u8d25\uff1a"

    invoke-direct {p3, v1}, Ljava/lang/StringBuilder;-><init>(Ljava/lang/String;)V

    invoke-virtual {p1}, Ljava/lang/Throwable;->getMessage()Ljava/lang/String;

    move-result-object v1

    if-nez v1, :cond_3

    goto :goto_2

    :cond_3
    invoke-virtual {p1}, Ljava/lang/Throwable;->getMessage()Ljava/lang/String;

    move-result-object v2

    :goto_2
    invoke-virtual {p3, v2}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    invoke-virtual {p3}, Ljava/lang/StringBuilder;->toString()Ljava/lang/String;

    move-result-object p1

    invoke-static {p2, p1, v0}, Lcom/rphub/app/MainActivity;->access$14(Lcom/rphub/app/MainActivity;Ljava/lang/String;Z)V

    :goto_3
    return-void
.end method

.method public writeBackupChunk(Ljava/lang/String;Ljava/lang/String;)Ljava/lang/String;
    .locals 3
    .annotation runtime Landroid/webkit/JavascriptInterface;
    .end annotation

    .line 858
    iget-object v0, p0, Lcom/rphub/app/MainActivity$6;->this$0:Lcom/rphub/app/MainActivity;

    invoke-static {v0}, Lcom/rphub/app/MainActivity;->access$21(Lcom/rphub/app/MainActivity;)Ljava/util/HashMap;

    move-result-object v0

    monitor-enter v0

    .line 859
    :try_start_0
    iget-object v1, p0, Lcom/rphub/app/MainActivity$6;->this$0:Lcom/rphub/app/MainActivity;

    invoke-static {v1}, Lcom/rphub/app/MainActivity;->access$21(Lcom/rphub/app/MainActivity;)Ljava/util/HashMap;

    move-result-object v1

    invoke-virtual {v1, p1}, Ljava/util/HashMap;->get(Ljava/lang/Object;)Ljava/lang/Object;

    move-result-object v1

    check-cast v1, Lcom/rphub/app/MainActivity$BackupWriteSession;

    .line 858
    monitor-exit v0
    :try_end_0
    .catchall {:try_start_0 .. :try_end_0} :catchall_2

    if-nez v1, :cond_0

    const-string p1, "ERR:\u5907\u4efd\u5199\u5165\u4f1a\u8bdd\u4e0d\u5b58\u5728"

    return-object p1

    :cond_0
    if-eqz p2, :cond_1

    .line 863
    :try_start_1
    invoke-virtual {p2}, Ljava/lang/String;->isEmpty()Z

    move-result v0

    if-nez v0, :cond_1

    .line 864
    iget-object v0, v1, Lcom/rphub/app/MainActivity$BackupWriteSession;->output:Ljava/io/OutputStream;

    const/4 v2, 0x0

    invoke-static {p2, v2}, Landroid/util/Base64;->decode(Ljava/lang/String;I)[B

    move-result-object p2

    invoke-virtual {v0, p2}, Ljava/io/OutputStream;->write([B)V
    :try_end_1
    .catchall {:try_start_1 .. :try_end_1} :catchall_0

    const-string p1, "OK"

    return-object p1

    .line 863
    :cond_1
    :try_start_2
    new-instance p2, Ljava/lang/IllegalStateException;

    const-string v0, "\u5907\u4efd\u6570\u636e\u4e3a\u7a7a"

    invoke-direct {p2, v0}, Ljava/lang/IllegalStateException;-><init>(Ljava/lang/String;)V

    throw p2
    :try_end_2
    .catchall {:try_start_2 .. :try_end_2} :catchall_0

    :catchall_0
    move-exception p2

    .line 868
    iget-object v0, p0, Lcom/rphub/app/MainActivity$6;->this$0:Lcom/rphub/app/MainActivity;

    invoke-static {v0}, Lcom/rphub/app/MainActivity;->access$21(Lcom/rphub/app/MainActivity;)Ljava/util/HashMap;

    move-result-object v2

    monitor-enter v2

    .line 869
    :try_start_3
    iget-object v0, p0, Lcom/rphub/app/MainActivity$6;->this$0:Lcom/rphub/app/MainActivity;

    invoke-static {v0}, Lcom/rphub/app/MainActivity;->access$21(Lcom/rphub/app/MainActivity;)Ljava/util/HashMap;

    move-result-object v0

    invoke-virtual {v0, p1}, Ljava/util/HashMap;->remove(Ljava/lang/Object;)Ljava/lang/Object;

    .line 868
    monitor-exit v2
    :try_end_3
    .catchall {:try_start_3 .. :try_end_3} :catchall_1

    .line 871
    iget-object p1, p0, Lcom/rphub/app/MainActivity$6;->this$0:Lcom/rphub/app/MainActivity;

    invoke-static {p1, v1}, Lcom/rphub/app/MainActivity;->access$22(Lcom/rphub/app/MainActivity;Lcom/rphub/app/MainActivity$BackupWriteSession;)V

    .line 872
    new-instance p1, Ljava/lang/StringBuilder;

    const-string v0, "ERR:"

    invoke-direct {p1, v0}, Ljava/lang/StringBuilder;-><init>(Ljava/lang/String;)V

    invoke-virtual {p2}, Ljava/lang/Throwable;->getMessage()Ljava/lang/String;

    move-result-object v0

    if-nez v0, :cond_2

    invoke-virtual {p2}, Ljava/lang/Throwable;->toString()Ljava/lang/String;

    move-result-object p2

    goto :goto_0

    :cond_2
    invoke-virtual {p2}, Ljava/lang/Throwable;->getMessage()Ljava/lang/String;

    move-result-object p2

    :goto_0
    invoke-virtual {p1, p2}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    invoke-virtual {p1}, Ljava/lang/StringBuilder;->toString()Ljava/lang/String;

    move-result-object p1

    return-object p1

    :catchall_1
    move-exception p1

    .line 868
    :try_start_4
    monitor-exit v2
    :try_end_4
    .catchall {:try_start_4 .. :try_end_4} :catchall_1

    throw p1

    :catchall_2
    move-exception p1

    .line 858
    :try_start_5
    monitor-exit v0
    :try_end_5
    .catchall {:try_start_5 .. :try_end_5} :catchall_2

    throw p1
.end method
