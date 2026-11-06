.class public final Lcom/rphub/app/LocalAssets;
.super Ljava/lang/Object;
.source "LocalAssets"

.method public static intercept(Landroid/content/Context;Ljava/lang/String;)Landroid/webkit/WebResourceResponse;
    .locals 7

    invoke-static {p0, p1}, Lcom/rphub/app/LocalFiles;->backupResponse(Landroid/content/Context;Ljava/lang/String;)Landroid/webkit/WebResourceResponse;
    move-result-object v0
    if-eqz v0, :images
    return-object v0
    :images
    invoke-static {p0, p1}, Lcom/rphub/app/LocalFiles;->imageResponse(Landroid/content/Context;Ljava/lang/String;)Landroid/webkit/WebResourceResponse;
    move-result-object v0
    if-eqz v0, :site
    return-object v0
    :site
    if-eqz p1, :remote
    const-string v0, "https://sta1n156.github.io/RP-Hub/"
    invoke-virtual {p1, v0}, Ljava/lang/String;->startsWith(Ljava/lang/String;)Z
    move-result v0
    if-eqz v0, :remote

    invoke-static {p1}, Landroid/net/Uri;->parse(Ljava/lang/String;)Landroid/net/Uri;
    move-result-object v0
    invoke-virtual {v0}, Landroid/net/Uri;->getPath()Ljava/lang/String;
    move-result-object v0
    const/16 v1, 0x8
    invoke-virtual {v0, v1}, Ljava/lang/String;->substring(I)Ljava/lang/String;
    move-result-object v0
    const-string v1, "/"
    invoke-virtual {v0, v1}, Ljava/lang/String;->endsWith(Ljava/lang/String;)Z
    move-result v1
    if-nez v1, :index
    invoke-virtual {v0}, Ljava/lang/String;->isEmpty()Z
    move-result v1
    if-eqz v1, :path
    :index
    const-string v1, "index.html"
    invoke-virtual {v0, v1}, Ljava/lang/String;->concat(Ljava/lang/String;)Ljava/lang/String;
    move-result-object v0
    :path
    const-string v1, "local-site/"
    invoke-virtual {v1, v0}, Ljava/lang/String;->concat(Ljava/lang/String;)Ljava/lang/String;
    move-result-object v1

    :try_start
    invoke-virtual {p0}, Landroid/content/Context;->getAssets()Landroid/content/res/AssetManager;
    move-result-object v2
    invoke-virtual {v2, v1}, Landroid/content/res/AssetManager;->open(Ljava/lang/String;)Ljava/io/InputStream;
    move-result-object v1
    :try_end
    .catch Ljava/io/IOException; {:try_start .. :try_end} :missing

    const-string v2, ".js"
    invoke-virtual {v0, v2}, Ljava/lang/String;->endsWith(Ljava/lang/String;)Z
    move-result v2
    if-eqz v2, :guess
    const-string v0, "application/javascript"
    goto :response
    :guess
    invoke-static {v0}, Landroid/webkit/MimeTypeMap;->getFileExtensionFromUrl(Ljava/lang/String;)Ljava/lang/String;
    move-result-object v0
    invoke-static {}, Landroid/webkit/MimeTypeMap;->getSingleton()Landroid/webkit/MimeTypeMap;
    move-result-object v2
    invoke-virtual {v2, v0}, Landroid/webkit/MimeTypeMap;->getMimeTypeFromExtension(Ljava/lang/String;)Ljava/lang/String;
    move-result-object v0
    if-nez v0, :response
    const-string v0, "application/octet-stream"
    :response
    new-instance v2, Landroid/webkit/WebResourceResponse;
    const-string v3, "UTF-8"
    invoke-direct {v2, v0, v3, v1}, Landroid/webkit/WebResourceResponse;-><init>(Ljava/lang/String;Ljava/lang/String;Ljava/io/InputStream;)V
    return-object v2

    :missing
    move-exception v0
    new-instance v1, Ljava/io/ByteArrayInputStream;
    const/4 v0, 0x0
    new-array v0, v0, [B
    invoke-direct {v1, v0}, Ljava/io/ByteArrayInputStream;-><init>([B)V
    new-instance v2, Landroid/webkit/WebResourceResponse;
    const-string v0, "text/plain"
    const-string v3, "UTF-8"
    invoke-direct {v2, v0, v3, v1}, Landroid/webkit/WebResourceResponse;-><init>(Ljava/lang/String;Ljava/lang/String;Ljava/io/InputStream;)V
    const/16 v0, 0x194
    const-string v1, "Not Found"
    invoke-virtual {v2, v0, v1}, Landroid/webkit/WebResourceResponse;->setStatusCodeAndReasonPhrase(ILjava/lang/String;)V
    return-object v2

    :remote
    const/4 v0, 0x0
    return-object v0
.end method
