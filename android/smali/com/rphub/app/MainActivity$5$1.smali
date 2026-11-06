.class Lcom/rphub/app/MainActivity$5$1;
.super Ljava/lang/Object;
.source "MainActivity.java"

# interfaces
.implements Ljava/lang/Runnable;


# annotations
.annotation system Ldalvik/annotation/EnclosingMethod;
    value = Lcom/rphub/app/MainActivity$5;->setBackground(Z)V
.end annotation

.annotation system Ldalvik/annotation/InnerClass;
    accessFlags = 0x0
    name = null
.end annotation


# instance fields
.field final synthetic this$1:Lcom/rphub/app/MainActivity$5;

.field private final synthetic val$dark:Z


# direct methods
.method constructor <init>(Lcom/rphub/app/MainActivity$5;Z)V
    .locals 0

    .line 1
    iput-object p1, p0, Lcom/rphub/app/MainActivity$5$1;->this$1:Lcom/rphub/app/MainActivity$5;

    iput-boolean p2, p0, Lcom/rphub/app/MainActivity$5$1;->val$dark:Z

    .line 359
    invoke-direct {p0}, Ljava/lang/Object;-><init>()V

    return-void
.end method


# virtual methods
.method public run()V
    .locals 2

    .line 363
    :try_start_0
    iget-object v0, p0, Lcom/rphub/app/MainActivity$5$1;->this$1:Lcom/rphub/app/MainActivity$5;

    invoke-static {v0}, Lcom/rphub/app/MainActivity$5;->access$0(Lcom/rphub/app/MainActivity$5;)Lcom/rphub/app/MainActivity;

    move-result-object v0

    invoke-static {v0}, Lcom/rphub/app/MainActivity;->access$2(Lcom/rphub/app/MainActivity;)Landroid/webkit/WebView;

    move-result-object v0

    iget-boolean v1, p0, Lcom/rphub/app/MainActivity$5$1;->val$dark:Z

    if-eqz v1, :cond_0

    const v1, -0xefeae4

    goto :goto_0

    :cond_0
    const v1, -0x60505

    :goto_0
    invoke-virtual {v0, v1}, Landroid/webkit/WebView;->setBackgroundColor(I)V

    .line 367
    sget v0, Landroid/os/Build$VERSION;->SDK_INT:I

    const/16 v1, 0x21

    if-lt v0, v1, :cond_1

    .line 368
    iget-object v0, p0, Lcom/rphub/app/MainActivity$5$1;->this$1:Lcom/rphub/app/MainActivity$5;

    invoke-static {v0}, Lcom/rphub/app/MainActivity$5;->access$0(Lcom/rphub/app/MainActivity$5;)Lcom/rphub/app/MainActivity;

    move-result-object v0

    iget-boolean v1, p0, Lcom/rphub/app/MainActivity$5$1;->val$dark:Z

    invoke-static {v0, v1}, Lcom/rphub/app/MainActivity;->access$8(Lcom/rphub/app/MainActivity;Z)V

    .line 369
    iget-object v0, p0, Lcom/rphub/app/MainActivity$5$1;->this$1:Lcom/rphub/app/MainActivity$5;

    invoke-static {v0}, Lcom/rphub/app/MainActivity$5;->access$0(Lcom/rphub/app/MainActivity$5;)Lcom/rphub/app/MainActivity;

    move-result-object v0

    iget-boolean v1, p0, Lcom/rphub/app/MainActivity$5$1;->val$dark:Z

    invoke-static {v0, v1}, Lcom/rphub/app/MainActivity;->access$9(Lcom/rphub/app/MainActivity;Z)V

    goto :goto_1

    .line 371
    :cond_1
    iget-object v0, p0, Lcom/rphub/app/MainActivity$5$1;->this$1:Lcom/rphub/app/MainActivity$5;

    invoke-static {v0}, Lcom/rphub/app/MainActivity$5;->access$0(Lcom/rphub/app/MainActivity$5;)Lcom/rphub/app/MainActivity;

    move-result-object v0

    iget-boolean v1, p0, Lcom/rphub/app/MainActivity$5$1;->val$dark:Z

    invoke-static {v0, v1}, Lcom/rphub/app/MainActivity;->access$8(Lcom/rphub/app/MainActivity;Z)V
    :try_end_0
    .catchall {:try_start_0 .. :try_end_0} :catchall_0

    :catchall_0
    :goto_1
    return-void
.end method
