.class Lcom/rphub/app/MainActivity$21;
.super Ljava/lang/Object;
.source "MainActivity.java"

# interfaces
.implements Landroid/content/DialogInterface$OnClickListener;


# annotations
.annotation system Ldalvik/annotation/EnclosingMethod;
    value = Lcom/rphub/app/MainActivity;->handleWhiteScreenFailure(Ljava/lang/String;)V
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
    iput-object p1, p0, Lcom/rphub/app/MainActivity$21;->this$0:Lcom/rphub/app/MainActivity;

    .line 2384
    invoke-direct {p0}, Ljava/lang/Object;-><init>()V

    return-void
.end method


# virtual methods
.method public onClick(Landroid/content/DialogInterface;I)V
    .locals 1

    const/4 p1, 0x0

    .line 2387
    invoke-static {p1}, Lcom/rphub/app/PatchEngine;->setSafeModeDirect(Z)V

    .line 2391
    iget-object p2, p0, Lcom/rphub/app/MainActivity$21;->this$0:Lcom/rphub/app/MainActivity;

    invoke-virtual {p2}, Lcom/rphub/app/MainActivity;->getApplicationContext()Landroid/content/Context;

    move-result-object p2

    invoke-static {p2}, Lcom/rphub/app/PatchEngine;->clearPatchCache(Landroid/content/Context;)V

    .line 2392
    iget-object p2, p0, Lcom/rphub/app/MainActivity$21;->this$0:Lcom/rphub/app/MainActivity;

    invoke-virtual {p2}, Lcom/rphub/app/MainActivity;->getApplicationContext()Landroid/content/Context;

    move-result-object p2

    invoke-static {p2}, Lcom/rphub/app/PatchEngine;->clearRejectedGenerations(Landroid/content/Context;)V

    .line 2393
    iget-object p2, p0, Lcom/rphub/app/MainActivity$21;->this$0:Lcom/rphub/app/MainActivity;

    const-string v0, "\u5df2\u6e05\u7a7a\u8865\u4e01\u7f13\u5b58\uff0c\u6b63\u5728\u91cd\u8f7d..."

    invoke-static {p2, v0, p1}, Landroid/widget/Toast;->makeText(Landroid/content/Context;Ljava/lang/CharSequence;I)Landroid/widget/Toast;

    move-result-object p1

    invoke-virtual {p1}, Landroid/widget/Toast;->show()V

    .line 2394
    iget-object p1, p0, Lcom/rphub/app/MainActivity$21;->this$0:Lcom/rphub/app/MainActivity;

    invoke-static {p1}, Lcom/rphub/app/MainActivity;->access$2(Lcom/rphub/app/MainActivity;)Landroid/webkit/WebView;

    move-result-object p1

    if-eqz p1, :cond_0

    iget-object p1, p0, Lcom/rphub/app/MainActivity$21;->this$0:Lcom/rphub/app/MainActivity;

    invoke-static {p1}, Lcom/rphub/app/MainActivity;->access$2(Lcom/rphub/app/MainActivity;)Landroid/webkit/WebView;

    move-result-object p1

    const-string p2, "https://sta1n156.github.io/RP-Hub/"

    invoke-virtual {p1, p2}, Landroid/webkit/WebView;->loadUrl(Ljava/lang/String;)V

    :cond_0
    return-void
.end method
