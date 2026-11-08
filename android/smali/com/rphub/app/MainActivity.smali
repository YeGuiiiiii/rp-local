.class public Lcom/rphub/app/MainActivity;
.super Landroid/app/Activity;
.source "MainActivity.java"


# annotations
.annotation system Ldalvik/annotation/MemberClasses;
    value = {
        Lcom/rphub/app/MainActivity$BackupWriteSession;
    }
.end annotation


# static fields
.field private static final BACKUP_FOLDER_RESULT:I = 0x3eb

.field private static final BACK_EXIT_INTERVAL_MS:J = 0x7d0L

.field private static final COLOR_BG_DARK:I = -0xefeae4

.field private static final COLOR_BG_LIGHT:I = -0x60505

.field private static final CREATE_DOCUMENT_RESULT:I = 0x3ea

.field private static final FILE_CHOOSER_RESULT:I = 0x3e9

.field private static final INDEX_URL:Ljava/lang/String; = "https://sta1n156.github.io/RP-Hub/"

.field private static final KEYBOARD_LOG_NAME:Ljava/lang/String; = "rphub-keyboard.log"

.field private static final LIGHTHOUSE_FILE_CHOOSER_RESULT:I = 0x3ec

.field private static final LOG_NAME:Ljava/lang/String; = "rphub-crash.log"

.field private static final TAG:Ljava/lang/String; = "RPHub"

.field private static final THEME_PREFS:Ljava/lang/String; = "rphub_theme"

.field private static final THEME_PREFS_DARK:Ljava/lang/String; = "dark"

.field private static final WEB_ERROR_LOG_NAME:Ljava/lang/String; = "rphub-web-error.log"


# instance fields
.field private final assetTextCache:Ljava/util/Map;
    .annotation system Ldalvik/annotation/Signature;
        value = {
            "Ljava/util/Map<",
            "Ljava/lang/String;",
            "Ljava/lang/String;",
            ">;"
        }
    .end annotation
.end field

.field private backHandling:Z

.field private final backupWriteSessions:Ljava/util/HashMap;
    .annotation system Ldalvik/annotation/Signature;
        value = {
            "Ljava/util/HashMap<",
            "Ljava/lang/String;",
            "Lcom/rphub/app/MainActivity$BackupWriteSession;",
            ">;"
        }
    .end annotation
.end field

.field private darkThemeActive:Z

.field private final keyboardHandler:Landroid/os/Handler;

.field private final keyboardPoller:Ljava/lang/Runnable;

.field private lastAutoRecoverAt:J

.field private lastBackPressedAt:J

.field private lastPushedKeyboardInset:I

.field private lastRawKeyboardInsetPx:I

.field private lighthouseExitDialog:Landroid/app/AlertDialog;

.field private lighthouseLayer:Landroid/widget/FrameLayout;

.field private lighthouseUploadMessage:Landroid/webkit/ValueCallback;
    .annotation system Ldalvik/annotation/Signature;
        value = {
            "Landroid/webkit/ValueCallback<",
            "[",
            "Landroid/net/Uri;",
            ">;"
        }
    .end annotation
.end field

.field private lighthouseWebView:Landroid/webkit/WebView;

.field private final logDateFormat:Ljava/lang/ThreadLocal;
    .annotation system Ldalvik/annotation/Signature;
        value = {
            "Ljava/lang/ThreadLocal<",
            "Ljava/text/SimpleDateFormat;",
            ">;"
        }
    .end annotation
.end field

.field private final logFlusher:Ljava/lang/Thread;

.field private final logQueue:Ljava/util/concurrent/ConcurrentLinkedQueue;
    .annotation system Ldalvik/annotation/Signature;
        value = {
            "Ljava/util/concurrent/ConcurrentLinkedQueue<",
            "[",
            "Ljava/lang/String;",
            ">;"
        }
    .end annotation
.end field

