.class public final Lcom/rphub/app/OfficialUpdateWatcher;
.super Ljava/lang/Object;
.source "OfficialUpdateWatcher.java"


# annotations
.annotation system Ldalvik/annotation/MemberClasses;
    value = {
        Lcom/rphub/app/OfficialUpdateWatcher$RemoteAnnouncement;
    }
.end annotation


# static fields
.field private static final ANCHOR_PATTERN:Ljava/util/regex/Pattern;

.field private static final ANNOUNCEMENT_URL:Ljava/lang/String; = "https://sta1n156.github.io/RP-Hub/assets/announcement.json"

.field private static final BASE_URL:Ljava/lang/String; = "https://sta1n156.github.io/RP-Hub"

.field private static final CHECK_INTERVAL_MS:J = 0x1499700L

.field private static final CONNECT_TIMEOUT_MS:I = 0x1f40

.field private static final FAIL_NOTICE_INTERVAL_MS:J = 0x5265c00L

.field private static final FAIL_STREAK_THRESHOLD:I = 0x3

.field private static final FALLBACK_URL:Ljava/lang/String; = "https://sta1n156.github.io/RP-Hub/assets/js/built-in-content.js"

.field private static final HOME_URL:Ljava/lang/String; = "https://sta1n156.github.io/RP-Hub/"

.field private static final ID_PATTERN:Ljava/util/regex/Pattern;

.field private static final KEY_LAST_CHECK:Ljava/lang/String; = "last_check_ms"

.field private static final KEY_LAST_FAIL_NOTICE:Ljava/lang/String; = "last_fail_notice_ms"

.field private static final KEY_LAST_NOTIFIED:Ljava/lang/String; = "last_notified_id"

.field private static final KEY_SUPPRESS_FAIL_VERSION:Ljava/lang/String; = "suppress_fail_version"

.field private static final MAX_BODY_BYTES:I = 0x80000

.field private static final PREFS:Ljava/lang/String; = "rphub_official_update"

.field private static final READ_TIMEOUT_MS:I = 0x2ee0

.field private static final SEED_ASSET:Ljava/lang/String; = "patch-seed/built-in-content.js"

.field private static final STARTUP_DELAY_MS:J = 0xfa0L

.field private static final TAG:Ljava/lang/String; = "RPHubOfficial"

.field private static final UPDATED_AT_PATTERN:Ljava/util/regex/Pattern;


# direct methods
.method static constructor <clinit>()V
    .locals 1

    const-string v0, "(?:^|[^A-Za-z0-9_])[\"\']?id[\"\']?\\s*:\\s*(\\d{3,9})"

    .line 116
    invoke-static {v0}, Ljava/util/regex/Pattern;->compile(Ljava/lang/String;)Ljava/util/regex/Pattern;

    move-result-object v0

    .line 115
    sput-object v0, Lcom/rphub/app/OfficialUpdateWatcher;->ID_PATTERN:Ljava/util/regex/Pattern;

    const-string v0, "RPHubLatestUpdate\\s*=\\s*Object\\.freeze\\s*\\(\\s*\\{"

    .line 124
    invoke-static {v0}, Ljava/util/regex/Pattern;->compile(Ljava/lang/String;)Ljava/util/regex/Pattern;

    move-result-object v0

    .line 123
    sput-object v0, Lcom/rphub/app/OfficialUpdateWatcher;->ANCHOR_PATTERN:Ljava/util/regex/Pattern;

    const-string v0, "\u66f4\u65b0\u65f6\u95f4[\uff1a:]\\s*([^\\n\\r`\"\\\\]{1,40})"

    .line 136
    invoke-static {v0}, Ljava/util/regex/Pattern;->compile(Ljava/lang/String;)Ljava/util/regex/Pattern;

    move-result-object v0

    .line 135
    sput-object v0, Lcom/rphub/app/OfficialUpdateWatcher;->UPDATED_AT_PATTERN:Ljava/util/regex/Pattern;

    return-void
.end method

.method private constructor <init>()V
    .locals 0

    .line 138
    invoke-direct {p0}, Ljava/lang/Object;-><init>()V

    return-void
.end method

.method static synthetic access$0(Landroid/app/Activity;Landroid/content/Context;Landroid/webkit/WebView;)V
    .locals 0

    .line 180
    invoke-static {p0, p1, p2}, Lcom/rphub/app/OfficialUpdateWatcher;->runCheck(Landroid/app/Activity;Landroid/content/Context;Landroid/webkit/WebView;)V

    return-void
.end method

.method private static appVersionCode(Landroid/content/Context;)I
    .locals 2

    const/4 v0, 0x0

    .line 617
    :try_start_0
    invoke-virtual {p0}, Landroid/content/Context;->getPackageManager()Landroid/content/pm/PackageManager;

    move-result-object v1

    .line 618
    invoke-virtual {p0}, Landroid/content/Context;->getPackageName()Ljava/lang/String;

    move-result-object p0

    invoke-virtual {v1, p0, v0}, Landroid/content/pm/PackageManager;->getPackageInfo(Ljava/lang/String;I)Landroid/content/pm/PackageInfo;

    move-result-object p0

    iget p0, p0, Landroid/content/pm/PackageInfo;->versionCode:I
    :try_end_0
    .catchall {:try_start_0 .. :try_end_0} :catchall_0

    return p0

    :catchall_0
    return v0
.end method

.method public static checkOnColdStart(Landroid/app/Activity;Landroid/webkit/WebView;)V
    .locals 0
    return-void
.end method

