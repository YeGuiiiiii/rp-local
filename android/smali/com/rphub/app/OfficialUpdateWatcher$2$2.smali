.class Lcom/rphub/app/OfficialUpdateWatcher$2$2;
.super Ljava/lang/Object;
.source "OfficialUpdateWatcher.java"

# interfaces
.implements Landroid/content/DialogInterface$OnClickListener;


# annotations
.annotation system Ldalvik/annotation/EnclosingMethod;
    value = Lcom/rphub/app/OfficialUpdateWatcher$2;->run()V
.end annotation

.annotation system Ldalvik/annotation/InnerClass;
    accessFlags = 0x0
    name = null
.end annotation


# instance fields
.field final synthetic this$1:Lcom/rphub/app/OfficialUpdateWatcher$2;

.field private final synthetic val$prefs:Landroid/content/SharedPreferences;

.field private final synthetic val$versionCode:I


# direct methods
.method constructor <init>(Lcom/rphub/app/OfficialUpdateWatcher$2;Landroid/content/SharedPreferences;I)V
    .locals 0

    .line 1
    iput-object p1, p0, Lcom/rphub/app/OfficialUpdateWatcher$2$2;->this$1:Lcom/rphub/app/OfficialUpdateWatcher$2;

    iput-object p2, p0, Lcom/rphub/app/OfficialUpdateWatcher$2$2;->val$prefs:Landroid/content/SharedPreferences;

    iput p3, p0, Lcom/rphub/app/OfficialUpdateWatcher$2$2;->val$versionCode:I

    .line 293
    invoke-direct {p0}, Ljava/lang/Object;-><init>()V

    return-void
.end method


# virtual methods
.method public onClick(Landroid/content/DialogInterface;I)V
    .locals 1

    .line 297
    :try_start_0
    iget-object p1, p0, Lcom/rphub/app/OfficialUpdateWatcher$2$2;->val$prefs:Landroid/content/SharedPreferences;

    invoke-interface {p1}, Landroid/content/SharedPreferences;->edit()Landroid/content/SharedPreferences$Editor;

    move-result-object p1

    const-string p2, "suppress_fail_version"

    .line 298
    iget v0, p0, Lcom/rphub/app/OfficialUpdateWatcher$2$2;->val$versionCode:I

    invoke-interface {p1, p2, v0}, Landroid/content/SharedPreferences$Editor;->putInt(Ljava/lang/String;I)Landroid/content/SharedPreferences$Editor;

    move-result-object p1

    .line 299
    invoke-interface {p1}, Landroid/content/SharedPreferences$Editor;->apply()V

    const-string p1, "RPHubOfficial"

    .line 300
    new-instance p2, Ljava/lang/StringBuilder;

    const-string v0, "promote failure notice suppressed by user, versionCode="

    invoke-direct {p2, v0}, Ljava/lang/StringBuilder;-><init>(Ljava/lang/String;)V

    .line 301
    iget v0, p0, Lcom/rphub/app/OfficialUpdateWatcher$2$2;->val$versionCode:I

    invoke-virtual {p2, v0}, Ljava/lang/StringBuilder;->append(I)Ljava/lang/StringBuilder;

    invoke-virtual {p2}, Ljava/lang/StringBuilder;->toString()Ljava/lang/String;

    move-result-object p2

    .line 300
    invoke-static {p1, p2}, Landroid/util/Log;->i(Ljava/lang/String;Ljava/lang/String;)I
    :try_end_0
    .catchall {:try_start_0 .. :try_end_0} :catchall_0

    :catchall_0
    return-void
.end method
