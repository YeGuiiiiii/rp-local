.class Lcom/rphub/app/MainActivity$17$1;
.super Landroid/webkit/WebViewClient;
.source "MainActivity.java"


# annotations
.annotation system Ldalvik/annotation/EnclosingMethod;
    value = Lcom/rphub/app/MainActivity$17;->onCreateWindow(Landroid/webkit/WebView;ZZLandroid/os/Message;)Z
.end annotation

.annotation system Ldalvik/annotation/InnerClass;
    accessFlags = 0x0
    name = null
.end annotation


# instance fields
.field private handled:Z

.field final synthetic this$1:Lcom/rphub/app/MainActivity$17;

.field private final synthetic val$probe:Landroid/webkit/WebView;

.field private final synthetic val$wv:Landroid/webkit/WebView;


# direct methods
.method constructor <init>(Lcom/rphub/app/MainActivity$17;Landroid/webkit/WebView;Landroid/webkit/WebView;)V
    .locals 0

    .line 1
    iput-object p1, p0, Lcom/rphub/app/MainActivity$17$1;->this$1:Lcom/rphub/app/MainActivity$17;

    iput-object p2, p0, Lcom/rphub/app/MainActivity$17$1;->val$wv:Landroid/webkit/WebView;

    iput-object p3, p0, Lcom/rphub/app/MainActivity$17$1;->val$probe:Landroid/webkit/WebView;

    .line 2147
    invoke-direct {p0}, Landroid/webkit/WebViewClient;-><init>()V

    const/4 p1, 0x0

    .line 2148
    iput-boolean p1, p0, Lcom/rphub/app/MainActivity$17$1;->handled:Z

    return-void
.end method

.method private handle(Ljava/lang/String;)V
    .locals 3

    .line 2151
    iget-boolean v0, p0, Lcom/rphub/app/MainActivity$17$1;->handled:Z

    if-nez v0, :cond_2

    if-eqz p1, :cond_2

    invoke-virtual {p1}, Ljava/lang/String;->isEmpty()Z

    move-result v0

    if-eqz v0, :cond_0

    goto :goto_0

    :cond_0
    const/4 v0, 0x1

    .line 2152
    iput-boolean v0, p0, Lcom/rphub/app/MainActivity$17$1;->handled:Z

    .line 2155
    iget-object v0, p0, Lcom/rphub/app/MainActivity$17$1;->this$1:Lcom/rphub/app/MainActivity$17;

    invoke-static {v0}, Lcom/rphub/app/MainActivity$17;->access$0(Lcom/rphub/app/MainActivity$17;)Lcom/rphub/app/MainActivity;

    move-result-object v0

    iget-object v1, p0, Lcom/rphub/app/MainActivity$17$1;->val$wv:Landroid/webkit/WebView;

    const/4 v2, 0x0

    invoke-static {v0, v1, p1, v2}, Lcom/rphub/app/MainActivity;->access$40(Lcom/rphub/app/MainActivity;Landroid/webkit/WebView;Ljava/lang/String;Ljava/lang/String;)Z

    move-result v0

    if-eqz v0, :cond_1

    .line 2157
    :try_start_0
    iget-object p1, p0, Lcom/rphub/app/MainActivity$17$1;->val$probe:Landroid/webkit/WebView;

    invoke-virtual {p1}, Landroid/webkit/WebView;->destroy()V
    :try_end_0
    .catchall {:try_start_0 .. :try_end_0} :catchall_0

    :catchall_0
    return-void

    .line 2162
    :cond_1
    iget-object v0, p0, Lcom/rphub/app/MainActivity$17$1;->this$1:Lcom/rphub/app/MainActivity$17;

    invoke-static {v0}, Lcom/rphub/app/MainActivity$17;->access$0(Lcom/rphub/app/MainActivity$17;)Lcom/rphub/app/MainActivity;

    move-result-object v0

    invoke-static {v0, p1}, Lcom/rphub/app/MainActivity;->access$33(Lcom/rphub/app/MainActivity;Ljava/lang/String;)V

    .line 2164
    :try_start_1
    iget-object p1, p0, Lcom/rphub/app/MainActivity$17$1;->val$probe:Landroid/webkit/WebView;

    invoke-virtual {p1}, Landroid/webkit/WebView;->destroy()V
    :try_end_1
    .catchall {:try_start_1 .. :try_end_1} :catchall_1

    :catchall_1
    :cond_2
    :goto_0
    return-void
.end method


# virtual methods
.method public onPageStarted(Landroid/webkit/WebView;Ljava/lang/String;Landroid/graphics/Bitmap;)V
    .locals 0

    .line 2177
    invoke-direct {p0, p2}, Lcom/rphub/app/MainActivity$17$1;->handle(Ljava/lang/String;)V

    .line 2178
    invoke-super {p0, p1, p2, p3}, Landroid/webkit/WebViewClient;->onPageStarted(Landroid/webkit/WebView;Ljava/lang/String;Landroid/graphics/Bitmap;)V

    return-void
.end method

.method public shouldOverrideUrlLoading(Landroid/webkit/WebView;Ljava/lang/String;)Z
    .locals 0

    .line 2171
    invoke-direct {p0, p2}, Lcom/rphub/app/MainActivity$17$1;->handle(Ljava/lang/String;)V

    const/4 p1, 0x1

    return p1
.end method
