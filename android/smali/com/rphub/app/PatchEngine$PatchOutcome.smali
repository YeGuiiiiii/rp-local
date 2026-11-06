.class final Lcom/rphub/app/PatchEngine$PatchOutcome;
.super Ljava/lang/Object;
.source "PatchEngine.java"


# annotations
.annotation system Ldalvik/annotation/EnclosingClass;
    value = Lcom/rphub/app/PatchEngine;
.end annotation

.annotation system Ldalvik/annotation/InnerClass;
    accessFlags = 0x1a
    name = "PatchOutcome"
.end annotation


# instance fields
.field alreadyApplied:I

.field applied:I

.field content:Ljava/lang/String;

.field missing:I

.field qualityNote:Ljava/lang/String;

.field qualityOk:Z


# direct methods
.method private constructor <init>()V
    .locals 0

    .line 1857
    invoke-direct {p0}, Ljava/lang/Object;-><init>()V

    return-void
.end method

.method synthetic constructor <init>(Lcom/rphub/app/PatchEngine$PatchOutcome;)V
    .locals 0

    .line 1857
    invoke-direct {p0}, Lcom/rphub/app/PatchEngine$PatchOutcome;-><init>()V

    return-void
.end method
