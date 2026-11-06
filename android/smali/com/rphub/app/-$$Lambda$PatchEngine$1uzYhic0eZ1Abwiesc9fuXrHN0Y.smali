.class public final synthetic Lcom/rphub/app/-$$Lambda$PatchEngine$1uzYhic0eZ1Abwiesc9fuXrHN0Y;
.super Ljava/lang/Object;
.source "lambda"

# interfaces
.implements Ljava/lang/Runnable;


# instance fields
.field public final synthetic f$0:Ljava/lang/String;

.field public final synthetic f$1:J

.field public final synthetic f$2:Ljava/lang/String;

.field public final synthetic f$3:Landroid/content/Context;


# direct methods
.method public synthetic constructor <init>(Ljava/lang/String;JLjava/lang/String;Landroid/content/Context;)V
    .locals 0

    invoke-direct {p0}, Ljava/lang/Object;-><init>()V

    iput-object p1, p0, Lcom/rphub/app/-$$Lambda$PatchEngine$1uzYhic0eZ1Abwiesc9fuXrHN0Y;->f$0:Ljava/lang/String;

    iput-wide p2, p0, Lcom/rphub/app/-$$Lambda$PatchEngine$1uzYhic0eZ1Abwiesc9fuXrHN0Y;->f$1:J

    iput-object p4, p0, Lcom/rphub/app/-$$Lambda$PatchEngine$1uzYhic0eZ1Abwiesc9fuXrHN0Y;->f$2:Ljava/lang/String;

    iput-object p5, p0, Lcom/rphub/app/-$$Lambda$PatchEngine$1uzYhic0eZ1Abwiesc9fuXrHN0Y;->f$3:Landroid/content/Context;

    return-void
.end method


# virtual methods
.method public final run()V
    .locals 5

    iget-object v0, p0, Lcom/rphub/app/-$$Lambda$PatchEngine$1uzYhic0eZ1Abwiesc9fuXrHN0Y;->f$0:Ljava/lang/String;

    iget-wide v1, p0, Lcom/rphub/app/-$$Lambda$PatchEngine$1uzYhic0eZ1Abwiesc9fuXrHN0Y;->f$1:J

    iget-object v3, p0, Lcom/rphub/app/-$$Lambda$PatchEngine$1uzYhic0eZ1Abwiesc9fuXrHN0Y;->f$2:Ljava/lang/String;

    iget-object v4, p0, Lcom/rphub/app/-$$Lambda$PatchEngine$1uzYhic0eZ1Abwiesc9fuXrHN0Y;->f$3:Landroid/content/Context;

    invoke-static {v0, v1, v2, v3, v4}, Lcom/rphub/app/PatchEngine;->lambda$0(Ljava/lang/String;JLjava/lang/String;Landroid/content/Context;)V

    return-void
.end method
