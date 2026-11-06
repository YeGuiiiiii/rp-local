.class final Lcom/rphub/app/OfficialUpdateWatcher$RemoteAnnouncement;
.super Ljava/lang/Object;
.source "OfficialUpdateWatcher.java"


# annotations
.annotation system Ldalvik/annotation/EnclosingClass;
    value = Lcom/rphub/app/OfficialUpdateWatcher;
.end annotation

.annotation system Ldalvik/annotation/InnerClass;
    accessFlags = 0x18
    name = "RemoteAnnouncement"
.end annotation


# instance fields
.field final id:I

.field final updatedAt:Ljava/lang/String;


# direct methods
.method constructor <init>(ILjava/lang/String;)V
    .locals 0

    .line 631
    invoke-direct {p0}, Ljava/lang/Object;-><init>()V

    .line 632
    iput p1, p0, Lcom/rphub/app/OfficialUpdateWatcher$RemoteAnnouncement;->id:I

    .line 633
    iput-object p2, p0, Lcom/rphub/app/OfficialUpdateWatcher$RemoteAnnouncement;->updatedAt:Ljava/lang/String;

    return-void
.end method
