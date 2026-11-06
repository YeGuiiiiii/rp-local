.class Lcom/rphub/app/OfficialUpdateWatcher$3$2;
.super Ljava/lang/Object;
.source "OfficialUpdateWatcher.java"

# interfaces
.implements Landroid/content/DialogInterface$OnDismissListener;


# annotations
.annotation system Ldalvik/annotation/EnclosingMethod;
    value = Lcom/rphub/app/OfficialUpdateWatcher$3;->run()V
.end annotation

.annotation system Ldalvik/annotation/InnerClass;
    accessFlags = 0x0
    name = null
.end annotation


# instance fields
.field final synthetic this$1:Lcom/rphub/app/OfficialUpdateWatcher$3;

.field private final synthetic val$prefs:Landroid/content/SharedPreferences;

.field private final synthetic val$remote:Lcom/rphub/app/OfficialUpdateWatcher$RemoteAnnouncement;


# direct methods
.method constructor <init>(Lcom/rphub/app/OfficialUpdateWatcher$3;Landroid/content/SharedPreferences;Lcom/rphub/app/OfficialUpdateWatcher$RemoteAnnouncement;)V
    .locals 0

    .line 1
    iput-object p1, p0, Lcom/rphub/app/OfficialUpdateWatcher$3$2;->this$1:Lcom/rphub/app/OfficialUpdateWatcher$3;

    iput-object p2, p0, Lcom/rphub/app/OfficialUpdateWatcher$3$2;->val$prefs:Landroid/content/SharedPreferences;

    iput-object p3, p0, Lcom/rphub/app/OfficialUpdateWatcher$3$2;->val$remote:Lcom/rphub/app/OfficialUpdateWatcher$RemoteAnnouncement;

    .line 415
    invoke-direct {p0}, Ljava/lang/Object;-><init>()V

    return-void
.end method


# virtual methods
.method public onDismiss(Landroid/content/DialogInterface;)V
    .locals 2

    .line 419
    :try_start_0
    iget-object p1, p0, Lcom/rphub/app/OfficialUpdateWatcher$3$2;->val$prefs:Landroid/content/SharedPreferences;

    invoke-interface {p1}, Landroid/content/SharedPreferences;->edit()Landroid/content/SharedPreferences$Editor;

    move-result-object p1

    const-string v0, "last_notified_id"

    iget-object v1, p0, Lcom/rphub/app/OfficialUpdateWatcher$3$2;->val$remote:Lcom/rphub/app/OfficialUpdateWatcher$RemoteAnnouncement;

    iget v1, v1, Lcom/rphub/app/OfficialUpdateWatcher$RemoteAnnouncement;->id:I

    invoke-interface {p1, v0, v1}, Landroid/content/SharedPreferences$Editor;->putInt(Ljava/lang/String;I)Landroid/content/SharedPreferences$Editor;

    move-result-object p1

    invoke-interface {p1}, Landroid/content/SharedPreferences$Editor;->apply()V
    :try_end_0
    .catchall {:try_start_0 .. :try_end_0} :catchall_0

    :catchall_0
    return-void
.end method
