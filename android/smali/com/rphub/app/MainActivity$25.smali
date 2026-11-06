.class Lcom/rphub/app/MainActivity$25;
.super Ljava/lang/Object;
.source "MainActivity.java"

# interfaces
.implements Landroid/webkit/ValueCallback;


# annotations
.annotation system Ldalvik/annotation/EnclosingMethod;
    value = Lcom/rphub/app/MainActivity;->handleBackPressed()V
.end annotation

.annotation system Ldalvik/annotation/InnerClass;
    accessFlags = 0x0
    name = null
.end annotation

.annotation system Ldalvik/annotation/Signature;
    value = {
        "Ljava/lang/Object;",
        "Landroid/webkit/ValueCallback<",
        "Ljava/lang/String;",
        ">;"
    }
.end annotation


# instance fields
.field final synthetic this$0:Lcom/rphub/app/MainActivity;

.field private final synthetic val$prev:J


# direct methods
.method constructor <init>(Lcom/rphub/app/MainActivity;J)V
    .locals 0

    .line 1
    iput-object p1, p0, Lcom/rphub/app/MainActivity$25;->this$0:Lcom/rphub/app/MainActivity;

    iput-wide p2, p0, Lcom/rphub/app/MainActivity$25;->val$prev:J

    .line 2614
    invoke-direct {p0}, Ljava/lang/Object;-><init>()V

    return-void
.end method


# virtual methods
.method public bridge synthetic onReceiveValue(Ljava/lang/Object;)V
    .locals 0

    .line 1
    check-cast p1, Ljava/lang/String;

    invoke-virtual {p0, p1}, Lcom/rphub/app/MainActivity$25;->onReceiveValue(Ljava/lang/String;)V

    return-void
.end method

.method public onReceiveValue(Ljava/lang/String;)V
    .locals 8

    .line 2617
    iget-object v0, p0, Lcom/rphub/app/MainActivity$25;->this$0:Lcom/rphub/app/MainActivity;

    const/4 v1, 0x0

    invoke-static {v0, v1}, Lcom/rphub/app/MainActivity;->access$45(Lcom/rphub/app/MainActivity;Z)V

    if-eqz p1, :handled

    .line 2618
    invoke-virtual {p1}, Ljava/lang/String;->trim()Ljava/lang/String;

    move-result-object p1

    const-string v0, "false"

    invoke-virtual {p1, v0}, Ljava/lang/String;->equals(Ljava/lang/Object;)Z

    move-result p1

    if-nez p1, :cond_1

    :handled
    iget-object v0, p0, Lcom/rphub/app/MainActivity$25;->this$0:Lcom/rphub/app/MainActivity;

    const-wide/16 v2, 0x0

    invoke-static {v0, v2, v3}, Lcom/rphub/app/MainActivity;->access$46(Lcom/rphub/app/MainActivity;J)V

    return-void

    .line 2620
    :cond_1
    invoke-static {}, Ljava/lang/System;->currentTimeMillis()J

    move-result-wide v2

    .line 2621
    iget-wide v4, p0, Lcom/rphub/app/MainActivity$25;->val$prev:J

    sub-long v4, v2, v4

    const-wide/16 v6, 0x7d0

    cmp-long p1, v4, v6

    if-gez p1, :cond_2

    .line 2622
    iget-object p1, p0, Lcom/rphub/app/MainActivity$25;->this$0:Lcom/rphub/app/MainActivity;

    invoke-virtual {p1}, Lcom/rphub/app/MainActivity;->finish()V

    goto :goto_1

    .line 2624
    :cond_2
    iget-object p1, p0, Lcom/rphub/app/MainActivity$25;->this$0:Lcom/rphub/app/MainActivity;

    invoke-static {p1, v2, v3}, Lcom/rphub/app/MainActivity;->access$46(Lcom/rphub/app/MainActivity;J)V

    .line 2625
    iget-object p1, p0, Lcom/rphub/app/MainActivity$25;->this$0:Lcom/rphub/app/MainActivity;

    const-string v0, "\u518d\u6309\u4e00\u6b21\u8fd4\u56de\u952e\u9000\u51fa\u5e94\u7528"

    invoke-static {p1, v0, v1}, Landroid/widget/Toast;->makeText(Landroid/content/Context;Ljava/lang/CharSequence;I)Landroid/widget/Toast;

    move-result-object p1

    invoke-virtual {p1}, Landroid/widget/Toast;->show()V

    :goto_1
    return-void
.end method
