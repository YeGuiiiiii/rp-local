.class Lcom/rphub/app/MainActivity$16;
.super Landroid/webkit/WebViewClient;
.source "MainActivity.java"


# annotations
.annotation system Ldalvik/annotation/EnclosingMethod;
    value = Lcom/rphub/app/MainActivity;->showLighthouseLayer(Ljava/lang/String;)V
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
    iput-object p1, p0, Lcom/rphub/app/MainActivity$16;->this$0:Lcom/rphub/app/MainActivity;

    .line 2128
    invoke-direct {p0}, Landroid/webkit/WebViewClient;-><init>()V

    return-void
.end method


# virtual methods
.method public onPageFinished(Landroid/webkit/WebView;Ljava/lang/String;)V
    .locals 0

    .line 2131
    invoke-super {p0, p1, p2}, Landroid/webkit/WebViewClient;->onPageFinished(Landroid/webkit/WebView;Ljava/lang/String;)V

    .line 2135
    iget-object p2, p0, Lcom/rphub/app/MainActivity$16;->this$0:Lcom/rphub/app/MainActivity;

    invoke-static {p2, p1}, Lcom/rphub/app/MainActivity;->access$41(Lcom/rphub/app/MainActivity;Landroid/webkit/WebView;)V

    return-void
.end method
