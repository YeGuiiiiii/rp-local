.class Lcom/rphub/app/MainActivity$8$1;
.super Landroid/webkit/WebViewClient;
.source "MainActivity.java"


# annotations
.annotation system Ldalvik/annotation/EnclosingMethod;
    value = Lcom/rphub/app/MainActivity$8;->onCreateWindow(Landroid/webkit/WebView;ZZLandroid/os/Message;)Z
.end annotation

.annotation system Ldalvik/annotation/InnerClass;
    accessFlags = 0x0
    name = null
.end annotation


# instance fields
.field private handled:Z

.field final synthetic this$1:Lcom/rphub/app/MainActivity$8;

.field private final synthetic val$probe:Landroid/webkit/WebView;


# direct methods
.method constructor <init>(Lcom/rphub/app/MainActivity$8;Landroid/webkit/WebView;)V
    .locals 0

    .line 1
    iput-object p1, p0, Lcom/rphub/app/MainActivity$8$1;->this$1:Lcom/rphub/app/MainActivity$8;

    iput-object p2, p0, Lcom/rphub/app/MainActivity$8$1;->val$probe:Landroid/webkit/WebView;

    .line 1251
    invoke-direct {p0}, Landroid/webkit/WebViewClient;-><init>()V

    const/4 p1, 0x0

    .line 1252
    iput-boolean p1, p0, Lcom/rphub/app/MainActivity$8$1;->handled:Z

    return-void
.end method

.method private handle(Ljava/lang/String;)V
    .locals 1

    .line 1254
    iget-boolean v0, p0, Lcom/rphub/app/MainActivity$8$1;->handled:Z

    if-nez v0, :cond_1

    if-eqz p1, :cond_1

    invoke-virtual {p1}, Ljava/lang/String;->isEmpty()Z

    move-result v0

    if-eqz v0, :cond_0

    goto :goto_0

    :cond_0
    const/4 v0, 0x1

    .line 1255
    iput-boolean v0, p0, Lcom/rphub/app/MainActivity$8$1;->handled:Z

    .line 1256
    iget-object v0, p0, Lcom/rphub/app/MainActivity$8$1;->this$1:Lcom/rphub/app/MainActivity$8;

    invoke-static {v0}, Lcom/rphub/app/MainActivity$8;->access$0(Lcom/rphub/app/MainActivity$8;)Lcom/rphub/app/MainActivity;

    move-result-object v0

    invoke-static {v0, p1}, Lcom/rphub/app/MainActivity;->access$33(Lcom/rphub/app/MainActivity;Ljava/lang/String;)V

    .line 1257
    :try_start_0
    iget-object p1, p0, Lcom/rphub/app/MainActivity$8$1;->val$probe:Landroid/webkit/WebView;

    invoke-virtual {p1}, Landroid/webkit/WebView;->destroy()V
    :try_end_0
    .catchall {:try_start_0 .. :try_end_0} :catchall_0

    :catchall_0
    :cond_1
    :goto_0
    return-void
.end method


# virtual methods
.method public onPageStarted(Landroid/webkit/WebView;Ljava/lang/String;Landroid/graphics/Bitmap;)V
    .locals 0

    .line 1266
    invoke-direct {p0, p2}, Lcom/rphub/app/MainActivity$8$1;->handle(Ljava/lang/String;)V

    .line 1267
    invoke-super {p0, p1, p2, p3}, Landroid/webkit/WebViewClient;->onPageStarted(Landroid/webkit/WebView;Ljava/lang/String;Landroid/graphics/Bitmap;)V

    return-void
.end method

.method public shouldOverrideUrlLoading(Landroid/webkit/WebView;Ljava/lang/String;)Z
    .locals 0

    .line 1261
    invoke-direct {p0, p2}, Lcom/rphub/app/MainActivity$8$1;->handle(Ljava/lang/String;)V

    const/4 p1, 0x1

    return p1
.end method
