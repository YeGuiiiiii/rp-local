.class Lcom/rphub/app/MainActivity$OnlineReturn;
.super Ljava/lang/Object;
.implements Landroid/view/View$OnClickListener;

.field private final activity:Lcom/rphub/app/MainActivity;

.method constructor <init>(Lcom/rphub/app/MainActivity;)V
    .locals 0
    invoke-direct {p0}, Ljava/lang/Object;-><init>()V
    iput-object p1, p0, Lcom/rphub/app/MainActivity$OnlineReturn;->activity:Lcom/rphub/app/MainActivity;
    return-void
.end method

.method public onClick(Landroid/view/View;)V
    .locals 0
    iget-object p1, p0, Lcom/rphub/app/MainActivity$OnlineReturn;->activity:Lcom/rphub/app/MainActivity;
    invoke-static {p1}, Lcom/rphub/app/MainActivity;->access$44(Lcom/rphub/app/MainActivity;)V
    return-void
.end method
