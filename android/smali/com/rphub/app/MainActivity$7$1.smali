.class Lcom/rphub/app/MainActivity$7$1;
.super Ljava/lang/Object;
.source "MainActivity.java"

# interfaces
.implements Ljava/lang/Runnable;


# annotations
.annotation system Ldalvik/annotation/EnclosingMethod;
    value = Lcom/rphub/app/MainActivity$7;->onRenderProcessGone(Landroid/webkit/WebView;Landroid/webkit/RenderProcessGoneDetail;)Z
.end annotation

.annotation system Ldalvik/annotation/InnerClass;
    accessFlags = 0x0
    name = null
.end annotation


# instance fields
.field final synthetic this$1:Lcom/rphub/app/MainActivity$7;

.field private final synthetic val$wv:Landroid/webkit/WebView;


# direct methods
.method constructor <init>(Lcom/rphub/app/MainActivity$7;Landroid/webkit/WebView;)V
    .locals 0

    .line 1
    iput-object p1, p0, Lcom/rphub/app/MainActivity$7$1;->this$1:Lcom/rphub/app/MainActivity$7;

    iput-object p2, p0, Lcom/rphub/app/MainActivity$7$1;->val$wv:Landroid/webkit/WebView;

    .line 1229
    invoke-direct {p0}, Ljava/lang/Object;-><init>()V

    return-void
.end method


# virtual methods
.method public run()V
    .locals 3
    iget-object v0, p0, Lcom/rphub/app/MainActivity$7$1;->val$wv:Landroid/webkit/WebView;
    invoke-virtual {v0}, Landroid/webkit/WebView;->getContext()Landroid/content/Context;
    move-result-object v1
    check-cast v1, Landroid/app/Activity;
    invoke-virtual {v0}, Landroid/webkit/WebView;->getParent()Landroid/view/ViewParent;
    move-result-object v2
    instance-of v2, v2, Landroid/view/ViewGroup;
    if-eqz v2, :destroy
    invoke-virtual {v0}, Landroid/webkit/WebView;->getParent()Landroid/view/ViewParent;
    move-result-object v2
    check-cast v2, Landroid/view/ViewGroup;
    invoke-virtual {v2, v0}, Landroid/view/ViewGroup;->removeView(Landroid/view/View;)V
    :destroy
    invoke-virtual {v0}, Landroid/webkit/WebView;->destroy()V
    invoke-static {v1}, Lcom/rphub/app/RenderRecovery;->recreate(Landroid/app/Activity;)V
    return-void
.end method
