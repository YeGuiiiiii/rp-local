.class Lcom/rphub/app/MainActivity$BackupWriteSession;
.super Ljava/lang/Object;
.source "MainActivity.java"


# annotations
.annotation system Ldalvik/annotation/EnclosingClass;
    value = Lcom/rphub/app/MainActivity;
.end annotation

.annotation system Ldalvik/annotation/InnerClass;
    accessFlags = 0xa
    name = "BackupWriteSession"
.end annotation


# instance fields
.field final output:Ljava/io/OutputStream;

.field final scanMime:Ljava/lang/String;

.field final targetFile:Ljava/io/File;

.field final targetUri:Landroid/net/Uri;


# direct methods
.method constructor <init>(Ljava/io/OutputStream;Ljava/io/File;Landroid/net/Uri;)V
    .locals 1

    const/4 v0, 0x0

    .line 126
    invoke-direct {p0, p1, p2, p3, v0}, Lcom/rphub/app/MainActivity$BackupWriteSession;-><init>(Ljava/io/OutputStream;Ljava/io/File;Landroid/net/Uri;Ljava/lang/String;)V

    return-void
.end method

.method constructor <init>(Ljava/io/OutputStream;Ljava/io/File;Landroid/net/Uri;Ljava/lang/String;)V
    .locals 0

    .line 129
    invoke-direct {p0}, Ljava/lang/Object;-><init>()V

    .line 130
    iput-object p1, p0, Lcom/rphub/app/MainActivity$BackupWriteSession;->output:Ljava/io/OutputStream;

    .line 131
    iput-object p2, p0, Lcom/rphub/app/MainActivity$BackupWriteSession;->targetFile:Ljava/io/File;

    .line 132
    iput-object p3, p0, Lcom/rphub/app/MainActivity$BackupWriteSession;->targetUri:Landroid/net/Uri;

    .line 133
    iput-object p4, p0, Lcom/rphub/app/MainActivity$BackupWriteSession;->scanMime:Ljava/lang/String;

    return-void
.end method
