.class Lcom/rphub/app/MainActivity$14;
.super Ljava/lang/Object;
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
    iput-object p1, p0, Lcom/rphub/app/MainActivity$14;->this$0:Lcom/rphub/app/MainActivity;

    .line 2097
    invoke-direct {p0}, Ljava/lang/Object;-><init>()V

    return-void
.end method


# virtual methods
.method public isNativeApp()Z
    .locals 1
    .annotation runtime Landroid/webkit/JavascriptInterface;
    .end annotation

    const/4 v0, 0x1

    return v0
.end method

.method public logJsError(Ljava/lang/String;Ljava/lang/String;Ljava/lang/String;I)V
    .locals 2
    .annotation runtime Landroid/webkit/JavascriptInterface;
    .end annotation

    .line 2110
    iget-object v0, p0, Lcom/rphub/app/MainActivity$14;->this$0:Lcom/rphub/app/MainActivity;

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

.method public saveFile(Ljava/lang/String;Ljava/lang/String;Ljava/lang/String;)V
    .locals 1
    .annotation runtime Landroid/webkit/JavascriptInterface;
    .end annotation

    .line 2105
    iget-object v0, p0, Lcom/rphub/app/MainActivity$14;->this$0:Lcom/rphub/app/MainActivity;

    invoke-static {v0, p1, p2, p3}, Lcom/rphub/app/MainActivity;->access$13(Lcom/rphub/app/MainActivity;Ljava/lang/String;Ljava/lang/String;Ljava/lang/String;)V

    return-void
.end method
