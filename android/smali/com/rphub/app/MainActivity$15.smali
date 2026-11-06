.class Lcom/rphub/app/MainActivity$15;
.super Ljava/lang/Object;
.source "MainActivity.java"

# interfaces
.implements Landroid/webkit/DownloadListener;


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

.field private final synthetic val$wv:Landroid/webkit/WebView;


# direct methods
.method constructor <init>(Lcom/rphub/app/MainActivity;Landroid/webkit/WebView;)V
    .locals 0

    .line 1
    iput-object p1, p0, Lcom/rphub/app/MainActivity$15;->this$0:Lcom/rphub/app/MainActivity;

    iput-object p2, p0, Lcom/rphub/app/MainActivity$15;->val$wv:Landroid/webkit/WebView;

    .line 2118
    invoke-direct {p0}, Ljava/lang/Object;-><init>()V

    return-void
.end method


# virtual methods
.method public onDownloadStart(Ljava/lang/String;Ljava/lang/String;Ljava/lang/String;Ljava/lang/String;J)V
    .locals 0

    .line 2124
    iget-object p5, p0, Lcom/rphub/app/MainActivity$15;->this$0:Lcom/rphub/app/MainActivity;

    iget-object p6, p0, Lcom/rphub/app/MainActivity$15;->val$wv:Landroid/webkit/WebView;

    invoke-static {p5, p6, p1, p4}, Lcom/rphub/app/MainActivity;->access$40(Lcom/rphub/app/MainActivity;Landroid/webkit/WebView;Ljava/lang/String;Ljava/lang/String;)Z

    move-result p5

    if-eqz p5, :cond_0

    return-void

    .line 2125
    :cond_0
    iget-object p5, p0, Lcom/rphub/app/MainActivity$15;->this$0:Lcom/rphub/app/MainActivity;

    invoke-static {p5, p1, p2, p3, p4}, Lcom/rphub/app/MainActivity;->access$37(Lcom/rphub/app/MainActivity;Ljava/lang/String;Ljava/lang/String;Ljava/lang/String;Ljava/lang/String;)V

    return-void
.end method
