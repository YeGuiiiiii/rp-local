.class Lcom/rphub/app/MainActivity$20;
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
    iput-object p1, p0, Lcom/rphub/app/MainActivity$20;->this$0:Lcom/rphub/app/MainActivity;

    .line 2376
    invoke-direct {p0}, Ljava/lang/Object;-><init>()V

    return-void
.end method


# virtual methods
.method public onClick(Landroid/content/DialogInterface;I)V
    .locals 1

    const/4 p1, 0x1

    .line 2379
    invoke-static {p1}, Lcom/rphub/app/PatchEngine;->setSafeModeDirect(Z)V

    .line 2380
    iget-object p2, p0, Lcom/rphub/app/MainActivity$20;->this$0:Lcom/rphub/app/MainActivity;

    const-string v0, "\u5df2\u8fdb\u5165\u5b98\u65b9\u7eaf\u51c0\u6a21\u5f0f\uff08\u6682\u4e0d\u52a0\u8f7d\u672c\u5730\u8865\u4e01\uff09"

    invoke-static {p2, v0, p1}, Landroid/widget/Toast;->makeText(Landroid/content/Context;Ljava/lang/CharSequence;I)Landroid/widget/Toast;

    move-result-object p1

    invoke-virtual {p1}, Landroid/widget/Toast;->show()V

    .line 2381
    iget-object p1, p0, Lcom/rphub/app/MainActivity$20;->this$0:Lcom/rphub/app/MainActivity;

    invoke-static {p1}, Lcom/rphub/app/MainActivity;->access$2(Lcom/rphub/app/MainActivity;)Landroid/webkit/WebView;

    move-result-object p1

    if-eqz p1, :cond_0

    iget-object p1, p0, Lcom/rphub/app/MainActivity$20;->this$0:Lcom/rphub/app/MainActivity;

    invoke-static {p1}, Lcom/rphub/app/MainActivity;->access$2(Lcom/rphub/app/MainActivity;)Landroid/webkit/WebView;

    move-result-object p1

    const-string p2, "https://sta1n156.github.io/RP-Hub/"

    invoke-virtual {p1, p2}, Landroid/webkit/WebView;->loadUrl(Ljava/lang/String;)V

    :cond_0
    return-void
.end method
