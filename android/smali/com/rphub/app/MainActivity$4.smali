.class Lcom/rphub/app/MainActivity$4;
.super Ljava/lang/Object;
.source "MainActivity.java"

# interfaces
.implements Landroid/view/View$OnApplyWindowInsetsListener;


# annotations
.annotation system Ldalvik/annotation/EnclosingMethod;
    value = Lcom/rphub/app/MainActivity;->onCreate(Landroid/os/Bundle;)V
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
    iput-object p1, p0, Lcom/rphub/app/MainActivity$4;->this$0:Lcom/rphub/app/MainActivity;

    .line 275
    invoke-direct {p0}, Ljava/lang/Object;-><init>()V

    return-void
.end method


# virtual methods
.method public onApplyWindowInsets(Landroid/view/View;Landroid/view/WindowInsets;)Landroid/view/WindowInsets;
    .locals 2

    .line 278
    sget p1, Landroid/os/Build$VERSION;->SDK_INT:I

    const/16 v0, 0x1e

    if-lt p1, v0, :cond_1

    .line 280
    invoke-static {}, Landroid/view/WindowInsets$Type;->ime()I

    move-result p1

    invoke-virtual {p2, p1}, Landroid/view/WindowInsets;->getInsets(I)Landroid/graphics/Insets;

    move-result-object p1

    iget p1, p1, Landroid/graphics/Insets;->bottom:I

    .line 281
    iget-object p2, p0, Lcom/rphub/app/MainActivity$4;->this$0:Lcom/rphub/app/MainActivity;

    invoke-static {p2}, Lcom/rphub/app/MainActivity;->access$3(Lcom/rphub/app/MainActivity;)I

    move-result p2

    if-eq p1, p2, :cond_0

    .line 282
    iget-object p2, p0, Lcom/rphub/app/MainActivity$4;->this$0:Lcom/rphub/app/MainActivity;

    invoke-static {p2, p1}, Lcom/rphub/app/MainActivity;->access$4(Lcom/rphub/app/MainActivity;I)V

    .line 283
    iget-object p2, p0, Lcom/rphub/app/MainActivity$4;->this$0:Lcom/rphub/app/MainActivity;

    new-instance v0, Ljava/lang/StringBuilder;

    const-string v1, "dispatch imePx="

    invoke-direct {v0, v1}, Ljava/lang/StringBuilder;-><init>(Ljava/lang/String;)V

    invoke-virtual {v0, p1}, Ljava/lang/StringBuilder;->append(I)Ljava/lang/StringBuilder;

    invoke-virtual {v0}, Ljava/lang/StringBuilder;->toString()Ljava/lang/String;

    move-result-object v0

    invoke-static {p2, v0}, Lcom/rphub/app/MainActivity;->access$5(Lcom/rphub/app/MainActivity;Ljava/lang/String;)V

    .line 285
    :cond_0
    iget-object p2, p0, Lcom/rphub/app/MainActivity$4;->this$0:Lcom/rphub/app/MainActivity;

    invoke-static {p2, p1}, Lcom/rphub/app/MainActivity;->access$6(Lcom/rphub/app/MainActivity;I)V

    .line 288
    sget-object p1, Landroid/view/WindowInsets;->CONSUMED:Landroid/view/WindowInsets;

    return-object p1

    .line 289
    :cond_1
    sget p1, Landroid/os/Build$VERSION;->SDK_INT:I

    const/16 v0, 0x1c

    if-lt p1, v0, :cond_2

    .line 290
    invoke-virtual {p2}, Landroid/view/WindowInsets;->consumeDisplayCutout()Landroid/view/WindowInsets;

    move-result-object p1

    invoke-virtual {p1}, Landroid/view/WindowInsets;->consumeSystemWindowInsets()Landroid/view/WindowInsets;

    move-result-object p1

    return-object p1

    .line 292
    :cond_2
    invoke-virtual {p2}, Landroid/view/WindowInsets;->consumeSystemWindowInsets()Landroid/view/WindowInsets;

    move-result-object p1

    return-object p1
.end method
