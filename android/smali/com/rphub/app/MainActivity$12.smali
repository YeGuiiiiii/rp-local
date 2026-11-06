.class Lcom/rphub/app/MainActivity$12;
.super Ljava/lang/Object;
.source "MainActivity.java"

# interfaces
.implements Ljava/lang/Runnable;


# annotations
.annotation system Ldalvik/annotation/EnclosingMethod;
    value = Lcom/rphub/app/MainActivity;->openInAppOrBrowser(Ljava/lang/String;)V
.end annotation

.annotation system Ldalvik/annotation/InnerClass;
    accessFlags = 0x0
    name = null
.end annotation


# instance fields
.field final synthetic this$0:Lcom/rphub/app/MainActivity;

.field private final synthetic val$url:Ljava/lang/String;


# direct methods
.method constructor <init>(Lcom/rphub/app/MainActivity;Ljava/lang/String;)V
    .locals 0

    .line 1
    iput-object p1, p0, Lcom/rphub/app/MainActivity$12;->this$0:Lcom/rphub/app/MainActivity;

    iput-object p2, p0, Lcom/rphub/app/MainActivity$12;->val$url:Ljava/lang/String;

    .line 1848
    invoke-direct {p0}, Ljava/lang/Object;-><init>()V

    return-void
.end method


# virtual methods
.method public run()V
    .locals 5

    .line 1851
    iget-object v0, p0, Lcom/rphub/app/MainActivity$12;->val$url:Ljava/lang/String;

    const-string v1, "rphforum.zeabur.app"

    invoke-virtual {v0, v1}, Ljava/lang/String;->contains(Ljava/lang/CharSequence;)Z

    move-result v0

    if-eqz v0, :cond_1

    .line 1852
    iget-object v0, p0, Lcom/rphub/app/MainActivity$12;->this$0:Lcom/rphub/app/MainActivity;

    invoke-static {v0}, Lcom/rphub/app/MainActivity;->access$2(Lcom/rphub/app/MainActivity;)Landroid/webkit/WebView;

    move-result-object v0

    if-eqz v0, :cond_0

    .line 1853
    new-instance v0, Ljava/lang/StringBuilder;

    const-string v1, "window.rphubOpenSquare&&window.rphubOpenSquare("

    invoke-direct {v0, v1}, Ljava/lang/StringBuilder;-><init>(Ljava/lang/String;)V

    .line 1854
    iget-object v1, p0, Lcom/rphub/app/MainActivity$12;->val$url:Ljava/lang/String;

    invoke-static {v1}, Lorg/json/JSONObject;->quote(Ljava/lang/String;)Ljava/lang/String;

    move-result-object v1

    invoke-virtual {v0, v1}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    const-string v1, ")"

    invoke-virtual {v0, v1}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    .line 1853
    invoke-virtual {v0}, Ljava/lang/StringBuilder;->toString()Ljava/lang/String;

    move-result-object v0

    .line 1855
    iget-object v1, p0, Lcom/rphub/app/MainActivity$12;->this$0:Lcom/rphub/app/MainActivity;

    invoke-static {v1}, Lcom/rphub/app/MainActivity;->access$2(Lcom/rphub/app/MainActivity;)Landroid/webkit/WebView;

    move-result-object v1

    const/4 v2, 0x0

    invoke-virtual {v1, v0, v2}, Landroid/webkit/WebView;->evaluateJavascript(Ljava/lang/String;Landroid/webkit/ValueCallback;)V

    :cond_0
    return-void

    .line 1860
    :cond_1
    :try_start_0
    iget-object v0, p0, Lcom/rphub/app/MainActivity$12;->this$0:Lcom/rphub/app/MainActivity;

    new-instance v1, Landroid/content/Intent;

    const-string v2, "android.intent.action.VIEW"

    iget-object v3, p0, Lcom/rphub/app/MainActivity$12;->val$url:Ljava/lang/String;

    invoke-static {v3}, Landroid/net/Uri;->parse(Ljava/lang/String;)Landroid/net/Uri;

    move-result-object v3

    invoke-direct {v1, v2, v3}, Landroid/content/Intent;-><init>(Ljava/lang/String;Landroid/net/Uri;)V

    invoke-virtual {v0, v1}, Lcom/rphub/app/MainActivity;->startActivity(Landroid/content/Intent;)V
    :try_end_0
    .catchall {:try_start_0 .. :try_end_0} :catchall_0

    goto :goto_0

    .line 1862
    :catchall_0
    iget-object v0, p0, Lcom/rphub/app/MainActivity$12;->this$0:Lcom/rphub/app/MainActivity;

    new-instance v1, Ljava/lang/StringBuilder;

    const-string v2, "cannot open "

    invoke-direct {v1, v2}, Ljava/lang/StringBuilder;-><init>(Ljava/lang/String;)V

    iget-object v2, p0, Lcom/rphub/app/MainActivity$12;->val$url:Ljava/lang/String;

    invoke-virtual {v1, v2}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    invoke-virtual {v1}, Ljava/lang/StringBuilder;->toString()Ljava/lang/String;

    move-result-object v1

    const/4 v2, 0x0

    const-string v3, "newWindow"

    const-string v4, ""

    invoke-static {v0, v3, v1, v4, v2}, Lcom/rphub/app/MainActivity;->access$11(Lcom/rphub/app/MainActivity;Ljava/lang/String;Ljava/lang/String;Ljava/lang/String;I)V

    :goto_0
    return-void
.end method
