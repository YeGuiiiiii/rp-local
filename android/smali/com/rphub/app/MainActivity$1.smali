.class Lcom/rphub/app/MainActivity$1;
.super Ljava/lang/Object;
.source "MainActivity.java"

# interfaces
.implements Ljava/lang/Runnable;


# annotations
.annotation system Ldalvik/annotation/EnclosingClass;
    value = Lcom/rphub/app/MainActivity;
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
    iput-object p1, p0, Lcom/rphub/app/MainActivity$1;->this$0:Lcom/rphub/app/MainActivity;

    .line 172
    invoke-direct {p0}, Ljava/lang/Object;-><init>()V

    return-void
.end method


# virtual methods
.method public run()V
    .locals 3

    .line 175
    new-instance v0, Ljava/util/ArrayList;

    invoke-direct {v0}, Ljava/util/ArrayList;-><init>()V

    .line 177
    :goto_0
    iget-object v1, p0, Lcom/rphub/app/MainActivity$1;->this$0:Lcom/rphub/app/MainActivity;

    invoke-static {v1}, Lcom/rphub/app/MainActivity;->access$0(Lcom/rphub/app/MainActivity;)Ljava/util/concurrent/ConcurrentLinkedQueue;

    move-result-object v1

    invoke-virtual {v1}, Ljava/util/concurrent/ConcurrentLinkedQueue;->poll()Ljava/lang/Object;

    move-result-object v1

    check-cast v1, [Ljava/lang/String;

    if-eqz v1, :cond_2

    .line 179
    invoke-interface {v0, v1}, Ljava/util/List;->add(Ljava/lang/Object;)Z

    .line 180
    :goto_1
    invoke-interface {v0}, Ljava/util/List;->size()I

    move-result v1

    const/16 v2, 0x40

    if-ge v1, v2, :cond_1

    iget-object v1, p0, Lcom/rphub/app/MainActivity$1;->this$0:Lcom/rphub/app/MainActivity;

    invoke-static {v1}, Lcom/rphub/app/MainActivity;->access$0(Lcom/rphub/app/MainActivity;)Ljava/util/concurrent/ConcurrentLinkedQueue;

    move-result-object v1

    invoke-virtual {v1}, Ljava/util/concurrent/ConcurrentLinkedQueue;->poll()Ljava/lang/Object;

    move-result-object v1

    check-cast v1, [Ljava/lang/String;

    if-nez v1, :cond_0

    goto :goto_2

    .line 181
    :cond_0
    invoke-interface {v0, v1}, Ljava/util/List;->add(Ljava/lang/Object;)Z

    goto :goto_1

    .line 183
    :cond_1
    :goto_2
    iget-object v1, p0, Lcom/rphub/app/MainActivity$1;->this$0:Lcom/rphub/app/MainActivity;

    invoke-static {v1, v0}, Lcom/rphub/app/MainActivity;->access$1(Lcom/rphub/app/MainActivity;Ljava/util/List;)V

    .line 184
    invoke-interface {v0}, Ljava/util/List;->clear()V

    goto :goto_0

    :cond_2
    const-wide/16 v1, 0x78

    .line 186
    :try_start_0
    invoke-static {v1, v2}, Ljava/lang/Thread;->sleep(J)V
    :try_end_0
    .catch Ljava/lang/InterruptedException; {:try_start_0 .. :try_end_0} :catch_0

    goto :goto_0

    :catch_0
    return-void
.end method
