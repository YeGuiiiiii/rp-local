.class Lcom/rphub/app/MainActivity$6$1;
.super Ljava/lang/Object;
.source "MainActivity.java"

# interfaces
.implements Ljava/lang/Runnable;


# annotations
.annotation system Ldalvik/annotation/EnclosingMethod;
    value = Lcom/rphub/app/MainActivity$6;->openLighthouse(Ljava/lang/String;)V
.end annotation

.annotation system Ldalvik/annotation/InnerClass;
    accessFlags = 0x0
    name = null
.end annotation


# instance fields
.field final synthetic this$1:Lcom/rphub/app/MainActivity$6;

.field private final synthetic val$url:Ljava/lang/String;


# direct methods
.method constructor <init>(Lcom/rphub/app/MainActivity$6;Ljava/lang/String;)V
    .locals 0

    .line 1
    iput-object p1, p0, Lcom/rphub/app/MainActivity$6$1;->this$1:Lcom/rphub/app/MainActivity$6;

    iput-object p2, p0, Lcom/rphub/app/MainActivity$6$1;->val$url:Ljava/lang/String;

    .line 402
    invoke-direct {p0}, Ljava/lang/Object;-><init>()V

    return-void
.end method


# virtual methods
.method public run()V
    .locals 5

    .line 406
    :try_start_0
    iget-object v0, p0, Lcom/rphub/app/MainActivity$6$1;->this$1:Lcom/rphub/app/MainActivity$6;

    invoke-static {v0}, Lcom/rphub/app/MainActivity$6;->access$2(Lcom/rphub/app/MainActivity$6;)Lcom/rphub/app/MainActivity;

    move-result-object v0

    iget-object v1, p0, Lcom/rphub/app/MainActivity$6$1;->val$url:Ljava/lang/String;

    if-eqz v1, :cond_1

    iget-object v1, p0, Lcom/rphub/app/MainActivity$6$1;->val$url:Ljava/lang/String;

    invoke-virtual {v1}, Ljava/lang/String;->length()I

    move-result v1

    if-nez v1, :cond_0

    goto :goto_0

    .line 407
    :cond_0
    iget-object v1, p0, Lcom/rphub/app/MainActivity$6$1;->val$url:Ljava/lang/String;

    goto :goto_1

    :cond_1
    :goto_0
    const-string v1, "https://wxdt.duckdns.org/"

    .line 406
    :goto_1
    invoke-static {v0, v1}, Lcom/rphub/app/MainActivity;->access$10(Lcom/rphub/app/MainActivity;Ljava/lang/String;)V
    :try_end_0
    .catchall {:try_start_0 .. :try_end_0} :catchall_0

    goto :goto_2

    :catchall_0
    move-exception v0

    .line 409
    iget-object v1, p0, Lcom/rphub/app/MainActivity$6$1;->this$1:Lcom/rphub/app/MainActivity$6;

    invoke-static {v1}, Lcom/rphub/app/MainActivity$6;->access$2(Lcom/rphub/app/MainActivity$6;)Lcom/rphub/app/MainActivity;

    move-result-object v1

    new-instance v2, Ljava/lang/StringBuilder;

    const-string v3, "open failed: "

    invoke-direct {v2, v3}, Ljava/lang/StringBuilder;-><init>(Ljava/lang/String;)V

    invoke-virtual {v2, v0}, Ljava/lang/StringBuilder;->append(Ljava/lang/Object;)Ljava/lang/StringBuilder;

    invoke-virtual {v2}, Ljava/lang/StringBuilder;->toString()Ljava/lang/String;

    move-result-object v0

    const-string v2, "lighthouse"

    const-string v3, ""

    const/4 v4, 0x0

    invoke-static {v1, v2, v0, v3, v4}, Lcom/rphub/app/MainActivity;->access$11(Lcom/rphub/app/MainActivity;Ljava/lang/String;Ljava/lang/String;Ljava/lang/String;I)V

    .line 410
    iget-object v0, p0, Lcom/rphub/app/MainActivity$6$1;->this$1:Lcom/rphub/app/MainActivity$6;

    invoke-static {v0}, Lcom/rphub/app/MainActivity$6;->access$2(Lcom/rphub/app/MainActivity$6;)Lcom/rphub/app/MainActivity;

    move-result-object v0

    const-string v1, "\u706f\u5854\u7a97\u53e3\u6253\u5f00\u5931\u8d25"

    invoke-static {v0, v1, v4}, Landroid/widget/Toast;->makeText(Landroid/content/Context;Ljava/lang/CharSequence;I)Landroid/widget/Toast;

    move-result-object v0

    invoke-virtual {v0}, Landroid/widget/Toast;->show()V

    :goto_2
    return-void
.end method