.method static extractAnnouncementId(Ljava/lang/String;)I
    .locals 3

    const/4 v0, -0x1

    if-eqz p0, :cond_2

    .line 516
    invoke-virtual {p0}, Ljava/lang/String;->length()I

    move-result v1

    if-nez v1, :cond_0

    goto :goto_0

    .line 519
    :cond_0
    sget-object v1, Lcom/rphub/app/OfficialUpdateWatcher;->ANCHOR_PATTERN:Ljava/util/regex/Pattern;

    invoke-virtual {v1, p0}, Ljava/util/regex/Pattern;->matcher(Ljava/lang/CharSequence;)Ljava/util/regex/Matcher;

    move-result-object v1

    .line 520
    invoke-virtual {v1}, Ljava/util/regex/Matcher;->find()Z

    move-result v2

    if-nez v2, :cond_1

    return v0

    .line 523
    :cond_1
    invoke-virtual {v1}, Ljava/util/regex/Matcher;->end()I

    move-result v0

    invoke-static {p0, v0}, Lcom/rphub/app/OfficialUpdateWatcher;->firstIdAfter(Ljava/lang/String;I)I

    move-result p0

    return p0

    :cond_2
    :goto_0
    return v0
.end method

.method static extractJsonId(Ljava/lang/String;)I
    .locals 2

    const/4 v0, -0x1

    if-eqz p0, :cond_2

    .line 532
    invoke-virtual {p0}, Ljava/lang/String;->length()I

    move-result v1

    if-nez v1, :cond_0

    goto :goto_0

    :cond_0
    const/16 v1, 0x7b

    .line 535
    invoke-virtual {p0, v1}, Ljava/lang/String;->indexOf(I)I

    move-result v1

    if-gez v1, :cond_1

    return v0

    .line 539
    :cond_1
    invoke-static {p0, v1}, Lcom/rphub/app/OfficialUpdateWatcher;->firstIdAfter(Ljava/lang/String;I)I

    move-result p0

    return p0

    :cond_2
    :goto_0
    return v0
.end method

.method static extractUpdatedAt(Ljava/lang/String;)Ljava/lang/String;
    .locals 2

    const/4 v0, 0x0

    if-eqz p0, :cond_3

    .line 560
    invoke-virtual {p0}, Ljava/lang/String;->length()I

    move-result v1

    if-nez v1, :cond_0

    goto :goto_0

    .line 564
    :cond_0
    :try_start_0
    sget-object v1, Lcom/rphub/app/OfficialUpdateWatcher;->UPDATED_AT_PATTERN:Ljava/util/regex/Pattern;

    invoke-virtual {v1, p0}, Ljava/util/regex/Pattern;->matcher(Ljava/lang/CharSequence;)Ljava/util/regex/Matcher;

    move-result-object p0

    .line 565
    invoke-virtual {p0}, Ljava/util/regex/Matcher;->find()Z

    move-result v1

    if-nez v1, :cond_1

    return-object v0

    :cond_1
    const/4 v1, 0x1

    .line 568
    invoke-virtual {p0, v1}, Ljava/util/regex/Matcher;->group(I)Ljava/lang/String;

    move-result-object p0

    if-nez p0, :cond_2

    goto :goto_0

    .line 569
    :cond_2
    invoke-virtual {p0}, Ljava/lang/String;->trim()Ljava/lang/String;

    move-result-object v0
    :try_end_0
    .catchall {:try_start_0 .. :try_end_0} :catchall_0

    :catchall_0
    :cond_3
    :goto_0
    return-object v0
.end method

.method private static fetchRemote()Lcom/rphub/app/OfficialUpdateWatcher$RemoteAnnouncement;
    .locals 3

    const-string v0, "https://sta1n156.github.io/RP-Hub/assets/announcement.json"

    .line 438
    invoke-static {v0}, Lcom/rphub/app/OfficialUpdateWatcher;->fetchText(Ljava/lang/String;)Ljava/lang/String;

    move-result-object v0

    if-eqz v0, :cond_1

    .line 440
    invoke-static {v0}, Lcom/rphub/app/OfficialUpdateWatcher;->extractJsonId(Ljava/lang/String;)I

    move-result v1

    if-lez v1, :cond_0

    .line 442
    new-instance v2, Lcom/rphub/app/OfficialUpdateWatcher$RemoteAnnouncement;

    invoke-static {v0}, Lcom/rphub/app/OfficialUpdateWatcher;->extractUpdatedAt(Ljava/lang/String;)Ljava/lang/String;

    move-result-object v0

    invoke-direct {v2, v1, v0}, Lcom/rphub/app/OfficialUpdateWatcher$RemoteAnnouncement;-><init>(ILjava/lang/String;)V

    return-object v2

    :cond_0
    const-string v0, "RPHubOfficial"

    const-string v1, "announcement.json present but no id, trying fallback"

    .line 444
    invoke-static {v0, v1}, Landroid/util/Log;->i(Ljava/lang/String;Ljava/lang/String;)I

    :cond_1
    const-string v0, "https://sta1n156.github.io/RP-Hub/assets/js/built-in-content.js"

    .line 447
    invoke-static {v0}, Lcom/rphub/app/OfficialUpdateWatcher;->fetchText(Ljava/lang/String;)Ljava/lang/String;

    move-result-object v0

    if-eqz v0, :cond_2

    .line 449
    invoke-static {v0}, Lcom/rphub/app/OfficialUpdateWatcher;->extractAnnouncementId(Ljava/lang/String;)I

    move-result v1

    if-lez v1, :cond_2

    .line 451
    new-instance v2, Lcom/rphub/app/OfficialUpdateWatcher$RemoteAnnouncement;

    invoke-static {v0}, Lcom/rphub/app/OfficialUpdateWatcher;->extractUpdatedAt(Ljava/lang/String;)Ljava/lang/String;

    move-result-object v0

    invoke-direct {v2, v1, v0}, Lcom/rphub/app/OfficialUpdateWatcher$RemoteAnnouncement;-><init>(ILjava/lang/String;)V

    return-object v2

    :cond_2
    const/4 v0, 0x0

    return-object v0
