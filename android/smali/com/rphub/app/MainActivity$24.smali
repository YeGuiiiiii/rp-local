.class Lcom/rphub/app/MainActivity$24;
.super Ljava/lang/Object;
.source "MainActivity.java"

# interfaces
.implements Ljava/lang/Runnable;


# annotations
.annotation system Ldalvik/annotation/EnclosingMethod;
    value = Lcom/rphub/app/MainActivity;->notifyPickerSaveCancelled()V
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
    iput-object p1, p0, Lcom/rphub/app/MainActivity$24;->this$0:Lcom/rphub/app/MainActivity;

    .line 2467
    invoke-direct {p0}, Ljava/lang/Object;-><init>()V

    return-void
.end method


# virtual methods
.method public run()V
    .locals 3

    .line 2470
    iget-object v0, p0, Lcom/rphub/app/MainActivity$24;->this$0:Lcom/rphub/app/MainActivity;

    invoke-static {v0}, Lcom/rphub/app/MainActivity;->access$2(Lcom/rphub/app/MainActivity;)Landroid/webkit/WebView;

    move-result-object v0

    const-string v1, "window.rphubPickerSaveCancelled && window.rphubPickerSaveCancelled();"

    const/4 v2, 0x0

    invoke-virtual {v0, v1, v2}, Landroid/webkit/WebView;->evaluateJavascript(Ljava/lang/String;Landroid/webkit/ValueCallback;)V

    return-void
.end method
