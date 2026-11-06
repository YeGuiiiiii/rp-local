.class Lcom/rphub/app/MainActivity$3;
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
    iput-object p1, p0, Lcom/rphub/app/MainActivity$3;->this$0:Lcom/rphub/app/MainActivity;

    .line 198
    invoke-direct {p0}, Ljava/lang/Object;-><init>()V

    return-void
.end method


# virtual methods
.method public run()V
    .locals 4

    .line 201
    iget-object v0, p0, Lcom/rphub/app/MainActivity$3;->this$0:Lcom/rphub/app/MainActivity;

    invoke-static {v0}, Lcom/rphub/app/MainActivity;->access$2(Lcom/rphub/app/MainActivity;)Landroid/webkit/WebView;

    move-result-object v0

    if-nez v0, :cond_0

    return-void

    .line 202
    :cond_0
    sget v0, Landroid/os/Build$VERSION;->SDK_INT:I

    const/16 v1, 0x1e

    if-lt v0, v1, :cond_2

    .line 204
    :try_start_0
    iget-object v0, p0, Lcom/rphub/app/MainActivity$3;->this$0:Lcom/rphub/app/MainActivity;

    invoke-virtual {v0}, Lcom/rphub/app/MainActivity;->getWindow()Landroid/view/Window;

    move-result-object v0

    invoke-virtual {v0}, Landroid/view/Window;->getDecorView()Landroid/view/View;

    move-result-object v0

    invoke-virtual {v0}, Landroid/view/View;->getRootWindowInsets()Landroid/view/WindowInsets;

    move-result-object v0

    if-eqz v0, :cond_2

    .line 206
    invoke-static {}, Landroid/view/WindowInsets$Type;->ime()I

    move-result v1

    invoke-virtual {v0, v1}, Landroid/view/WindowInsets;->getInsets(I)Landroid/graphics/Insets;

    move-result-object v0

    iget v0, v0, Landroid/graphics/Insets;->bottom:I

    .line 207
    iget-object v1, p0, Lcom/rphub/app/MainActivity$3;->this$0:Lcom/rphub/app/MainActivity;

    invoke-static {v1}, Lcom/rphub/app/MainActivity;->access$3(Lcom/rphub/app/MainActivity;)I

    move-result v1

    if-eq v0, v1, :cond_1

    .line 208
    iget-object v1, p0, Lcom/rphub/app/MainActivity$3;->this$0:Lcom/rphub/app/MainActivity;

    invoke-static {v1, v0}, Lcom/rphub/app/MainActivity;->access$4(Lcom/rphub/app/MainActivity;I)V

    .line 209
    iget-object v1, p0, Lcom/rphub/app/MainActivity$3;->this$0:Lcom/rphub/app/MainActivity;

    new-instance v2, Ljava/lang/StringBuilder;

    const-string v3, "poll imePx="

    invoke-direct {v2, v3}, Ljava/lang/StringBuilder;-><init>(Ljava/lang/String;)V

    invoke-virtual {v2, v0}, Ljava/lang/StringBuilder;->append(I)Ljava/lang/StringBuilder;

    invoke-virtual {v2}, Ljava/lang/StringBuilder;->toString()Ljava/lang/String;

    move-result-object v2

    invoke-static {v1, v2}, Lcom/rphub/app/MainActivity;->access$5(Lcom/rphub/app/MainActivity;Ljava/lang/String;)V

    .line 211
    :cond_1
    iget-object v1, p0, Lcom/rphub/app/MainActivity$3;->this$0:Lcom/rphub/app/MainActivity;

    invoke-static {v1, v0}, Lcom/rphub/app/MainActivity;->access$6(Lcom/rphub/app/MainActivity;I)V
    :try_end_0
    .catchall {:try_start_0 .. :try_end_0} :catchall_0

    .line 216
    :catchall_0
    :cond_2
    iget-object v0, p0, Lcom/rphub/app/MainActivity$3;->this$0:Lcom/rphub/app/MainActivity;

    invoke-static {v0}, Lcom/rphub/app/MainActivity;->access$7(Lcom/rphub/app/MainActivity;)Landroid/os/Handler;

    move-result-object v0

    const-wide/16 v1, 0xc8

    invoke-virtual {v0, p0, v1, v2}, Landroid/os/Handler;->postDelayed(Ljava/lang/Runnable;J)Z

    return-void
.end method
