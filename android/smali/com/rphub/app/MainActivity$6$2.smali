.class Lcom/rphub/app/MainActivity$6$2;
.super Ljava/lang/Object;
.source "MainActivity.java"

# interfaces
.implements Ljava/lang/Runnable;


# annotations
.annotation system Ldalvik/annotation/EnclosingMethod;
    value = Lcom/rphub/app/MainActivity$6;->reportWhiteScreenFailure(Ljava/lang/String;)V
.end annotation

.annotation system Ldalvik/annotation/InnerClass;
    accessFlags = 0x0
    name = null
.end annotation


# instance fields
.field final synthetic this$1:Lcom/rphub/app/MainActivity$6;

.field private final synthetic val$reason:Ljava/lang/String;


# direct methods
.method constructor <init>(Lcom/rphub/app/MainActivity$6;Ljava/lang/String;)V
    .locals 0

    .line 1
    iput-object p1, p0, Lcom/rphub/app/MainActivity$6$2;->this$1:Lcom/rphub/app/MainActivity$6;

    iput-object p2, p0, Lcom/rphub/app/MainActivity$6$2;->val$reason:Ljava/lang/String;

    .line 482
    invoke-direct {p0}, Ljava/lang/Object;-><init>()V

    return-void
.end method


# virtual methods
.method public run()V
    .locals 2

    .line 485
    iget-object v0, p0, Lcom/rphub/app/MainActivity$6$2;->this$1:Lcom/rphub/app/MainActivity$6;

    invoke-static {v0}, Lcom/rphub/app/MainActivity$6;->access$2(Lcom/rphub/app/MainActivity$6;)Lcom/rphub/app/MainActivity;

    move-result-object v0

    iget-object v1, p0, Lcom/rphub/app/MainActivity$6$2;->val$reason:Ljava/lang/String;

    invoke-static {v0, v1}, Lcom/rphub/app/MainActivity;->access$12(Lcom/rphub/app/MainActivity;Ljava/lang/String;)V

    return-void
.end method