.end method

.method private static fetchText(Ljava/lang/String;)Ljava/lang/String;
    .locals 10

    const-string v0, "RPHubOfficial"

    const/4 v1, 0x0

    .line 461
    :try_start_0
    new-instance v2, Ljava/net/URL;

    invoke-direct {v2, p0}, Ljava/net/URL;-><init>(Ljava/lang/String;)V

    .line 462
    invoke-virtual {v2}, Ljava/net/URL;->openConnection()Ljava/net/URLConnection;

    move-result-object v2

    check-cast v2, Ljava/net/HttpURLConnection;
    :try_end_0
    .catchall {:try_start_0 .. :try_end_0} :catchall_4

    const/16 v3, 0x1f40

    .line 463
    :try_start_1
    invoke-virtual {v2, v3}, Ljava/net/HttpURLConnection;->setConnectTimeout(I)V

    const/16 v3, 0x2ee0

    .line 464
    invoke-virtual {v2, v3}, Ljava/net/HttpURLConnection;->setReadTimeout(I)V

    const/4 v3, 0x1

    .line 465
    invoke-virtual {v2, v3}, Ljava/net/HttpURLConnection;->setInstanceFollowRedirects(Z)V

    const-string v3, "User-Agent"

    const-string v4, "RP-Hub-Android"

    .line 466
    invoke-virtual {v2, v3, v4}, Ljava/net/HttpURLConnection;->setRequestProperty(Ljava/lang/String;Ljava/lang/String;)V

    const-string v3, "Accept"

    const-string v4, "*/*"

    .line 467
    invoke-virtual {v2, v3, v4}, Ljava/net/HttpURLConnection;->setRequestProperty(Ljava/lang/String;Ljava/lang/String;)V

    .line 468
    invoke-virtual {v2}, Ljava/net/HttpURLConnection;->getResponseCode()I

    move-result v3

    const/16 v4, 0xc8

    if-lt v3, v4, :cond_7

    const/16 v4, 0x12c

    if-lt v3, v4, :cond_0

    goto :goto_3

    .line 473
    :cond_0
    invoke-virtual {v2}, Ljava/net/HttpURLConnection;->getInputStream()Ljava/io/InputStream;

    move-result-object v3
    :try_end_1
    .catchall {:try_start_1 .. :try_end_1} :catchall_3

    .line 474
    :try_start_2
    new-instance v4, Ljava/io/ByteArrayOutputStream;

    invoke-direct {v4}, Ljava/io/ByteArrayOutputStream;-><init>()V

    const/16 v5, 0x2000

    new-array v5, v5, [B

    const/4 v6, 0x0

    const/4 v7, 0x0

    .line 478
    :goto_0
    invoke-virtual {v3, v5}, Ljava/io/InputStream;->read([B)I

    move-result v8

    if-gtz v8, :cond_3

    const-string v5, "UTF-8"

    .line 486
    invoke-virtual {v4, v5}, Ljava/io/ByteArrayOutputStream;->toString(Ljava/lang/String;)Ljava/lang/String;

    move-result-object p0
    :try_end_2
    .catchall {:try_start_2 .. :try_end_2} :catchall_2

    if-eqz v3, :cond_1

    .line 493
    :try_start_3
    invoke-virtual {v3}, Ljava/io/InputStream;->close()V
    :try_end_3
    .catchall {:try_start_3 .. :try_end_3} :catchall_0

    goto :goto_1

    :catchall_0
    nop

    :cond_1
    :goto_1
    if-eqz v2, :cond_2

    .line 498
    invoke-virtual {v2}, Ljava/net/HttpURLConnection;->disconnect()V

    :cond_2
    return-object p0

    :cond_3
    add-int/2addr v7, v8

    const/high16 v9, 0x80000

    if-le v7, v9, :cond_6

    .line 481
    :try_start_4
    new-instance v4, Ljava/lang/StringBuilder;

    const-string v5, "body too large, aborting: "

    invoke-direct {v4, v5}, Ljava/lang/StringBuilder;-><init>(Ljava/lang/String;)V

    invoke-virtual {v4, p0}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    invoke-virtual {v4}, Ljava/lang/StringBuilder;->toString()Ljava/lang/String;

    move-result-object v4

    invoke-static {v0, v4}, Landroid/util/Log;->w(Ljava/lang/String;Ljava/lang/String;)I
    :try_end_4
    .catchall {:try_start_4 .. :try_end_4} :catchall_2

    if-eqz v3, :cond_4

    .line 493
    :try_start_5
    invoke-virtual {v3}, Ljava/io/InputStream;->close()V
    :try_end_5
    .catchall {:try_start_5 .. :try_end_5} :catchall_1

    goto :goto_2

    :catchall_1
    nop

    :cond_4
    :goto_2
    if-eqz v2, :cond_5

    .line 498
    invoke-virtual {v2}, Ljava/net/HttpURLConnection;->disconnect()V

    :cond_5
    return-object v1

    .line 484
    :cond_6
    :try_start_6
    invoke-virtual {v4, v5, v6, v8}, Ljava/io/ByteArrayOutputStream;->write([BII)V
    :try_end_6
    .catchall {:try_start_6 .. :try_end_6} :catchall_2

    goto :goto_0

    :catchall_2
    move-exception v4

    goto :goto_4

    .line 470
    :cond_7
    :goto_3
    :try_start_7
    new-instance v4, Ljava/lang/StringBuilder;

    const-string v5, "HTTP "

    invoke-direct {v4, v5}, Ljava/lang/StringBuilder;-><init>(Ljava/lang/String;)V

    invoke-virtual {v4, v3}, Ljava/lang/StringBuilder;->append(I)Ljava/lang/StringBuilder;

    const-string v3, " for "

    invoke-virtual {v4, v3}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    invoke-virtual {v4, p0}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    invoke-virtual {v4}, Ljava/lang/StringBuilder;->toString()Ljava/lang/String;

    move-result-object v3

    invoke-static {v0, v3}, Landroid/util/Log;->i(Ljava/lang/String;Ljava/lang/String;)I
    :try_end_7
    .catchall {:try_start_7 .. :try_end_7} :catchall_3

    if-eqz v2, :cond_8

    .line 498
    invoke-virtual {v2}, Ljava/net/HttpURLConnection;->disconnect()V

    :cond_8
    return-object v1

    :catchall_3
    move-exception v4

    move-object v3, v1

    goto :goto_4

    :catchall_4
    move-exception v4

    move-object v2, v1

    move-object v3, v2

    .line 488
    :goto_4
    :try_start_8
    new-instance v5, Ljava/lang/StringBuilder;

    const-string v6, "fetch failed "

    invoke-direct {v5, v6}, Ljava/lang/StringBuilder;-><init>(Ljava/lang/String;)V

    invoke-virtual {v5, p0}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    const-string p0, ": "

    invoke-virtual {v5, p0}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    invoke-virtual {v5, v4}, Ljava/lang/StringBuilder;->append(Ljava/lang/Object;)Ljava/lang/StringBuilder;

    invoke-virtual {v5}, Ljava/lang/StringBuilder;->toString()Ljava/lang/String;

    move-result-object p0

    invoke-static {v0, p0}, Landroid/util/Log;->i(Ljava/lang/String;Ljava/lang/String;)I
    :try_end_8
    .catchall {:try_start_8 .. :try_end_8} :catchall_6

    if-eqz v3, :cond_9

    .line 493
    :try_start_9
    invoke-virtual {v3}, Ljava/io/InputStream;->close()V
    :try_end_9
    .catchall {:try_start_9 .. :try_end_9} :catchall_5

    goto :goto_5

    :catchall_5
    nop

    :cond_9
    :goto_5
    if-eqz v2, :cond_a

    .line 498
    invoke-virtual {v2}, Ljava/net/HttpURLConnection;->disconnect()V

    :cond_a
    return-object v1

    :catchall_6
    move-exception p0

    if-eqz v3, :cond_b

    .line 493
    :try_start_a
    invoke-virtual {v3}, Ljava/io/InputStream;->close()V
    :try_end_a
    .catchall {:try_start_a .. :try_end_a} :catchall_7

    goto :goto_6

    :catchall_7
    nop

    :cond_b
    :goto_6
    if-eqz v2, :cond_c

    .line 498
    invoke-virtual {v2}, Ljava/net/HttpURLConnection;->disconnect()V

    .line 500
    :cond_c
    goto :goto_8

    :goto_7
    throw p0

    :goto_8
    goto :goto_7
.end method

.method private static firstIdAfter(Ljava/lang/String;I)I
    .locals 2

    const/4 v0, -0x1

    .line 544
    :try_start_0
    sget-object v1, Lcom/rphub/app/OfficialUpdateWatcher;->ID_PATTERN:Ljava/util/regex/Pattern;

    invoke-virtual {v1, p0}, Ljava/util/regex/Pattern;->matcher(Ljava/lang/CharSequence;)Ljava/util/regex/Matcher;

    move-result-object v1

    .line 545
    invoke-virtual {p0}, Ljava/lang/String;->length()I

    move-result p0

    invoke-virtual {v1, p1, p0}, Ljava/util/regex/Matcher;->region(II)Ljava/util/regex/Matcher;

    .line 546
    invoke-virtual {v1}, Ljava/util/regex/Matcher;->find()Z

    move-result p0

    if-nez p0, :cond_0

    return v0

    :cond_0
    const/4 p0, 0x1

    .line 549
    invoke-virtual {v1, p0}, Ljava/util/regex/Matcher;->group(I)Ljava/lang/String;

    move-result-object p0

    invoke-static {p0}, Ljava/lang/Integer;->parseInt(Ljava/lang/String;)I

    move-result p0
    :try_end_0
    .catchall {:try_start_0 .. :try_end_0} :catchall_0

    return p0

    :catchall_0
    return v0
.end method

.method private static notifyPromoteFailure(Landroid/app/Activity;Landroid/content/Context;Landroid/content/SharedPreferences;Landroid/webkit/WebView;)Z
    .locals 11

    .line 244
    invoke-static {p1}, Lcom/rphub/app/PatchEngine;->getPromoteFailStreak(Landroid/content/Context;)I

    move-result v7

    .line 245
    invoke-static {p1}, Lcom/rphub/app/OfficialUpdateWatcher;->appVersionCode(Landroid/content/Context;)I

    move-result v8

    const-string v0, "suppress_fail_version"

    const/4 v9, 0x0

    .line 246
    invoke-interface {p2, v0, v9}, Landroid/content/SharedPreferences;->getInt(Ljava/lang/String;I)I

    move-result v10

    const-string v0, "last_fail_notice_ms"

    const-wide/16 v1, 0x0

    .line 247
    invoke-interface {p2, v0, v1, v2}, Landroid/content/SharedPreferences;->getLong(Ljava/lang/String;J)J

    move-result-wide v3

    .line 249
    invoke-static {}, Ljava/lang/System;->currentTimeMillis()J

    move-result-wide v5

    move v0, v7

    move v1, v8

    move v2, v10

    .line 248
    invoke-static/range {v0 .. v6}, Lcom/rphub/app/OfficialUpdateWatcher;->shouldNotifyPromoteFailure(IIIJJ)Z

    move-result v0

    const-string v1, "RPHubOfficial"

    if-nez v0, :cond_0

    .line 250
    new-instance p0, Ljava/lang/StringBuilder;

    const-string p1, "promote failure notice skipped (streak="

    invoke-direct {p0, p1}, Ljava/lang/StringBuilder;-><init>(Ljava/lang/String;)V

    invoke-virtual {p0, v7}, Ljava/lang/StringBuilder;->append(I)Ljava/lang/StringBuilder;

    const-string p1, " suppressed="

    .line 251
    invoke-virtual {p0, p1}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    invoke-virtual {p0, v10}, Ljava/lang/StringBuilder;->append(I)Ljava/lang/StringBuilder;

    const-string p1, " versionCode="

    invoke-virtual {p0, p1}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    invoke-virtual {p0, v8}, Ljava/lang/StringBuilder;->append(I)Ljava/lang/StringBuilder;

    const-string p1, ")"

    invoke-virtual {p0, p1}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    invoke-virtual {p0}, Ljava/lang/StringBuilder;->toString()Ljava/lang/String;

    move-result-object p0

    .line 250
    invoke-static {v1, p0}, Landroid/util/Log;->i(Ljava/lang/String;Ljava/lang/String;)I

    return v9

    .line 255
    :cond_0
    invoke-static {p1}, Lcom/rphub/app/PatchEngine;->getPromoteFailNote(Landroid/content/Context;)Ljava/lang/String;

    move-result-object v0

    const-string v2, ""

    if-nez v0, :cond_1

    move-object v0, v2

    .line 257
    :cond_1
    invoke-virtual {v0}, Ljava/lang/String;->trim()Ljava/lang/String;

    move-result-object v0

    .line 258
    invoke-virtual {v0}, Ljava/lang/String;->length()I

    move-result v3

    const/16 v4, 0xdc

    if-le v3, v4, :cond_2

    new-instance v3, Ljava/lang/StringBuilder;

    invoke-virtual {v0, v9, v4}, Ljava/lang/String;->substring(II)Ljava/lang/String;

    move-result-object v0

    invoke-static {v0}, Ljava/lang/String;->valueOf(Ljava/lang/Object;)Ljava/lang/String;

    move-result-object v0

    invoke-direct {v3, v0}, Ljava/lang/StringBuilder;-><init>(Ljava/lang/String;)V

    const-string v0, "\u2026"

    invoke-virtual {v3, v0}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    invoke-virtual {v3}, Ljava/lang/StringBuilder;->toString()Ljava/lang/String;

    move-result-object v0

    .line 260
    :cond_2
    new-instance v3, Ljava/lang/StringBuilder;

    const-string v4, "\u5b98\u7f51\u5185\u5bb9\u5df2\u7ecf\u53d8\u4e86\uff0c\u4f46\u672c\u7248 App \u7684\u9002\u914d\u89c4\u5219\u5bf9\u4e0d\u4e0a\uff08\u5df2\u8fde\u7eed "

    invoke-direct {v3, v4}, Ljava/lang/StringBuilder;-><init>(Ljava/lang/String;)V

    .line 261
    invoke-virtual {v3, v7}, Ljava/lang/StringBuilder;->append(I)Ljava/lang/StringBuilder;

    const-string v4, " \u6b21\u5c1d\u8bd5\u63d0\u5347\u90fd\u5931\u8d25\uff09\u3002\n\n"

    invoke-virtual {v3, v4}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    const-string v4, "\u5f53\u524d\u663e\u793a\u7684\u662f App \u5185\u7f6e\u7684\u65e7\u7248\u5185\u5bb9\uff0c\u6240\u4ee5\u754c\u9762\u548c\u529f\u80fd\u53ef\u80fd\u4e0e\u5b98\u7f51\u4e0d\u4e00\u81f4\u3002\n\n"

    .line 262
    invoke-virtual {v3, v4}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    .line 263
    invoke-virtual {v0}, Ljava/lang/String;->length()I

    move-result v4

    if-nez v4, :cond_3

    goto :goto_0

    :cond_3
    new-instance v2, Ljava/lang/StringBuilder;

    const-string v4, "\u6700\u8fd1\u4e00\u6b21\u5931\u8d25\u539f\u56e0\uff1a\n"

    invoke-direct {v2, v4}, Ljava/lang/StringBuilder;-><init>(Ljava/lang/String;)V

    invoke-virtual {v2, v0}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    const-string v0, "\n\n"

    invoke-virtual {v2, v0}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    invoke-virtual {v2}, Ljava/lang/StringBuilder;->toString()Ljava/lang/String;

    move-result-object v2

    :goto_0
    invoke-virtual {v3, v2}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    const-string v0, "\u5efa\u8bae\u5b89\u88c5\u65b0\u7248\u672c App\u3002"

    .line 264
    invoke-virtual {v3, v0}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    .line 260
    invoke-virtual {v3}, Ljava/lang/StringBuilder;->toString()Ljava/lang/String;

    move-result-object v2

    .line 266
    new-instance v0, Ljava/lang/StringBuilder;

    const-string v3, "promote failure streak="

    invoke-direct {v0, v3}, Ljava/lang/StringBuilder;-><init>(Ljava/lang/String;)V

    invoke-virtual {v0, v7}, Ljava/lang/StringBuilder;->append(I)Ljava/lang/StringBuilder;

    const-string v3, " \u21d2 notify user"

    invoke-virtual {v0, v3}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    invoke-virtual {v0}, Ljava/lang/StringBuilder;->toString()Ljava/lang/String;

    move-result-object v0

    invoke-static {v1, v0}, Landroid/util/Log;->i(Ljava/lang/String;Ljava/lang/String;)I

    .line 268
    new-instance v7, Lcom/rphub/app/OfficialUpdateWatcher$2;

    move-object v0, v7

    move-object v1, p0

    move-object v3, p1

    move-object v4, p3

    move-object v5, p2

    move v6, v8

    invoke-direct/range {v0 .. v6}, Lcom/rphub/app/OfficialUpdateWatcher$2;-><init>(Landroid/app/Activity;Ljava/lang/String;Landroid/content/Context;Landroid/webkit/WebView;Landroid/content/SharedPreferences;I)V

    invoke-virtual {p0, v7}, Landroid/app/Activity;->runOnUiThread(Ljava/lang/Runnable;)V

    const/4 p0, 0x1

    return p0
.end method

.method private static readSeedAnnouncementId(Landroid/content/Context;)I
    .locals 4

    const/4 v0, 0x0

    .line 586
    :try_start_0
    invoke-virtual {p0}, Landroid/content/Context;->getAssets()Landroid/content/res/AssetManager;

    move-result-object p0

    const-string v1, "patch-seed/built-in-content.js"

    invoke-virtual {p0, v1}, Landroid/content/res/AssetManager;->open(Ljava/lang/String;)Ljava/io/InputStream;

    move-result-object v0

    .line 587
    new-instance p0, Ljava/io/ByteArrayOutputStream;

    invoke-direct {p0}, Ljava/io/ByteArrayOutputStream;-><init>()V

    const/16 v1, 0x2000

    new-array v1, v1, [B

    .line 590
    :goto_0
    invoke-virtual {v0, v1}, Ljava/io/InputStream;->read([B)I

    move-result v2

    if-gtz v2, :cond_1

    const-string v1, "UTF-8"

    .line 593
    invoke-virtual {p0, v1}, Ljava/io/ByteArrayOutputStream;->toString(Ljava/lang/String;)Ljava/lang/String;

    move-result-object p0

    invoke-static {p0}, Lcom/rphub/app/OfficialUpdateWatcher;->extractAnnouncementId(Ljava/lang/String;)I

    move-result p0
    :try_end_0
    .catchall {:try_start_0 .. :try_end_0} :catchall_1

    if-eqz v0, :cond_0

    .line 600
    :try_start_1
    invoke-virtual {v0}, Ljava/io/InputStream;->close()V
    :try_end_1
    .catchall {:try_start_1 .. :try_end_1} :catchall_0

    :catchall_0
    :cond_0
    return p0

    :cond_1
    const/4 v3, 0x0

    .line 591
    :try_start_2
    invoke-virtual {p0, v1, v3, v2}, Ljava/io/ByteArrayOutputStream;->write([BII)V
    :try_end_2
    .catchall {:try_start_2 .. :try_end_2} :catchall_1

    goto :goto_0

    :catchall_1
    move-exception p0

    :try_start_3
    const-string v1, "RPHubOfficial"

    const-string v2, "read seed announcement failed"

    .line 595
    invoke-static {v1, v2, p0}, Landroid/util/Log;->w(Ljava/lang/String;Ljava/lang/String;Ljava/lang/Throwable;)I
    :try_end_3
    .catchall {:try_start_3 .. :try_end_3} :catchall_3

    if-eqz v0, :cond_2

    .line 600
    :try_start_4
    invoke-virtual {v0}, Ljava/io/InputStream;->close()V
    :try_end_4
    .catchall {:try_start_4 .. :try_end_4} :catchall_2

    :catchall_2
    :cond_2
    const/4 p0, -0x1

    return p0

    :catchall_3
    move-exception p0

    if-eqz v0, :cond_3

    :try_start_5
    invoke-virtual {v0}, Ljava/io/InputStream;->close()V
    :try_end_5
    .catchall {:try_start_5 .. :try_end_5} :catchall_4

    .line 604
    :catchall_4
    :cond_3
    goto :goto_2

    :goto_1
    throw p0

    :goto_2
    goto :goto_1
.end method

.method private static runCheck(Landroid/app/Activity;Landroid/content/Context;Landroid/webkit/WebView;)V
    .locals 11

    const-string v0, "rphub_official_update"

    const/4 v1, 0x0

    .line 181
    invoke-virtual {p1, v0, v1}, Landroid/content/Context;->getSharedPreferences(Ljava/lang/String;I)Landroid/content/SharedPreferences;

    move-result-object v5

    .line 186
    invoke-static {p0, p1, v5, p2}, Lcom/rphub/app/OfficialUpdateWatcher;->notifyPromoteFailure(Landroid/app/Activity;Landroid/content/Context;Landroid/content/SharedPreferences;Landroid/webkit/WebView;)Z

    move-result v0

    if-eqz v0, :cond_0

    return-void

    .line 191
    :cond_0
    invoke-static {}, Ljava/lang/System;->currentTimeMillis()J

    move-result-wide v2

    const-string v0, "last_check_ms"

    const-wide/16 v6, 0x0

    .line 193
    invoke-interface {v5, v0, v6, v7}, Landroid/content/SharedPreferences;->getLong(Ljava/lang/String;J)J

    move-result-wide v8

    const-string v4, "RPHubOfficial"

    cmp-long v10, v8, v6

    if-lez v10, :cond_1

    sub-long v6, v2, v8

    const-wide/32 v8, 0x1499700

    cmp-long v10, v6, v8

    if-gez v10, :cond_1

    .line 195
    new-instance p0, Ljava/lang/StringBuilder;

    const-string p1, "skip: checked "

    invoke-direct {p0, p1}, Ljava/lang/StringBuilder;-><init>(Ljava/lang/String;)V

    const-wide/32 p1, 0xea60

    div-long/2addr v6, p1

    invoke-virtual {p0, v6, v7}, Ljava/lang/StringBuilder;->append(J)Ljava/lang/StringBuilder;

    const-string p1, " min ago"

    invoke-virtual {p0, p1}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    invoke-virtual {p0}, Ljava/lang/StringBuilder;->toString()Ljava/lang/String;

    move-result-object p0

    invoke-static {v4, p0}, Landroid/util/Log;->i(Ljava/lang/String;Ljava/lang/String;)I

    return-void

    .line 199
    :cond_1
    invoke-static {p1}, Lcom/rphub/app/OfficialUpdateWatcher;->readSeedAnnouncementId(Landroid/content/Context;)I

    move-result v6

    if-gtz v6, :cond_2

    const-string p0, "skip: cannot parse seed announcement id"

    .line 201
    invoke-static {v4, p0}, Landroid/util/Log;->i(Ljava/lang/String;Ljava/lang/String;)I

    return-void

    .line 205
    :cond_2
    invoke-static {}, Lcom/rphub/app/OfficialUpdateWatcher;->fetchRemote()Lcom/rphub/app/OfficialUpdateWatcher$RemoteAnnouncement;

    move-result-object v7

    .line 207
    invoke-interface {v5}, Landroid/content/SharedPreferences;->edit()Landroid/content/SharedPreferences$Editor;

    move-result-object v8

    invoke-interface {v8, v0, v2, v3}, Landroid/content/SharedPreferences$Editor;->putLong(Ljava/lang/String;J)Landroid/content/SharedPreferences$Editor;

    move-result-object v0

    invoke-interface {v0}, Landroid/content/SharedPreferences$Editor;->apply()V

    if-eqz v7, :cond_6

    .line 209
    iget v0, v7, Lcom/rphub/app/OfficialUpdateWatcher$RemoteAnnouncement;->id:I

    if-gtz v0, :cond_3

    goto :goto_0

    .line 213
    :cond_3
    iget v0, v7, Lcom/rphub/app/OfficialUpdateWatcher$RemoteAnnouncement;->id:I

    const-string v2, " local="

    if-gt v0, v6, :cond_4

    .line 214
    new-instance p0, Ljava/lang/StringBuilder;

    const-string p1, "up to date: remote="

    invoke-direct {p0, p1}, Ljava/lang/StringBuilder;-><init>(Ljava/lang/String;)V

    iget p1, v7, Lcom/rphub/app/OfficialUpdateWatcher$RemoteAnnouncement;->id:I

    invoke-virtual {p0, p1}, Ljava/lang/StringBuilder;->append(I)Ljava/lang/StringBuilder;

    invoke-virtual {p0, v2}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    invoke-virtual {p0, v6}, Ljava/lang/StringBuilder;->append(I)Ljava/lang/StringBuilder;

    invoke-virtual {p0}, Ljava/lang/StringBuilder;->toString()Ljava/lang/String;

    move-result-object p0

    invoke-static {v4, p0}, Landroid/util/Log;->i(Ljava/lang/String;Ljava/lang/String;)I

    return-void

    :cond_4
    const-string v0, "last_notified_id"

    .line 218
    invoke-interface {v5, v0, v1}, Landroid/content/SharedPreferences;->getInt(Ljava/lang/String;I)I

    move-result v0

    .line 219
    iget v1, v7, Lcom/rphub/app/OfficialUpdateWatcher$RemoteAnnouncement;->id:I

    if-gt v1, v0, :cond_5

    .line 220
    new-instance p0, Ljava/lang/StringBuilder;

    const-string p1, "already notified for "

    invoke-direct {p0, p1}, Ljava/lang/StringBuilder;-><init>(Ljava/lang/String;)V

    iget p1, v7, Lcom/rphub/app/OfficialUpdateWatcher$RemoteAnnouncement;->id:I

    invoke-virtual {p0, p1}, Ljava/lang/StringBuilder;->append(I)Ljava/lang/StringBuilder;

    invoke-virtual {p0}, Ljava/lang/StringBuilder;->toString()Ljava/lang/String;

    move-result-object p0

    invoke-static {v4, p0}, Landroid/util/Log;->i(Ljava/lang/String;Ljava/lang/String;)I

    return-void

    .line 224
    :cond_5
    new-instance v0, Ljava/lang/StringBuilder;

    const-string v1, "official announcement newer: remote="

    invoke-direct {v0, v1}, Ljava/lang/StringBuilder;-><init>(Ljava/lang/String;)V

    iget v1, v7, Lcom/rphub/app/OfficialUpdateWatcher$RemoteAnnouncement;->id:I

    invoke-virtual {v0, v1}, Ljava/lang/StringBuilder;->append(I)Ljava/lang/StringBuilder;

    invoke-virtual {v0, v2}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    invoke-virtual {v0, v6}, Ljava/lang/StringBuilder;->append(I)Ljava/lang/StringBuilder;

    const-string v1, " updatedAt="

    .line 225
    invoke-virtual {v0, v1}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    iget-object v1, v7, Lcom/rphub/app/OfficialUpdateWatcher$RemoteAnnouncement;->updatedAt:Ljava/lang/String;

    invoke-virtual {v0, v1}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    invoke-virtual {v0}, Ljava/lang/StringBuilder;->toString()Ljava/lang/String;

    move-result-object v0

    .line 224
    invoke-static {v4, v0}, Landroid/util/Log;->i(Ljava/lang/String;Ljava/lang/String;)I

    move-object v2, p0

    move-object v3, p1

    move-object v4, p2

    .line 226
    invoke-static/range {v2 .. v7}, Lcom/rphub/app/OfficialUpdateWatcher;->showDialog(Landroid/app/Activity;Landroid/content/Context;Landroid/webkit/WebView;Landroid/content/SharedPreferences;ILcom/rphub/app/OfficialUpdateWatcher$RemoteAnnouncement;)V

    return-void

    :cond_6
    :goto_0
    const-string p0, "skip: remote announcement unavailable"

    .line 210
    invoke-static {v4, p0}, Landroid/util/Log;->i(Ljava/lang/String;Ljava/lang/String;)I

    return-void
.end method

.method static shouldNotifyPromoteFailure(IIIJJ)Z
    .locals 2

    const/4 v0, 0x0

    const/4 v1, 0x3

    if-ge p0, v1, :cond_0

    return v0

    :cond_0
    if-eqz p1, :cond_1

    if-ne p2, p1, :cond_1

    return v0

    :cond_1
    const-wide/16 p0, 0x0

    cmp-long p2, p3, p0

    if-lez p2, :cond_2

    sub-long/2addr p5, p3

    const-wide/32 p0, 0x5265c00

    cmp-long p2, p5, p0

    if-gez p2, :cond_2

    return v0

    :cond_2
    const/4 p0, 0x1

    return p0
.end method

.method private static showDialog(Landroid/app/Activity;Landroid/content/Context;Landroid/webkit/WebView;Landroid/content/SharedPreferences;ILcom/rphub/app/OfficialUpdateWatcher$RemoteAnnouncement;)V
    .locals 10

    .line 362
    invoke-static {}, Lcom/rphub/app/PatchEngine;->getActiveGeneration()I

    move-result v0

    if-lez v0, :cond_0

    const/4 v0, 0x1

    const/4 v5, 0x1

    goto :goto_0

    :cond_0
    const/4 v0, 0x0

    const/4 v5, 0x0

    .line 364
    :goto_0
    new-instance v0, Ljava/lang/StringBuilder;

    invoke-direct {v0}, Ljava/lang/StringBuilder;-><init>()V

    const-string v1, "\u5b98\u7f51\u516c\u544a\u5df2\u66f4\u65b0\uff08\u7248\u672c\u53f7 "

    .line 365
    invoke-virtual {v0, v1}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    iget v1, p5, Lcom/rphub/app/OfficialUpdateWatcher$RemoteAnnouncement;->id:I

    invoke-virtual {v0, v1}, Ljava/lang/StringBuilder;->append(I)Ljava/lang/StringBuilder;

    const-string v1, "\uff09"

    invoke-virtual {v0, v1}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    .line 366
    iget-object v1, p5, Lcom/rphub/app/OfficialUpdateWatcher$RemoteAnnouncement;->updatedAt:Ljava/lang/String;

    if-eqz v1, :cond_1

    iget-object v1, p5, Lcom/rphub/app/OfficialUpdateWatcher$RemoteAnnouncement;->updatedAt:Ljava/lang/String;

    invoke-virtual {v1}, Ljava/lang/String;->length()I

    move-result v1

    if-lez v1, :cond_1

    const-string v1, "\n\u66f4\u65b0\u65f6\u95f4\uff1a"

    .line 367
    invoke-virtual {v0, v1}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    iget-object v1, p5, Lcom/rphub/app/OfficialUpdateWatcher$RemoteAnnouncement;->updatedAt:Ljava/lang/String;

    invoke-virtual {v0, v1}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    :cond_1
    const-string v1, "\n\n"

    .line 369
    invoke-virtual {v0, v1}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    if-eqz v5, :cond_2

    const-string p4, "\u70b9\u300c\u7acb\u5373\u91cd\u8f7d\u300d\u5373\u53ef\u8f7d\u5165\u5b98\u7f51\u6700\u65b0\u5185\u5bb9\u3002"

    .line 371
    invoke-virtual {v0, p4}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    goto :goto_1

    :cond_2
    const-string v1, "\u5f53\u524d\u6b63\u5728\u4f7f\u7528 App \u5185\u7f6e\u7684\u65e7\u7248\u5185\u5bb9\uff08\u7248\u672c\u53f7 "

    .line 373
    invoke-virtual {v0, v1}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    invoke-virtual {v0, p4}, Ljava/lang/StringBuilder;->append(I)Ljava/lang/StringBuilder;

    const-string p4, "\uff09\u3002\n"

    invoke-virtual {v0, p4}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    const-string p4, "\u70b9\u300c\u91cd\u8bd5\u52a0\u8f7d\u300d\u4f1a\u6e05\u6389\u672c\u5730\u7f13\u5b58\u5e76\u91cd\u65b0\u62c9\u53d6\u5b98\u7f51\uff1b"

    .line 374
    invoke-virtual {v0, p4}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    const-string p4, "\u5982\u679c\u91cd\u8bd5\u540e\u4ecd\u770b\u4e0d\u5230\u65b0\u5185\u5bb9\uff0c\u8bf4\u660e\u8fd9\u6b21\u5b98\u7f51\u6539\u52a8\u8f83\u5927\uff0c\u9700\u8981\u5b89\u88c5\u65b0\u7248\u672c App\u3002"

    .line 375
    invoke-virtual {v0, p4}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    .line 377
    :goto_1
    invoke-virtual {v0}, Ljava/lang/StringBuilder;->toString()Ljava/lang/String;

    move-result-object v3

    if-eqz v5, :cond_3

    const-string p4, "\u7acb\u5373\u91cd\u8f7d"

    goto :goto_2

    :cond_3
    const-string p4, "\u91cd\u8bd5\u52a0\u8f7d"

    :goto_2
    move-object v4, p4

    .line 380
    new-instance p4, Lcom/rphub/app/OfficialUpdateWatcher$3;

    move-object v1, p4

    move-object v2, p0

    move-object v6, p1

    move-object v7, p2

    move-object v8, p3

    move-object v9, p5

    invoke-direct/range {v1 .. v9}, Lcom/rphub/app/OfficialUpdateWatcher$3;-><init>(Landroid/app/Activity;Ljava/lang/String;Ljava/lang/String;ZLandroid/content/Context;Landroid/webkit/WebView;Landroid/content/SharedPreferences;Lcom/rphub/app/OfficialUpdateWatcher$RemoteAnnouncement;)V

    invoke-virtual {p0, p4}, Landroid/app/Activity;->runOnUiThread(Ljava/lang/Runnable;)V

    return-void
.end method