.field private pendingCreateDocumentBytes:[B

.field private pendingCreateDocumentMime:Ljava/lang/String;

.field private pendingCreateDocumentName:Ljava/lang/String;

.field private pendingCreateDocumentStream:Z

.field private rootLayout:Landroid/widget/FrameLayout;

.field private uploadMessage:Landroid/webkit/ValueCallback;
    .annotation system Ldalvik/annotation/Signature;
        value = {
            "Landroid/webkit/ValueCallback<",
            "[",
            "Landroid/net/Uri;",
            ">;"
        }
    .end annotation
.end field

.field private webView:Landroid/webkit/WebView;


# direct methods
.method public constructor <init>()V
    .locals 3

    .line 67
    invoke-direct {p0}, Landroid/app/Activity;-><init>()V

    const/4 v0, 0x0

    .line 98
    iput-boolean v0, p0, Lcom/rphub/app/MainActivity;->darkThemeActive:Z

    const-wide/16 v1, 0x0

    .line 104
    iput-wide v1, p0, Lcom/rphub/app/MainActivity;->lastBackPressedAt:J

    .line 105
    iput-wide v1, p0, Lcom/rphub/app/MainActivity;->lastAutoRecoverAt:J

    .line 106
    iput-boolean v0, p0, Lcom/rphub/app/MainActivity;->backHandling:Z

    const/4 v0, -0x1

    .line 107
    iput v0, p0, Lcom/rphub/app/MainActivity;->lastPushedKeyboardInset:I

    .line 108
    iput v0, p0, Lcom/rphub/app/MainActivity;->lastRawKeyboardInsetPx:I

    const-string v0, "application/octet-stream"

    .line 111
    iput-object v0, p0, Lcom/rphub/app/MainActivity;->pendingCreateDocumentMime:Ljava/lang/String;

    const-string v0, "export.json"

    .line 112
    iput-object v0, p0, Lcom/rphub/app/MainActivity;->pendingCreateDocumentName:Ljava/lang/String;

    .line 137
    new-instance v0, Ljava/util/HashMap;

    invoke-direct {v0}, Ljava/util/HashMap;-><init>()V

    iput-object v0, p0, Lcom/rphub/app/MainActivity;->backupWriteSessions:Ljava/util/HashMap;

    .line 171
    new-instance v0, Ljava/util/concurrent/ConcurrentLinkedQueue;

    invoke-direct {v0}, Ljava/util/concurrent/ConcurrentLinkedQueue;-><init>()V

    iput-object v0, p0, Lcom/rphub/app/MainActivity;->logQueue:Ljava/util/concurrent/ConcurrentLinkedQueue;

    .line 172
    new-instance v0, Ljava/lang/Thread;

    new-instance v1, Lcom/rphub/app/MainActivity$1;

    invoke-direct {v1, p0}, Lcom/rphub/app/MainActivity$1;-><init>(Lcom/rphub/app/MainActivity;)V

    const-string v2, "rphub-log-flusher"

    .line 190
    invoke-direct {v0, v1, v2}, Ljava/lang/Thread;-><init>(Ljava/lang/Runnable;Ljava/lang/String;)V

    iput-object v0, p0, Lcom/rphub/app/MainActivity;->logFlusher:Ljava/lang/Thread;

    .line 191
    new-instance v0, Lcom/rphub/app/MainActivity$2;

    invoke-direct {v0, p0}, Lcom/rphub/app/MainActivity$2;-><init>(Lcom/rphub/app/MainActivity;)V

    iput-object v0, p0, Lcom/rphub/app/MainActivity;->logDateFormat:Ljava/lang/ThreadLocal;

    .line 197
    new-instance v0, Landroid/os/Handler;

    invoke-static {}, Landroid/os/Looper;->getMainLooper()Landroid/os/Looper;

    move-result-object v1

    invoke-direct {v0, v1}, Landroid/os/Handler;-><init>(Landroid/os/Looper;)V

    iput-object v0, p0, Lcom/rphub/app/MainActivity;->keyboardHandler:Landroid/os/Handler;

    .line 198
    new-instance v0, Lcom/rphub/app/MainActivity$3;

    invoke-direct {v0, p0}, Lcom/rphub/app/MainActivity$3;-><init>(Lcom/rphub/app/MainActivity;)V

    iput-object v0, p0, Lcom/rphub/app/MainActivity;->keyboardPoller:Ljava/lang/Runnable;

    .line 2324
    new-instance v0, Ljava/util/HashMap;

    invoke-direct {v0}, Ljava/util/HashMap;-><init>()V

    iput-object v0, p0, Lcom/rphub/app/MainActivity;->assetTextCache:Ljava/util/Map;

    return-void
.end method

.method static synthetic access$0(Lcom/rphub/app/MainActivity;)Ljava/util/concurrent/ConcurrentLinkedQueue;
    .locals 0

    .line 170
    iget-object p0, p0, Lcom/rphub/app/MainActivity;->logQueue:Ljava/util/concurrent/ConcurrentLinkedQueue;

    return-object p0
.end method

.method static synthetic access$1(Lcom/rphub/app/MainActivity;Ljava/util/List;)V
    .locals 0

    .line 1609
    invoke-direct {p0, p1}, Lcom/rphub/app/MainActivity;->flushLogBatch(Ljava/util/List;)V

    return-void
.end method

.method static synthetic access$10(Lcom/rphub/app/MainActivity;Ljava/lang/String;)V
    .locals 0

    .line 2067
    invoke-direct {p0, p1}, Lcom/rphub/app/MainActivity;->showLighthouseLayer(Ljava/lang/String;)V

    return-void
.end method

.method static synthetic access$11(Lcom/rphub/app/MainActivity;Ljava/lang/String;Ljava/lang/String;Ljava/lang/String;I)V
    .locals 0

    .line 2341
    invoke-direct {p0, p1, p2, p3, p4}, Lcom/rphub/app/MainActivity;->logWebError(Ljava/lang/String;Ljava/lang/String;Ljava/lang/String;I)V

    return-void
.end method

.method static synthetic access$12(Lcom/rphub/app/MainActivity;Ljava/lang/String;)V
    .locals 0

    .line 2367
    invoke-direct {p0, p1}, Lcom/rphub/app/MainActivity;->handleWhiteScreenFailure(Ljava/lang/String;)V

    return-void
.end method

.method static synthetic access$13(Lcom/rphub/app/MainActivity;Ljava/lang/String;Ljava/lang/String;Ljava/lang/String;)V
    .locals 0

    .line 1892
    invoke-direct {p0, p1, p2, p3}, Lcom/rphub/app/MainActivity;->writeBase64ToDownloads(Ljava/lang/String;Ljava/lang/String;Ljava/lang/String;)V

    return-void
.end method

.method static synthetic access$14(Lcom/rphub/app/MainActivity;Ljava/lang/String;Z)V
    .locals 0

    .line 1873
    invoke-direct {p0, p1, p2}, Lcom/rphub/app/MainActivity;->showSaveToast(Ljava/lang/String;Z)V

    return-void
.end method

.method static synthetic access$15(Lcom/rphub/app/MainActivity;Ljava/lang/String;)Ljava/lang/String;
    .locals 0

    .line 1882
    invoke-direct {p0, p1}, Lcom/rphub/app/MainActivity;->sanitizeSaveFileName(Ljava/lang/String;)Ljava/lang/String;

    move-result-object p0

    return-object p0
.end method

.method static synthetic access$16(Lcom/rphub/app/MainActivity;[B)V
    .locals 0

    .line 109
    iput-object p1, p0, Lcom/rphub/app/MainActivity;->pendingCreateDocumentBytes:[B

    return-void
.end method

.method static synthetic access$17(Lcom/rphub/app/MainActivity;Ljava/lang/String;)V
    .locals 0

    .line 111
    iput-object p1, p0, Lcom/rphub/app/MainActivity;->pendingCreateDocumentMime:Ljava/lang/String;

    return-void
.end method

.method static synthetic access$18(Lcom/rphub/app/MainActivity;Ljava/lang/String;)V
    .locals 0

    .line 112
    iput-object p1, p0, Lcom/rphub/app/MainActivity;->pendingCreateDocumentName:Ljava/lang/String;

    return-void
.end method

.method static synthetic access$19(Lcom/rphub/app/MainActivity;Z)V
    .locals 0

    .line 110
    iput-boolean p1, p0, Lcom/rphub/app/MainActivity;->pendingCreateDocumentStream:Z

    return-void
.end method

.method static synthetic access$2(Lcom/rphub/app/MainActivity;)Landroid/webkit/WebView;
    .locals 0

    .line 75
    iget-object p0, p0, Lcom/rphub/app/MainActivity;->webView:Landroid/webkit/WebView;

    return-object p0
.end method

.method static synthetic access$20(Lcom/rphub/app/MainActivity;)V
    .locals 0

    .line 2465
    invoke-direct {p0}, Lcom/rphub/app/MainActivity;->notifyPickerSaveCancelled()V

    return-void
.end method

.method static synthetic access$21(Lcom/rphub/app/MainActivity;)Ljava/util/HashMap;
    .locals 0

    .line 137
    iget-object p0, p0, Lcom/rphub/app/MainActivity;->backupWriteSessions:Ljava/util/HashMap;

    return-object p0
.end method

.method static synthetic access$22(Lcom/rphub/app/MainActivity;Lcom/rphub/app/MainActivity$BackupWriteSession;)V
    .locals 0

    .line 144
    invoke-direct {p0, p1}, Lcom/rphub/app/MainActivity;->discardBackupWriteSession(Lcom/rphub/app/MainActivity$BackupWriteSession;)V

    return-void
.end method

.method static synthetic access$23(Lcom/rphub/app/MainActivity;Ljava/lang/String;)V
    .locals 0

    .line 1638
    invoke-direct {p0, p1}, Lcom/rphub/app/MainActivity;->logInfo(Ljava/lang/String;)V

    return-void
.end method

.method static synthetic access$24(Lcom/rphub/app/MainActivity;Ljava/lang/String;)V
    .locals 0

    .line 2432
    invoke-direct {p0, p1}, Lcom/rphub/app/MainActivity;->showErrorPage(Ljava/lang/String;)V

    return-void
.end method

.method static synthetic access$25(Lcom/rphub/app/MainActivity;Landroid/webkit/WebView;)V
    .locals 0

    .line 1654
    invoke-direct {p0, p1}, Lcom/rphub/app/MainActivity;->installEarlyErrorTrap(Landroid/webkit/WebView;)V

    return-void
.end method

.method static synthetic access$26(Lcom/rphub/app/MainActivity;Landroid/webkit/WebView;)V
    .locals 0

    .line 1696
    invoke-direct {p0, p1}, Lcom/rphub/app/MainActivity;->installEmbeddingCache(Landroid/webkit/WebView;)V

    return-void
.end method

.method static synthetic access$27(Lcom/rphub/app/MainActivity;Landroid/webkit/WebView;)V
    .locals 0

    .line 1708
    invoke-direct {p0, p1}, Lcom/rphub/app/MainActivity;->installSakuraFeatures(Landroid/webkit/WebView;)V

    return-void
.end method

.method static synthetic access$28(Lcom/rphub/app/MainActivity;Landroid/webkit/WebView;)V
    .locals 0

    .line 1720
    invoke-direct {p0, p1}, Lcom/rphub/app/MainActivity;->installImageGallery(Landroid/webkit/WebView;)V

    return-void
.end method

.method static synthetic access$29(Lcom/rphub/app/MainActivity;Landroid/webkit/WebView;)V
    .locals 0

    .line 1732
    invoke-direct {p0, p1}, Lcom/rphub/app/MainActivity;->installImageVault(Landroid/webkit/WebView;)V

    return-void
.end method

.method static synthetic access$3(Lcom/rphub/app/MainActivity;)I
    .locals 0

    .line 108
    iget p0, p0, Lcom/rphub/app/MainActivity;->lastRawKeyboardInsetPx:I

    return p0
.end method

.method static synthetic access$30(Lcom/rphub/app/MainActivity;Landroid/webkit/WebView;)V
    .locals 0

    .line 1744
    invoke-direct {p0, p1}, Lcom/rphub/app/MainActivity;->installJSZip(Landroid/webkit/WebView;)V

    return-void
.end method

.method static synthetic access$31(Lcom/rphub/app/MainActivity;Landroid/webkit/WebView;)V
    .locals 0

    .line 2300
    invoke-direct {p0, p1}, Lcom/rphub/app/MainActivity;->installNativeThemeFollow(Landroid/webkit/WebView;)V

    return-void
.end method

.method static synthetic access$32(Lcom/rphub/app/MainActivity;Landroid/webkit/WebView;)V
    .locals 0

    .line 2312
    invoke-direct {p0, p1}, Lcom/rphub/app/MainActivity;->installWebErrorTrap(Landroid/webkit/WebView;)V

    return-void
.end method

.method static synthetic access$33(Lcom/rphub/app/MainActivity;Ljava/lang/String;)V
    .locals 0

    .line 1846
    invoke-direct {p0, p1}, Lcom/rphub/app/MainActivity;->openInAppOrBrowser(Ljava/lang/String;)V

    return-void
.end method

.method static synthetic access$34(Lcom/rphub/app/MainActivity;)Landroid/webkit/ValueCallback;
    .locals 0

    .line 90
    iget-object p0, p0, Lcom/rphub/app/MainActivity;->uploadMessage:Landroid/webkit/ValueCallback;

    return-object p0
.end method

.method static synthetic access$35(Lcom/rphub/app/MainActivity;Landroid/webkit/ValueCallback;)V
    .locals 0

    .line 90
    iput-object p1, p0, Lcom/rphub/app/MainActivity;->uploadMessage:Landroid/webkit/ValueCallback;

    return-void
.end method

.method static synthetic access$36(Lcom/rphub/app/MainActivity;Landroid/webkit/WebChromeClient$FileChooserParams;)Landroid/content/Intent;
    .locals 0

    .line 1476
    invoke-direct {p0, p1}, Lcom/rphub/app/MainActivity;->buildFileChooserIntent(Landroid/webkit/WebChromeClient$FileChooserParams;)Landroid/content/Intent;

    move-result-object p0

    return-object p0
.end method

.method static synthetic access$37(Lcom/rphub/app/MainActivity;Ljava/lang/String;Ljava/lang/String;Ljava/lang/String;Ljava/lang/String;)V
    .locals 0

    .line 1957
    invoke-direct {p0, p1, p2, p3, p4}, Lcom/rphub/app/MainActivity;->enqueueDownload(Ljava/lang/String;Ljava/lang/String;Ljava/lang/String;Ljava/lang/String;)V

    return-void
.end method

.method static synthetic access$38(Lcom/rphub/app/MainActivity;)V
    .locals 0

    .line 2592
    invoke-direct {p0}, Lcom/rphub/app/MainActivity;->handleBackPressed()V

    return-void
.end method

.method static synthetic access$39(Lcom/rphub/app/MainActivity;Ljava/io/File;Ljava/lang/String;)V
    .locals 0

    .line 1626
    invoke-direct {p0, p1, p2}, Lcom/rphub/app/MainActivity;->writeLogFile(Ljava/io/File;Ljava/lang/String;)V

    return-void
.end method

.method static synthetic access$4(Lcom/rphub/app/MainActivity;I)V
    .locals 0

    .line 108
    iput p1, p0, Lcom/rphub/app/MainActivity;->lastRawKeyboardInsetPx:I

    return-void
.end method

.method static synthetic access$40(Lcom/rphub/app/MainActivity;Landroid/webkit/WebView;Ljava/lang/String;Ljava/lang/String;)Z
    .locals 0

    .line 1995
    invoke-direct {p0, p1, p2, p3}, Lcom/rphub/app/MainActivity;->rescueInlineDownload(Landroid/webkit/WebView;Ljava/lang/String;Ljava/lang/String;)Z

    move-result p0

    return p0
.end method

.method static synthetic access$41(Lcom/rphub/app/MainActivity;Landroid/webkit/WebView;)V
    .locals 0

    .line 1940
    invoke-direct {p0, p1}, Lcom/rphub/app/MainActivity;->injectDownloadHook(Landroid/webkit/WebView;)V

    return-void
.end method

.method static synthetic access$42(Lcom/rphub/app/MainActivity;)Landroid/webkit/ValueCallback;
    .locals 0

    .line 96
    iget-object p0, p0, Lcom/rphub/app/MainActivity;->lighthouseUploadMessage:Landroid/webkit/ValueCallback;

    return-object p0
.end method

.method static synthetic access$43(Lcom/rphub/app/MainActivity;Landroid/webkit/ValueCallback;)V
    .locals 0

    .line 96
    iput-object p1, p0, Lcom/rphub/app/MainActivity;->lighthouseUploadMessage:Landroid/webkit/ValueCallback;

    return-void
.end method

.method static synthetic access$44(Lcom/rphub/app/MainActivity;)V
    .locals 0

    .line 2262
    invoke-direct {p0}, Lcom/rphub/app/MainActivity;->closeLighthouseLayer()V

    return-void
.end method

.method static synthetic access$45(Lcom/rphub/app/MainActivity;Z)V
    .locals 0

    .line 106
    iput-boolean p1, p0, Lcom/rphub/app/MainActivity;->backHandling:Z

    return-void
.end method

.method static synthetic access$46(Lcom/rphub/app/MainActivity;J)V
    .locals 0

    .line 104
    iput-wide p1, p0, Lcom/rphub/app/MainActivity;->lastBackPressedAt:J

    return-void
.end method

.method static synthetic access$5(Lcom/rphub/app/MainActivity;Ljava/lang/String;)V
    .locals 0

    .line 2354
    invoke-direct {p0, p1}, Lcom/rphub/app/MainActivity;->logKeyboard(Ljava/lang/String;)V

    return-void
.end method

.method static synthetic access$6(Lcom/rphub/app/MainActivity;I)V
    .locals 0

    .line 1525
    invoke-direct {p0, p1}, Lcom/rphub/app/MainActivity;->pushKeyboardInsetToPage(I)V

    return-void
.end method

.method static synthetic access$7(Lcom/rphub/app/MainActivity;)Landroid/os/Handler;
    .locals 0

    .line 197
    iget-object p0, p0, Lcom/rphub/app/MainActivity;->keyboardHandler:Landroid/os/Handler;

    return-object p0
.end method

.method static synthetic access$9(Lcom/rphub/app/MainActivity;Z)V
    .locals 0

    .line 1824
    invoke-direct {p0, p1}, Lcom/rphub/app/MainActivity;->refreshDarkTheme(Z)V

    return-void
.end method

.method private buildFileChooserIntent(Landroid/webkit/WebChromeClient$FileChooserParams;)Landroid/content/Intent;
    .locals 16

    .line 1477
    new-instance v0, Landroid/content/Intent;

    const-string v1, "android.intent.action.GET_CONTENT"

    invoke-direct {v0, v1}, Landroid/content/Intent;-><init>(Ljava/lang/String;)V

    const-string v1, "android.intent.category.OPENABLE"

    .line 1478
    invoke-virtual {v0, v1}, Landroid/content/Intent;->addCategory(Ljava/lang/String;)Landroid/content/Intent;

    const-string v1, "*/*"

    .line 1479
    invoke-virtual {v0, v1}, Landroid/content/Intent;->setType(Ljava/lang/String;)Landroid/content/Intent;

    const/4 v2, 0x0

    if-eqz p1, :cond_f

    .line 1482
    invoke-virtual/range {p1 .. p1}, Landroid/webkit/WebChromeClient$FileChooserParams;->getMode()I

    move-result v3

    const/4 v4, 0x1

    if-ne v3, v4, :cond_0

    const/4 v3, 0x1

    goto :goto_0

    :cond_0
    const/4 v3, 0x0

    .line 1483
    :goto_0
    invoke-virtual/range {p1 .. p1}, Landroid/webkit/WebChromeClient$FileChooserParams;->getAcceptTypes()[Ljava/lang/String;

    move-result-object v5

    .line 1484
    new-instance v6, Ljava/util/ArrayList;

    invoke-direct {v6}, Ljava/util/ArrayList;-><init>()V

    if-eqz v5, :cond_9

    .line 1487
    invoke-static {}, Landroid/webkit/MimeTypeMap;->getSingleton()Landroid/webkit/MimeTypeMap;

    move-result-object v7

    .line 1488
    array-length v8, v5

    const/4 v9, 0x0

    const/4 v10, 0x0

    :goto_1
    if-lt v9, v8, :cond_1

    goto :goto_6

    :cond_1
    aget-object v11, v5, v9

    if-nez v11, :cond_2

    goto :goto_3

    :cond_2
    const-string v12, ","

    .line 1491
    invoke-virtual {v11, v12}, Ljava/lang/String;->split(Ljava/lang/String;)[Ljava/lang/String;

    move-result-object v11

    array-length v12, v11

    const/4 v13, 0x0

    :goto_2
    if-lt v13, v12, :cond_3

    :goto_3
    add-int/lit8 v9, v9, 0x1

    goto :goto_1

    :cond_3
    aget-object v14, v11, v13

    .line 1492
    invoke-virtual {v14}, Ljava/lang/String;->trim()Ljava/lang/String;

    move-result-object v14

    .line 1493
    invoke-virtual {v14}, Ljava/lang/String;->isEmpty()Z

    move-result v15

    if-eqz v15, :cond_4

    goto :goto_5

    :cond_4
    const-string v15, "."

    .line 1494
    invoke-virtual {v14, v15}, Ljava/lang/String;->startsWith(Ljava/lang/String;)Z

    move-result v15

    if-eqz v15, :cond_6

    .line 1495
    invoke-virtual {v14, v4}, Ljava/lang/String;->substring(I)Ljava/lang/String;

    move-result-object v14

    sget-object v15, Ljava/util/Locale;->ROOT:Ljava/util/Locale;

    invoke-virtual {v14, v15}, Ljava/lang/String;->toLowerCase(Ljava/util/Locale;)Ljava/lang/String;

    move-result-object v14

    .line 1496
    invoke-virtual {v7, v14}, Landroid/webkit/MimeTypeMap;->getMimeTypeFromExtension(Ljava/lang/String;)Ljava/lang/String;

    move-result-object v14

    if-eqz v14, :cond_7

    .line 1497
    invoke-virtual {v14}, Ljava/lang/String;->trim()Ljava/lang/String;

    move-result-object v15

    invoke-virtual {v15}, Ljava/lang/String;->isEmpty()Z

    move-result v15

    if-eqz v15, :cond_5

    goto :goto_4

    .line 1499
    :cond_5
    invoke-virtual {v6, v14}, Ljava/util/ArrayList;->contains(Ljava/lang/Object;)Z

    move-result v15

    if-nez v15, :cond_8

    .line 1500
    invoke-virtual {v6, v14}, Ljava/util/ArrayList;->add(Ljava/lang/Object;)Z

    goto :goto_5

    :cond_6
    const-string v15, "/"

    .line 1502
    invoke-virtual {v14, v15}, Ljava/lang/String;->contains(Ljava/lang/CharSequence;)Z

    move-result v15

    if-eqz v15, :cond_7

    .line 1503
    invoke-virtual {v6, v14}, Ljava/util/ArrayList;->contains(Ljava/lang/Object;)Z

    move-result v15

    if-nez v15, :cond_8

    invoke-virtual {v6, v14}, Ljava/util/ArrayList;->add(Ljava/lang/Object;)Z

    goto :goto_5

    :cond_7
    :goto_4
    const/4 v10, 0x1

    :cond_8
    :goto_5
    add-int/lit8 v13, v13, 0x1

    goto :goto_2

    :cond_9
    const/4 v10, 0x0

    :goto_6
    if-nez v10, :cond_a

    .line 1510
    invoke-virtual {v6}, Ljava/util/ArrayList;->size()I

    move-result v7

    if-ne v7, v4, :cond_a

    .line 1512
    invoke-virtual {v6, v2}, Ljava/util/ArrayList;->get(I)Ljava/lang/Object;

    move-result-object v1

    check-cast v1, Ljava/lang/String;

    invoke-virtual {v0, v1}, Landroid/content/Intent;->setType(Ljava/lang/String;)Landroid/content/Intent;

    goto :goto_7

    :cond_a
    if-nez v10, :cond_b

    .line 1513
    invoke-virtual {v6}, Ljava/util/ArrayList;->size()I

    move-result v2

    if-le v2, v4, :cond_b

    .line 1514
    invoke-virtual {v0, v1}, Landroid/content/Intent;->setType(Ljava/lang/String;)Landroid/content/Intent;

    .line 1515
    invoke-virtual {v6}, Ljava/util/ArrayList;->size()I

    move-result v1

    new-array v1, v1, [Ljava/lang/String;

    invoke-virtual {v6, v1}, Ljava/util/ArrayList;->toArray([Ljava/lang/Object;)[Ljava/lang/Object;

    move-result-object v1

    check-cast v1, [Ljava/lang/String;

    const-string v2, "android.intent.extra.MIME_TYPES"

    invoke-virtual {v0, v2, v1}, Landroid/content/Intent;->putExtra(Ljava/lang/String;[Ljava/lang/String;)Landroid/content/Intent;

    .line 1518
    :cond_b
    :goto_7
    new-instance v1, Ljava/lang/StringBuilder;

    const-string v2, "fileChooser accept="

    invoke-direct {v1, v2}, Ljava/lang/StringBuilder;-><init>(Ljava/lang/String;)V

    if-nez v5, :cond_c

    const-string v2, "null"

    goto :goto_8

    :cond_c
    invoke-static {v5}, Ljava/util/Arrays;->toString([Ljava/lang/Object;)Ljava/lang/String;

    move-result-object v2

    :goto_8
    invoke-virtual {v1, v2}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    const-string v2, " => "

    .line 1519
    invoke-virtual {v1, v2}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    if-nez v10, :cond_e

    invoke-virtual {v6}, Ljava/util/ArrayList;->isEmpty()Z

    move-result v2

    if-eqz v2, :cond_d

    goto :goto_9

    :cond_d
    invoke-virtual {v6}, Ljava/util/ArrayList;->toString()Ljava/lang/String;

    move-result-object v2

    goto :goto_a

    :cond_e
    :goto_9
    const-string v2, "*/*(\u653e\u884c\u5168\u90e8)"

    :goto_a
    invoke-virtual {v1, v2}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    invoke-virtual {v1}, Ljava/lang/StringBuilder;->toString()Ljava/lang/String;

    move-result-object v1

    move-object/from16 v4, p0

    .line 1518
    invoke-direct {v4, v1}, Lcom/rphub/app/MainActivity;->logKeyboard(Ljava/lang/String;)V

    move v2, v3

    goto :goto_b

    :cond_f
    move-object/from16 v4, p0

    :goto_b
    const-string v1, "android.intent.extra.ALLOW_MULTIPLE"

    .line 1521
    invoke-virtual {v0, v1, v2}, Landroid/content/Intent;->putExtra(Ljava/lang/String;Z)Landroid/content/Intent;

    return-object v0
.end method

.method private closeLighthouseLayer()V
    .locals 2

    .line 2264
    :try_start_0
    iget-object v0, p0, Lcom/rphub/app/MainActivity;->lighthouseLayer:Landroid/widget/FrameLayout;

    if-eqz v0, :cond_0

    iget-object v0, p0, Lcom/rphub/app/MainActivity;->lighthouseLayer:Landroid/widget/FrameLayout;

    const/16 v1, 0x8

    invoke-virtual {v0, v1}, Landroid/widget/FrameLayout;->setVisibility(I)V

    .line 2265
    :cond_0
    iget-object v0, p0, Lcom/rphub/app/MainActivity;->lighthouseWebView:Landroid/webkit/WebView;

    if-eqz v0, :cond_1

    iget-object v0, p0, Lcom/rphub/app/MainActivity;->lighthouseWebView:Landroid/webkit/WebView;

    const-string v1, "about:blank"

    invoke-virtual {v0, v1}, Landroid/webkit/WebView;->loadUrl(Ljava/lang/String;)V
    :try_end_0
    .catchall {:try_start_0 .. :try_end_0} :catchall_0

    :catchall_0
    :cond_1
    return-void
.end method

.method private confirmCloseLighthouseLayer()V
    .locals 4

    .line 2278
    invoke-virtual {p0}, Lcom/rphub/app/MainActivity;->isFinishing()Z

    move-result v0

    if-eqz v0, :cond_0

    return-void

    .line 2280
    :cond_0
    :try_start_0
    iget-object v0, p0, Lcom/rphub/app/MainActivity;->lighthouseExitDialog:Landroid/app/AlertDialog;

    if-eqz v0, :cond_1

    iget-object v0, p0, Lcom/rphub/app/MainActivity;->lighthouseExitDialog:Landroid/app/AlertDialog;

    invoke-virtual {v0}, Landroid/app/AlertDialog;->isShowing()Z

    move-result v0

    if-eqz v0, :cond_1

    return-void

    .line 2281
    :cond_1
    new-instance v0, Landroid/app/AlertDialog$Builder;

    invoke-direct {v0, p0}, Landroid/app/AlertDialog$Builder;-><init>(Landroid/content/Context;)V

    const-string v1, "\u9000\u51fa\u706f\u5854\uff1f"

    .line 2282
    invoke-virtual {v0, v1}, Landroid/app/AlertDialog$Builder;->setTitle(Ljava/lang/CharSequence;)Landroid/app/AlertDialog$Builder;

    move-result-object v0

    const-string v1, "\u8fd4\u56de\u4f1a\u5173\u95ed\u706f\u5854\u7a97\u53e3\u3002\u8981\u7ee7\u7eed\u6d4f\u89c8\u8bf7\u70b9\u300c\u53d6\u6d88\u300d\u3002"

    .line 2283
    invoke-virtual {v0, v1}, Landroid/app/AlertDialog$Builder;->setMessage(Ljava/lang/CharSequence;)Landroid/app/AlertDialog$Builder;

    move-result-object v0

    const/4 v1, 0x1

    .line 2284
    invoke-virtual {v0, v1}, Landroid/app/AlertDialog$Builder;->setCancelable(Z)Landroid/app/AlertDialog$Builder;

    move-result-object v0

    const-string v1, "\u9000\u51fa"

    .line 2285
    new-instance v2, Lcom/rphub/app/MainActivity$19;

    invoke-direct {v2, p0}, Lcom/rphub/app/MainActivity$19;-><init>(Lcom/rphub/app/MainActivity;)V

    invoke-virtual {v0, v1, v2}, Landroid/app/AlertDialog$Builder;->setPositiveButton(Ljava/lang/CharSequence;Landroid/content/DialogInterface$OnClickListener;)Landroid/app/AlertDialog$Builder;

    move-result-object v0

    const-string v1, "\u53d6\u6d88"

    const/4 v2, 0x0

    .line 2291
    invoke-virtual {v0, v1, v2}, Landroid/app/AlertDialog$Builder;->setNegativeButton(Ljava/lang/CharSequence;Landroid/content/DialogInterface$OnClickListener;)Landroid/app/AlertDialog$Builder;

    move-result-object v0

    .line 2292
    invoke-virtual {v0}, Landroid/app/AlertDialog$Builder;->show()Landroid/app/AlertDialog;

    move-result-object v0

    .line 2281
    iput-object v0, p0, Lcom/rphub/app/MainActivity;->lighthouseExitDialog:Landroid/app/AlertDialog;
    :try_end_0
    .catchall {:try_start_0 .. :try_end_0} :catchall_0

    goto :goto_0

    :catchall_0
    move-exception v0

    .line 2295
    new-instance v1, Ljava/lang/StringBuilder;

    const-string v2, "confirm dialog failed: "

    invoke-direct {v1, v2}, Ljava/lang/StringBuilder;-><init>(Ljava/lang/String;)V

    invoke-virtual {v1, v0}, Ljava/lang/StringBuilder;->append(Ljava/lang/Object;)Ljava/lang/StringBuilder;

    invoke-virtual {v1}, Ljava/lang/StringBuilder;->toString()Ljava/lang/String;

    move-result-object v0

    const/4 v1, 0x0

    const-string v2, "lighthouse"

    const-string v3, ""

    invoke-direct {p0, v2, v0, v3, v1}, Lcom/rphub/app/MainActivity;->logWebError(Ljava/lang/String;Ljava/lang/String;Ljava/lang/String;I)V

    .line 2296
    invoke-direct {p0}, Lcom/rphub/app/MainActivity;->closeLighthouseLayer()V

    :goto_0
    return-void
.end method

.method private discardBackupWriteSession(Lcom/rphub/app/MainActivity$BackupWriteSession;)V
    .locals 3

    const-string v0, "RPHub"

    if-nez p1, :cond_0

    return-void

    .line 147
    :cond_0
    :try_start_0
    iget-object v1, p1, Lcom/rphub/app/MainActivity$BackupWriteSession;->output:Ljava/io/OutputStream;

    if-eqz v1, :cond_1

    iget-object v1, p1, Lcom/rphub/app/MainActivity$BackupWriteSession;->output:Ljava/io/OutputStream;

    invoke-virtual {v1}, Ljava/io/OutputStream;->close()V
    :try_end_0
    .catchall {:try_start_0 .. :try_end_0} :catchall_0

    .line 151
    :catchall_0
    :cond_1
    :try_start_1
    iget-object v1, p1, Lcom/rphub/app/MainActivity$BackupWriteSession;->targetFile:Ljava/io/File;

    if-eqz v1, :cond_2

    iget-object v1, p1, Lcom/rphub/app/MainActivity$BackupWriteSession;->targetFile:Ljava/io/File;

    invoke-virtual {v1}, Ljava/io/File;->exists()Z

    move-result v1

    if-eqz v1, :cond_2

    .line 152
    iget-object v1, p1, Lcom/rphub/app/MainActivity$BackupWriteSession;->targetFile:Ljava/io/File;

    invoke-virtual {v1}, Ljava/io/File;->delete()Z

    move-result v1

    if-nez v1, :cond_4

    .line 153
    new-instance v1, Ljava/lang/StringBuilder;

    const-string v2, "\u534a\u6210\u54c1\u5907\u4efd\u6587\u4ef6\u5220\u9664\u5931\u8d25: "

    invoke-direct {v1, v2}, Ljava/lang/StringBuilder;-><init>(Ljava/lang/String;)V

    iget-object p1, p1, Lcom/rphub/app/MainActivity$BackupWriteSession;->targetFile:Ljava/io/File;

    invoke-virtual {p1}, Ljava/io/File;->getName()Ljava/lang/String;

    move-result-object p1

    invoke-virtual {v1, p1}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    invoke-virtual {v1}, Ljava/lang/StringBuilder;->toString()Ljava/lang/String;

    move-result-object p1

    invoke-static {v0, p1}, Landroid/util/Log;->w(Ljava/lang/String;Ljava/lang/String;)I

    goto :goto_0

    .line 155
    :cond_2
    iget-object v1, p1, Lcom/rphub/app/MainActivity$BackupWriteSession;->targetUri:Landroid/net/Uri;

    if-eqz v1, :cond_4

    const-string v1, "media"

    .line 158
    iget-object v2, p1, Lcom/rphub/app/MainActivity$BackupWriteSession;->targetUri:Landroid/net/Uri;

    invoke-virtual {v2}, Landroid/net/Uri;->getAuthority()Ljava/lang/String;

    move-result-object v2

    invoke-virtual {v1, v2}, Ljava/lang/String;->equals(Ljava/lang/Object;)Z

    move-result v1

    if-eqz v1, :cond_3

    .line 159
    invoke-virtual {p0}, Lcom/rphub/app/MainActivity;->getContentResolver()Landroid/content/ContentResolver;

    move-result-object v1

    iget-object p1, p1, Lcom/rphub/app/MainActivity$BackupWriteSession;->targetUri:Landroid/net/Uri;

    const/4 v2, 0x0

    invoke-virtual {v1, p1, v2, v2}, Landroid/content/ContentResolver;->delete(Landroid/net/Uri;Ljava/lang/String;[Ljava/lang/String;)I

    goto :goto_0

    .line 161
    :cond_3
    invoke-virtual {p0}, Lcom/rphub/app/MainActivity;->getContentResolver()Landroid/content/ContentResolver;

    move-result-object v1

    iget-object p1, p1, Lcom/rphub/app/MainActivity$BackupWriteSession;->targetUri:Landroid/net/Uri;

    invoke-static {v1, p1}, Landroid/provider/DocumentsContract;->deleteDocument(Landroid/content/ContentResolver;Landroid/net/Uri;)Z
    :try_end_1
    .catchall {:try_start_1 .. :try_end_1} :catchall_1

    goto :goto_0

    :catchall_1
    move-exception p1

    .line 165
    new-instance v1, Ljava/lang/StringBuilder;

    const-string v2, "\u5220\u9664\u534a\u6210\u54c1\u5907\u4efd\u6587\u4ef6\u5f02\u5e38: "

    invoke-direct {v1, v2}, Ljava/lang/StringBuilder;-><init>(Ljava/lang/String;)V

    invoke-virtual {p1}, Ljava/lang/Throwable;->getMessage()Ljava/lang/String;

    move-result-object p1

    invoke-virtual {v1, p1}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    invoke-virtual {v1}, Ljava/lang/StringBuilder;->toString()Ljava/lang/String;

    move-result-object p1

    invoke-static {v0, p1}, Landroid/util/Log;->w(Ljava/lang/String;Ljava/lang/String;)I

    :cond_4
    :goto_0
    return-void
.end method

.method private enableImmersiveFullscreen()V
    .locals 4

    .line 1431
    invoke-virtual {p0}, Lcom/rphub/app/MainActivity;->getWindow()Landroid/view/Window;

    move-result-object v0

    if-nez v0, :cond_0

    return-void

    .line 1434
    :cond_0
    :try_start_0
    sget v1, Landroid/os/Build$VERSION;->SDK_INT:I

    const/16 v2, 0x1e

    const/4 v3, 0x0

    if-lt v1, v2, :cond_1

    .line 1435
    invoke-virtual {v0, v3}, Landroid/view/Window;->setDecorFitsSystemWindows(Z)V

    .line 1436
    invoke-virtual {v0, v3}, Landroid/view/Window;->setStatusBarColor(I)V

    .line 1437
    invoke-virtual {v0, v3}, Landroid/view/Window;->setNavigationBarColor(I)V

    .line 1438
    invoke-virtual {v0}, Landroid/view/Window;->getInsetsController()Landroid/view/WindowInsetsController;

    move-result-object v1

    .line 1439
    invoke-static {}, Landroid/view/WindowInsets$Type;->statusBars()I

    move-result v2

    .line 1440
    invoke-static {}, Landroid/view/WindowInsets$Type;->navigationBars()I

    move-result v3

    or-int/2addr v2, v3

    .line 1438
    invoke-interface {v1, v2}, Landroid/view/WindowInsetsController;->hide(I)V

    .line 1441
    invoke-virtual {v0}, Landroid/view/Window;->getInsetsController()Landroid/view/WindowInsetsController;

    move-result-object v0

    const/4 v1, 0x2

    invoke-interface {v0, v1}, Landroid/view/WindowInsetsController;->setSystemBarsBehavior(I)V

    goto :goto_0

    .line 1444
    :cond_1
    invoke-virtual {v0, v3}, Landroid/view/Window;->setStatusBarColor(I)V

    .line 1445
    invoke-virtual {v0, v3}, Landroid/view/Window;->setNavigationBarColor(I)V

    .line 1446
    invoke-virtual {v0}, Landroid/view/Window;->getDecorView()Landroid/view/View;

    move-result-object v0

    const/16 v1, 0x1706

    .line 1447
    invoke-virtual {v0, v1}, Landroid/view/View;->setSystemUiVisibility(I)V
    :try_end_0
    .catchall {:try_start_0 .. :try_end_0} :catchall_0

    goto :goto_0

    :catchall_0
    move-exception v0

    .line 1456
    new-instance v1, Ljava/lang/StringBuilder;

    const-string v2, "\u5168\u5c4f\u8bbe\u7f6e\u5931\u8d25: "

    invoke-direct {v1, v2}, Ljava/lang/StringBuilder;-><init>(Ljava/lang/String;)V

    invoke-virtual {v0}, Ljava/lang/Throwable;->getMessage()Ljava/lang/String;

    move-result-object v0

    invoke-virtual {v1, v0}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    invoke-virtual {v1}, Ljava/lang/StringBuilder;->toString()Ljava/lang/String;

    move-result-object v0

    invoke-direct {p0, v0}, Lcom/rphub/app/MainActivity;->logInfo(Ljava/lang/String;)V

    :goto_0
    return-void
.end method

.method private enqueueDownload(Ljava/lang/String;Ljava/lang/String;Ljava/lang/String;Ljava/lang/String;)V
    .locals 5

    if-eqz p1, :cond_5

    .line 1958
    invoke-virtual {p1}, Ljava/lang/String;->isEmpty()Z

    move-result v0

    if-eqz v0, :cond_0

    goto/16 :goto_2

    .line 1959
    :cond_0
    invoke-virtual {p1}, Ljava/lang/String;->toLowerCase()Ljava/lang/String;

    move-result-object v0

    const-string v1, "blob:"

    .line 1960
    invoke-virtual {v0, v1}, Ljava/lang/String;->startsWith(Ljava/lang/String;)Z

    move-result v1

    const-string v2, ""

    const/4 v3, 0x0

    const-string v4, "download"

    if-nez v1, :cond_3

    const-string v1, "data:"

    invoke-virtual {v0, v1}, Ljava/lang/String;->startsWith(Ljava/lang/String;)Z

    move-result v0

    if-eqz v0, :cond_1

    goto :goto_1

    .line 1966
    :cond_1
    :try_start_0
    new-instance v0, Landroid/app/DownloadManager$Request;

    invoke-static {p1}, Landroid/net/Uri;->parse(Ljava/lang/String;)Landroid/net/Uri;

    move-result-object v1

    invoke-direct {v0, v1}, Landroid/app/DownloadManager$Request;-><init>(Landroid/net/Uri;)V

    const-string v1, "User-Agent"

    .line 1967
    invoke-virtual {v0, v1, p2}, Landroid/app/DownloadManager$Request;->addRequestHeader(Ljava/lang/String;Ljava/lang/String;)Landroid/app/DownloadManager$Request;

    .line 1968
    invoke-virtual {v0, p4}, Landroid/app/DownloadManager$Request;->setMimeType(Ljava/lang/String;)Landroid/app/DownloadManager$Request;

    .line 1969
    invoke-static {p1, p3, p4}, Landroid/webkit/URLUtil;->guessFileName(Ljava/lang/String;Ljava/lang/String;Ljava/lang/String;)Ljava/lang/String;

    move-result-object p2

    .line 1970
    invoke-virtual {v0, p2}, Landroid/app/DownloadManager$Request;->setTitle(Ljava/lang/CharSequence;)Landroid/app/DownloadManager$Request;

    const/4 p3, 0x1

    .line 1971
    invoke-virtual {v0, p3}, Landroid/app/DownloadManager$Request;->setNotificationVisibility(I)Landroid/app/DownloadManager$Request;

    .line 1972
    invoke-static {}, Landroid/webkit/CookieManager;->getInstance()Landroid/webkit/CookieManager;

    move-result-object p3

    invoke-virtual {p3, p1}, Landroid/webkit/CookieManager;->getCookie(Ljava/lang/String;)Ljava/lang/String;

    move-result-object p1

    if-eqz p1, :cond_2

    const-string p3, "Cookie"

    .line 1974
    invoke-virtual {v0, p3, p1}, Landroid/app/DownloadManager$Request;->addRequestHeader(Ljava/lang/String;Ljava/lang/String;)Landroid/app/DownloadManager$Request;

    .line 1976
    :cond_2
    sget-object p1, Landroid/os/Environment;->DIRECTORY_DOWNLOADS:Ljava/lang/String;

    invoke-virtual {v0, p1, p2}, Landroid/app/DownloadManager$Request;->setDestinationInExternalPublicDir(Ljava/lang/String;Ljava/lang/String;)Landroid/app/DownloadManager$Request;

    .line 1977
    invoke-virtual {p0, v4}, Lcom/rphub/app/MainActivity;->getSystemService(Ljava/lang/String;)Ljava/lang/Object;

    move-result-object p1

    check-cast p1, Landroid/app/DownloadManager;

    .line 1978
    invoke-virtual {p1, v0}, Landroid/app/DownloadManager;->enqueue(Landroid/app/DownloadManager$Request;)J
    :try_end_0
    .catchall {:try_start_0 .. :try_end_0} :catchall_0

    goto :goto_0

    :catchall_0
    move-exception p1

    .line 1980
    new-instance p2, Ljava/lang/StringBuilder;

    const-string p3, "enqueue failed: "

    invoke-direct {p2, p3}, Ljava/lang/StringBuilder;-><init>(Ljava/lang/String;)V

    invoke-virtual {p2, p1}, Ljava/lang/StringBuilder;->append(Ljava/lang/Object;)Ljava/lang/StringBuilder;

    invoke-virtual {p2}, Ljava/lang/StringBuilder;->toString()Ljava/lang/String;

    move-result-object p1

    invoke-direct {p0, v4, p1, v2, v3}, Lcom/rphub/app/MainActivity;->logWebError(Ljava/lang/String;Ljava/lang/String;Ljava/lang/String;I)V

    :goto_0
    return-void

    .line 1961
    :cond_3
    :goto_1
    new-instance p2, Ljava/lang/StringBuilder;

    const-string p3, "skip non-http url: "

    invoke-direct {p2, p3}, Ljava/lang/StringBuilder;-><init>(Ljava/lang/String;)V

    .line 1962
    invoke-virtual {p1}, Ljava/lang/String;->length()I

    move-result p3

    const/16 p4, 0x50

    if-le p3, p4, :cond_4

    new-instance p3, Ljava/lang/StringBuilder;

    invoke-virtual {p1, v3, p4}, Ljava/lang/String;->substring(II)Ljava/lang/String;

    move-result-object p1

    invoke-static {p1}, Ljava/lang/String;->valueOf(Ljava/lang/Object;)Ljava/lang/String;

    move-result-object p1

    invoke-direct {p3, p1}, Ljava/lang/StringBuilder;-><init>(Ljava/lang/String;)V

    const-string p1, "\u2026"

    invoke-virtual {p3, p1}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    invoke-virtual {p3}, Ljava/lang/StringBuilder;->toString()Ljava/lang/String;

    move-result-object p1

    :cond_4
    invoke-virtual {p2, p1}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    invoke-virtual {p2}, Ljava/lang/StringBuilder;->toString()Ljava/lang/String;

    move-result-object p1

    .line 1961
    invoke-direct {p0, v4, p1, v2, v3}, Lcom/rphub/app/MainActivity;->logWebError(Ljava/lang/String;Ljava/lang/String;Ljava/lang/String;I)V

    :cond_5
    :goto_2
    return-void
.end method

.method private enqueueLog(Ljava/lang/String;Ljava/lang/String;)V
    .locals 3

    .line 1602
    iget-object v0, p0, Lcom/rphub/app/MainActivity;->logQueue:Ljava/util/concurrent/ConcurrentLinkedQueue;

    const/4 v1, 0x2

    new-array v1, v1, [Ljava/lang/String;

    const/4 v2, 0x0

    aput-object p1, v1, v2

    const/4 p1, 0x1

    aput-object p2, v1, p1

    invoke-virtual {v0, v1}, Ljava/util/concurrent/ConcurrentLinkedQueue;->offer(Ljava/lang/Object;)Z

    .line 1603
    iget-object p1, p0, Lcom/rphub/app/MainActivity;->logFlusher:Ljava/lang/Thread;

    invoke-virtual {p1}, Ljava/lang/Thread;->isAlive()Z

    move-result p1

    if-nez p1, :cond_0

    .line 1604
    :try_start_0
    iget-object p1, p0, Lcom/rphub/app/MainActivity;->logFlusher:Ljava/lang/Thread;

    invoke-virtual {p1}, Ljava/lang/Thread;->start()V
    :try_end_0
    .catchall {:try_start_0 .. :try_end_0} :catchall_0

    :catchall_0
    :cond_0
    return-void
.end method

.method private extForMime(Ljava/lang/String;)Ljava/lang/String;
    .locals 1

    if-nez p1, :cond_0

    const-string p1, ""

    goto :goto_0

    .line 2049
    :cond_0
    sget-object v0, Ljava/util/Locale;->ROOT:Ljava/util/Locale;

    invoke-virtual {p1, v0}, Ljava/lang/String;->toLowerCase(Ljava/util/Locale;)Ljava/lang/String;

    move-result-object p1

    :goto_0
    const-string v0, "png"

    .line 2050
    invoke-virtual {p1, v0}, Ljava/lang/String;->indexOf(Ljava/lang/String;)I

    move-result v0

    if-ltz v0, :cond_1

    const-string p1, ".png"

    return-object p1

    :cond_1
    const-string v0, "jpeg"

    .line 2051
    invoke-virtual {p1, v0}, Ljava/lang/String;->indexOf(Ljava/lang/String;)I

    move-result v0

    if-gez v0, :cond_8

    const-string v0, "jpg"

    invoke-virtual {p1, v0}, Ljava/lang/String;->indexOf(Ljava/lang/String;)I

    move-result v0

    if-ltz v0, :cond_2

    goto :goto_1

    :cond_2
    const-string v0, "webp"

    .line 2052
    invoke-virtual {p1, v0}, Ljava/lang/String;->indexOf(Ljava/lang/String;)I

    move-result v0

    if-ltz v0, :cond_3

    const-string p1, ".webp"

    return-object p1

    :cond_3
    const-string v0, "json"

    .line 2053
    invoke-virtual {p1, v0}, Ljava/lang/String;->indexOf(Ljava/lang/String;)I

    move-result v0

    if-ltz v0, :cond_4

    const-string p1, ".json"

    return-object p1

    :cond_4
    const-string v0, "plain"

    .line 2054
    invoke-virtual {p1, v0}, Ljava/lang/String;->indexOf(Ljava/lang/String;)I

    move-result v0

    if-ltz v0, :cond_5

    const-string p1, ".txt"

    return-object p1

    :cond_5
    const-string v0, "zip"

    .line 2055
    invoke-virtual {p1, v0}, Ljava/lang/String;->indexOf(Ljava/lang/String;)I

    move-result v0

    if-ltz v0, :cond_6

    const-string p1, ".zip"

    return-object p1

    :cond_6
    const-string v0, "pdf"

    .line 2056
    invoke-virtual {p1, v0}, Ljava/lang/String;->indexOf(Ljava/lang/String;)I

    move-result p1

    if-ltz p1, :cond_7

    const-string p1, ".pdf"

    return-object p1

    :cond_7
    const-string p1, ".bin"

    return-object p1

    :cond_8
    :goto_1
    const-string p1, ".jpg"

    return-object p1
.end method

.method private flushLogBatch(Ljava/util/List;)V
    .locals 4
    .annotation system Ldalvik/annotation/Signature;
        value = {
            "(",
            "Ljava/util/List<",
            "[",
            "Ljava/lang/String;",
            ">;)V"
        }
    .end annotation

    .line 1610
    new-instance v0, Ljava/util/HashMap;

    invoke-direct {v0}, Ljava/util/HashMap;-><init>()V

    .line 1611
    invoke-interface {p1}, Ljava/util/List;->iterator()Ljava/util/Iterator;

    move-result-object p1

    :goto_0
    invoke-interface {p1}, Ljava/util/Iterator;->hasNext()Z

    move-result v1

    if-nez v1, :cond_2

    const/4 p1, 0x0

    .line 1619
    invoke-virtual {p0, p1}, Lcom/rphub/app/MainActivity;->getExternalFilesDir(Ljava/lang/String;)Ljava/io/File;

    move-result-object v1

    if-nez v1, :cond_0

    return-void

    .line 1621
    :cond_0
    invoke-interface {v0}, Ljava/util/Map;->entrySet()Ljava/util/Set;

    move-result-object p1

    invoke-interface {p1}, Ljava/util/Set;->iterator()Ljava/util/Iterator;

    move-result-object v2

    :goto_1
    invoke-interface {v2}, Ljava/util/Iterator;->hasNext()Z

    move-result p1

    if-nez p1, :cond_1

    return-void

    :cond_1
    invoke-interface {v2}, Ljava/util/Iterator;->next()Ljava/lang/Object;

    move-result-object p1

    check-cast p1, Ljava/util/Map$Entry;

    .line 1622
    new-instance v0, Ljava/io/File;

    invoke-interface {p1}, Ljava/util/Map$Entry;->getKey()Ljava/lang/Object;

    move-result-object v3

    check-cast v3, Ljava/lang/String;

    invoke-direct {v0, v1, v3}, Ljava/io/File;-><init>(Ljava/io/File;Ljava/lang/String;)V

    invoke-interface {p1}, Ljava/util/Map$Entry;->getValue()Ljava/lang/Object;

    move-result-object p1

    check-cast p1, Ljava/lang/StringBuilder;

    invoke-virtual {p1}, Ljava/lang/StringBuilder;->toString()Ljava/lang/String;

    move-result-object p1

    invoke-direct {p0, v0, p1}, Lcom/rphub/app/MainActivity;->writeLogFile(Ljava/io/File;Ljava/lang/String;)V

    goto :goto_1

    .line 1611
    :cond_2
    invoke-interface {p1}, Ljava/util/Iterator;->next()Ljava/lang/Object;

    move-result-object v1

    check-cast v1, [Ljava/lang/String;

    const/4 v2, 0x0

    .line 1612
    aget-object v3, v1, v2

    invoke-interface {v0, v3}, Ljava/util/Map;->get(Ljava/lang/Object;)Ljava/lang/Object;

    move-result-object v3

    check-cast v3, Ljava/lang/StringBuilder;

    if-nez v3, :cond_3

    .line 1614
    new-instance v3, Ljava/lang/StringBuilder;

    invoke-direct {v3}, Ljava/lang/StringBuilder;-><init>()V

    .line 1615
    aget-object v2, v1, v2

    invoke-interface {v0, v2, v3}, Ljava/util/Map;->put(Ljava/lang/Object;Ljava/lang/Object;)Ljava/lang/Object;

    :cond_3
    const/4 v2, 0x1

    .line 1617
    aget-object v1, v1, v2

    invoke-virtual {v3, v1}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    goto :goto_0
.end method

.method private handleBackPressed()V
    .locals 6

    .line 2594
    iget-object v0, p0, Lcom/rphub/app/MainActivity;->lighthouseLayer:Landroid/widget/FrameLayout;

    if-eqz v0, :cond_0

    invoke-virtual {v0}, Landroid/widget/FrameLayout;->getVisibility()I

    move-result v0

    if-nez v0, :cond_0

    .line 2595
    invoke-direct {p0}, Lcom/rphub/app/MainActivity;->confirmCloseLighthouseLayer()V

    return-void

    .line 2598
    :cond_0
    iget-boolean v0, p0, Lcom/rphub/app/MainActivity;->backHandling:Z

    if-eqz v0, :cond_1

    return-void

    :cond_1
    const/4 v0, 0x1

    .line 2599
    iput-boolean v0, p0, Lcom/rphub/app/MainActivity;->backHandling:Z

    const/4 v0, 0x0

    .line 2601
    :try_start_0
    iget-object v1, p0, Lcom/rphub/app/MainActivity;->webView:Landroid/webkit/WebView;

    if-nez v1, :cond_2

    .line 2602
    iput-boolean v0, p0, Lcom/rphub/app/MainActivity;->backHandling:Z

    .line 2603
    return-void

    .line 2606
    :cond_2
    iget-wide v1, p0, Lcom/rphub/app/MainActivity;->lastBackPressedAt:J

    .line 2612
    iget-object v3, p0, Lcom/rphub/app/MainActivity;->webView:Landroid/webkit/WebView;

    const-string v4, "(function(){ try { return typeof window.rphubHandleBack !== 'function' || window.rphubHandleBack() === true; } catch(e) { return true; } })();"

    .line 2614
    new-instance v5, Lcom/rphub/app/MainActivity$25;

    invoke-direct {v5, p0, v1, v2}, Lcom/rphub/app/MainActivity$25;-><init>(Lcom/rphub/app/MainActivity;J)V

    .line 2612
    invoke-virtual {v3, v4, v5}, Landroid/webkit/WebView;->evaluateJavascript(Ljava/lang/String;Landroid/webkit/ValueCallback;)V
    :try_end_0
    .catchall {:try_start_0 .. :try_end_0} :catchall_0

    goto :goto_0

    .line 2630
    :catchall_0
    iput-boolean v0, p0, Lcom/rphub/app/MainActivity;->backHandling:Z

    .line 2631
    :goto_0
    return-void
.end method

.method private handleWhiteScreenFailure(Ljava/lang/String;)V
    .locals 8

    .line 2368
    invoke-static {}, Ljava/lang/System;->currentTimeMillis()J

    move-result-wide v0

    const-string v2, "whitescreen"

    const-string v3, "watchdog"

    const/4 v4, 0x0

    .line 2369
    invoke-direct {p0, v2, p1, v3, v4}, Lcom/rphub/app/MainActivity;->logWebError(Ljava/lang/String;Ljava/lang/String;Ljava/lang/String;I)V

    .line 2371
    iget-wide v2, p0, Lcom/rphub/app/MainActivity;->lastAutoRecoverAt:J

    sub-long v2, v0, v2

    const-wide/32 v5, 0x88b8

    cmp-long v7, v2, v5

    if-gez v7, :cond_1

    .line 2372
    new-instance v0, Landroid/app/AlertDialog$Builder;

    invoke-direct {v0, p0}, Landroid/app/AlertDialog$Builder;-><init>(Landroid/content/Context;)V

    const-string v1, "\u26a0\ufe0f \u9875\u9762\u542f\u52a8\u5f02\u5e38\u6025\u6551"

    .line 2373
    invoke-virtual {v0, v1}, Landroid/app/AlertDialog$Builder;->setTitle(Ljava/lang/CharSequence;)Landroid/app/AlertDialog$Builder;

    move-result-object v0

    .line 2374
    new-instance v1, Ljava/lang/StringBuilder;

    const-string v2, "\u68c0\u6d4b\u5230\u5b98\u65b9\u9875\u9762\u7ed3\u6784\u53d8\u5316\u6216\u672c\u5730\u811a\u672c\u51b2\u7a81\u5bfc\u81f4\u6e32\u67d3\u4e2d\u65ad\u3002\n\n\u8be6\u60c5: "

    invoke-direct {v1, v2}, Ljava/lang/StringBuilder;-><init>(Ljava/lang/String;)V

    if-nez p1, :cond_0

    const-string p1, "\u6e32\u67d3\u8d85\u65f6"

    :cond_0
    invoke-virtual {v1, p1}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    invoke-virtual {v1}, Ljava/lang/StringBuilder;->toString()Ljava/lang/String;

    move-result-object p1

    invoke-virtual {v0, p1}, Landroid/app/AlertDialog$Builder;->setMessage(Ljava/lang/CharSequence;)Landroid/app/AlertDialog$Builder;

    move-result-object p1

    .line 2375
    invoke-virtual {p1, v4}, Landroid/app/AlertDialog$Builder;->setCancelable(Z)Landroid/app/AlertDialog$Builder;

    move-result-object p1

    .line 2376
    new-instance v0, Lcom/rphub/app/MainActivity$20;

    invoke-direct {v0, p0}, Lcom/rphub/app/MainActivity$20;-><init>(Lcom/rphub/app/MainActivity;)V

    const-string v1, "\u5b98\u65b9\u7eaf\u51c0\u6a21\u5f0f\u542f\u52a8"

    invoke-virtual {p1, v1, v0}, Landroid/app/AlertDialog$Builder;->setPositiveButton(Ljava/lang/CharSequence;Landroid/content/DialogInterface$OnClickListener;)Landroid/app/AlertDialog$Builder;

    move-result-object p1

    .line 2384
    new-instance v0, Lcom/rphub/app/MainActivity$21;

    invoke-direct {v0, p0}, Lcom/rphub/app/MainActivity$21;-><init>(Lcom/rphub/app/MainActivity;)V

    const-string v1, "\u6e05\u7a7a\u7f13\u5b58\u91cd\u8bd5"

    invoke-virtual {p1, v1, v0}, Landroid/app/AlertDialog$Builder;->setNeutralButton(Ljava/lang/CharSequence;Landroid/content/DialogInterface$OnClickListener;)Landroid/app/AlertDialog$Builder;

    move-result-object p1

    const/4 v0, 0x0

    const-string v1, "\u5173\u95ed"

    .line 2397
    invoke-virtual {p1, v1, v0}, Landroid/app/AlertDialog$Builder;->setNegativeButton(Ljava/lang/CharSequence;Landroid/content/DialogInterface$OnClickListener;)Landroid/app/AlertDialog$Builder;

    move-result-object p1

    .line 2398
    invoke-virtual {p1}, Landroid/app/AlertDialog$Builder;->show()Landroid/app/AlertDialog;

    goto :goto_0

    .line 2401
    :cond_1
    iput-wide v0, p0, Lcom/rphub/app/MainActivity;->lastAutoRecoverAt:J

    const-string p1, "\u68c0\u6d4b\u5230\u9875\u9762\u52a0\u8f7d\u5f02\u5e38\uff0c\u5df2\u81ea\u52a8\u5207\u6362\u4e3a\u5b89\u5168\u5185\u7f6e\u6a21\u5f0f"

    .line 2402
    invoke-static {p0, p1, v4}, Landroid/widget/Toast;->makeText(Landroid/content/Context;Ljava/lang/CharSequence;I)Landroid/widget/Toast;

    move-result-object p1

    invoke-virtual {p1}, Landroid/widget/Toast;->show()V

    .line 2408
    invoke-virtual {p0}, Lcom/rphub/app/MainActivity;->getApplicationContext()Landroid/content/Context;

    move-result-object p1

    invoke-static {p1}, Lcom/rphub/app/PatchEngine;->rejectCurrentGeneration(Landroid/content/Context;)V

    .line 2409
    iget-object p1, p0, Lcom/rphub/app/MainActivity;->webView:Landroid/webkit/WebView;

    if-eqz p1, :cond_2

    .line 2410
    new-instance v0, Lcom/rphub/app/MainActivity$22;

    invoke-direct {v0, p0}, Lcom/rphub/app/MainActivity$22;-><init>(Lcom/rphub/app/MainActivity;)V

    const-wide/16 v1, 0x12c

    invoke-virtual {p1, v0, v1, v2}, Landroid/webkit/WebView;->postDelayed(Ljava/lang/Runnable;J)Z

    :cond_2
    :goto_0
    return-void
.end method

.method private injectDownloadHook(Landroid/webkit/WebView;)V
    .locals 3

    .line 1942
    :try_start_0
    invoke-static {p0}, Lcom/rphub/app/PatchEngine;->downloadHookJs(Landroid/content/Context;)Ljava/lang/String;

    move-result-object v0

    if-eqz v0, :cond_1

    .line 1943
    invoke-virtual {v0}, Ljava/lang/String;->isEmpty()Z

    move-result v1

    if-eqz v1, :cond_0

    goto :goto_0

    :cond_0
    const/4 v1, 0x0

    .line 1944
    invoke-virtual {p1, v0, v1}, Landroid/webkit/WebView;->evaluateJavascript(Ljava/lang/String;Landroid/webkit/ValueCallback;)V
    :try_end_0
    .catchall {:try_start_0 .. :try_end_0} :catchall_0

    goto :goto_1

    :cond_1
    :goto_0
    return-void

    :catchall_0
    move-exception p1

    .line 1946
    new-instance v0, Ljava/lang/StringBuilder;

    const-string v1, "hook inject failed: "

    invoke-direct {v0, v1}, Ljava/lang/StringBuilder;-><init>(Ljava/lang/String;)V

    invoke-virtual {v0, p1}, Ljava/lang/StringBuilder;->append(Ljava/lang/Object;)Ljava/lang/StringBuilder;

    invoke-virtual {v0}, Ljava/lang/StringBuilder;->toString()Ljava/lang/String;

    move-result-object p1

    const/4 v0, 0x0

    const-string v1, "download"

    const-string v2, ""

    invoke-direct {p0, v1, p1, v2, v0}, Lcom/rphub/app/MainActivity;->logWebError(Ljava/lang/String;Ljava/lang/String;Ljava/lang/String;I)V

    :goto_1
    return-void
.end method

.method private installCrashLogger()V
    .locals 2

    .line 1574
    invoke-static {}, Ljava/lang/Thread;->getDefaultUncaughtExceptionHandler()Ljava/lang/Thread$UncaughtExceptionHandler;

    move-result-object v0

    .line 1575
    new-instance v1, Lcom/rphub/app/MainActivity$11;

    invoke-direct {v1, p0, v0}, Lcom/rphub/app/MainActivity$11;-><init>(Lcom/rphub/app/MainActivity;Ljava/lang/Thread$UncaughtExceptionHandler;)V

    invoke-static {v1}, Ljava/lang/Thread;->setDefaultUncaughtExceptionHandler(Ljava/lang/Thread$UncaughtExceptionHandler;)V

    return-void
.end method

.method private installEarlyErrorTrap(Landroid/webkit/WebView;)V
    .locals 2

    if-nez p1, :cond_0

    return-void

    :cond_0
    :try_start_0
    const-string v0, "local-site/assets/native/web-error-early.js"

    .line 1657
    invoke-direct {p0, v0}, Lcom/rphub/app/MainActivity;->readAssetText(Ljava/lang/String;)Ljava/lang/String;

    move-result-object v0

    if-eqz v0, :cond_2

    .line 1658
    invoke-virtual {v0}, Ljava/lang/String;->trim()Ljava/lang/String;

    move-result-object v1

    invoke-virtual {v1}, Ljava/lang/String;->isEmpty()Z

    move-result v1

    if-eqz v1, :cond_1

    goto :goto_0

    :cond_1
    const/4 v1, 0x0

    .line 1659
    invoke-virtual {p1, v0, v1}, Landroid/webkit/WebView;->evaluateJavascript(Ljava/lang/String;Landroid/webkit/ValueCallback;)V
    :try_end_0
    .catchall {:try_start_0 .. :try_end_0} :catchall_0

    goto :goto_1

    :cond_2
    :goto_0
    return-void

    :catchall_0
    move-exception p1

    .line 1661
    new-instance v0, Ljava/lang/StringBuilder;

    const-string v1, "\u6ce8\u5165\u65e9\u671f\u9519\u8bef\u76d1\u542c\u5931\u8d25: "

    invoke-direct {v0, v1}, Ljava/lang/StringBuilder;-><init>(Ljava/lang/String;)V

    invoke-virtual {p1}, Ljava/lang/Throwable;->getMessage()Ljava/lang/String;

    move-result-object p1

    invoke-virtual {v0, p1}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    invoke-virtual {v0}, Ljava/lang/StringBuilder;->toString()Ljava/lang/String;

    move-result-object p1

    invoke-direct {p0, p1}, Lcom/rphub/app/MainActivity;->logInfo(Ljava/lang/String;)V

    :goto_1
    return-void
.end method

.method private installEmbeddingCache(Landroid/webkit/WebView;)V
    .locals 2

    if-nez p1, :cond_0

    return-void

    :cond_0
    :try_start_0
    const-string v0, "local-site/assets/native/rphub-embedding-cache.js"

    .line 1699
    invoke-direct {p0, v0}, Lcom/rphub/app/MainActivity;->readAssetText(Ljava/lang/String;)Ljava/lang/String;

    move-result-object v0

    if-eqz v0, :cond_2

    .line 1700
    invoke-virtual {v0}, Ljava/lang/String;->trim()Ljava/lang/String;

    move-result-object v1

    invoke-virtual {v1}, Ljava/lang/String;->isEmpty()Z

    move-result v1

    if-eqz v1, :cond_1

    goto :goto_0

    :cond_1
    const/4 v1, 0x0

    .line 1701
    invoke-virtual {p1, v0, v1}, Landroid/webkit/WebView;->evaluateJavascript(Ljava/lang/String;Landroid/webkit/ValueCallback;)V
    :try_end_0
    .catchall {:try_start_0 .. :try_end_0} :catchall_0

    goto :goto_1

    :cond_2
    :goto_0
    return-void

    :catchall_0
    move-exception p1

    .line 1703
    new-instance v0, Ljava/lang/StringBuilder;

    const-string v1, "\u6ce8\u5165\u5411\u91cf\u7f13\u5b58\u5931\u8d25: "

    invoke-direct {v0, v1}, Ljava/lang/StringBuilder;-><init>(Ljava/lang/String;)V

    invoke-virtual {p1}, Ljava/lang/Throwable;->getMessage()Ljava/lang/String;

    move-result-object p1

    invoke-virtual {v0, p1}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    invoke-virtual {v0}, Ljava/lang/StringBuilder;->toString()Ljava/lang/String;

    move-result-object p1

    invoke-direct {p0, p1}, Lcom/rphub/app/MainActivity;->logInfo(Ljava/lang/String;)V

    :goto_1
    return-void
.end method

.method private installHybridCore(Landroid/webkit/WebView;)V
    .locals 2

    if-nez p1, :cond_0

    return-void

    :cond_0
    :try_start_0
    const-string v0, "hybrid-core.js"

    .line 1676
    invoke-direct {p0, v0}, Lcom/rphub/app/MainActivity;->readAssetText(Ljava/lang/String;)Ljava/lang/String;

    move-result-object v0

    if-eqz v0, :cond_2

    .line 1677
    invoke-virtual {v0}, Ljava/lang/String;->trim()Ljava/lang/String;

    move-result-object v1

    invoke-virtual {v1}, Ljava/lang/String;->isEmpty()Z

    move-result v1

    if-eqz v1, :cond_1

    goto :goto_0

    :cond_1
    const/4 v1, 0x0

    .line 1678
    invoke-virtual {p1, v0, v1}, Landroid/webkit/WebView;->evaluateJavascript(Ljava/lang/String;Landroid/webkit/ValueCallback;)V
    :try_end_0
    .catchall {:try_start_0 .. :try_end_0} :catchall_0

    goto :goto_1

    :cond_2
    :goto_0
    return-void

    :catchall_0
    move-exception p1

    .line 1680
    new-instance v0, Ljava/lang/StringBuilder;

    const-string v1, "\u6ce8\u5165\u7ed3\u5408\u6a21\u5f0f\u6838\u5fc3\u5931\u8d25: "

    invoke-direct {v0, v1}, Ljava/lang/StringBuilder;-><init>(Ljava/lang/String;)V

    invoke-virtual {p1}, Ljava/lang/Throwable;->getMessage()Ljava/lang/String;

    move-result-object p1

    invoke-virtual {v0, p1}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    invoke-virtual {v0}, Ljava/lang/StringBuilder;->toString()Ljava/lang/String;

    move-result-object p1

    invoke-direct {p0, p1}, Lcom/rphub/app/MainActivity;->logInfo(Ljava/lang/String;)V

    :goto_1
    return-void
.end method

.method private installImageGallery(Landroid/webkit/WebView;)V
    .locals 2

    if-nez p1, :cond_0

    return-void

    :cond_0
    :try_start_0
    const-string v0, "local-site/assets/native/rphub-image-gallery.js"

    .line 1723
    invoke-direct {p0, v0}, Lcom/rphub/app/MainActivity;->readAssetText(Ljava/lang/String;)Ljava/lang/String;

    move-result-object v0

    if-eqz v0, :cond_2

    .line 1724
    invoke-virtual {v0}, Ljava/lang/String;->trim()Ljava/lang/String;

    move-result-object v1

    invoke-virtual {v1}, Ljava/lang/String;->isEmpty()Z

    move-result v1

    if-eqz v1, :cond_1

    goto :goto_0

    :cond_1
    const/4 v1, 0x0

    .line 1725
    invoke-virtual {p1, v0, v1}, Landroid/webkit/WebView;->evaluateJavascript(Ljava/lang/String;Landroid/webkit/ValueCallback;)V
    :try_end_0
    .catchall {:try_start_0 .. :try_end_0} :catchall_0

    goto :goto_1

    :cond_2
    :goto_0
    return-void

    :catchall_0
    move-exception p1

    .line 1727
    new-instance v0, Ljava/lang/StringBuilder;

    const-string v1, "\u6ce8\u5165\u56fe\u7247\u5e93\u5931\u8d25: "

    invoke-direct {v0, v1}, Ljava/lang/StringBuilder;-><init>(Ljava/lang/String;)V

    invoke-virtual {p1}, Ljava/lang/Throwable;->getMessage()Ljava/lang/String;

    move-result-object p1

    invoke-virtual {v0, p1}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    invoke-virtual {v0}, Ljava/lang/StringBuilder;->toString()Ljava/lang/String;

    move-result-object p1

    invoke-direct {p0, p1}, Lcom/rphub/app/MainActivity;->logInfo(Ljava/lang/String;)V

    :goto_1
    return-void
.end method

.method private installImageVault(Landroid/webkit/WebView;)V
    .locals 2

    if-nez p1, :cond_0

    return-void

    :cond_0
    :try_start_0
    const-string v0, "local-site/assets/native/rphub-image-vault.js"

    .line 1735
    invoke-direct {p0, v0}, Lcom/rphub/app/MainActivity;->readAssetText(Ljava/lang/String;)Ljava/lang/String;

    move-result-object v0

    if-eqz v0, :cond_2

    .line 1736
    invoke-virtual {v0}, Ljava/lang/String;->trim()Ljava/lang/String;

    move-result-object v1

    invoke-virtual {v1}, Ljava/lang/String;->isEmpty()Z

    move-result v1

    if-eqz v1, :cond_1

    goto :goto_0

    :cond_1
    const/4 v1, 0x0

    .line 1737
    invoke-virtual {p1, v0, v1}, Landroid/webkit/WebView;->evaluateJavascript(Ljava/lang/String;Landroid/webkit/ValueCallback;)V
    :try_end_0
    .catchall {:try_start_0 .. :try_end_0} :catchall_0

    goto :goto_1

    :cond_2
    :goto_0
    return-void

    :catchall_0
    move-exception p1

    .line 1739
    new-instance v0, Ljava/lang/StringBuilder;

    const-string v1, "\u6ce8\u5165\u751f\u56fe\u539f\u56fe\u4ed3\u5e93\u5931\u8d25: "

    invoke-direct {v0, v1}, Ljava/lang/StringBuilder;-><init>(Ljava/lang/String;)V

    invoke-virtual {p1}, Ljava/lang/Throwable;->getMessage()Ljava/lang/String;

    move-result-object p1

    invoke-virtual {v0, p1}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    invoke-virtual {v0}, Ljava/lang/StringBuilder;->toString()Ljava/lang/String;

    move-result-object p1

    invoke-direct {p0, p1}, Lcom/rphub/app/MainActivity;->logInfo(Ljava/lang/String;)V

    :goto_1
    return-void
.end method

.method private installJSZip(Landroid/webkit/WebView;)V
    .locals 2

    if-nez p1, :cond_0

    return-void

    :cond_0
    :try_start_0
    const-string v0, "local-site/assets/vendor/jszip.min.js"

    .line 1747
    invoke-direct {p0, v0}, Lcom/rphub/app/MainActivity;->readAssetText(Ljava/lang/String;)Ljava/lang/String;

    move-result-object v0

    if-eqz v0, :cond_2

    .line 1748
    invoke-virtual {v0}, Ljava/lang/String;->trim()Ljava/lang/String;

    move-result-object v1

    invoke-virtual {v1}, Ljava/lang/String;->isEmpty()Z

    move-result v1

    if-eqz v1, :cond_1

    goto :goto_0

    :cond_1
    const/4 v1, 0x0

    .line 1749
    invoke-virtual {p1, v0, v1}, Landroid/webkit/WebView;->evaluateJavascript(Ljava/lang/String;Landroid/webkit/ValueCallback;)V
    :try_end_0
    .catchall {:try_start_0 .. :try_end_0} :catchall_0

    goto :goto_1

    :cond_2
    :goto_0
    return-void

    :catchall_0
    move-exception p1

    .line 1751
    new-instance v0, Ljava/lang/StringBuilder;

    const-string v1, "\u6ce8\u5165 JSZip \u5f15\u64ce\u5931\u8d25: "

    invoke-direct {v0, v1}, Ljava/lang/StringBuilder;-><init>(Ljava/lang/String;)V

    invoke-virtual {p1}, Ljava/lang/Throwable;->getMessage()Ljava/lang/String;

    move-result-object p1

    invoke-virtual {v0, p1}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    invoke-virtual {v0}, Ljava/lang/StringBuilder;->toString()Ljava/lang/String;

    move-result-object p1

    invoke-direct {p0, p1}, Lcom/rphub/app/MainActivity;->logInfo(Ljava/lang/String;)V

    :goto_1
    return-void
.end method

.method private installNativeThemeFollow(Landroid/webkit/WebView;)V
    .locals 2

    if-nez p1, :cond_0

    return-void

    :cond_0
    :try_start_0
    const-string v0, "local-site/assets/native/rphub-native-theme.js"

    .line 2303
    invoke-direct {p0, v0}, Lcom/rphub/app/MainActivity;->readAssetText(Ljava/lang/String;)Ljava/lang/String;

    move-result-object v0

    if-eqz v0, :cond_2

    .line 2304
    invoke-virtual {v0}, Ljava/lang/String;->trim()Ljava/lang/String;

    move-result-object v1

    invoke-virtual {v1}, Ljava/lang/String;->isEmpty()Z

    move-result v1

    if-eqz v1, :cond_1

    goto :goto_0

    :cond_1
    const/4 v1, 0x0

    .line 2305
    invoke-virtual {p1, v0, v1}, Landroid/webkit/WebView;->evaluateJavascript(Ljava/lang/String;Landroid/webkit/ValueCallback;)V
    :try_end_0
    .catchall {:try_start_0 .. :try_end_0} :catchall_0

    goto :goto_1

    :cond_2
    :goto_0
    return-void

    :catchall_0
    move-exception p1

    .line 2307
    new-instance v0, Ljava/lang/StringBuilder;

    const-string v1, "\u6ce8\u5165\u591c\u95f4\u6a21\u5f0f\u8ddf\u968f\u6865\u5931\u8d25: "

    invoke-direct {v0, v1}, Ljava/lang/StringBuilder;-><init>(Ljava/lang/String;)V

    invoke-virtual {p1}, Ljava/lang/Throwable;->getMessage()Ljava/lang/String;

    move-result-object p1

    invoke-virtual {v0, p1}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    invoke-virtual {v0}, Ljava/lang/StringBuilder;->toString()Ljava/lang/String;

    move-result-object p1

    invoke-direct {p0, p1}, Lcom/rphub/app/MainActivity;->logInfo(Ljava/lang/String;)V

    :goto_1
    return-void
.end method

.method private installSakuraFeatures(Landroid/webkit/WebView;)V
    .locals 2

    if-nez p1, :cond_0

    return-void

    :cond_0
    :try_start_0
    const-string v0, "local-site/assets/native/sakura-features.js"

    .line 1711
    invoke-direct {p0, v0}, Lcom/rphub/app/MainActivity;->readAssetText(Ljava/lang/String;)Ljava/lang/String;

    move-result-object v0

    if-eqz v0, :cond_2

    .line 1712
    invoke-virtual {v0}, Ljava/lang/String;->trim()Ljava/lang/String;

    move-result-object v1

    invoke-virtual {v1}, Ljava/lang/String;->isEmpty()Z

    move-result v1

    if-eqz v1, :cond_1

    goto :goto_0

    :cond_1
    const/4 v1, 0x0

    .line 1713
    invoke-virtual {p1, v0, v1}, Landroid/webkit/WebView;->evaluateJavascript(Ljava/lang/String;Landroid/webkit/ValueCallback;)V
    :try_end_0
    .catchall {:try_start_0 .. :try_end_0} :catchall_0

    goto :goto_1

    :cond_2
    :goto_0
    return-void

    :catchall_0
    move-exception p1

    .line 1715
    new-instance v0, Ljava/lang/StringBuilder;

    const-string v1, "\u6ce8\u5165\u6a31\u82b1\u529f\u80fd\u96c6\u5931\u8d25: "

    invoke-direct {v0, v1}, Ljava/lang/StringBuilder;-><init>(Ljava/lang/String;)V

    invoke-virtual {p1}, Ljava/lang/Throwable;->getMessage()Ljava/lang/String;

    move-result-object p1

    invoke-virtual {v0, p1}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    invoke-virtual {v0}, Ljava/lang/StringBuilder;->toString()Ljava/lang/String;

    move-result-object p1

    invoke-direct {p0, p1}, Lcom/rphub/app/MainActivity;->logInfo(Ljava/lang/String;)V

    :goto_1
    return-void
.end method

.method private installWebErrorTrap(Landroid/webkit/WebView;)V
    .locals 2

    if-nez p1, :cond_0

    return-void

    :cond_0
    :try_start_0
    const-string v0, "local-site/assets/native/web-error-trap.js"

    .line 2315
    invoke-direct {p0, v0}, Lcom/rphub/app/MainActivity;->readAssetText(Ljava/lang/String;)Ljava/lang/String;

    move-result-object v0

    if-eqz v0, :cond_2

    .line 2316
    invoke-virtual {v0}, Ljava/lang/String;->trim()Ljava/lang/String;

    move-result-object v1

    invoke-virtual {v1}, Ljava/lang/String;->isEmpty()Z

    move-result v1

    if-eqz v1, :cond_1

    goto :goto_0

    :cond_1
    const/4 v1, 0x0

    .line 2317
    invoke-virtual {p1, v0, v1}, Landroid/webkit/WebView;->evaluateJavascript(Ljava/lang/String;Landroid/webkit/ValueCallback;)V
    :try_end_0
    .catchall {:try_start_0 .. :try_end_0} :catchall_0

    goto :goto_1

    :cond_2
    :goto_0
    return-void

    :catchall_0
    move-exception p1

    .line 2319
    new-instance v0, Ljava/lang/StringBuilder;

    const-string v1, "\u6ce8\u5165\u7f51\u9875\u9519\u8bef\u76d1\u542c\u5931\u8d25: "

    invoke-direct {v0, v1}, Ljava/lang/StringBuilder;-><init>(Ljava/lang/String;)V

    invoke-virtual {p1}, Ljava/lang/Throwable;->getMessage()Ljava/lang/String;

    move-result-object p1

    invoke-virtual {v0, p1}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    invoke-virtual {v0}, Ljava/lang/StringBuilder;->toString()Ljava/lang/String;

    move-result-object p1

    invoke-direct {p0, p1}, Lcom/rphub/app/MainActivity;->logInfo(Ljava/lang/String;)V

    :goto_1
    return-void
.end method

.method private isDarkPreferred()Z
    .locals 4

    const-string v0, "dark"

    const/4 v1, 0x0

    :try_start_0
    const-string v2, "rphub_theme"

    .line 1786
    invoke-virtual {p0, v2, v1}, Lcom/rphub/app/MainActivity;->getSharedPreferences(Ljava/lang/String;I)Landroid/content/SharedPreferences;

    move-result-object v2

    .line 1787
    invoke-interface {v2, v0}, Landroid/content/SharedPreferences;->contains(Ljava/lang/String;)Z

    move-result v3

    if-eqz v3, :cond_0

    .line 1788
    invoke-interface {v2, v0, v1}, Landroid/content/SharedPreferences;->getBoolean(Ljava/lang/String;Z)Z

    move-result v0
    :try_end_0
    .catchall {:try_start_0 .. :try_end_0} :catchall_0

    return v0

    :catchall_0
    :cond_0
    return v1
.end method

.method private logInfo(Ljava/lang/String;)V
    .locals 4

    const-string v0, "RPHub"

    .line 1639
    invoke-static {v0, p1}, Landroid/util/Log;->i(Ljava/lang/String;Ljava/lang/String;)I

    const/4 v0, 0x0

    .line 1641
    :try_start_0
    invoke-virtual {p0, v0}, Lcom/rphub/app/MainActivity;->getExternalFilesDir(Ljava/lang/String;)Ljava/io/File;

    move-result-object v0

    if-eqz v0, :cond_0

    const-string v0, "rphub-crash.log"

    .line 1643
    new-instance v1, Ljava/lang/StringBuilder;

    const-string v2, "time="

    invoke-direct {v1, v2}, Ljava/lang/StringBuilder;-><init>(Ljava/lang/String;)V

    iget-object v2, p0, Lcom/rphub/app/MainActivity;->logDateFormat:Ljava/lang/ThreadLocal;

    invoke-virtual {v2}, Ljava/lang/ThreadLocal;->get()Ljava/lang/Object;

    move-result-object v2

    check-cast v2, Ljava/text/SimpleDateFormat;

    new-instance v3, Ljava/util/Date;

    invoke-direct {v3}, Ljava/util/Date;-><init>()V

    invoke-virtual {v2, v3}, Ljava/text/SimpleDateFormat;->format(Ljava/util/Date;)Ljava/lang/String;

    move-result-object v2

    invoke-virtual {v1, v2}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    const-string v2, " info="

    .line 1644
    invoke-virtual {v1, v2}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    invoke-virtual {v1, p1}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    const-string p1, "\n"

    invoke-virtual {v1, p1}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    invoke-virtual {v1}, Ljava/lang/StringBuilder;->toString()Ljava/lang/String;

    move-result-object p1

    .line 1643
    invoke-direct {p0, v0, p1}, Lcom/rphub/app/MainActivity;->enqueueLog(Ljava/lang/String;Ljava/lang/String;)V
    :try_end_0
    .catch Ljava/lang/Exception; {:try_start_0 .. :try_end_0} :catch_0

    :catch_0
    :cond_0
    return-void
.end method

.method private logKeyboard(Ljava/lang/String;)V
    .locals 4

    .line 2355
    new-instance v0, Ljava/lang/StringBuilder;

    const-string v1, "kbd "

    invoke-direct {v0, v1}, Ljava/lang/StringBuilder;-><init>(Ljava/lang/String;)V

    invoke-virtual {v0, p1}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    invoke-virtual {v0}, Ljava/lang/StringBuilder;->toString()Ljava/lang/String;

    move-result-object v0

    const-string v1, "RPHub"

    invoke-static {v1, v0}, Landroid/util/Log;->i(Ljava/lang/String;Ljava/lang/String;)I

    const/4 v0, 0x0

    .line 2357
    :try_start_0
    invoke-virtual {p0, v0}, Lcom/rphub/app/MainActivity;->getExternalFilesDir(Ljava/lang/String;)Ljava/io/File;

    move-result-object v0

    if-eqz v0, :cond_0

    const-string v0, "rphub-keyboard.log"

    .line 2359
    new-instance v1, Ljava/lang/StringBuilder;

    const-string v2, "time="

    invoke-direct {v1, v2}, Ljava/lang/StringBuilder;-><init>(Ljava/lang/String;)V

    iget-object v2, p0, Lcom/rphub/app/MainActivity;->logDateFormat:Ljava/lang/ThreadLocal;

    invoke-virtual {v2}, Ljava/lang/ThreadLocal;->get()Ljava/lang/Object;

    move-result-object v2

    check-cast v2, Ljava/text/SimpleDateFormat;

    new-instance v3, Ljava/util/Date;

    invoke-direct {v3}, Ljava/util/Date;-><init>()V

    invoke-virtual {v2, v3}, Ljava/text/SimpleDateFormat;->format(Ljava/util/Date;)Ljava/lang/String;

    move-result-object v2

    invoke-virtual {v1, v2}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    const-string v2, " "

    .line 2360
    invoke-virtual {v1, v2}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    invoke-virtual {v1, p1}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    const-string p1, "\n"

    invoke-virtual {v1, p1}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    invoke-virtual {v1}, Ljava/lang/StringBuilder;->toString()Ljava/lang/String;

    move-result-object p1

    .line 2359
    invoke-direct {p0, v0, p1}, Lcom/rphub/app/MainActivity;->enqueueLog(Ljava/lang/String;Ljava/lang/String;)V
    :try_end_0
    .catch Ljava/lang/Exception; {:try_start_0 .. :try_end_0} :catch_0

    :catch_0
    :cond_0
    return-void
.end method

.method private logWebError(Ljava/lang/String;Ljava/lang/String;Ljava/lang/String;I)V
    .locals 4

    .line 2342
    new-instance v0, Ljava/lang/StringBuilder;

    const-string v1, "web "

    invoke-direct {v0, v1}, Ljava/lang/StringBuilder;-><init>(Ljava/lang/String;)V

    invoke-virtual {v0, p1}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    const-string v1, ": "

    invoke-virtual {v0, v1}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    invoke-virtual {v0, p2}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    const-string v1, " @ "

    invoke-virtual {v0, v1}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    invoke-virtual {v0, p3}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    const-string v1, ":"

    invoke-virtual {v0, v1}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    invoke-virtual {v0, p4}, Ljava/lang/StringBuilder;->append(I)Ljava/lang/StringBuilder;

    invoke-virtual {v0}, Ljava/lang/StringBuilder;->toString()Ljava/lang/String;

    move-result-object v0

    const-string v1, "RPHub"

    invoke-static {v1, v0}, Landroid/util/Log;->e(Ljava/lang/String;Ljava/lang/String;)I

    const/4 v0, 0x0

    .line 2344
    :try_start_0
    invoke-virtual {p0, v0}, Lcom/rphub/app/MainActivity;->getExternalFilesDir(Ljava/lang/String;)Ljava/io/File;

    move-result-object v0

    if-eqz v0, :cond_0

    const-string v0, "rphub-web-error.log"

    .line 2346
    new-instance v1, Ljava/lang/StringBuilder;

    const-string v2, "time="

    invoke-direct {v1, v2}, Ljava/lang/StringBuilder;-><init>(Ljava/lang/String;)V

    iget-object v2, p0, Lcom/rphub/app/MainActivity;->logDateFormat:Ljava/lang/ThreadLocal;

    invoke-virtual {v2}, Ljava/lang/ThreadLocal;->get()Ljava/lang/Object;

    move-result-object v2

    check-cast v2, Ljava/text/SimpleDateFormat;

    new-instance v3, Ljava/util/Date;

    invoke-direct {v3}, Ljava/util/Date;-><init>()V

    invoke-virtual {v2, v3}, Ljava/text/SimpleDateFormat;->format(Ljava/util/Date;)Ljava/lang/String;

    move-result-object v2

    invoke-virtual {v1, v2}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    const-string v2, " kind="

    .line 2347
    invoke-virtual {v1, v2}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    invoke-virtual {v1, p1}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    const-string p1, " line="

    invoke-virtual {v1, p1}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    invoke-virtual {v1, p4}, Ljava/lang/StringBuilder;->append(I)Ljava/lang/StringBuilder;

    const-string p1, " src="

    invoke-virtual {v1, p1}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    invoke-virtual {v1, p3}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    const-string p1, " msg="

    .line 2348
    invoke-virtual {v1, p1}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    invoke-virtual {v1, p2}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    const-string p1, "\n"

    invoke-virtual {v1, p1}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    invoke-virtual {v1}, Ljava/lang/StringBuilder;->toString()Ljava/lang/String;

    move-result-object p1

    .line 2346
    invoke-direct {p0, v0, p1}, Lcom/rphub/app/MainActivity;->enqueueLog(Ljava/lang/String;Ljava/lang/String;)V
    :try_end_0
    .catch Ljava/lang/Exception; {:try_start_0 .. :try_end_0} :catch_0

    :catch_0
    :cond_0
    return-void
.end method

.method private notifyPickerSaveCancelled()V
    .locals 1

    .line 2466
    iget-object v0, p0, Lcom/rphub/app/MainActivity;->webView:Landroid/webkit/WebView;

    if-nez v0, :cond_0

    return-void

    .line 2467
    :cond_0
    new-instance v0, Lcom/rphub/app/MainActivity$24;

    invoke-direct {v0, p0}, Lcom/rphub/app/MainActivity$24;-><init>(Lcom/rphub/app/MainActivity;)V

    invoke-virtual {p0, v0}, Lcom/rphub/app/MainActivity;->runOnUiThread(Ljava/lang/Runnable;)V

    return-void
.end method

.method private notifyPickerSaveReady(Ljava/lang/String;)V
    .locals 1

    .line 2454
    iget-object v0, p0, Lcom/rphub/app/MainActivity;->webView:Landroid/webkit/WebView;

    if-nez v0, :cond_0

    return-void

    .line 2455
    :cond_0
    new-instance v0, Lcom/rphub/app/MainActivity$23;

    invoke-direct {v0, p0, p1}, Lcom/rphub/app/MainActivity$23;-><init>(Lcom/rphub/app/MainActivity;Ljava/lang/String;)V

    invoke-virtual {p0, v0}, Lcom/rphub/app/MainActivity;->runOnUiThread(Ljava/lang/Runnable;)V

    return-void
.end method

.method private openInAppOrBrowser(Ljava/lang/String;)V
    .locals 1

    if-eqz p1, :cond_1

    .line 1847
    invoke-virtual {p1}, Ljava/lang/String;->isEmpty()Z

    move-result v0

    if-eqz v0, :cond_0

    goto :goto_0

    .line 1848
    :cond_0
    new-instance v0, Lcom/rphub/app/MainActivity$12;

    invoke-direct {v0, p0, p1}, Lcom/rphub/app/MainActivity$12;-><init>(Lcom/rphub/app/MainActivity;Ljava/lang/String;)V

    invoke-virtual {p0, v0}, Lcom/rphub/app/MainActivity;->runOnUiThread(Ljava/lang/Runnable;)V

    :cond_1
    :goto_0
    return-void
.end method

.method private preferredBackgroundColor()I
    .locals 1

    .line 1774
    invoke-direct {p0}, Lcom/rphub/app/MainActivity;->isDarkPreferred()Z

    move-result v0

    if-eqz v0, :cond_0

    const v0, -0xefeae4

    goto :goto_0

    :cond_0
    const v0, -0x60505

    :goto_0
    return v0
.end method

.method private pushKeyboardInsetToPage(I)V
    .locals 4

    .line 1526
    iget-object v0, p0, Lcom/rphub/app/MainActivity;->webView:Landroid/webkit/WebView;

    if-nez v0, :cond_0

    return-void

    :cond_0
    const/4 v0, 0x0

    .line 1527
    invoke-static {v0, p1}, Ljava/lang/Math;->max(II)I

    move-result v1

    int-to-float v1, v1

    invoke-virtual {p0}, Lcom/rphub/app/MainActivity;->getResources()Landroid/content/res/Resources;

    move-result-object v2

    invoke-virtual {v2}, Landroid/content/res/Resources;->getDisplayMetrics()Landroid/util/DisplayMetrics;

    move-result-object v2

    iget v2, v2, Landroid/util/DisplayMetrics;->density:F

    div-float/2addr v1, v2

    invoke-static {v1}, Ljava/lang/Math;->round(F)I

    move-result v1

    .line 1528
    iget v2, p0, Lcom/rphub/app/MainActivity;->lastPushedKeyboardInset:I

    if-ne v1, v2, :cond_1

    return-void

    .line 1529
    :cond_1
    iput v1, p0, Lcom/rphub/app/MainActivity;->lastPushedKeyboardInset:I

    .line 1530
    new-instance v2, Ljava/lang/StringBuilder;

    const-string v3, "push px="

    invoke-direct {v2, v3}, Ljava/lang/StringBuilder;-><init>(Ljava/lang/String;)V

    invoke-static {v0, p1}, Ljava/lang/Math;->max(II)I

    move-result p1

    invoke-virtual {v2, p1}, Ljava/lang/StringBuilder;->append(I)Ljava/lang/StringBuilder;

    const-string p1, " dip="

    invoke-virtual {v2, p1}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    invoke-virtual {v2, v1}, Ljava/lang/StringBuilder;->append(I)Ljava/lang/StringBuilder;

    invoke-virtual {v2}, Ljava/lang/StringBuilder;->toString()Ljava/lang/String;

    move-result-object p1

    invoke-direct {p0, p1}, Lcom/rphub/app/MainActivity;->logKeyboard(Ljava/lang/String;)V

    .line 1532
    :try_start_0
    iget-object p1, p0, Lcom/rphub/app/MainActivity;->webView:Landroid/webkit/WebView;

    .line 1533
    new-instance v0, Ljava/lang/StringBuilder;

    const-string v2, "(function(){ try { window.rphubSetKeyboardInset && window.rphubSetKeyboardInset("

    invoke-direct {v0, v2}, Ljava/lang/StringBuilder;-><init>(Ljava/lang/String;)V

    invoke-virtual {v0, v1}, Ljava/lang/StringBuilder;->append(I)Ljava/lang/StringBuilder;

    const-string v1, "); } catch(e){} })();"

    invoke-virtual {v0, v1}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    invoke-virtual {v0}, Ljava/lang/StringBuilder;->toString()Ljava/lang/String;

    move-result-object v0

    const/4 v1, 0x0

    .line 1532
    invoke-virtual {p1, v0, v1}, Landroid/webkit/WebView;->evaluateJavascript(Ljava/lang/String;Landroid/webkit/ValueCallback;)V
    :try_end_0
    .catchall {:try_start_0 .. :try_end_0} :catchall_0

    :catchall_0
    return-void
.end method

.method private readAssetText(Ljava/lang/String;)Ljava/lang/String;
    .locals 5

    .line 2328
    iget-object v0, p0, Lcom/rphub/app/MainActivity;->assetTextCache:Ljava/util/Map;

    invoke-interface {v0, p1}, Ljava/util/Map;->get(Ljava/lang/Object;)Ljava/lang/Object;

    move-result-object v0

    check-cast v0, Ljava/lang/String;

    if-eqz v0, :cond_0

    return-object v0

    :cond_0
    const/4 v0, 0x0

    .line 2331
    :try_start_0
    invoke-virtual {p0}, Lcom/rphub/app/MainActivity;->getAssets()Landroid/content/res/AssetManager;

    move-result-object v1

    invoke-virtual {v1, p1}, Landroid/content/res/AssetManager;->open(Ljava/lang/String;)Ljava/io/InputStream;

    move-result-object v1
    :try_end_0
    .catchall {:try_start_0 .. :try_end_0} :catchall_2

    .line 2332
    :try_start_1
    new-instance v2, Ljava/util/Scanner;

    const-string v3, "UTF-8"

    invoke-direct {v2, v1, v3}, Ljava/util/Scanner;-><init>(Ljava/io/InputStream;Ljava/lang/String;)V

    const-string v3, "\\A"

    invoke-virtual {v2, v3}, Ljava/util/Scanner;->useDelimiter(Ljava/lang/String;)Ljava/util/Scanner;

    move-result-object v2

    .line 2333
    invoke-virtual {v2}, Ljava/util/Scanner;->hasNext()Z

    move-result v3

    if-eqz v3, :cond_1

    invoke-virtual {v2}, Ljava/util/Scanner;->next()Ljava/lang/String;

    move-result-object v2

    goto :goto_0

    :cond_1
    const-string v2, ""
    :try_end_1
    .catchall {:try_start_1 .. :try_end_1} :catchall_0

    :goto_0
    if-eqz v1, :cond_2

    .line 2334
    :try_start_2
    invoke-virtual {v1}, Ljava/io/InputStream;->close()V
    :try_end_2
    .catchall {:try_start_2 .. :try_end_2} :catchall_2

    .line 2337
    :cond_2
    iget-object v0, p0, Lcom/rphub/app/MainActivity;->assetTextCache:Ljava/util/Map;

    invoke-interface {v0, p1, v2}, Ljava/util/Map;->put(Ljava/lang/Object;Ljava/lang/Object;)Ljava/lang/Object;

    return-object v2

    :catchall_0
    move-exception p1

    if-eqz v1, :cond_3

    .line 2334
    :try_start_3
    invoke-virtual {v1}, Ljava/io/InputStream;->close()V

    :cond_3
    throw p1
    :try_end_3
    .catchall {:try_start_3 .. :try_end_3} :catchall_1

    :catchall_1
    move-exception v1

    move-object v4, v1

    move-object v1, p1

    move-object p1, v4

    goto :goto_1

    :catchall_2
    move-exception p1

    move-object v1, v0

    :goto_1
    if-eqz v1, :cond_4

    move-object p1, v1

    :cond_4
    :try_start_4
    throw p1
    :try_end_4
    .catchall {:try_start_4 .. :try_end_4} :catchall_3

    :catchall_3
    return-object v0
.end method

.method private refreshDarkTheme(Z)V
    .locals 1

    .line 1825
    iget-boolean v0, p0, Lcom/rphub/app/MainActivity;->darkThemeActive:Z

    if-eq p1, v0, :cond_0

    .line 1828
    :try_start_0
    invoke-virtual {p0}, Lcom/rphub/app/MainActivity;->recreate()V
    :try_end_0
    .catchall {:try_start_0 .. :try_end_0} :catchall_0

    :catchall_0
    :cond_0
    return-void
.end method

.method private rescueInlineDownload(Landroid/webkit/WebView;Ljava/lang/String;Ljava/lang/String;)Z
    .locals 8

    const-string v0, ","

    const/4 v1, 0x0

    if-eqz p1, :cond_6

    if-nez p2, :cond_0

    goto/16 :goto_2

    .line 1997
    :cond_0
    sget-object v2, Ljava/util/Locale;->ROOT:Ljava/util/Locale;

    invoke-virtual {p2, v2}, Ljava/lang/String;->toLowerCase(Ljava/util/Locale;)Ljava/lang/String;

    move-result-object v2

    const-string v3, "blob:"

    .line 1998
    invoke-virtual {v2, v3}, Ljava/lang/String;->startsWith(Ljava/lang/String;)Z

    move-result v3

    const-string v4, "data:"

    .line 1999
    invoke-virtual {v2, v4}, Ljava/lang/String;->startsWith(Ljava/lang/String;)Z

    move-result v2

    if-nez v3, :cond_1

    if-nez v2, :cond_1

    return v1

    .line 2003
    :cond_1
    invoke-virtual {p2}, Ljava/lang/String;->length()I

    move-result v2

    const/high16 v3, 0x200000

    const-string v4, ""

    const-string v5, "download"

    if-le v2, v3, :cond_2

    .line 2004
    new-instance p1, Ljava/lang/StringBuilder;

    const-string p3, "rescue skipped (url too long): "

    invoke-direct {p1, p3}, Ljava/lang/StringBuilder;-><init>(Ljava/lang/String;)V

    invoke-virtual {p2}, Ljava/lang/String;->length()I

    move-result p2

    invoke-virtual {p1, p2}, Ljava/lang/StringBuilder;->append(I)Ljava/lang/StringBuilder;

    invoke-virtual {p1}, Ljava/lang/StringBuilder;->toString()Ljava/lang/String;

    move-result-object p1

    invoke-direct {p0, v5, p1, v4, v1}, Lcom/rphub/app/MainActivity;->logWebError(Ljava/lang/String;Ljava/lang/String;Ljava/lang/String;I)V

    return v1

    .line 2007
    :cond_2
    new-instance v2, Ljava/lang/StringBuilder;

    const-string v3, "\u706f\u5854\u4e0b\u8f7d-"

    invoke-direct {v2, v3}, Ljava/lang/StringBuilder;-><init>(Ljava/lang/String;)V

    new-instance v3, Ljava/text/SimpleDateFormat;

    sget-object v6, Ljava/util/Locale;->US:Ljava/util/Locale;

    const-string v7, "yyyyMMdd-HHmmss"

    invoke-direct {v3, v7, v6}, Ljava/text/SimpleDateFormat;-><init>(Ljava/lang/String;Ljava/util/Locale;)V

    new-instance v6, Ljava/util/Date;

    invoke-direct {v6}, Ljava/util/Date;-><init>()V

    invoke-virtual {v3, v6}, Ljava/text/SimpleDateFormat;->format(Ljava/util/Date;)Ljava/lang/String;

    move-result-object v3

    invoke-virtual {v2, v3}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    invoke-virtual {v2}, Ljava/lang/StringBuilder;->toString()Ljava/lang/String;

    move-result-object v2

    .line 2008
    invoke-direct {p0, p3}, Lcom/rphub/app/MainActivity;->extForMime(Ljava/lang/String;)Ljava/lang/String;

    move-result-object v3

    if-eqz p3, :cond_4

    .line 2009
    invoke-virtual {p3}, Ljava/lang/String;->trim()Ljava/lang/String;

    move-result-object v6

    invoke-virtual {v6}, Ljava/lang/String;->isEmpty()Z

    move-result v6

    if-eqz v6, :cond_3

    goto :goto_0

    .line 2010
    :cond_3
    invoke-virtual {p3}, Ljava/lang/String;->trim()Ljava/lang/String;

    move-result-object p3

    goto :goto_1

    :cond_4
    :goto_0
    const-string p3, "application/octet-stream"

    .line 2014
    :goto_1
    :try_start_0
    new-instance v6, Ljava/lang/StringBuilder;

    const-string v7, "(function(){try{var u="

    invoke-direct {v6, v7}, Ljava/lang/StringBuilder;-><init>(Ljava/lang/String;)V

    invoke-static {p2}, Lorg/json/JSONObject;->quote(Ljava/lang/String;)Ljava/lang/String;

    move-result-object v7

    invoke-virtual {v6, v7}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    invoke-virtual {v6, v0}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    const-string v7, "base="

    .line 2015
    invoke-virtual {v6, v7}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    invoke-static {v2}, Lorg/json/JSONObject;->quote(Ljava/lang/String;)Ljava/lang/String;

    move-result-object v2

    invoke-virtual {v6, v2}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    invoke-virtual {v6, v0}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    const-string v2, "fb="

    .line 2016
    invoke-virtual {v6, v2}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    invoke-static {v3}, Lorg/json/JSONObject;->quote(Ljava/lang/String;)Ljava/lang/String;

    move-result-object v2

    invoke-virtual {v6, v2}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    invoke-virtual {v6, v0}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    const-string v0, "fm="

    .line 2017
    invoke-virtual {v6, v0}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    invoke-static {p3}, Lorg/json/JSONObject;->quote(Ljava/lang/String;)Ljava/lang/String;

    move-result-object p3

    invoke-virtual {v6, p3}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    const-string p3, ";"

    invoke-virtual {v6, p3}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    const-string p3, "var ext=function(t){t=String(t||\'\').toLowerCase();"

    .line 2018
    invoke-virtual {v6, p3}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    const-string p3, "if(t.indexOf(\'json\')>=0)return \'.json\';"

    .line 2019
    invoke-virtual {v6, p3}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    const-string p3, "if(t.indexOf(\'png\')>=0)return \'.png\';"

    .line 2020
    invoke-virtual {v6, p3}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    const-string p3, "if(t.indexOf(\'jpeg\')>=0||t.indexOf(\'jpg\')>=0)return \'.jpg\';"

    .line 2021
    invoke-virtual {v6, p3}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    const-string p3, "if(t.indexOf(\'webp\')>=0)return \'.webp\';"

    .line 2022
    invoke-virtual {v6, p3}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    const-string p3, "if(t.indexOf(\'plain\')>=0)return \'.txt\';"

    .line 2023
    invoke-virtual {v6, p3}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    const-string p3, "if(t.indexOf(\'zip\')>=0)return \'.zip\';"

    .line 2024
    invoke-virtual {v6, p3}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    const-string p3, "if(t.indexOf(\'pdf\')>=0)return \'.pdf\';"

    .line 2025
    invoke-virtual {v6, p3}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    const-string p3, "return \'\';};"

    .line 2026
    invoke-virtual {v6, p3}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    const-string p3, "var done=function(b64,t){try{RPHubLighthouse.saveFile(b64,base+(ext(t)||fb),t||fm);}catch(e){}};"

    .line 2027
    invoke-virtual {v6, p3}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    const-string p3, "var i=u.indexOf(\'base64,\');"

    .line 2028
    invoke-virtual {v6, p3}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    const-string p3, "if(u.indexOf(\'data:\')===0){if(i>0)done(u.slice(i+7),u.slice(5,i).split(\';\')[0]);return;}"

    .line 2029
    invoke-virtual {v6, p3}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    const-string p3, "fetch(u).then(function(r){return r.blob();}).then(function(b){"

    .line 2030
    invoke-virtual {v6, p3}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    const-string p3, "var fr=new FileReader();fr.onload=function(){var s=String(fr.result||\'\');"

    .line 2031
    invoke-virtual {v6, p3}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    const-string p3, "var j=s.indexOf(\'base64,\');if(j>0)done(s.slice(j+7),b.type);};"

    .line 2032
    invoke-virtual {v6, p3}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    const-string p3, "fr.readAsDataURL(b);}).catch(function(){});}catch(e){}})();"

    .line 2033
    invoke-virtual {v6, p3}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    .line 2014
    invoke-virtual {v6}, Ljava/lang/StringBuilder;->toString()Ljava/lang/String;

    move-result-object p3

    const/4 v0, 0x0

    .line 2034
    invoke-virtual {p1, p3, v0}, Landroid/webkit/WebView;->evaluateJavascript(Ljava/lang/String;Landroid/webkit/ValueCallback;)V

    .line 2035
    new-instance p1, Ljava/lang/StringBuilder;

    const-string p3, "rescue inline url: "

    invoke-direct {p1, p3}, Ljava/lang/StringBuilder;-><init>(Ljava/lang/String;)V

    .line 2036
    invoke-virtual {p2}, Ljava/lang/String;->length()I

    move-result p3

    const/16 v0, 0x50

    if-le p3, v0, :cond_5

    new-instance p3, Ljava/lang/StringBuilder;

    invoke-virtual {p2, v1, v0}, Ljava/lang/String;->substring(II)Ljava/lang/String;

    move-result-object p2

    invoke-static {p2}, Ljava/lang/String;->valueOf(Ljava/lang/Object;)Ljava/lang/String;

    move-result-object p2

    invoke-direct {p3, p2}, Ljava/lang/StringBuilder;-><init>(Ljava/lang/String;)V

    const-string p2, "\u2026"

    invoke-virtual {p3, p2}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    invoke-virtual {p3}, Ljava/lang/StringBuilder;->toString()Ljava/lang/String;

    move-result-object p2

    :cond_5
    invoke-virtual {p1, p2}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    invoke-virtual {p1}, Ljava/lang/StringBuilder;->toString()Ljava/lang/String;

    move-result-object p1

    .line 2035
    invoke-direct {p0, v5, p1, v4, v1}, Lcom/rphub/app/MainActivity;->logWebError(Ljava/lang/String;Ljava/lang/String;Ljava/lang/String;I)V
    :try_end_0
    .catchall {:try_start_0 .. :try_end_0} :catchall_0

    const/4 p1, 0x1

    return p1

    :catchall_0
    move-exception p1

    .line 2039
    new-instance p2, Ljava/lang/StringBuilder;

    const-string p3, "rescue failed: "

    invoke-direct {p2, p3}, Ljava/lang/StringBuilder;-><init>(Ljava/lang/String;)V

    invoke-virtual {p2, p1}, Ljava/lang/StringBuilder;->append(Ljava/lang/Object;)Ljava/lang/StringBuilder;

    invoke-virtual {p2}, Ljava/lang/StringBuilder;->toString()Ljava/lang/String;

    move-result-object p1

    invoke-direct {p0, v5, p1, v4, v1}, Lcom/rphub/app/MainActivity;->logWebError(Ljava/lang/String;Ljava/lang/String;Ljava/lang/String;I)V

    :cond_6
    :goto_2
    return v1
.end method

.method private resolveChooserUris(ILandroid/content/Intent;)[Landroid/net/Uri;
    .locals 3

    const/4 v0, 0x0

    const/4 v1, -0x1

    if-ne p1, v1, :cond_3

    if-nez p2, :cond_0

    goto :goto_1

    .line 2482
    :cond_0
    invoke-virtual {p2}, Landroid/content/Intent;->getData()Landroid/net/Uri;

    move-result-object p1

    const/4 v1, 0x0

    if-eqz p1, :cond_1

    const/4 p1, 0x1

    new-array p1, p1, [Landroid/net/Uri;

    invoke-virtual {p2}, Landroid/content/Intent;->getData()Landroid/net/Uri;

    move-result-object p2

    aput-object p2, p1, v1

    return-object p1

    .line 2483
    :cond_1
    invoke-virtual {p2}, Landroid/content/Intent;->getClipData()Landroid/content/ClipData;

    move-result-object p1

    if-eqz p1, :cond_3

    .line 2484
    invoke-virtual {p2}, Landroid/content/Intent;->getClipData()Landroid/content/ClipData;

    move-result-object p1

    invoke-virtual {p1}, Landroid/content/ClipData;->getItemCount()I

    move-result p1

    .line 2485
    new-array v2, p1, [Landroid/net/Uri;

    :goto_0
    if-lt v1, p1, :cond_2

    return-object v2

    .line 2487
    :cond_2
    invoke-virtual {p2}, Landroid/content/Intent;->getClipData()Landroid/content/ClipData;

    move-result-object v0

    invoke-virtual {v0, v1}, Landroid/content/ClipData;->getItemAt(I)Landroid/content/ClipData$Item;

    move-result-object v0

    invoke-virtual {v0}, Landroid/content/ClipData$Item;->getUri()Landroid/net/Uri;

    move-result-object v0

    aput-object v0, v2, v1

    add-int/lit8 v1, v1, 0x1

    goto :goto_0

    :cond_3
    :goto_1
    return-object v0
.end method

.method private sanitizeSaveFileName(Ljava/lang/String;)Ljava/lang/String;
    .locals 2

    if-eqz p1, :cond_1

    .line 1883
    invoke-virtual {p1}, Ljava/lang/String;->trim()Ljava/lang/String;

    move-result-object v0

    invoke-virtual {v0}, Ljava/lang/String;->isEmpty()Z

    move-result v0

    if-eqz v0, :cond_0

    goto :goto_0

    :cond_0
    const-string v0, "[\\\\/:*?\"<>|]"

    const-string v1, "_"

    .line 1884
    invoke-virtual {p1, v0, v1}, Ljava/lang/String;->replaceAll(Ljava/lang/String;Ljava/lang/String;)Ljava/lang/String;

    move-result-object p1

    invoke-virtual {p1}, Ljava/lang/String;->trim()Ljava/lang/String;

    move-result-object p1

    return-object p1

    :cond_1
    :goto_0
    const-string p1, "export.json"

    return-object p1
.end method

.method private showErrorPage(Ljava/lang/String;)V
    .locals 7

    .line 2433
    iget-object v0, p0, Lcom/rphub/app/MainActivity;->webView:Landroid/webkit/WebView;

    if-nez v0, :cond_0

    return-void

    :cond_0
    if-nez p1, :cond_1

    const-string p1, ""

    goto :goto_0

    :cond_1
    const-string v0, "\""

    const-string v1, "&quot;"

    .line 2434
    invoke-virtual {p1, v0, v1}, Ljava/lang/String;->replace(Ljava/lang/CharSequence;Ljava/lang/CharSequence;)Ljava/lang/String;

    move-result-object p1

    const-string v0, "\n"

    const-string v1, " "

    invoke-virtual {p1, v0, v1}, Ljava/lang/String;->replace(Ljava/lang/CharSequence;Ljava/lang/CharSequence;)Ljava/lang/String;

    move-result-object p1

    .line 2435
    :goto_0
    new-instance v0, Ljava/lang/StringBuilder;

    const-string v1, "<html><head><meta charset=\'utf-8\'><meta name=\'viewport\' content=\'width=device-width,initial-scale=1\'><style>body{font-family:sans-serif;display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;margin:0;background:#f9fafb;color:#111827;text-align:center;padding:20px;box-sizing:border-box}h1{font-size:20px;margin-bottom:8px} p{color:#6b7280;font-size:14px;word-break:break-all}button{margin-top:18px;padding:10px 30px;border:0;border-radius:8px;background:#2563eb;color:#fff;font-size:15px}</style></head><body><h1>\u9875\u9762\u52a0\u8f7d\u5931\u8d25</h1><p>"

    invoke-direct {v0, v1}, Ljava/lang/StringBuilder;-><init>(Ljava/lang/String;)V

    .line 2443
    invoke-virtual {v0, p1}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    const-string p1, "</p>"

    invoke-virtual {v0, p1}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    const-string p1, "<button onclick=\"location.href=\'"

    .line 2444
    invoke-virtual {v0, p1}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    const-string p1, "https://sta1n156.github.io/RP-Hub/"

    invoke-virtual {v0, p1}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    const-string p1, "\'\">\u91cd\u65b0\u52a0\u8f7d</button>"

    invoke-virtual {v0, p1}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    const-string p1, "</body></html>"

    .line 2445
    invoke-virtual {v0, p1}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    .line 2435
    invoke-virtual {v0}, Ljava/lang/StringBuilder;->toString()Ljava/lang/String;

    move-result-object v3

    .line 2447
    :try_start_0
    iget-object v1, p0, Lcom/rphub/app/MainActivity;->webView:Landroid/webkit/WebView;

    const-string v2, "file:///android_asset/"

    const-string v4, "text/html"

    const-string v5, "UTF-8"

    const/4 v6, 0x0

    invoke-virtual/range {v1 .. v6}, Landroid/webkit/WebView;->loadDataWithBaseURL(Ljava/lang/String;Ljava/lang/String;Ljava/lang/String;Ljava/lang/String;Ljava/lang/String;)V
    :try_end_0
    .catch Ljava/lang/Exception; {:try_start_0 .. :try_end_0} :catch_0

    :catch_0
    return-void
.end method

.method private showLighthouseLayer(Ljava/lang/String;)V
    .locals 7

    .line 2068
    iget-object v0, p0, Lcom/rphub/app/MainActivity;->rootLayout:Landroid/widget/FrameLayout;

    if-nez v0, :cond_0

    return-void

    .line 2069
    :cond_0
    iget-object v0, p0, Lcom/rphub/app/MainActivity;->lighthouseLayer:Landroid/widget/FrameLayout;

    const/4 v1, 0x0

    if-nez v0, :cond_5

    .line 2070
    new-instance v0, Landroid/widget/FrameLayout;

    invoke-direct {v0, p0}, Landroid/widget/FrameLayout;-><init>(Landroid/content/Context;)V

    .line 2071
    invoke-direct {p0}, Lcom/rphub/app/MainActivity;->isDarkPreferred()Z

    move-result v2

    const/4 v3, -0x1

    if-eqz v2, :cond_1

    const v2, -0xeeeeef

    goto :goto_0

    :cond_1
    const/4 v2, -0x1

    :goto_0
    invoke-virtual {v0, v2}, Landroid/widget/FrameLayout;->setBackgroundColor(I)V

    .line 2073
    new-instance v2, Landroid/webkit/WebView;

    invoke-direct {v2, p0}, Landroid/webkit/WebView;-><init>(Landroid/content/Context;)V

    .line 2074
    invoke-virtual {v2}, Landroid/webkit/WebView;->getSettings()Landroid/webkit/WebSettings;

    move-result-object v4

    const/4 v5, 0x1

    .line 2075
    invoke-virtual {v4, v5}, Landroid/webkit/WebSettings;->setJavaScriptEnabled(Z)V

    .line 2076
    invoke-virtual {v4, v5}, Landroid/webkit/WebSettings;->setDomStorageEnabled(Z)V

    .line 2077
    invoke-virtual {v4, v5}, Landroid/webkit/WebSettings;->setDatabaseEnabled(Z)V

    .line 2078
    invoke-virtual {v4, v5}, Landroid/webkit/WebSettings;->setLoadWithOverviewMode(Z)V

    .line 2079
    invoke-virtual {v4, v5}, Landroid/webkit/WebSettings;->setUseWideViewPort(Z)V

    .line 2080
    invoke-virtual {v4, v1}, Landroid/webkit/WebSettings;->setSupportZoom(Z)V

    .line 2081
    invoke-virtual {v4, v1}, Landroid/webkit/WebSettings;->setBuiltInZoomControls(Z)V

    .line 2082
    invoke-virtual {v4, v5}, Landroid/webkit/WebSettings;->setSupportMultipleWindows(Z)V

    .line 2083
    invoke-virtual {v4, v3}, Landroid/webkit/WebSettings;->setCacheMode(I)V

    .line 2085
    :try_start_0
    iget-object v6, p0, Lcom/rphub/app/MainActivity;->webView:Landroid/webkit/WebView;

    if-eqz v6, :cond_2

    .line 2086
    iget-object v6, p0, Lcom/rphub/app/MainActivity;->webView:Landroid/webkit/WebView;

    invoke-virtual {v6}, Landroid/webkit/WebView;->getSettings()Landroid/webkit/WebSettings;

    move-result-object v6

    invoke-virtual {v6}, Landroid/webkit/WebSettings;->getUserAgentString()Ljava/lang/String;

    move-result-object v6

    invoke-virtual {v4, v6}, Landroid/webkit/WebSettings;->setUserAgentString(Ljava/lang/String;)V
    :try_end_0
    .catchall {:try_start_0 .. :try_end_0} :catchall_0

    goto :goto_1

    :catchall_0
    nop

    .line 2090
    :cond_2
    :goto_1
    invoke-static {}, Landroid/webkit/CookieManager;->getInstance()Landroid/webkit/CookieManager;

    move-result-object v4

    invoke-virtual {v4, v5}, Landroid/webkit/CookieManager;->setAcceptCookie(Z)V

    .line 2091
    sget v4, Landroid/os/Build$VERSION;->SDK_INT:I

    const/16 v6, 0x15

    if-lt v4, v6, :cond_3

    .line 2092
    invoke-static {}, Landroid/webkit/CookieManager;->getInstance()Landroid/webkit/CookieManager;

    move-result-object v4

    invoke-virtual {v4, v2, v5}, Landroid/webkit/CookieManager;->setAcceptThirdPartyCookies(Landroid/webkit/WebView;Z)V

    .line 2097
    :cond_3
    new-instance v4, Lcom/rphub/app/MainActivity$14;

    invoke-direct {v4, p0}, Lcom/rphub/app/MainActivity$14;-><init>(Lcom/rphub/app/MainActivity;)V

    const-string v5, "RPHubLighthouse"

    invoke-virtual {v2, v4, v5}, Landroid/webkit/WebView;->addJavascriptInterface(Ljava/lang/Object;Ljava/lang/String;)V

    .line 2118
    new-instance v4, Lcom/rphub/app/MainActivity$15;

    invoke-direct {v4, p0, v2}, Lcom/rphub/app/MainActivity$15;-><init>(Lcom/rphub/app/MainActivity;Landroid/webkit/WebView;)V

    invoke-virtual {v2, v4}, Landroid/webkit/WebView;->setDownloadListener(Landroid/webkit/DownloadListener;)V

    .line 2128
    new-instance v4, Lcom/rphub/app/MainActivity$16;

    invoke-direct {v4, p0}, Lcom/rphub/app/MainActivity$16;-><init>(Lcom/rphub/app/MainActivity;)V

    invoke-virtual {v2, v4}, Landroid/webkit/WebView;->setWebViewClient(Landroid/webkit/WebViewClient;)V

    .line 2140
    new-instance v4, Lcom/rphub/app/MainActivity$17;

    invoke-direct {v4, p0, v2}, Lcom/rphub/app/MainActivity$17;-><init>(Lcom/rphub/app/MainActivity;Landroid/webkit/WebView;)V

    invoke-virtual {v2, v4}, Landroid/webkit/WebView;->setWebChromeClient(Landroid/webkit/WebChromeClient;)V

    .line 2226
    sget v4, Landroid/os/Build$VERSION;->SDK_INT:I

    if-lt v4, v6, :cond_4

    .line 2227
    new-instance v4, Lcom/rphub/app/MainActivity$18;

    invoke-direct {v4, p0}, Lcom/rphub/app/MainActivity$18;-><init>(Lcom/rphub/app/MainActivity;)V

    invoke-virtual {v2, v4}, Landroid/webkit/WebView;->setOnApplyWindowInsetsListener(Landroid/view/View$OnApplyWindowInsetsListener;)V

    .line 2241
    :cond_4
    new-instance v4, Landroid/widget/FrameLayout$LayoutParams;

    .line 2242
    invoke-direct {v4, v3, v3}, Landroid/widget/FrameLayout$LayoutParams;-><init>(II)V

    .line 2241
    invoke-virtual {v0, v2, v4}, Landroid/widget/FrameLayout;->addView(Landroid/view/View;Landroid/view/ViewGroup$LayoutParams;)V

    new-instance v4, Lcom/rphub/app/MainActivity$OnlineReturn;
    invoke-direct {v4, p0}, Lcom/rphub/app/MainActivity$OnlineReturn;-><init>(Lcom/rphub/app/MainActivity;)V
    invoke-static {p0, v0, v4}, Lcom/rphub/app/OnlineReturn;->attach(Landroid/content/Context;Landroid/widget/FrameLayout;Landroid/view/View$OnClickListener;)V

    .line 2247
    iget-object v4, p0, Lcom/rphub/app/MainActivity;->rootLayout:Landroid/widget/FrameLayout;

    new-instance v5, Landroid/widget/FrameLayout$LayoutParams;

    .line 2248
    invoke-direct {v5, v3, v3}, Landroid/widget/FrameLayout$LayoutParams;-><init>(II)V

    .line 2247
    invoke-virtual {v4, v0, v5}, Landroid/widget/FrameLayout;->addView(Landroid/view/View;Landroid/view/ViewGroup$LayoutParams;)V

    .line 2249
    iput-object v0, p0, Lcom/rphub/app/MainActivity;->lighthouseLayer:Landroid/widget/FrameLayout;

    .line 2250
    iput-object v2, p0, Lcom/rphub/app/MainActivity;->lighthouseWebView:Landroid/webkit/WebView;

    .line 2252
    :cond_5
    iget-object v0, p0, Lcom/rphub/app/MainActivity;->lighthouseLayer:Landroid/widget/FrameLayout;

    invoke-virtual {v0, v1}, Landroid/widget/FrameLayout;->setVisibility(I)V

    .line 2253
    iget-object v0, p0, Lcom/rphub/app/MainActivity;->lighthouseLayer:Landroid/widget/FrameLayout;

    invoke-virtual {v0}, Landroid/widget/FrameLayout;->bringToFront()V

    .line 2255
    :try_start_1
    iget-object v0, p0, Lcom/rphub/app/MainActivity;->lighthouseWebView:Landroid/webkit/WebView;

    invoke-virtual {v0, p1}, Landroid/webkit/WebView;->loadUrl(Ljava/lang/String;)V
    :try_end_1
    .catchall {:try_start_1 .. :try_end_1} :catchall_1

    goto :goto_2

    :catchall_1
    move-exception p1

    .line 2257
    new-instance v0, Ljava/lang/StringBuilder;

    const-string v2, "load failed: "

    invoke-direct {v0, v2}, Ljava/lang/StringBuilder;-><init>(Ljava/lang/String;)V

    invoke-virtual {v0, p1}, Ljava/lang/StringBuilder;->append(Ljava/lang/Object;)Ljava/lang/StringBuilder;

    invoke-virtual {v0}, Ljava/lang/StringBuilder;->toString()Ljava/lang/String;

    move-result-object p1

    const-string v0, "lighthouse"

    const-string v2, ""

    invoke-direct {p0, v0, p1, v2, v1}, Lcom/rphub/app/MainActivity;->logWebError(Ljava/lang/String;Ljava/lang/String;Ljava/lang/String;I)V

    :goto_2
    return-void
.end method

.method private showSaveToast(Ljava/lang/String;Z)V
    .locals 0

    .line 1874
    new-instance p2, Lcom/rphub/app/MainActivity$13;

    invoke-direct {p2, p0, p1}, Lcom/rphub/app/MainActivity$13;-><init>(Lcom/rphub/app/MainActivity;Ljava/lang/String;)V

    invoke-virtual {p0, p2}, Lcom/rphub/app/MainActivity;->runOnUiThread(Ljava/lang/Runnable;)V

    return-void
.end method

.method private startKeepAliveService()V
    .locals 3

    .line 1391
    :try_start_0
    new-instance v0, Landroid/content/Intent;

    const-class v1, Lcom/rphub/app/KeepAliveService;

    invoke-direct {v0, p0, v1}, Landroid/content/Intent;-><init>(Landroid/content/Context;Ljava/lang/Class;)V

    .line 1392
    sget v1, Landroid/os/Build$VERSION;->SDK_INT:I

    const/16 v2, 0x1a

    if-lt v1, v2, :cond_0

    .line 1393
    invoke-virtual {p0, v0}, Lcom/rphub/app/MainActivity;->startForegroundService(Landroid/content/Intent;)Landroid/content/ComponentName;

    goto :goto_0

    .line 1395
    :cond_0
    invoke-virtual {p0, v0}, Lcom/rphub/app/MainActivity;->startService(Landroid/content/Intent;)Landroid/content/ComponentName;
    :try_end_0
    .catchall {:try_start_0 .. :try_end_0} :catchall_0

    :catchall_0
    :goto_0
    return-void
.end method

.method private stopKeepAliveService()V
    .locals 2

    .line 1403
    :try_start_0
    new-instance v0, Landroid/content/Intent;

    const-class v1, Lcom/rphub/app/KeepAliveService;

    invoke-direct {v0, p0, v1}, Landroid/content/Intent;-><init>(Landroid/content/Context;Ljava/lang/Class;)V

    invoke-virtual {p0, v0}, Lcom/rphub/app/MainActivity;->stopService(Landroid/content/Intent;)Z
    :try_end_0
    .catchall {:try_start_0 .. :try_end_0} :catchall_0

    :catchall_0
    return-void
.end method

.method private writeBase64ToDownloads(Ljava/lang/String;Ljava/lang/String;Ljava/lang/String;)V
    .locals 5

    const/4 v0, 0x0

    if-eqz p1, :cond_7

    .line 1894
    :try_start_0
    invoke-virtual {p1}, Ljava/lang/String;->isEmpty()Z

    move-result v1

    if-eqz v1, :cond_0

    goto/16 :goto_0

    .line 1898
    :cond_0
    invoke-static {p1, v0}, Landroid/util/Base64;->decode(Ljava/lang/String;I)[B

    move-result-object p1

    .line 1899
    invoke-direct {p0, p2}, Lcom/rphub/app/MainActivity;->sanitizeSaveFileName(Ljava/lang/String;)Ljava/lang/String;

    move-result-object p2

    if-eqz p3, :cond_1

    .line 1900
    invoke-virtual {p3}, Ljava/lang/String;->isEmpty()Z

    move-result v1

    if-eqz v1, :cond_2

    :cond_1
    const-string p3, "application/octet-stream"

    .line 1901
    :cond_2
    sget v1, Landroid/os/Build$VERSION;->SDK_INT:I
    :try_end_0
    .catchall {:try_start_0 .. :try_end_0} :catchall_0

    const/16 v2, 0x1d

    const-string v3, "\u5df2\u4fdd\u5b58\u5230 \u4e0b\u8f7d/RP\u672c\u5730\u7248/\u5bfc\u51fa\u6587\u4ef6/"

    const/4 v4, 0x1

    if-lt v1, v2, :cond_5

    .line 1902
    :try_start_1
    new-instance v1, Landroid/content/ContentValues;

    invoke-direct {v1}, Landroid/content/ContentValues;-><init>()V

    const-string v2, "_display_name"

    .line 1903
    invoke-virtual {v1, v2, p2}, Landroid/content/ContentValues;->put(Ljava/lang/String;Ljava/lang/String;)V

    const-string v2, "mime_type"

    .line 1904
    invoke-virtual {v1, v2, p3}, Landroid/content/ContentValues;->put(Ljava/lang/String;Ljava/lang/String;)V

    const-string p3, "relative_path"

    .line 1905
    const-string v2, "Download/RP\u672c\u5730\u7248/\u5bfc\u51fa\u6587\u4ef6"

    invoke-virtual {v1, p3, v2}, Landroid/content/ContentValues;->put(Ljava/lang/String;Ljava/lang/String;)V

    .line 1906
    invoke-virtual {p0}, Lcom/rphub/app/MainActivity;->getContentResolver()Landroid/content/ContentResolver;

    move-result-object p3

    sget-object v2, Landroid/provider/MediaStore$Downloads;->EXTERNAL_CONTENT_URI:Landroid/net/Uri;

    invoke-virtual {p3, v2, v1}, Landroid/content/ContentResolver;->insert(Landroid/net/Uri;Landroid/content/ContentValues;)Landroid/net/Uri;

    move-result-object p3

    if-nez p3, :cond_3

    const-string p1, "\u4fdd\u5b58\u5931\u8d25\uff1a\u65e0\u6cd5\u521b\u5efa\u6587\u4ef6"

    .line 1908
    invoke-direct {p0, p1, v0}, Lcom/rphub/app/MainActivity;->showSaveToast(Ljava/lang/String;Z)V

    return-void

    .line 1911
    :cond_3
    invoke-virtual {p0}, Lcom/rphub/app/MainActivity;->getContentResolver()Landroid/content/ContentResolver;

    move-result-object v1

    invoke-virtual {v1, p3}, Landroid/content/ContentResolver;->openOutputStream(Landroid/net/Uri;)Ljava/io/OutputStream;

    move-result-object p3

    if-eqz p3, :cond_4

    .line 1913
    invoke-virtual {p3, p1}, Ljava/io/OutputStream;->write([B)V

    .line 1914
    invoke-virtual {p3}, Ljava/io/OutputStream;->close()V

    .line 1916
    :cond_4
    new-instance p1, Ljava/lang/StringBuilder;

    invoke-direct {p1, v3}, Ljava/lang/StringBuilder;-><init>(Ljava/lang/String;)V

    invoke-virtual {p1, p2}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    invoke-virtual {p1}, Ljava/lang/StringBuilder;->toString()Ljava/lang/String;

    move-result-object p1

    invoke-direct {p0, p1, v4}, Lcom/rphub/app/MainActivity;->showSaveToast(Ljava/lang/String;Z)V

    goto/16 :goto_3

    .line 1918
    :cond_5
    const-string v1, "Download/RP\u672c\u5730\u7248/\u5bfc\u51fa\u6587\u4ef6"

    invoke-static {v1}, Landroid/os/Environment;->getExternalStoragePublicDirectory(Ljava/lang/String;)Ljava/io/File;

    move-result-object v1

    .line 1919
    invoke-virtual {v1}, Ljava/io/File;->exists()Z

    move-result v2

    if-nez v2, :cond_6

    invoke-virtual {v1}, Ljava/io/File;->mkdirs()Z

    .line 1920
    :cond_6
    new-instance v2, Ljava/io/File;

    invoke-direct {v2, v1, p2}, Ljava/io/File;-><init>(Ljava/io/File;Ljava/lang/String;)V

    .line 1921
    new-instance v1, Ljava/io/FileOutputStream;

    invoke-direct {v1, v2}, Ljava/io/FileOutputStream;-><init>(Ljava/io/File;)V

    .line 1922
    invoke-virtual {v1, p1}, Ljava/io/FileOutputStream;->write([B)V

    .line 1923
    invoke-virtual {v1}, Ljava/io/FileOutputStream;->close()V

    new-array p1, v4, [Ljava/lang/String;

    .line 1924
    invoke-virtual {v2}, Ljava/io/File;->getAbsolutePath()Ljava/lang/String;

    move-result-object v1

    aput-object v1, p1, v0

    new-array v1, v4, [Ljava/lang/String;

    aput-object p3, v1, v0

    const/4 p3, 0x0

    invoke-static {p0, p1, v1, p3}, Landroid/media/MediaScannerConnection;->scanFile(Landroid/content/Context;[Ljava/lang/String;[Ljava/lang/String;Landroid/media/MediaScannerConnection$OnScanCompletedListener;)V

    .line 1925
    new-instance p1, Ljava/lang/StringBuilder;

    invoke-direct {p1, v3}, Ljava/lang/StringBuilder;-><init>(Ljava/lang/String;)V

    invoke-virtual {p1, p2}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    invoke-virtual {p1}, Ljava/lang/StringBuilder;->toString()Ljava/lang/String;

    move-result-object p1

    invoke-direct {p0, p1, v4}, Lcom/rphub/app/MainActivity;->showSaveToast(Ljava/lang/String;Z)V

    goto :goto_3

    :cond_7
    :goto_0
    const-string p1, "\u4fdd\u5b58\u5931\u8d25\uff1a\u6570\u636e\u4e3a\u7a7a"

    .line 1895
    invoke-direct {p0, p1, v0}, Lcom/rphub/app/MainActivity;->showSaveToast(Ljava/lang/String;Z)V
    :try_end_1
    .catchall {:try_start_1 .. :try_end_1} :catchall_0

    return-void

    :catchall_0
    move-exception p1

    .line 1928
    new-instance p2, Ljava/lang/StringBuilder;

    const-string p3, "saveFile error: "

    invoke-direct {p2, p3}, Ljava/lang/StringBuilder;-><init>(Ljava/lang/String;)V

    invoke-virtual {p1}, Ljava/lang/Throwable;->getMessage()Ljava/lang/String;

    move-result-object p3

    const-string v1, ""

    if-nez p3, :cond_8

    move-object p3, v1

    goto :goto_1

    :cond_8
    invoke-virtual {p1}, Ljava/lang/Throwable;->getMessage()Ljava/lang/String;

    move-result-object p3

    :goto_1
    invoke-virtual {p2, p3}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    invoke-virtual {p2}, Ljava/lang/StringBuilder;->toString()Ljava/lang/String;

    move-result-object p2

    invoke-direct {p0, p2}, Lcom/rphub/app/MainActivity;->logKeyboard(Ljava/lang/String;)V

    .line 1929
    new-instance p2, Ljava/lang/StringBuilder;

    const-string p3, "\u4fdd\u5b58\u5931\u8d25\uff1a"

    invoke-direct {p2, p3}, Ljava/lang/StringBuilder;-><init>(Ljava/lang/String;)V

    invoke-virtual {p1}, Ljava/lang/Throwable;->getMessage()Ljava/lang/String;

    move-result-object p3

    if-nez p3, :cond_9

    goto :goto_2

    :cond_9
    invoke-virtual {p1}, Ljava/lang/Throwable;->getMessage()Ljava/lang/String;

    move-result-object v1

    :goto_2
    invoke-virtual {p2, v1}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    invoke-virtual {p2}, Ljava/lang/StringBuilder;->toString()Ljava/lang/String;

    move-result-object p1

    invoke-direct {p0, p1, v0}, Lcom/rphub/app/MainActivity;->showSaveToast(Ljava/lang/String;Z)V

    :goto_3
    return-void
.end method

.method private writeLogFile(Ljava/io/File;Ljava/lang/String;)V
    .locals 2

    .line 1628
    :try_start_0
    new-instance v0, Ljava/io/FileOutputStream;

    const/4 v1, 0x1

    invoke-direct {v0, p1, v1}, Ljava/io/FileOutputStream;-><init>(Ljava/io/File;Z)V
    :try_end_0
    .catch Ljava/lang/Exception; {:try_start_0 .. :try_end_0} :catch_0

    :try_start_1
    const-string p1, "UTF-8"

    .line 1630
    invoke-virtual {p2, p1}, Ljava/lang/String;->getBytes(Ljava/lang/String;)[B

    move-result-object p1

    invoke-virtual {v0, p1}, Ljava/io/FileOutputStream;->write([B)V
    :try_end_1
    .catchall {:try_start_1 .. :try_end_1} :catchall_0

    .line 1632
    :try_start_2
    invoke-virtual {v0}, Ljava/io/FileOutputStream;->close()V

    goto :goto_0

    :catchall_0
    move-exception p1

    invoke-virtual {v0}, Ljava/io/FileOutputStream;->close()V

    .line 1633
    throw p1
    :try_end_2
    .catch Ljava/lang/Exception; {:try_start_2 .. :try_end_2} :catch_0

    :catch_0
    :goto_0
    return-void
.end method


# virtual methods
.method protected onActivityResult(IILandroid/content/Intent;)V
    .locals 6

    const/4 v0, -0x1

    const/4 v1, 0x0

    const/4 v2, 0x1

    const/4 v3, 0x0

    const/16 v4, 0x3eb

    if-ne p1, v4, :cond_2

    if-ne p2, v0, :cond_1

    if-eqz p3, :cond_1

    .line 2497
    invoke-virtual {p3}, Landroid/content/Intent;->getData()Landroid/net/Uri;

    move-result-object p1

    if-nez p1, :cond_0

    goto :goto_0

    .line 2499
    :cond_0
    :try_start_0
    invoke-virtual {p3}, Landroid/content/Intent;->getData()Landroid/net/Uri;

    move-result-object p1

    .line 2500
    invoke-virtual {p0}, Lcom/rphub/app/MainActivity;->getContentResolver()Landroid/content/ContentResolver;

    move-result-object p2

    const/4 p3, 0x3

    invoke-virtual {p2, p1, p3}, Landroid/content/ContentResolver;->takePersistableUriPermission(Landroid/net/Uri;I)V

    const-string p2, "rphub_settings"

    .line 2503
    invoke-virtual {p0, p2, v1}, Lcom/rphub/app/MainActivity;->getSharedPreferences(Ljava/lang/String;I)Landroid/content/SharedPreferences;

    move-result-object p2

    .line 2504
    invoke-interface {p2}, Landroid/content/SharedPreferences;->edit()Landroid/content/SharedPreferences$Editor;

    move-result-object p2

    const-string p3, "backup_folder"

    invoke-virtual {p1}, Landroid/net/Uri;->toString()Ljava/lang/String;

    move-result-object v0

    invoke-interface {p2, p3, v0}, Landroid/content/SharedPreferences$Editor;->putString(Ljava/lang/String;Ljava/lang/String;)Landroid/content/SharedPreferences$Editor;

    move-result-object p2

    invoke-interface {p2}, Landroid/content/SharedPreferences$Editor;->apply()V

    .line 2505
    iget-object p2, p0, Lcom/rphub/app/MainActivity;->webView:Landroid/webkit/WebView;

    if-eqz p2, :cond_1

    .line 2506
    iget-object p2, p0, Lcom/rphub/app/MainActivity;->webView:Landroid/webkit/WebView;

    .line 2507
    new-instance p3, Ljava/lang/StringBuilder;

    const-string v0, "window.rphubBackupFolderChanged && window.rphubBackupFolderChanged(\'"

    invoke-direct {p3, v0}, Ljava/lang/StringBuilder;-><init>(Ljava/lang/String;)V

    invoke-virtual {p3, p1}, Ljava/lang/StringBuilder;->append(Ljava/lang/Object;)Ljava/lang/StringBuilder;

    const-string p1, "\');"

    invoke-virtual {p3, p1}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    invoke-virtual {p3}, Ljava/lang/StringBuilder;->toString()Ljava/lang/String;

    move-result-object p1

    .line 2506
    invoke-virtual {p2, p1, v3}, Landroid/webkit/WebView;->evaluateJavascript(Ljava/lang/String;Landroid/webkit/ValueCallback;)V
    :try_end_0
    .catchall {:try_start_0 .. :try_end_0} :catchall_0

    goto :goto_0

    :catchall_0
    move-exception p1

    .line 2511
    new-instance p2, Ljava/lang/StringBuilder;

    const-string p3, "\u5907\u4efd\u6587\u4ef6\u5939\u8bbe\u7f6e\u5931\u8d25\uff1a"

    invoke-direct {p2, p3}, Ljava/lang/StringBuilder;-><init>(Ljava/lang/String;)V

    invoke-virtual {p1}, Ljava/lang/Throwable;->getMessage()Ljava/lang/String;

    move-result-object p1

    invoke-virtual {p2, p1}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    invoke-virtual {p2}, Ljava/lang/StringBuilder;->toString()Ljava/lang/String;

    move-result-object p1

    invoke-static {p0, p1, v2}, Landroid/widget/Toast;->makeText(Landroid/content/Context;Ljava/lang/CharSequence;I)Landroid/widget/Toast;

    move-result-object p1

    invoke-virtual {p1}, Landroid/widget/Toast;->show()V

    :cond_1
    :goto_0
    return-void

    :cond_2
    const/16 v4, 0x3ea

    if-ne p1, v4, :cond_e

    .line 2516
    iget-boolean p1, p0, Lcom/rphub/app/MainActivity;->pendingCreateDocumentStream:Z

    .line 2517
    iget-object v4, p0, Lcom/rphub/app/MainActivity;->pendingCreateDocumentBytes:[B

    .line 2518
    iput-object v3, p0, Lcom/rphub/app/MainActivity;->pendingCreateDocumentBytes:[B

    .line 2519
    iput-boolean v1, p0, Lcom/rphub/app/MainActivity;->pendingCreateDocumentStream:Z

    if-ne p2, v0, :cond_c

    if-eqz p3, :cond_c

    .line 2520
    invoke-virtual {p3}, Landroid/content/Intent;->getData()Landroid/net/Uri;

    move-result-object p2

    if-nez p2, :cond_3

    goto/16 :goto_5

    :cond_3
    if-eqz p1, :cond_6

    .line 2527
    :try_start_1
    invoke-virtual {p0}, Lcom/rphub/app/MainActivity;->getContentResolver()Landroid/content/ContentResolver;

    move-result-object p1

    invoke-virtual {p3}, Landroid/content/Intent;->getData()Landroid/net/Uri;

    move-result-object p2

    invoke-virtual {p1, p2}, Landroid/content/ContentResolver;->openOutputStream(Landroid/net/Uri;)Ljava/io/OutputStream;

    move-result-object p1

    if-eqz p1, :cond_4

    .line 2529
    new-instance p2, Ljava/lang/StringBuilder;

    const-string v0, "backup-"

    invoke-direct {p2, v0}, Ljava/lang/StringBuilder;-><init>(Ljava/lang/String;)V

    invoke-static {}, Ljava/lang/System;->nanoTime()J

    move-result-wide v4

    invoke-virtual {p2, v4, v5}, Ljava/lang/StringBuilder;->append(J)Ljava/lang/StringBuilder;

    invoke-virtual {p2}, Ljava/lang/StringBuilder;->toString()Ljava/lang/String;

    move-result-object p2

    .line 2530
    iget-object v0, p0, Lcom/rphub/app/MainActivity;->backupWriteSessions:Ljava/util/HashMap;

    monitor-enter v0
    :try_end_1
    .catchall {:try_start_1 .. :try_end_1} :catchall_2

    .line 2531
    :try_start_2
    iget-object v4, p0, Lcom/rphub/app/MainActivity;->backupWriteSessions:Ljava/util/HashMap;

    new-instance v5, Lcom/rphub/app/MainActivity$BackupWriteSession;

    invoke-virtual {p3}, Landroid/content/Intent;->getData()Landroid/net/Uri;

    move-result-object p3

    invoke-direct {v5, p1, v3, p3}, Lcom/rphub/app/MainActivity$BackupWriteSession;-><init>(Ljava/io/OutputStream;Ljava/io/File;Landroid/net/Uri;)V

    invoke-virtual {v4, p2, v5}, Ljava/util/HashMap;->put(Ljava/lang/Object;Ljava/lang/Object;)Ljava/lang/Object;

    .line 2530
    monitor-exit v0
    :try_end_2
    .catchall {:try_start_2 .. :try_end_2} :catchall_1

    :try_start_3
    const-string p1, "\u5df2\u9009\u62e9\u4fdd\u5b58\u4f4d\u7f6e\uff0c\u6b63\u5728\u5199\u5165\u5907\u4efd..."

    .line 2533
    invoke-static {p0, p1, v1}, Landroid/widget/Toast;->makeText(Landroid/content/Context;Ljava/lang/CharSequence;I)Landroid/widget/Toast;

    move-result-object p1

    invoke-virtual {p1}, Landroid/widget/Toast;->show()V

    .line 2534
    invoke-direct {p0, p2}, Lcom/rphub/app/MainActivity;->notifyPickerSaveReady(Ljava/lang/String;)V
    :try_end_3
    .catchall {:try_start_3 .. :try_end_3} :catchall_2

    goto :goto_2

    :catchall_1
    move-exception p1

    .line 2530
    :try_start_4
    monitor-exit v0
    :try_end_4
    .catchall {:try_start_4 .. :try_end_4} :catchall_1

    :try_start_5
    throw p1

    .line 2528
    :cond_4
    new-instance p1, Ljava/lang/IllegalStateException;

    const-string p2, "\u65e0\u6cd5\u5199\u5165\u6240\u9009\u4f4d\u7f6e"

    invoke-direct {p1, p2}, Ljava/lang/IllegalStateException;-><init>(Ljava/lang/String;)V

    throw p1
    :try_end_5
    .catchall {:try_start_5 .. :try_end_5} :catchall_2

    :catchall_2
    move-exception p1

    .line 2536
    new-instance p2, Ljava/lang/StringBuilder;

    const-string p3, "\u4fdd\u5b58\u5931\u8d25\uff1a"

    invoke-direct {p2, p3}, Ljava/lang/StringBuilder;-><init>(Ljava/lang/String;)V

    invoke-virtual {p1}, Ljava/lang/Throwable;->getMessage()Ljava/lang/String;

    move-result-object p3

    if-nez p3, :cond_5

    const-string p1, ""

    goto :goto_1

    :cond_5
    invoke-virtual {p1}, Ljava/lang/Throwable;->getMessage()Ljava/lang/String;

    move-result-object p1

    :goto_1
    invoke-virtual {p2, p1}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    invoke-virtual {p2}, Ljava/lang/StringBuilder;->toString()Ljava/lang/String;

    move-result-object p1

    invoke-static {p0, p1, v2}, Landroid/widget/Toast;->makeText(Landroid/content/Context;Ljava/lang/CharSequence;I)Landroid/widget/Toast;

    move-result-object p1

    invoke-virtual {p1}, Landroid/widget/Toast;->show()V

    .line 2537
    invoke-direct {p0}, Lcom/rphub/app/MainActivity;->notifyPickerSaveCancelled()V

    :goto_2
    return-void

    :cond_6
    if-nez v4, :cond_7

    return-void

    .line 2542
    :cond_7
    :try_start_6
    invoke-virtual {p0}, Lcom/rphub/app/MainActivity;->getContentResolver()Landroid/content/ContentResolver;

    move-result-object p1

    invoke-virtual {p3}, Landroid/content/Intent;->getData()Landroid/net/Uri;

    move-result-object p2

    invoke-virtual {p1, p2}, Landroid/content/ContentResolver;->openOutputStream(Landroid/net/Uri;)Ljava/io/OutputStream;

    move-result-object p1
    :try_end_6
    .catchall {:try_start_6 .. :try_end_6} :catchall_4

    if-eqz p1, :cond_8

    .line 2544
    :try_start_7
    invoke-virtual {p1, v4}, Ljava/io/OutputStream;->write([B)V

    .line 2545
    invoke-virtual {p1}, Ljava/io/OutputStream;->flush()V

    new-array p2, v2, [Ljava/lang/String;

    .line 2546
    invoke-virtual {p3}, Landroid/content/Intent;->getData()Landroid/net/Uri;

    move-result-object p3

    invoke-virtual {p3}, Landroid/net/Uri;->toString()Ljava/lang/String;

    move-result-object p3

    aput-object p3, p2, v1

    new-array p3, v2, [Ljava/lang/String;

    iget-object v0, p0, Lcom/rphub/app/MainActivity;->pendingCreateDocumentMime:Ljava/lang/String;

    aput-object v0, p3, v1

    invoke-static {p0, p2, p3, v3}, Landroid/media/MediaScannerConnection;->scanFile(Landroid/content/Context;[Ljava/lang/String;[Ljava/lang/String;Landroid/media/MediaScannerConnection$OnScanCompletedListener;)V

    .line 2547
    new-instance p2, Ljava/lang/StringBuilder;

    const-string p3, "\u5df2\u4fdd\u5b58\u5230\u6240\u9009\u4f4d\u7f6e\uff1a"

    invoke-direct {p2, p3}, Ljava/lang/StringBuilder;-><init>(Ljava/lang/String;)V

    iget-object p3, p0, Lcom/rphub/app/MainActivity;->pendingCreateDocumentName:Ljava/lang/String;

    invoke-virtual {p2, p3}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    invoke-virtual {p2}, Ljava/lang/StringBuilder;->toString()Ljava/lang/String;

    move-result-object p2

    invoke-static {p0, p2, v2}, Landroid/widget/Toast;->makeText(Landroid/content/Context;Ljava/lang/CharSequence;I)Landroid/widget/Toast;

    move-result-object p2

    invoke-virtual {p2}, Landroid/widget/Toast;->show()V
    :try_end_7
    .catchall {:try_start_7 .. :try_end_7} :catchall_3

    if-eqz p1, :cond_b

    .line 2548
    :try_start_8
    invoke-virtual {p1}, Ljava/io/OutputStream;->close()V
    :try_end_8
    .catchall {:try_start_8 .. :try_end_8} :catchall_4

    goto :goto_4

    :catchall_3
    move-exception p2

    move-object v3, p2

    goto :goto_3

    .line 2543
    :cond_8
    :try_start_9
    new-instance p2, Ljava/lang/IllegalStateException;

    const-string p3, "\u65e0\u6cd5\u5199\u5165\u6240\u9009\u4f4d\u7f6e"

    invoke-direct {p2, p3}, Ljava/lang/IllegalStateException;-><init>(Ljava/lang/String;)V

    throw p2
    :try_end_9
    .catchall {:try_start_9 .. :try_end_9} :catchall_3

    :goto_3
    if-eqz p1, :cond_9

    .line 2548
    :try_start_a
    invoke-virtual {p1}, Ljava/io/OutputStream;->close()V

    :cond_9
    throw v3
    :try_end_a
    .catchall {:try_start_a .. :try_end_a} :catchall_4

    :catchall_4
    move-exception p1

    if-eqz v3, :cond_a

    move-object p1, v3

    :cond_a
    :try_start_b
    throw p1
    :try_end_b
    .catchall {:try_start_b .. :try_end_b} :catchall_5

    :catchall_5
    move-exception p1

    .line 2549
    new-instance p2, Ljava/lang/StringBuilder;

    const-string p3, "\u4fdd\u5b58\u5931\u8d25\uff1a"

    invoke-direct {p2, p3}, Ljava/lang/StringBuilder;-><init>(Ljava/lang/String;)V

    invoke-virtual {p1}, Ljava/lang/Throwable;->getMessage()Ljava/lang/String;

    move-result-object p1

    invoke-virtual {p2, p1}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    invoke-virtual {p2}, Ljava/lang/StringBuilder;->toString()Ljava/lang/String;

    move-result-object p1

    invoke-static {p0, p1, v2}, Landroid/widget/Toast;->makeText(Landroid/content/Context;Ljava/lang/CharSequence;I)Landroid/widget/Toast;

    move-result-object p1

    invoke-virtual {p1}, Landroid/widget/Toast;->show()V

    :cond_b
    :goto_4
    return-void

    :cond_c
    :goto_5
    if-eqz p1, :cond_d

    .line 2521
    invoke-direct {p0}, Lcom/rphub/app/MainActivity;->notifyPickerSaveCancelled()V

    :cond_d
    return-void

    :cond_e
    const/16 v0, 0x3e9

    if-ne p1, v0, :cond_10

    .line 2554
    iget-object v0, p0, Lcom/rphub/app/MainActivity;->uploadMessage:Landroid/webkit/ValueCallback;

    if-nez v0, :cond_f

    .line 2555
    invoke-super {p0, p1, p2, p3}, Landroid/app/Activity;->onActivityResult(IILandroid/content/Intent;)V

    return-void

    .line 2558
    :cond_f
    invoke-direct {p0, p2, p3}, Lcom/rphub/app/MainActivity;->resolveChooserUris(ILandroid/content/Intent;)[Landroid/net/Uri;

    move-result-object p1

    invoke-interface {v0, p1}, Landroid/webkit/ValueCallback;->onReceiveValue(Ljava/lang/Object;)V

    .line 2559
    iput-object v3, p0, Lcom/rphub/app/MainActivity;->uploadMessage:Landroid/webkit/ValueCallback;

    return-void

    :cond_10
    const/16 v0, 0x3ec

    if-ne p1, v0, :cond_12

    .line 2563
    iget-object v0, p0, Lcom/rphub/app/MainActivity;->lighthouseUploadMessage:Landroid/webkit/ValueCallback;

    if-nez v0, :cond_11

    .line 2564
    invoke-super {p0, p1, p2, p3}, Landroid/app/Activity;->onActivityResult(IILandroid/content/Intent;)V

    return-void

    .line 2569
    :cond_11
    invoke-direct {p0, p2, p3}, Lcom/rphub/app/MainActivity;->resolveChooserUris(ILandroid/content/Intent;)[Landroid/net/Uri;

    move-result-object p1

    invoke-interface {v0, p1}, Landroid/webkit/ValueCallback;->onReceiveValue(Ljava/lang/Object;)V

    .line 2570
    iput-object v3, p0, Lcom/rphub/app/MainActivity;->lighthouseUploadMessage:Landroid/webkit/ValueCallback;

    return-void

    .line 2573
    :cond_12
    invoke-super {p0, p1, p2, p3}, Landroid/app/Activity;->onActivityResult(IILandroid/content/Intent;)V

    return-void
.end method

.method public onBackPressed()V
    .locals 0

    .line 2588
    invoke-direct {p0}, Lcom/rphub/app/MainActivity;->handleBackPressed()V

    return-void
.end method

.method protected onCreate(Landroid/os/Bundle;)V
    .locals 6

    .line 235
    invoke-direct {p0}, Lcom/rphub/app/MainActivity;->isDarkPreferred()Z

    move-result v0

    const/4 v1, 0x1

    if-eqz v0, :cond_0

    .line 236
    invoke-virtual {p0}, Lcom/rphub/app/MainActivity;->getResources()Landroid/content/res/Resources;

    move-result-object v0

    invoke-virtual {p0}, Lcom/rphub/app/MainActivity;->getPackageName()Ljava/lang/String;

    move-result-object v2

    const-string v3, "AppTheme.Dark"

    const-string v4, "style"

    invoke-virtual {v0, v3, v4, v2}, Landroid/content/res/Resources;->getIdentifier(Ljava/lang/String;Ljava/lang/String;Ljava/lang/String;)I

    move-result v0

    if-eqz v0, :cond_0

    .line 238
    invoke-virtual {p0, v0}, Lcom/rphub/app/MainActivity;->setTheme(I)V

    .line 239
    iput-boolean v1, p0, Lcom/rphub/app/MainActivity;->darkThemeActive:Z

    .line 242
    :cond_0
    invoke-super {p0, p1}, Landroid/app/Activity;->onCreate(Landroid/os/Bundle;)V

    .line 243
    invoke-direct {p0}, Lcom/rphub/app/MainActivity;->installCrashLogger()V

    .line 244
    invoke-static {p0}, Lcom/rphub/app/PatchEngine;->load(Landroid/content/Context;)V

    .line 245
    invoke-virtual {p0, v1}, Lcom/rphub/app/MainActivity;->requestWindowFeature(I)Z

    .line 246
    invoke-virtual {p0}, Lcom/rphub/app/MainActivity;->getWindow()Landroid/view/Window;

    move-result-object v0

    const/16 v2, 0x80

    invoke-virtual {v0, v2}, Landroid/view/Window;->addFlags(I)V

    .line 248
    invoke-virtual {p0}, Lcom/rphub/app/MainActivity;->getWindow()Landroid/view/Window;

    move-result-object v0

    const/16 v2, 0x400

    invoke-virtual {v0, v2}, Landroid/view/Window;->addFlags(I)V

    .line 250
    sget v0, Landroid/os/Build$VERSION;->SDK_INT:I

    const/16 v2, 0x1c

    if-lt v0, v2, :cond_1

    .line 251
    invoke-virtual {p0}, Lcom/rphub/app/MainActivity;->getWindow()Landroid/view/Window;

    move-result-object v0

    invoke-virtual {v0}, Landroid/view/Window;->getAttributes()Landroid/view/WindowManager$LayoutParams;

    move-result-object v0

    .line 252
    iput v1, v0, Landroid/view/WindowManager$LayoutParams;->layoutInDisplayCutoutMode:I

    .line 254
    invoke-virtual {p0}, Lcom/rphub/app/MainActivity;->getWindow()Landroid/view/Window;

    move-result-object v2

    invoke-virtual {v2, v0}, Landroid/view/Window;->setAttributes(Landroid/view/WindowManager$LayoutParams;)V

    .line 258
    :cond_1
    sget v0, Landroid/os/Build$VERSION;->SDK_INT:I

    const/16 v2, 0x1e

    const/4 v3, 0x0

    if-lt v0, v2, :cond_2

    .line 259
    invoke-virtual {p0}, Lcom/rphub/app/MainActivity;->getWindow()Landroid/view/Window;

    move-result-object v0

    invoke-virtual {v0, v3}, Landroid/view/Window;->setDecorFitsSystemWindows(Z)V

    .line 262
    :cond_2
    new-instance v0, Landroid/webkit/WebView;

    invoke-direct {v0, p0}, Landroid/webkit/WebView;-><init>(Landroid/content/Context;)V

    iput-object v0, p0, Lcom/rphub/app/MainActivity;->webView:Landroid/webkit/WebView;

    .line 265
    new-instance v0, Landroid/widget/FrameLayout;

    invoke-direct {v0, p0}, Landroid/widget/FrameLayout;-><init>(Landroid/content/Context;)V

    iput-object v0, p0, Lcom/rphub/app/MainActivity;->rootLayout:Landroid/widget/FrameLayout;

    .line 266
    iget-object v2, p0, Lcom/rphub/app/MainActivity;->webView:Landroid/webkit/WebView;

    new-instance v4, Landroid/widget/FrameLayout$LayoutParams;

    const/4 v5, -0x1

    .line 267
    invoke-direct {v4, v5, v5}, Landroid/widget/FrameLayout$LayoutParams;-><init>(II)V

    .line 266
    invoke-virtual {v0, v2, v4}, Landroid/widget/FrameLayout;->addView(Landroid/view/View;Landroid/view/ViewGroup$LayoutParams;)V

    .line 268
    iget-object v0, p0, Lcom/rphub/app/MainActivity;->rootLayout:Landroid/widget/FrameLayout;

    invoke-virtual {p0, v0}, Lcom/rphub/app/MainActivity;->setContentView(Landroid/view/View;)V

    .line 274
    sget v0, Landroid/os/Build$VERSION;->SDK_INT:I

    const/16 v2, 0x15

    if-lt v0, v2, :cond_3

    .line 275
    iget-object v0, p0, Lcom/rphub/app/MainActivity;->webView:Landroid/webkit/WebView;

    new-instance v4, Lcom/rphub/app/MainActivity$4;

    invoke-direct {v4, p0}, Lcom/rphub/app/MainActivity$4;-><init>(Lcom/rphub/app/MainActivity;)V

    invoke-virtual {v0, v4}, Landroid/webkit/WebView;->setOnApplyWindowInsetsListener(Landroid/view/View$OnApplyWindowInsetsListener;)V

    .line 296
    iget-object v0, p0, Lcom/rphub/app/MainActivity;->webView:Landroid/webkit/WebView;

    invoke-virtual {v0}, Landroid/webkit/WebView;->requestApplyInsets()V

    .line 300
    :cond_3
    invoke-direct {p0}, Lcom/rphub/app/MainActivity;->enableImmersiveFullscreen()V

    .line 302
    iget-object v0, p0, Lcom/rphub/app/MainActivity;->webView:Landroid/webkit/WebView;

    invoke-virtual {v0}, Landroid/webkit/WebView;->getSettings()Landroid/webkit/WebSettings;

    move-result-object v0

    .line 303
    invoke-virtual {v0, v1}, Landroid/webkit/WebSettings;->setJavaScriptEnabled(Z)V

    .line 304
    invoke-virtual {v0, v1}, Landroid/webkit/WebSettings;->setDomStorageEnabled(Z)V

    .line 305
    invoke-virtual {v0, v1}, Landroid/webkit/WebSettings;->setDatabaseEnabled(Z)V

    .line 306
    invoke-virtual {v0, v1}, Landroid/webkit/WebSettings;->setAllowFileAccess(Z)V

    .line 307
    invoke-virtual {v0, v1}, Landroid/webkit/WebSettings;->setAllowContentAccess(Z)V

    .line 308
    invoke-virtual {v0, v1}, Landroid/webkit/WebSettings;->setAllowFileAccessFromFileURLs(Z)V

    .line 309
    invoke-virtual {v0, v1}, Landroid/webkit/WebSettings;->setAllowUniversalAccessFromFileURLs(Z)V

    .line 310
    invoke-virtual {v0, v3}, Landroid/webkit/WebSettings;->setMediaPlaybackRequiresUserGesture(Z)V

    .line 314
    invoke-virtual {v0, v1}, Landroid/webkit/WebSettings;->setSupportMultipleWindows(Z)V

    .line 315
    invoke-virtual {v0, v1}, Landroid/webkit/WebSettings;->setLoadWithOverviewMode(Z)V

    .line 316
    invoke-virtual {v0, v1}, Landroid/webkit/WebSettings;->setUseWideViewPort(Z)V

    .line 317
    invoke-virtual {v0, v3}, Landroid/webkit/WebSettings;->setSupportZoom(Z)V

    .line 318
    invoke-virtual {v0, v3}, Landroid/webkit/WebSettings;->setBuiltInZoomControls(Z)V

    .line 319
    invoke-virtual {v0, v5}, Landroid/webkit/WebSettings;->setCacheMode(I)V

    .line 329
    invoke-static {}, Landroid/webkit/CookieManager;->getInstance()Landroid/webkit/CookieManager;

    move-result-object v4

    .line 330
    invoke-virtual {v4, v1}, Landroid/webkit/CookieManager;->setAcceptCookie(Z)V

    .line 331
    sget v5, Landroid/os/Build$VERSION;->SDK_INT:I

    if-lt v5, v2, :cond_4

    .line 332
    iget-object v2, p0, Lcom/rphub/app/MainActivity;->webView:Landroid/webkit/WebView;

    invoke-virtual {v4, v2, v1}, Landroid/webkit/CookieManager;->setAcceptThirdPartyCookies(Landroid/webkit/WebView;Z)V

    .line 343
    :cond_4

    .line 344
    iget-object v0, p0, Lcom/rphub/app/MainActivity;->webView:Landroid/webkit/WebView;

    invoke-static {p0, v0}, Lcom/rphub/app/CardNight;->install(Landroid/app/Activity;Landroid/webkit/WebView;)V

    .line 345
    iget-object v0, p0, Lcom/rphub/app/MainActivity;->webView:Landroid/webkit/WebView;

    invoke-direct {p0}, Lcom/rphub/app/MainActivity;->preferredBackgroundColor()I

    move-result v1

    invoke-virtual {v0, v1}, Landroid/webkit/WebView;->setBackgroundColor(I)V

    .line 350
    iget-object v0, p0, Lcom/rphub/app/MainActivity;->webView:Landroid/webkit/WebView;

    new-instance v1, Lcom/rphub/app/MainActivity$5;

    invoke-direct {v1, p0}, Lcom/rphub/app/MainActivity$5;-><init>(Lcom/rphub/app/MainActivity;)V

    const-string v2, "RPHubNativeTheme"

    invoke-virtual {v0, v1, v2}, Landroid/webkit/WebView;->addJavascriptInterface(Ljava/lang/Object;Ljava/lang/String;)V

    .line 382
    iget-object v0, p0, Lcom/rphub/app/MainActivity;->webView:Landroid/webkit/WebView;

    new-instance v1, Lcom/rphub/app/MainActivity$6;

    invoke-direct {v1, p0}, Lcom/rphub/app/MainActivity$6;-><init>(Lcom/rphub/app/MainActivity;)V

    const-string v2, "AndroidBridge"

    invoke-virtual {v0, v1, v2}, Landroid/webkit/WebView;->addJavascriptInterface(Ljava/lang/Object;Ljava/lang/String;)V

    new-instance v1, Lcom/rphub/app/LocalFiles;
    invoke-direct {v1, p0}, Lcom/rphub/app/LocalFiles;-><init>(Landroid/content/Context;)V
    const-string v2, "RPLocalFiles"
    invoke-virtual {v0, v1, v2}, Landroid/webkit/WebView;->addJavascriptInterface(Ljava/lang/Object;Ljava/lang/String;)V

    .line 1137
    iget-object v0, p0, Lcom/rphub/app/MainActivity;->webView:Landroid/webkit/WebView;

    new-instance v1, Lcom/rphub/app/MainActivity$7;

    invoke-direct {v1, p0}, Lcom/rphub/app/MainActivity$7;-><init>(Lcom/rphub/app/MainActivity;)V

    invoke-virtual {v0, v1}, Landroid/webkit/WebView;->setWebViewClient(Landroid/webkit/WebViewClient;)V

    .line 1241
    iget-object v0, p0, Lcom/rphub/app/MainActivity;->webView:Landroid/webkit/WebView;

    new-instance v1, Lcom/rphub/app/MainActivity$8;

    invoke-direct {v1, p0}, Lcom/rphub/app/MainActivity$8;-><init>(Lcom/rphub/app/MainActivity;)V

    invoke-virtual {v0, v1}, Landroid/webkit/WebView;->setWebChromeClient(Landroid/webkit/WebChromeClient;)V

    .line 1332
    iget-object v0, p0, Lcom/rphub/app/MainActivity;->webView:Landroid/webkit/WebView;

    new-instance v1, Lcom/rphub/app/MainActivity$9;

    invoke-direct {v1, p0}, Lcom/rphub/app/MainActivity$9;-><init>(Lcom/rphub/app/MainActivity;)V

    invoke-virtual {v0, v1}, Landroid/webkit/WebView;->setDownloadListener(Landroid/webkit/DownloadListener;)V

    .line 1342
    sget v0, Landroid/os/Build$VERSION;->SDK_INT:I

    const/16 v1, 0x21

    if-lt v0, v1, :cond_5

    .line 1344
    :try_start_0
    invoke-virtual {p0}, Lcom/rphub/app/MainActivity;->getOnBackInvokedDispatcher()Landroid/window/OnBackInvokedDispatcher;

    move-result-object v0

    .line 1346
    new-instance v1, Lcom/rphub/app/MainActivity$10;

    invoke-direct {v1, p0}, Lcom/rphub/app/MainActivity$10;-><init>(Lcom/rphub/app/MainActivity;)V

    .line 1344
    invoke-interface {v0, v3, v1}, Landroid/window/OnBackInvokedDispatcher;->registerOnBackInvokedCallback(ILandroid/window/OnBackInvokedCallback;)V
    :try_end_0
    .catchall {:try_start_0 .. :try_end_0} :catchall_0

    goto :goto_0

    :catchall_0
    nop

    :cond_5
    :goto_0
    if-eqz p1, :cond_6

    .line 1359
    :try_start_1
    iget-object v0, p0, Lcom/rphub/app/MainActivity;->webView:Landroid/webkit/WebView;

    invoke-virtual {v0, p1}, Landroid/webkit/WebView;->restoreState(Landroid/os/Bundle;)Landroid/webkit/WebBackForwardList;
    :try_end_1
    .catchall {:try_start_1 .. :try_end_1} :catchall_1

    goto :goto_1

    :catchall_1
    nop

    .line 1363
    :cond_6
    :goto_1
    iget-object p1, p0, Lcom/rphub/app/MainActivity;->webView:Landroid/webkit/WebView;

    invoke-virtual {p1}, Landroid/webkit/WebView;->getUrl()Ljava/lang/String;

    move-result-object p1

    if-nez p1, :cond_7

    .line 1364
    iget-object p1, p0, Lcom/rphub/app/MainActivity;->webView:Landroid/webkit/WebView;

    invoke-static {p0, p1}, Lcom/rphub/app/WebViewSupport;->loadEntry(Landroid/app/Activity;Landroid/webkit/WebView;)V

    .line 1366
    :cond_7
    invoke-direct {p0}, Lcom/rphub/app/MainActivity;->startKeepAliveService()V

    .line 1374
    iget-object p1, p0, Lcom/rphub/app/MainActivity;->webView:Landroid/webkit/WebView;

    invoke-static {p0, p1}, Lcom/rphub/app/OfficialUpdateWatcher;->checkOnColdStart(Landroid/app/Activity;Landroid/webkit/WebView;)V

    return-void
.end method

.method protected onDestroy()V
    .locals 3

    .line 1410
    invoke-super {p0}, Landroid/app/Activity;->onDestroy()V

    .line 1411
    invoke-direct {p0}, Lcom/rphub/app/MainActivity;->stopKeepAliveService()V

    .line 1415
    :try_start_0
    iget-object v0, p0, Lcom/rphub/app/MainActivity;->lighthouseExitDialog:Landroid/app/AlertDialog;

    const/4 v1, 0x0

    if-eqz v0, :cond_0

    .line 1416
    iget-object v0, p0, Lcom/rphub/app/MainActivity;->lighthouseExitDialog:Landroid/app/AlertDialog;

    invoke-virtual {v0}, Landroid/app/AlertDialog;->dismiss()V

    .line 1417
    iput-object v1, p0, Lcom/rphub/app/MainActivity;->lighthouseExitDialog:Landroid/app/AlertDialog;

    .line 1419
    :cond_0
    iget-object v0, p0, Lcom/rphub/app/MainActivity;->lighthouseWebView:Landroid/webkit/WebView;

    if-eqz v0, :cond_1

    .line 1420
    iget-object v0, p0, Lcom/rphub/app/MainActivity;->lighthouseWebView:Landroid/webkit/WebView;

    const-string v2, "about:blank"

    invoke-virtual {v0, v2}, Landroid/webkit/WebView;->loadUrl(Ljava/lang/String;)V

    .line 1421
    iget-object v0, p0, Lcom/rphub/app/MainActivity;->lighthouseWebView:Landroid/webkit/WebView;

    invoke-virtual {v0}, Landroid/webkit/WebView;->destroy()V

    .line 1422
    iput-object v1, p0, Lcom/rphub/app/MainActivity;->lighthouseWebView:Landroid/webkit/WebView;

    .line 1424
    :cond_1
    iput-object v1, p0, Lcom/rphub/app/MainActivity;->lighthouseLayer:Landroid/widget/FrameLayout;
    :try_end_0
    .catchall {:try_start_0 .. :try_end_0} :catchall_0

    :catchall_0
    return-void
.end method

.method public onKeyDown(ILandroid/view/KeyEvent;)Z
    .locals 1

    const/4 v0, 0x4

    if-ne p1, v0, :cond_0

    invoke-virtual {p2}, Landroid/view/KeyEvent;->getRepeatCount()I

    move-result v0

    if-lez v0, :handle_back_key

    const/4 p1, 0x1

    return p1

    :handle_back_key

    .line 2579
    invoke-direct {p0}, Lcom/rphub/app/MainActivity;->handleBackPressed()V

    const/4 p1, 0x1

    return p1

    .line 2582
    :cond_0
    invoke-super {p0, p1, p2}, Landroid/app/Activity;->onKeyDown(ILandroid/view/KeyEvent;)Z

    move-result p1

    return p1
.end method

.method protected onPause()V
    .locals 2

    .line 1550
    invoke-super {p0}, Landroid/app/Activity;->onPause()V

    .line 1551
    iget-object v0, p0, Lcom/rphub/app/MainActivity;->keyboardHandler:Landroid/os/Handler;

    iget-object v1, p0, Lcom/rphub/app/MainActivity;->keyboardPoller:Ljava/lang/Runnable;

    invoke-virtual {v0, v1}, Landroid/os/Handler;->removeCallbacks(Ljava/lang/Runnable;)V

    .line 1555
    :try_start_0
    invoke-static {}, Landroid/webkit/CookieManager;->getInstance()Landroid/webkit/CookieManager;

    move-result-object v0

    invoke-virtual {v0}, Landroid/webkit/CookieManager;->flush()V
    :try_end_0
    .catchall {:try_start_0 .. :try_end_0} :catchall_0

    :catchall_0
    return-void
.end method

.method protected onResume()V
    .locals 2

    .line 1541
    invoke-super {p0}, Landroid/app/Activity;->onResume()V

    .line 1543
    sget v0, Landroid/os/Build$VERSION;->SDK_INT:I

    const/16 v1, 0x1e

    if-lt v0, v1, :cond_0

    .line 1544
    iget-object v0, p0, Lcom/rphub/app/MainActivity;->keyboardHandler:Landroid/os/Handler;

    iget-object v1, p0, Lcom/rphub/app/MainActivity;->keyboardPoller:Ljava/lang/Runnable;

    invoke-virtual {v0, v1}, Landroid/os/Handler;->post(Ljava/lang/Runnable;)Z

    :cond_0
    return-void
.end method

.method protected onSaveInstanceState(Landroid/os/Bundle;)V
    .locals 1

    .line 1379
    invoke-super {p0, p1}, Landroid/app/Activity;->onSaveInstanceState(Landroid/os/Bundle;)V

    .line 1381
    :try_start_0
    iget-object v0, p0, Lcom/rphub/app/MainActivity;->webView:Landroid/webkit/WebView;

    if-eqz v0, :cond_0

    .line 1382
    iget-object v0, p0, Lcom/rphub/app/MainActivity;->webView:Landroid/webkit/WebView;

    invoke-virtual {v0, p1}, Landroid/webkit/WebView;->saveState(Landroid/os/Bundle;)Landroid/webkit/WebBackForwardList;
    :try_end_0
    .catchall {:try_start_0 .. :try_end_0} :catchall_0

    :catchall_0
    :cond_0
    return-void
.end method

.method public onWindowFocusChanged(Z)V
    .locals 1

    .line 1562
    invoke-super {p0, p1}, Landroid/app/Activity;->onWindowFocusChanged(Z)V

    if-eqz p1, :cond_0

    .line 1565
    invoke-direct {p0}, Lcom/rphub/app/MainActivity;->enableImmersiveFullscreen()V

    .line 1566
    iget-object p1, p0, Lcom/rphub/app/MainActivity;->webView:Landroid/webkit/WebView;

    if-eqz p1, :cond_0

    sget p1, Landroid/os/Build$VERSION;->SDK_INT:I

    const/16 v0, 0x15

    if-lt p1, v0, :cond_0

    .line 1567
    iget-object p1, p0, Lcom/rphub/app/MainActivity;->webView:Landroid/webkit/WebView;

    invoke-virtual {p1}, Landroid/webkit/WebView;->requestApplyInsets()V

    :cond_0
    return-void
.end method
