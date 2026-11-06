.class public final Lcom/rphub/app/PatchEngine;
.super Ljava/lang/Object;
.source "PatchEngine.java"


# annotations
.annotation system Ldalvik/annotation/MemberClasses;
    value = {
        Lcom/rphub/app/PatchEngine$PatchOutcome;
    }
.end annotation


# static fields
.field private static final APP_JS_CONSUMES:[Ljava/lang/String;

.field private static final BOOT_CHAIN_FILES:[Ljava/lang/String;

.field private static final BOOT_CHAIN_PROVIDES:Ljava/util/Map;
    .annotation system Ldalvik/annotation/Signature;
        value = {
            "Ljava/util/Map<",
            "Ljava/lang/String;",
            "[",
            "Ljava/lang/String;",
            ">;"
        }
    .end annotation
.end field

.field private static final BOOT_MODULE_ITEM_RE:Ljava/util/regex/Pattern;

.field private static final BOOT_MODULE_LIST_RE:Ljava/util/regex/Pattern;

.field private static final CONTENT_CONNECT_TIMEOUT_MS:I = 0x3e8

.field private static final CONTENT_READ_TIMEOUT_MS:I = 0x5dc

.field private static final CROSS_FILE_CONTRACTS:Ljava/util/Map;
    .annotation system Ldalvik/annotation/Signature;
        value = {
            "Ljava/util/Map<",
            "Ljava/lang/String;",
            "[",
            "Ljava/lang/String;",
            ">;"
        }
    .end annotation
.end field

.field private static final FAIL_STALE_MS:J = 0x240c8400L

.field private static final GENERATION_LOCK:Ljava/lang/Object;

.field private static final GENERATION_MARKER:Ljava/lang/String; = ".generation"

.field private static final HTML_COMMENT_RE:Ljava/util/regex/Pattern;

.field private static final HTML_SCRIPT_RE:Ljava/util/regex/Pattern;

.field private static final HTML_STYLE_RE:Ljava/util/regex/Pattern;

.field private static final HTML_TAG_RE:Ljava/util/regex/Pattern;

.field private static final HTML_VOID_TAGS:Ljava/util/Set;
    .annotation system Ldalvik/annotation/Signature;
        value = {
            "Ljava/util/Set<",
            "Ljava/lang/String;",
            ">;"
        }
    .end annotation
.end field

.field private static final KEY_FAIL_AT:Ljava/lang/String; = "fail_at"

.field private static final KEY_FAIL_NOTE:Ljava/lang/String; = "fail_note"

.field private static final KEY_FAIL_STREAK:Ljava/lang/String; = "fail_streak"

.field private static final KEY_STREAK_VERSION:Ljava/lang/String; = "streak_version_code"

.field private static final MAX_MISSING_ANCHORS:I = 0x3

.field private static final PATCHED_CACHE:Ljava/util/concurrent/ConcurrentHashMap;
    .annotation system Ldalvik/annotation/Signature;
        value = {
            "Ljava/util/concurrent/ConcurrentHashMap<",
            "Ljava/lang/String;",
            "Ljava/lang/String;",
            ">;"
        }
    .end annotation
.end field

.field private static final PLAZA_SCRIPT_LOCK:Ljava/lang/Object;

.field private static final PLAZA_SCRIPT_URL:Ljava/lang/String; = "https://rphforum.zeabur.app/theme.js"

.field private static final PROMOTE_PREFS:Ljava/lang/String; = "rphub_promote_health"

.field private static final RAW_CACHE:Ljava/util/concurrent/ConcurrentHashMap;
    .annotation system Ldalvik/annotation/Signature;
        value = {
            "Ljava/util/concurrent/ConcurrentHashMap<",
            "Ljava/lang/String;",
            "Ljava/lang/String;",
            ">;"
        }
    .end annotation
.end field

.field private static final REFRESH_ATTEMPTS:Ljava/util/concurrent/ConcurrentHashMap;
    .annotation system Ldalvik/annotation/Signature;
        value = {
            "Ljava/util/concurrent/ConcurrentHashMap<",
            "Ljava/lang/String;",
            "Ljava/lang/Long;",
            ">;"
        }
    .end annotation
.end field

.field private static final REFRESH_EXECUTOR:Ljava/util/concurrent/ExecutorService;

.field private static final REFRESH_INTERVAL_MS:J = 0x493e0L

.field private static final REJECTED_LIMIT:I = 0x14

.field private static final REJECTED_MARKER:Ljava/lang/String; = ".rejected"

.field private static final SEED_MISS_BASELINE:Ljava/util/concurrent/ConcurrentHashMap;
    .annotation system Ldalvik/annotation/Signature;
        value = {
            "Ljava/util/concurrent/ConcurrentHashMap<",
            "Ljava/lang/String;",
            "Ljava/lang/Integer;",
            ">;"
        }
    .end annotation
.end field

.field private static final SITE_PREFIX:Ljava/lang/String; = "https://sta1n156.github.io/RP-Hub"

.field private static final STAGED:Ljava/util/concurrent/ConcurrentHashMap;
    .annotation system Ldalvik/annotation/Signature;
        value = {
            "Ljava/util/concurrent/ConcurrentHashMap<",
            "Ljava/lang/String;",
            "Ljava/lang/String;",
            ">;"
        }
    .end annotation
.end field

.field private static final TAG:Ljava/lang/String; = "RPHubPatch"

.field private static volatile activeGeneration:I

.field private static volatile downloadHookSource:Ljava/lang/String;

.field private static volatile generationSerial:I

.field private static manifest:Lorg/json/JSONObject;

.field private static volatile pageGeneration:I

.field private static volatile plazaScriptFailedAt:J

.field private static volatile plazaScriptFetchedAt:J

.field private static volatile plazaScriptRaw:Ljava/lang/String;

.field private static volatile safeModeDirect:Z


# direct methods
.method static constructor <clinit>()V
    .locals 22

    const/4 v0, 0x2

    .line 71
    invoke-static {v0}, Ljava/util/concurrent/Executors;->newFixedThreadPool(I)Ljava/util/concurrent/ExecutorService;

    move-result-object v1

    sput-object v1, Lcom/rphub/app/PatchEngine;->REFRESH_EXECUTOR:Ljava/util/concurrent/ExecutorService;

    .line 72
    new-instance v1, Ljava/util/concurrent/ConcurrentHashMap;

    invoke-direct {v1}, Ljava/util/concurrent/ConcurrentHashMap;-><init>()V

    sput-object v1, Lcom/rphub/app/PatchEngine;->REFRESH_ATTEMPTS:Ljava/util/concurrent/ConcurrentHashMap;

    .line 75
    new-instance v1, Ljava/util/concurrent/ConcurrentHashMap;

    invoke-direct {v1}, Ljava/util/concurrent/ConcurrentHashMap;-><init>()V

    sput-object v1, Lcom/rphub/app/PatchEngine;->PATCHED_CACHE:Ljava/util/concurrent/ConcurrentHashMap;

    .line 104
    new-instance v1, Ljava/util/concurrent/ConcurrentHashMap;

    invoke-direct {v1}, Ljava/util/concurrent/ConcurrentHashMap;-><init>()V

    sput-object v1, Lcom/rphub/app/PatchEngine;->STAGED:Ljava/util/concurrent/ConcurrentHashMap;

    .line 105
    new-instance v1, Ljava/lang/Object;

    invoke-direct {v1}, Ljava/lang/Object;-><init>()V

    sput-object v1, Lcom/rphub/app/PatchEngine;->GENERATION_LOCK:Ljava/lang/Object;

    const/4 v1, 0x0

    .line 107
    sput v1, Lcom/rphub/app/PatchEngine;->activeGeneration:I

    .line 108
    sput v1, Lcom/rphub/app/PatchEngine;->generationSerial:I

    .line 111
    sput-boolean v1, Lcom/rphub/app/PatchEngine;->safeModeDirect:Z

    .line 128
    new-instance v2, Ljava/lang/Object;

    invoke-direct {v2}, Ljava/lang/Object;-><init>()V

    sput-object v2, Lcom/rphub/app/PatchEngine;->PLAZA_SCRIPT_LOCK:Ljava/lang/Object;

    const/4 v2, 0x0

    .line 129
    sput-object v2, Lcom/rphub/app/PatchEngine;->plazaScriptRaw:Ljava/lang/String;

    const-wide/16 v3, 0x0

    .line 130
    sput-wide v3, Lcom/rphub/app/PatchEngine;->plazaScriptFetchedAt:J

    .line 131
    sput-wide v3, Lcom/rphub/app/PatchEngine;->plazaScriptFailedAt:J

    .line 132
    sput-object v2, Lcom/rphub/app/PatchEngine;->downloadHookSource:Ljava/lang/String;

    .line 153
    new-instance v2, Ljava/util/concurrent/ConcurrentHashMap;

    invoke-direct {v2}, Ljava/util/concurrent/ConcurrentHashMap;-><init>()V

    sput-object v2, Lcom/rphub/app/PatchEngine;->RAW_CACHE:Ljava/util/concurrent/ConcurrentHashMap;

    .line 173
    sput v1, Lcom/rphub/app/PatchEngine;->pageGeneration:I

    const/16 v2, 0xa

    new-array v3, v2, [Ljava/lang/String;

    const-string v4, "index.html"

    aput-object v4, v3, v1

    const-string v4, "built-in-content.js"

    const/4 v5, 0x1

    aput-object v4, v3, v5

    const-string v4, "core-utils.js"

    aput-object v4, v3, v0

    const-string v4, "api-utils.js"

    const/4 v6, 0x3

    aput-object v4, v3, v6

    const-string v4, "data-services.js"

    const/4 v7, 0x4

    aput-object v4, v3, v7

    const-string v4, "runtime-services.js"

    const/4 v8, 0x5

    aput-object v4, v3, v8

    const-string v4, "cloud-backup.js"

    const/4 v9, 0x6

    aput-object v4, v3, v9

    const-string v4, "update-check.js"

    const/4 v10, 0x7

    aput-object v4, v3, v10

    const-string v4, "ui-components.js"

    const/16 v11, 0x8

    aput-object v4, v3, v11

    const-string v4, "app.js"

    const/16 v12, 0x9

    aput-object v4, v3, v12

    .line 990
    sput-object v3, Lcom/rphub/app/PatchEngine;->BOOT_CHAIN_FILES:[Ljava/lang/String;

    .line 1491
    invoke-static {}, Lcom/rphub/app/PatchEngine;->buildCrossFileContracts()Ljava/util/Map;

    move-result-object v3

    sput-object v3, Lcom/rphub/app/PatchEngine;->CROSS_FILE_CONTRACTS:Ljava/util/Map;

    const-string v3, "\\[([^\\[\\]]{0,2000}?)\\]\\s*\\.\\s*forEach\\s*\\("

    .line 1645
    invoke-static {v3}, Ljava/util/regex/Pattern;->compile(Ljava/lang/String;)Ljava/util/regex/Pattern;

    move-result-object v3

    .line 1644
    sput-object v3, Lcom/rphub/app/PatchEngine;->BOOT_MODULE_LIST_RE:Ljava/util/regex/Pattern;

    const-string v3, "[\'\"]([A-Za-z0-9_\\-]+)[\'\"]"

    .line 1649
    invoke-static {v3}, Ljava/util/regex/Pattern;->compile(Ljava/lang/String;)Ljava/util/regex/Pattern;

    move-result-object v3

    .line 1648
    sput-object v3, Lcom/rphub/app/PatchEngine;->BOOT_MODULE_ITEM_RE:Ljava/util/regex/Pattern;

    const/16 v3, 0x12

    new-array v4, v3, [Ljava/lang/String;

    const-string v13, "window.RPHubComposables"

    aput-object v13, v4, v1

    const-string v13, "window.RPHubMessageRenderer"

    aput-object v13, v4, v5

    const-string v13, "window.RPHubLayoutComponents"

    aput-object v13, v4, v0

    const-string v13, "window.RPHubApiClient"

    aput-object v13, v4, v6

    const-string v13, "window.RPHubApiUtils"

    aput-object v13, v4, v7

    const-string v13, "window.RPHubComponents"

    aput-object v13, v4, v8

    const-string v13, "window.RPHubUtils"

    aput-object v13, v4, v9

    const-string v13, "window.RPHubMemoryUtils"

    aput-object v13, v4, v10

    const-string v13, "window.RPHubContextUtils"

    aput-object v13, v4, v11

    const-string v13, "window.RPHubStoryBranches"

    aput-object v13, v4, v12

    const-string v13, "window.RPHubBuiltinPresets"

    aput-object v13, v4, v2

    const-string v13, "window.RPHubUiTemplateUtils"

    const/16 v14, 0xb

    aput-object v13, v4, v14

    const-string v13, "window.RPHubStorage"

    const/16 v15, 0xc

    aput-object v13, v4, v15

    const-string v13, "window.RPHubBuiltinContent"

    const/16 v16, 0xd

    aput-object v13, v4, v16

    const-string v13, "window.RPHubConfig"

    const/16 v17, 0xe

    aput-object v13, v4, v17

    const-string v13, "window.RPHubCustomSelect"

    const/16 v18, 0xf

    aput-object v13, v4, v18

    const-string v13, "window.RPHubCardUtils"

    const/16 v19, 0x10

    aput-object v13, v4, v19

    const-string v13, "window.RPHubCloudBackup"

    const/16 v20, 0x11

    aput-object v13, v4, v20

    .line 1676
    sput-object v4, Lcom/rphub/app/PatchEngine;->APP_JS_CONSUMES:[Ljava/lang/String;

    .line 1700
    invoke-static {}, Lcom/rphub/app/PatchEngine;->buildBootChainProvides()Ljava/util/Map;

    move-result-object v4

    sput-object v4, Lcom/rphub/app/PatchEngine;->BOOT_CHAIN_PROVIDES:Ljava/util/Map;

    .line 1825
    new-instance v4, Ljava/util/concurrent/ConcurrentHashMap;

    invoke-direct {v4}, Ljava/util/concurrent/ConcurrentHashMap;-><init>()V

    sput-object v4, Lcom/rphub/app/PatchEngine;->SEED_MISS_BASELINE:Ljava/util/concurrent/ConcurrentHashMap;

    .line 2089
    new-instance v4, Ljava/util/HashSet;

    const/16 v13, 0x1b

    new-array v13, v13, [Ljava/lang/String;

    const-string v21, "area"

    aput-object v21, v13, v1

    const-string v1, "base"

    aput-object v1, v13, v5

    const-string v1, "br"

    aput-object v1, v13, v0

    const-string v1, "col"

    aput-object v1, v13, v6

    const-string v1, "embed"

    aput-object v1, v13, v7

    const-string v1, "hr"

    aput-object v1, v13, v8

    const-string v1, "img"

    aput-object v1, v13, v9

    const-string v1, "input"

    aput-object v1, v13, v10

    const-string v1, "link"

    aput-object v1, v13, v11

    const-string v1, "meta"

    aput-object v1, v13, v12

    const-string v1, "param"

    aput-object v1, v13, v2

    const-string v1, "source"

    aput-object v1, v13, v14

    const-string v1, "track"

    aput-object v1, v13, v15

    const-string v1, "wbr"

    aput-object v1, v13, v16

    const-string v1, "path"

    aput-object v1, v13, v17

    const-string v1, "circle"

    aput-object v1, v13, v18

    const-string v1, "rect"

    aput-object v1, v13, v19

    const-string v1, "line"

    aput-object v1, v13, v20

    const-string v1, "polyline"

    aput-object v1, v13, v3

    const/16 v1, 0x13

    const-string v2, "polygon"

    aput-object v2, v13, v1

    const/16 v1, 0x14

    const-string v2, "use"

    aput-object v2, v13, v1

    const/16 v1, 0x15

    const-string v2, "stop"

    aput-object v2, v13, v1

    const/16 v1, 0x16

    const-string v2, "symbol"

    aput-object v2, v13, v1

    const/16 v1, 0x17

    const-string v2, "ellipse"

    aput-object v2, v13, v1

    const/16 v1, 0x18

    const-string v2, "image"

    aput-object v2, v13, v1

    const/16 v1, 0x19

    const-string v2, "animate"

    aput-object v2, v13, v1

    const/16 v1, 0x1a

    const-string v2, "animatetransform"

    aput-object v2, v13, v1

    invoke-static {v13}, Ljava/util/Arrays;->asList([Ljava/lang/Object;)Ljava/util/List;

    move-result-object v1

    invoke-direct {v4, v1}, Ljava/util/HashSet;-><init>(Ljava/util/Collection;)V

    sput-object v4, Lcom/rphub/app/PatchEngine;->HTML_VOID_TAGS:Ljava/util/Set;

    const-string v1, "<(/?)([a-zA-Z][a-zA-Z0-9-]*)([^>]*?)(/?)>"

    .line 2095
    invoke-static {v1}, Ljava/util/regex/Pattern;->compile(Ljava/lang/String;)Ljava/util/regex/Pattern;

    move-result-object v1

    .line 2094
    sput-object v1, Lcom/rphub/app/PatchEngine;->HTML_TAG_RE:Ljava/util/regex/Pattern;

    const-string v1, "<script[\\s\\S]*?</script>"

    .line 2097
    invoke-static {v1, v0}, Ljava/util/regex/Pattern;->compile(Ljava/lang/String;I)Ljava/util/regex/Pattern;

    move-result-object v1

    .line 2096
    sput-object v1, Lcom/rphub/app/PatchEngine;->HTML_SCRIPT_RE:Ljava/util/regex/Pattern;

    const-string v1, "<style[\\s\\S]*?</style>"

    .line 2099
    invoke-static {v1, v0}, Ljava/util/regex/Pattern;->compile(Ljava/lang/String;I)Ljava/util/regex/Pattern;

    move-result-object v0

    .line 2098
    sput-object v0, Lcom/rphub/app/PatchEngine;->HTML_STYLE_RE:Ljava/util/regex/Pattern;

    const-string v0, "<!--[\\s\\S]*?-->"

    .line 2101
    invoke-static {v0}, Ljava/util/regex/Pattern;->compile(Ljava/lang/String;)Ljava/util/regex/Pattern;

    move-result-object v0

    .line 2100
    sput-object v0, Lcom/rphub/app/PatchEngine;->HTML_COMMENT_RE:Ljava/util/regex/Pattern;

    return-void
.end method

.method private constructor <init>()V
    .locals 0

    .line 202
    invoke-direct {p0}, Ljava/lang/Object;-><init>()V

    return-void
.end method

.method static synthetic access$0()[Ljava/lang/String;
    .locals 1

    .line 990
    sget-object v0, Lcom/rphub/app/PatchEngine;->BOOT_CHAIN_FILES:[Ljava/lang/String;

    return-object v0
.end method

.method static synthetic access$1(Ljava/lang/String;)Z
    .locals 0

    .line 1728
    invoke-static {p0}, Lcom/rphub/app/PatchEngine;->isPatchableKey(Ljava/lang/String;)Z

    move-result p0

    return p0
.end method

.method static synthetic access$2(Landroid/content/Context;Ljava/lang/String;Ljava/lang/String;)I
    .locals 0

    .line 1837
    invoke-static {p0, p1, p2}, Lcom/rphub/app/PatchEngine;->seedMissBaseline(Landroid/content/Context;Ljava/lang/String;Ljava/lang/String;)I

    move-result p0

    return p0
.end method

.method static synthetic access$3()Ljava/lang/String;
    .locals 1

    .line 653
    invoke-static {}, Lcom/rphub/app/PatchEngine;->plazaScript()Ljava/lang/String;

    move-result-object v0

    return-object v0
.end method

.method private static appJsConsumesIntact(Ljava/lang/String;)Z
    .locals 6

    const/4 v0, 0x0

    if-eqz p0, :cond_3

    .line 1665
    invoke-virtual {p0}, Ljava/lang/String;->isEmpty()Z

    move-result v1

    if-eqz v1, :cond_0

    goto :goto_1

    .line 1666
    :cond_0
    sget-object v1, Lcom/rphub/app/PatchEngine;->APP_JS_CONSUMES:[Ljava/lang/String;

    array-length v2, v1

    const/4 v3, 0x0

    :goto_0
    if-lt v3, v2, :cond_1

    const/4 p0, 0x1

    return p0

    :cond_1
    aget-object v4, v1, v3

    .line 1667
    invoke-virtual {p0, v4}, Ljava/lang/String;->indexOf(Ljava/lang/String;)I

    move-result v5

    if-gez v5, :cond_2

    .line 1668
    new-instance p0, Ljava/lang/StringBuilder;

    const-string v1, "app.js self-check: no longer consumes "

    invoke-direct {p0, v1}, Ljava/lang/StringBuilder;-><init>(Ljava/lang/String;)V

    invoke-virtual {p0, v4}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    invoke-virtual {p0}, Ljava/lang/StringBuilder;->toString()Ljava/lang/String;

    move-result-object p0

    const-string v1, "RPHubPatch"

    invoke-static {v1, p0}, Landroid/util/Log;->w(Ljava/lang/String;Ljava/lang/String;)I

    return v0

    :cond_2
    add-int/lit8 v3, v3, 0x1

    goto :goto_0

    :cond_3
    :goto_1
    return v0
.end method

.method private static appVersionCode(Landroid/content/Context;)I
    .locals 2

    const/4 v0, 0x0

    .line 1464
    :try_start_0
    invoke-virtual {p0}, Landroid/content/Context;->getPackageManager()Landroid/content/pm/PackageManager;

    move-result-object v1

    .line 1465
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

.method private static apply(Ljava/lang/String;Ljava/lang/String;)Ljava/lang/String;
    .locals 8
    .annotation system Ldalvik/annotation/Throws;
        value = {
            Ljava/lang/Exception;
        }
    .end annotation

    .line 2219
    sget-object v0, Lcom/rphub/app/PatchEngine;->manifest:Lorg/json/JSONObject;

    if-nez v0, :cond_0

    return-object p0

    .line 2220
    :cond_0
    invoke-virtual {v0, p1}, Lorg/json/JSONObject;->optJSONArray(Ljava/lang/String;)Lorg/json/JSONArray;

    move-result-object v0

    if-nez v0, :cond_1

    return-object p0

    :cond_1
    const-string v1, "\r\n"

    const-string v2, "\n"

    .line 2222
    invoke-virtual {p0, v1, v2}, Ljava/lang/String;->replace(Ljava/lang/CharSequence;Ljava/lang/CharSequence;)Ljava/lang/String;

    move-result-object p0

    const/4 v1, 0x0

    const/4 v2, 0x0

    .line 2223
    :goto_0
    invoke-virtual {v0}, Lorg/json/JSONArray;->length()I

    move-result v3

    if-lt v2, v3, :cond_2

    return-object p0

    .line 2224
    :cond_2
    invoke-virtual {v0, v2}, Lorg/json/JSONArray;->getJSONObject(I)Lorg/json/JSONObject;

    move-result-object v3

    const-string v4, "find"

    .line 2225
    invoke-virtual {v3, v4}, Lorg/json/JSONObject;->getString(Ljava/lang/String;)Ljava/lang/String;

    move-result-object v4

    const-string v5, "replace"

    .line 2226
    invoke-virtual {v3, v5}, Lorg/json/JSONObject;->getString(Ljava/lang/String;)Ljava/lang/String;

    move-result-object v3

    .line 2227
    invoke-virtual {p0, v4}, Ljava/lang/String;->indexOf(Ljava/lang/String;)I

    move-result v5

    if-ltz v5, :cond_3

    .line 2229
    new-instance v6, Ljava/lang/StringBuilder;

    invoke-virtual {p0, v1, v5}, Ljava/lang/String;->substring(II)Ljava/lang/String;

    move-result-object v7

    invoke-static {v7}, Ljava/lang/String;->valueOf(Ljava/lang/Object;)Ljava/lang/String;

    move-result-object v7

    invoke-direct {v6, v7}, Ljava/lang/StringBuilder;-><init>(Ljava/lang/String;)V

    invoke-virtual {v6, v3}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    invoke-virtual {v4}, Ljava/lang/String;->length()I

    move-result v3

    add-int/2addr v5, v3

    invoke-virtual {p0, v5}, Ljava/lang/String;->substring(I)Ljava/lang/String;

    move-result-object p0

    invoke-virtual {v6, p0}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    invoke-virtual {v6}, Ljava/lang/StringBuilder;->toString()Ljava/lang/String;

    move-result-object p0

    goto :goto_1

    .line 2230
    :cond_3
    invoke-virtual {p0, v3}, Ljava/lang/String;->contains(Ljava/lang/CharSequence;)Z

    move-result v3

    if-eqz v3, :cond_4

    :goto_1
    add-int/lit8 v2, v2, 0x1

    goto :goto_0

    .line 2233
    :cond_4
    new-instance p0, Ljava/lang/IllegalStateException;

    new-instance v0, Ljava/lang/StringBuilder;

    const-string v1, "anchor not applied: "

    invoke-direct {v0, v1}, Ljava/lang/StringBuilder;-><init>(Ljava/lang/String;)V

    invoke-virtual {v0, p1}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    const-string p1, "#"

    invoke-virtual {v0, p1}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    add-int/lit8 v2, v2, 0x1

    invoke-virtual {v0, v2}, Ljava/lang/StringBuilder;->append(I)Ljava/lang/StringBuilder;

    invoke-virtual {v0}, Ljava/lang/StringBuilder;->toString()Ljava/lang/String;

    move-result-object p1

    invoke-direct {p0, p1}, Ljava/lang/IllegalStateException;-><init>(Ljava/lang/String;)V

    goto :goto_3

    :goto_2
    throw p0

    :goto_3
    goto :goto_2
.end method

.method private static applyChecked(Ljava/lang/String;Ljava/lang/String;I)Lcom/rphub/app/PatchEngine$PatchOutcome;
    .locals 17

    move-object/from16 v0, p0

    move-object/from16 v1, p1

    move/from16 v2, p2

    const-string v3, "#"

    .line 1885
    new-instance v4, Lcom/rphub/app/PatchEngine$PatchOutcome;

    const/4 v5, 0x0

    invoke-direct {v4, v5}, Lcom/rphub/app/PatchEngine$PatchOutcome;-><init>(Lcom/rphub/app/PatchEngine$PatchOutcome;)V

    .line 1886
    iput-object v0, v4, Lcom/rphub/app/PatchEngine$PatchOutcome;->content:Ljava/lang/String;

    const/4 v5, 0x1

    .line 1887
    iput-boolean v5, v4, Lcom/rphub/app/PatchEngine$PatchOutcome;->qualityOk:Z

    const-string v6, "no-rules"

    .line 1888
    iput-object v6, v4, Lcom/rphub/app/PatchEngine$PatchOutcome;->qualityNote:Ljava/lang/String;

    .line 1889
    sget-object v6, Lcom/rphub/app/PatchEngine;->manifest:Lorg/json/JSONObject;

    if-nez v6, :cond_0

    return-object v4

    .line 1890
    :cond_0
    invoke-virtual {v6, v1}, Lorg/json/JSONObject;->optJSONArray(Ljava/lang/String;)Lorg/json/JSONArray;

    move-result-object v6

    if-nez v6, :cond_1

    return-object v4

    .line 1893
    :cond_1
    new-instance v7, Ljava/lang/StringBuilder;

    const/16 v8, 0xd

    invoke-virtual {v0, v8}, Ljava/lang/String;->indexOf(I)I

    move-result v8

    if-ltz v8, :cond_2

    const-string v8, "\r\n"

    const-string v9, "\n"

    invoke-virtual {v0, v8, v9}, Ljava/lang/String;->replace(Ljava/lang/CharSequence;Ljava/lang/CharSequence;)Ljava/lang/String;

    move-result-object v0

    :cond_2
    invoke-direct {v7, v0}, Ljava/lang/StringBuilder;-><init>(Ljava/lang/String;)V

    const/4 v8, 0x3

    new-array v9, v8, [I

    const/4 v10, 0x0

    const/4 v11, 0x0

    .line 1898
    :goto_0
    invoke-virtual {v6}, Lorg/json/JSONArray;->length()I

    move-result v0

    const-string v12, "RPHubPatch"

    const/4 v13, 0x2

    if-lt v11, v0, :cond_8

    .line 1926
    invoke-virtual {v7}, Ljava/lang/StringBuilder;->toString()Ljava/lang/String;

    move-result-object v0

    iput-object v0, v4, Lcom/rphub/app/PatchEngine$PatchOutcome;->content:Ljava/lang/String;

    const v0, 0x7fffffff

    if-eq v2, v0, :cond_3

    .line 1932
    iget v3, v4, Lcom/rphub/app/PatchEngine$PatchOutcome;->missing:I

    sub-int/2addr v3, v2

    if-le v3, v8, :cond_3

    .line 1935
    iput-boolean v10, v4, Lcom/rphub/app/PatchEngine$PatchOutcome;->qualityOk:Z

    .line 1936
    new-instance v6, Ljava/lang/StringBuilder;

    const-string v7, "extra missing "

    invoke-direct {v6, v7}, Ljava/lang/StringBuilder;-><init>(Ljava/lang/String;)V

    invoke-virtual {v6, v3}, Ljava/lang/StringBuilder;->append(I)Ljava/lang/StringBuilder;

    const-string v3, " > "

    .line 1937
    invoke-virtual {v6, v3}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    invoke-virtual {v6, v8}, Ljava/lang/StringBuilder;->append(I)Ljava/lang/StringBuilder;

    const-string v3, " (missing="

    .line 1938
    invoke-virtual {v6, v3}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    iget v3, v4, Lcom/rphub/app/PatchEngine$PatchOutcome;->missing:I

    invoke-virtual {v6, v3}, Ljava/lang/StringBuilder;->append(I)Ljava/lang/StringBuilder;

    const-string v3, ", baseline="

    invoke-virtual {v6, v3}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    invoke-virtual {v6, v2}, Ljava/lang/StringBuilder;->append(I)Ljava/lang/StringBuilder;

    const-string v3, ")"

    invoke-virtual {v6, v3}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    invoke-virtual {v6}, Ljava/lang/StringBuilder;->toString()Ljava/lang/String;

    move-result-object v3

    .line 1936
    iput-object v3, v4, Lcom/rphub/app/PatchEngine$PatchOutcome;->qualityNote:Ljava/lang/String;

    .line 1946
    :cond_3
    iget-boolean v3, v4, Lcom/rphub/app/PatchEngine$PatchOutcome;->qualityOk:Z

    if-eqz v3, :cond_5

    .line 1947
    aget v3, v9, v10

    if-nez v3, :cond_4

    aget v3, v9, v5

    if-nez v3, :cond_4

    aget v3, v9, v13

    if-eqz v3, :cond_5

    .line 1965
    :cond_4
    iput-boolean v10, v4, Lcom/rphub/app/PatchEngine$PatchOutcome;->qualityOk:Z

    .line 1966
    new-instance v3, Ljava/lang/StringBuilder;

    const-string v6, "bracket delta "

    invoke-direct {v3, v6}, Ljava/lang/StringBuilder;-><init>(Ljava/lang/String;)V

    aget v6, v9, v10

    invoke-virtual {v3, v6}, Ljava/lang/StringBuilder;->append(I)Ljava/lang/StringBuilder;

    const-string v6, "/"

    invoke-virtual {v3, v6}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    aget v5, v9, v5

    invoke-virtual {v3, v5}, Ljava/lang/StringBuilder;->append(I)Ljava/lang/StringBuilder;

    .line 1967
    invoke-virtual {v3, v6}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    aget v5, v9, v13

    invoke-virtual {v3, v5}, Ljava/lang/StringBuilder;->append(I)Ljava/lang/StringBuilder;

    const-string v5, " (paired rules only half applied)"

    invoke-virtual {v3, v5}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    invoke-virtual {v3}, Ljava/lang/StringBuilder;->toString()Ljava/lang/String;

    move-result-object v3

    .line 1966
    iput-object v3, v4, Lcom/rphub/app/PatchEngine$PatchOutcome;->qualityNote:Ljava/lang/String;

    .line 1969
    :cond_5
    new-instance v3, Ljava/lang/StringBuilder;

    const-string v5, "patched "

    invoke-direct {v3, v5}, Ljava/lang/StringBuilder;-><init>(Ljava/lang/String;)V

    invoke-virtual {v3, v1}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    const-string v1, ": applied="

    invoke-virtual {v3, v1}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    iget v1, v4, Lcom/rphub/app/PatchEngine$PatchOutcome;->applied:I

    invoke-virtual {v3, v1}, Ljava/lang/StringBuilder;->append(I)Ljava/lang/StringBuilder;

    const-string v1, " already="

    .line 1970
    invoke-virtual {v3, v1}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    iget v1, v4, Lcom/rphub/app/PatchEngine$PatchOutcome;->alreadyApplied:I

    invoke-virtual {v3, v1}, Ljava/lang/StringBuilder;->append(I)Ljava/lang/StringBuilder;

    const-string v1, " missing="

    .line 1971
    invoke-virtual {v3, v1}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    iget v1, v4, Lcom/rphub/app/PatchEngine$PatchOutcome;->missing:I

    invoke-virtual {v3, v1}, Ljava/lang/StringBuilder;->append(I)Ljava/lang/StringBuilder;

    const-string v1, " baseline="

    .line 1972
    invoke-virtual {v3, v1}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    if-ne v2, v0, :cond_6

    const-string v0, "probe"

    goto :goto_1

    :cond_6
    invoke-static/range {p2 .. p2}, Ljava/lang/String;->valueOf(I)Ljava/lang/String;

    move-result-object v0

    :goto_1
    invoke-virtual {v3, v0}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    const-string v0, " ok="

    .line 1973
    invoke-virtual {v3, v0}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    iget-boolean v0, v4, Lcom/rphub/app/PatchEngine$PatchOutcome;->qualityOk:Z

    invoke-virtual {v3, v0}, Ljava/lang/StringBuilder;->append(Z)Ljava/lang/StringBuilder;

    .line 1974
    iget-object v0, v4, Lcom/rphub/app/PatchEngine$PatchOutcome;->qualityNote:Ljava/lang/String;

    if-nez v0, :cond_7

    const-string v0, ""

    goto :goto_2

    :cond_7
    new-instance v0, Ljava/lang/StringBuilder;

    const-string v1, " note="

    invoke-direct {v0, v1}, Ljava/lang/StringBuilder;-><init>(Ljava/lang/String;)V

    iget-object v1, v4, Lcom/rphub/app/PatchEngine$PatchOutcome;->qualityNote:Ljava/lang/String;

    invoke-virtual {v0, v1}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    invoke-virtual {v0}, Ljava/lang/StringBuilder;->toString()Ljava/lang/String;

    move-result-object v0

    :goto_2
    invoke-virtual {v3, v0}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    invoke-virtual {v3}, Ljava/lang/StringBuilder;->toString()Ljava/lang/String;

    move-result-object v0

    .line 1969
    invoke-static {v12, v0}, Landroid/util/Log;->i(Ljava/lang/String;Ljava/lang/String;)I

    return-object v4

    .line 1900
    :cond_8
    :try_start_0
    invoke-virtual {v6, v11}, Lorg/json/JSONArray;->getJSONObject(I)Lorg/json/JSONObject;

    move-result-object v0

    const-string v14, "find"

    .line 1901
    invoke-virtual {v0, v14}, Lorg/json/JSONObject;->getString(Ljava/lang/String;)Ljava/lang/String;

    move-result-object v14

    const-string v15, "replace"

    .line 1902
    invoke-virtual {v0, v15}, Lorg/json/JSONObject;->getString(Ljava/lang/String;)Ljava/lang/String;

    move-result-object v0

    .line 1903
    invoke-virtual {v7, v14}, Ljava/lang/StringBuilder;->indexOf(Ljava/lang/String;)I

    move-result v15

    if-ltz v15, :cond_9

    .line 1906
    invoke-virtual {v14}, Ljava/lang/String;->length()I

    move-result v16

    add-int v8, v15, v16

    invoke-virtual {v7, v15, v8, v0}, Ljava/lang/StringBuilder;->replace(IILjava/lang/String;)Ljava/lang/StringBuilder;

    .line 1907
    iget v8, v4, Lcom/rphub/app/PatchEngine$PatchOutcome;->applied:I

    add-int/2addr v8, v5

    iput v8, v4, Lcom/rphub/app/PatchEngine$PatchOutcome;->applied:I

    .line 1908
    invoke-static {v14}, Lcom/rphub/app/PatchEngine;->jsBracketProfile(Ljava/lang/String;)[I

    move-result-object v8

    .line 1909
    invoke-static {v0}, Lcom/rphub/app/PatchEngine;->jsBracketProfile(Ljava/lang/String;)[I

    move-result-object v0

    if-eqz v8, :cond_b

    if-eqz v0, :cond_b

    .line 1911
    aget v14, v9, v10

    aget v15, v0, v10

    aget v16, v8, v10

    sub-int v15, v15, v16

    add-int/2addr v14, v15

    aput v14, v9, v10

    .line 1912
    aget v14, v9, v5

    aget v15, v0, v5

    aget v16, v8, v5

    sub-int v15, v15, v16

    add-int/2addr v14, v15

    aput v14, v9, v5

    .line 1913
    aget v14, v9, v13

    aget v0, v0, v13

    aget v8, v8, v13

    sub-int/2addr v0, v8

    add-int/2addr v14, v0

    aput v14, v9, v13

    goto :goto_3

    .line 1915
    :cond_9
    invoke-virtual {v7, v0}, Ljava/lang/StringBuilder;->indexOf(Ljava/lang/String;)I

    move-result v0

    if-ltz v0, :cond_a

    .line 1916
    iget v0, v4, Lcom/rphub/app/PatchEngine$PatchOutcome;->alreadyApplied:I

    add-int/2addr v0, v5

    iput v0, v4, Lcom/rphub/app/PatchEngine$PatchOutcome;->alreadyApplied:I

    goto :goto_3

    .line 1918
    :cond_a
    iget v0, v4, Lcom/rphub/app/PatchEngine$PatchOutcome;->missing:I

    add-int/2addr v0, v5

    iput v0, v4, Lcom/rphub/app/PatchEngine$PatchOutcome;->missing:I

    .line 1919
    new-instance v0, Ljava/lang/StringBuilder;

    const-string v8, "anchor missing: "

    invoke-direct {v0, v8}, Ljava/lang/StringBuilder;-><init>(Ljava/lang/String;)V

    invoke-virtual {v0, v1}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    invoke-virtual {v0, v3}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    add-int/lit8 v8, v11, 0x1

    invoke-virtual {v0, v8}, Ljava/lang/StringBuilder;->append(I)Ljava/lang/StringBuilder;

    invoke-virtual {v0}, Ljava/lang/StringBuilder;->toString()Ljava/lang/String;

    move-result-object v0

    invoke-static {v12, v0}, Landroid/util/Log;->i(Ljava/lang/String;Ljava/lang/String;)I
    :try_end_0
    .catchall {:try_start_0 .. :try_end_0} :catchall_0

    goto :goto_3

    :catchall_0
    move-exception v0

    .line 1922
    iget v8, v4, Lcom/rphub/app/PatchEngine$PatchOutcome;->missing:I

    add-int/2addr v8, v5

    iput v8, v4, Lcom/rphub/app/PatchEngine$PatchOutcome;->missing:I

    .line 1923
    new-instance v8, Ljava/lang/StringBuilder;

    const-string v13, "patch item failed: "

    invoke-direct {v8, v13}, Ljava/lang/StringBuilder;-><init>(Ljava/lang/String;)V

    invoke-virtual {v8, v1}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    invoke-virtual {v8, v3}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    add-int/lit8 v13, v11, 0x1

    invoke-virtual {v8, v13}, Ljava/lang/StringBuilder;->append(I)Ljava/lang/StringBuilder;

    invoke-virtual {v8}, Ljava/lang/StringBuilder;->toString()Ljava/lang/String;

    move-result-object v8

    invoke-static {v12, v8, v0}, Landroid/util/Log;->w(Ljava/lang/String;Ljava/lang/String;Ljava/lang/Throwable;)I

    :cond_b
    :goto_3
    add-int/lit8 v11, v11, 0x1

    const/4 v8, 0x3

    goto/16 :goto_0
.end method

.method private static applyLenient(Ljava/lang/String;Ljava/lang/String;I)Ljava/lang/String;
    .locals 1

    .line 1809
    invoke-static {p0, p1, p2}, Lcom/rphub/app/PatchEngine;->applyChecked(Ljava/lang/String;Ljava/lang/String;I)Lcom/rphub/app/PatchEngine$PatchOutcome;

    move-result-object p0

    .line 1810
    iget-boolean p2, p0, Lcom/rphub/app/PatchEngine$PatchOutcome;->qualityOk:Z

    if-nez p2, :cond_0

    .line 1814
    new-instance p2, Ljava/lang/StringBuilder;

    const-string v0, "patch quality rejected: "

    invoke-direct {p2, v0}, Ljava/lang/StringBuilder;-><init>(Ljava/lang/String;)V

    invoke-virtual {p2, p1}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    const-string p1, " applied="

    .line 1815
    invoke-virtual {p2, p1}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    iget p1, p0, Lcom/rphub/app/PatchEngine$PatchOutcome;->applied:I

    invoke-virtual {p2, p1}, Ljava/lang/StringBuilder;->append(I)Ljava/lang/StringBuilder;

    const-string p1, " already="

    .line 1816
    invoke-virtual {p2, p1}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    iget p1, p0, Lcom/rphub/app/PatchEngine$PatchOutcome;->alreadyApplied:I

    invoke-virtual {p2, p1}, Ljava/lang/StringBuilder;->append(I)Ljava/lang/StringBuilder;

    const-string p1, " missing="

    .line 1817
    invoke-virtual {p2, p1}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    iget p1, p0, Lcom/rphub/app/PatchEngine$PatchOutcome;->missing:I

    invoke-virtual {p2, p1}, Ljava/lang/StringBuilder;->append(I)Ljava/lang/StringBuilder;

    const-string p1, " ("

    .line 1818
    invoke-virtual {p2, p1}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    iget-object p0, p0, Lcom/rphub/app/PatchEngine$PatchOutcome;->qualityNote:Ljava/lang/String;

    invoke-virtual {p2, p0}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    const-string p0, ")"

    invoke-virtual {p2, p0}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    invoke-virtual {p2}, Ljava/lang/StringBuilder;->toString()Ljava/lang/String;

    move-result-object p0

    const-string p1, "RPHubPatch"

    .line 1814
    invoke-static {p1, p0}, Landroid/util/Log;->w(Ljava/lang/String;Ljava/lang/String;)I

    const/4 p0, 0x0

    return-object p0

    .line 1821
    :cond_0
    iget-object p0, p0, Lcom/rphub/app/PatchEngine$PatchOutcome;->content:Ljava/lang/String;

    return-object p0
.end method

.method public static beginPageLoad()V
    .locals 2

    .line 187
    sget v0, Lcom/rphub/app/PatchEngine;->activeGeneration:I

    sput v0, Lcom/rphub/app/PatchEngine;->pageGeneration:I

    .line 188
    new-instance v0, Ljava/lang/StringBuilder;

    const-string v1, "page load begins, serving generation "

    invoke-direct {v0, v1}, Ljava/lang/StringBuilder;-><init>(Ljava/lang/String;)V

    sget v1, Lcom/rphub/app/PatchEngine;->pageGeneration:I

    invoke-virtual {v0, v1}, Ljava/lang/StringBuilder;->append(I)Ljava/lang/StringBuilder;

    invoke-virtual {v0}, Ljava/lang/StringBuilder;->toString()Ljava/lang/String;

    move-result-object v0

    const-string v1, "RPHubPatch"

    invoke-static {v1, v0}, Landroid/util/Log;->i(Ljava/lang/String;Ljava/lang/String;)I

    return-void
.end method

.method private static buildBootChainProvides()Ljava/util/Map;
    .locals 8
    .annotation system Ldalvik/annotation/Signature;
        value = {
            "()",
            "Ljava/util/Map<",
            "Ljava/lang/String;",
            "[",
            "Ljava/lang/String;",
            ">;"
        }
    .end annotation

    .line 1703
    new-instance v0, Ljava/util/HashMap;

    invoke-direct {v0}, Ljava/util/HashMap;-><init>()V

    const/4 v1, 0x2

    new-array v2, v1, [Ljava/lang/String;

    const-string v3, "window.RPHubBuiltinContent"

    const/4 v4, 0x0

    aput-object v3, v2, v4

    const-string v3, "window.RPHubBuiltinPresets"

    const/4 v5, 0x1

    aput-object v3, v2, v5

    const-string v3, "built-in-content.js"

    .line 1704
    invoke-interface {v0, v3, v2}, Ljava/util/Map;->put(Ljava/lang/Object;Ljava/lang/Object;)Ljava/lang/Object;

    const/4 v2, 0x3

    new-array v3, v2, [Ljava/lang/String;

    const-string v6, "window.RPHubCardUtils"

    aput-object v6, v3, v4

    const-string v6, "window.RPHubConfig"

    aput-object v6, v3, v5

    const-string v6, "window.RPHubUtils"

    aput-object v6, v3, v1

    const-string v6, "core-utils.js"

    .line 1706
    invoke-interface {v0, v6, v3}, Ljava/util/Map;->put(Ljava/lang/Object;Ljava/lang/Object;)Ljava/lang/Object;

    new-array v3, v1, [Ljava/lang/String;

    const-string v6, "window.RPHubApiClient"

    aput-object v6, v3, v4

    const-string v6, "window.RPHubApiUtils"

    aput-object v6, v3, v5

    const-string v6, "api-utils.js"

    .line 1708
    invoke-interface {v0, v6, v3}, Ljava/util/Map;->put(Ljava/lang/Object;Ljava/lang/Object;)Ljava/lang/Object;

    const/4 v3, 0x5

    new-array v3, v3, [Ljava/lang/String;

    const-string v6, "window.RPHubContextUtils"

    aput-object v6, v3, v4

    const-string v6, "window.RPHubMemoryUtils"

    aput-object v6, v3, v5

    const-string v6, "window.RPHubStorage"

    aput-object v6, v3, v1

    const-string v6, "window.RPHubStoryBranches"

    aput-object v6, v3, v2

    const/4 v6, 0x4

    const-string v7, "window.RPHubUiTemplateUtils"

    aput-object v7, v3, v6

    const-string v6, "data-services.js"

    .line 1710
    invoke-interface {v0, v6, v3}, Ljava/util/Map;->put(Ljava/lang/Object;Ljava/lang/Object;)Ljava/lang/Object;

    new-array v3, v1, [Ljava/lang/String;

    const-string v6, "window.RPHubComposables"

    aput-object v6, v3, v4

    const-string v6, "window.RPHubMessageRenderer"

    aput-object v6, v3, v5

    const-string v6, "runtime-services.js"

    .line 1713
    invoke-interface {v0, v6, v3}, Ljava/util/Map;->put(Ljava/lang/Object;Ljava/lang/Object;)Ljava/lang/Object;

    new-array v3, v5, [Ljava/lang/String;

    const-string v6, "window.RPHubUpdateCheck"

    aput-object v6, v3, v4

    const-string v6, "update-check.js"

    .line 1715
    invoke-interface {v0, v6, v3}, Ljava/util/Map;->put(Ljava/lang/Object;Ljava/lang/Object;)Ljava/lang/Object;

    new-array v3, v5, [Ljava/lang/String;

    const-string v6, "window.RPHubCloudBackup"

    aput-object v6, v3, v4

    const-string v6, "cloud-backup.js"

    .line 1720
    invoke-interface {v0, v6, v3}, Ljava/util/Map;->put(Ljava/lang/Object;Ljava/lang/Object;)Ljava/lang/Object;

    new-array v2, v2, [Ljava/lang/String;

    const-string v3, "window.RPHubComponents"

    aput-object v3, v2, v4

    const-string v3, "window.RPHubCustomSelect"

    aput-object v3, v2, v5

    const-string v3, "window.RPHubLayoutComponents"

    aput-object v3, v2, v1

    const-string v1, "ui-components.js"

    .line 1722
    invoke-interface {v0, v1, v2}, Ljava/util/Map;->put(Ljava/lang/Object;Ljava/lang/Object;)Ljava/lang/Object;

    return-object v0
.end method

.method private static buildCrossFileContracts()Ljava/util/Map;
    .locals 4
    .annotation system Ldalvik/annotation/Signature;
        value = {
            "()",
            "Ljava/util/Map<",
            "Ljava/lang/String;",
            "[",
            "Ljava/lang/String;",
            ">;"
        }
    .end annotation

    .line 1494
    new-instance v0, Ljava/util/HashMap;

    invoke-direct {v0}, Ljava/util/HashMap;-><init>()V

    const/4 v1, 0x2

    new-array v1, v1, [Ljava/lang/String;

    const/4 v2, 0x0

    const-string v3, "app.js"

    aput-object v3, v1, v2

    const/4 v2, 0x1

    const-string v3, "formatLatestUsageCost"

    aput-object v3, v1, v2

    const-string v2, "index.html"

    .line 1496
    invoke-interface {v0, v2, v1}, Ljava/util/Map;->put(Ljava/lang/Object;Ljava/lang/Object;)Ljava/lang/Object;

    return-object v0
.end method

.method private static cacheFile(Landroid/content/Context;Ljava/lang/String;)Ljava/io/File;
    .locals 4

    .line 1754
    new-instance v0, Ljava/io/File;

    new-instance v1, Ljava/io/File;

    invoke-virtual {p0}, Landroid/content/Context;->getFilesDir()Ljava/io/File;

    move-result-object v2

    const-string v3, "patch-cache"

    invoke-direct {v1, v2, v3}, Ljava/io/File;-><init>(Ljava/io/File;Ljava/lang/String;)V

    invoke-static {p0}, Lcom/rphub/app/PatchEngine;->cacheVersionTag(Landroid/content/Context;)Ljava/lang/String;

    move-result-object p0

    invoke-direct {v0, v1, p0}, Ljava/io/File;-><init>(Ljava/io/File;Ljava/lang/String;)V

    .line 1755
    invoke-virtual {v0}, Ljava/io/File;->exists()Z

    move-result p0

    if-nez p0, :cond_0

    invoke-virtual {v0}, Ljava/io/File;->mkdirs()Z

    .line 1756
    :cond_0
    new-instance p0, Ljava/io/File;

    new-instance v1, Ljava/lang/StringBuilder;

    invoke-static {p1}, Ljava/lang/String;->valueOf(Ljava/lang/Object;)Ljava/lang/String;

    move-result-object p1

    invoke-direct {v1, p1}, Ljava/lang/StringBuilder;-><init>(Ljava/lang/String;)V

    const-string p1, ".raw"

    invoke-virtual {v1, p1}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    invoke-virtual {v1}, Ljava/lang/StringBuilder;->toString()Ljava/lang/String;

    move-result-object p1

    invoke-direct {p0, v0, p1}, Ljava/io/File;-><init>(Ljava/io/File;Ljava/lang/String;)V

    return-object p0
.end method

.method private static cacheVersionTag(Landroid/content/Context;)Ljava/lang/String;
    .locals 3

    const-string v0, "unknown"

    .line 1740
    :try_start_0
    invoke-virtual {p0}, Landroid/content/Context;->getPackageManager()Landroid/content/pm/PackageManager;

    move-result-object v1

    .line 1741
    invoke-virtual {p0}, Landroid/content/Context;->getPackageName()Ljava/lang/String;

    move-result-object p0

    const/4 v2, 0x0

    invoke-virtual {v1, p0, v2}, Landroid/content/pm/PackageManager;->getPackageInfo(Ljava/lang/String;I)Landroid/content/pm/PackageInfo;

    move-result-object p0

    iget-object p0, p0, Landroid/content/pm/PackageInfo;->versionName:Ljava/lang/String;

    if-eqz p0, :cond_1

    .line 1742
    invoke-virtual {p0}, Ljava/lang/String;->trim()Ljava/lang/String;

    move-result-object v1

    invoke-virtual {v1}, Ljava/lang/String;->isEmpty()Z

    move-result v1

    if-eqz v1, :cond_0

    goto :goto_0

    .line 1744
    :cond_0
    invoke-virtual {p0}, Ljava/lang/String;->trim()Ljava/lang/String;

    move-result-object p0

    const-string v1, "[^0-9A-Za-z._-]"

    const-string v2, "_"

    invoke-virtual {p0, v1, v2}, Ljava/lang/String;->replaceAll(Ljava/lang/String;Ljava/lang/String;)Ljava/lang/String;

    move-result-object p0
    :try_end_0
    .catchall {:try_start_0 .. :try_end_0} :catchall_0

    return-object p0

    :cond_1
    :goto_0
    return-object v0

    :catchall_0
    move-exception p0

    const-string v1, "RPHubPatch"

    const-string v2, "cache version lookup failed"

    .line 1746
    invoke-static {v1, v2, p0}, Landroid/util/Log;->w(Ljava/lang/String;Ljava/lang/String;Ljava/lang/Throwable;)I

    return-object v0
.end method

.method private static chainFingerprint(Ljava/util/Map;)Ljava/lang/String;
    .locals 9
    .annotation system Ldalvik/annotation/Signature;
        value = {
            "(",
            "Ljava/util/Map<",
            "Ljava/lang/String;",
            "Ljava/lang/String;",
            ">;)",
            "Ljava/lang/String;"
        }
    .end annotation

    const/4 v0, 0x0

    :try_start_0
    const-string v1, "SHA-256"

    .line 1204
    invoke-static {v1}, Ljava/security/MessageDigest;->getInstance(Ljava/lang/String;)Ljava/security/MessageDigest;

    move-result-object v1

    .line 1205
    sget-object v2, Lcom/rphub/app/PatchEngine;->BOOT_CHAIN_FILES:[Ljava/lang/String;

    array-length v3, v2

    const/4 v4, 0x0

    const/4 v5, 0x0

    :goto_0
    if-lt v5, v3, :cond_0

    .line 1214
    invoke-virtual {v1}, Ljava/security/MessageDigest;->digest()[B

    move-result-object p0

    invoke-static {p0}, Lcom/rphub/app/PatchEngine;->toHex([B)Ljava/lang/String;

    move-result-object p0

    return-object p0

    .line 1205
    :cond_0
    aget-object v6, v2, v5

    if-nez p0, :cond_1

    move-object v7, v0

    goto :goto_1

    .line 1206
    :cond_1
    invoke-interface {p0, v6}, Ljava/util/Map;->get(Ljava/lang/Object;)Ljava/lang/Object;

    move-result-object v7

    check-cast v7, Ljava/lang/String;

    .line 1207
    :goto_1
    sget-object v8, Ljava/nio/charset/StandardCharsets;->UTF_8:Ljava/nio/charset/Charset;

    invoke-virtual {v6, v8}, Ljava/lang/String;->getBytes(Ljava/nio/charset/Charset;)[B

    move-result-object v6

    invoke-virtual {v1, v6}, Ljava/security/MessageDigest;->update([B)V

    .line 1208
    invoke-virtual {v1, v4}, Ljava/security/MessageDigest;->update(B)V

    if-eqz v7, :cond_2

    .line 1210
    sget-object v6, Ljava/nio/charset/StandardCharsets;->UTF_8:Ljava/nio/charset/Charset;

    invoke-virtual {v7, v6}, Ljava/lang/String;->getBytes(Ljava/nio/charset/Charset;)[B

    move-result-object v6

    invoke-virtual {v1, v6}, Ljava/security/MessageDigest;->update([B)V

    .line 1212
    :cond_2
    invoke-virtual {v1, v4}, Ljava/security/MessageDigest;->update(B)V
    :try_end_0
    .catchall {:try_start_0 .. :try_end_0} :catchall_0

    add-int/lit8 v5, v5, 0x1

    goto :goto_0

    :catchall_0
    move-exception p0

    const-string v1, "RPHubPatch"

    const-string v2, "chain fingerprint failed"

    .line 1216
    invoke-static {v1, v2, p0}, Landroid/util/Log;->w(Ljava/lang/String;Ljava/lang/String;Ljava/lang/Throwable;)I

    return-object v0
.end method

.method public static clearPatchCache(Landroid/content/Context;)V
    .locals 9

    const-string v0, "RPHubPatch"

    .line 289
    :try_start_0
    new-instance v1, Ljava/io/File;

    new-instance v2, Ljava/io/File;

    invoke-virtual {p0}, Landroid/content/Context;->getFilesDir()Ljava/io/File;

    move-result-object v3

    const-string v4, "patch-cache"

    invoke-direct {v2, v3, v4}, Ljava/io/File;-><init>(Ljava/io/File;Ljava/lang/String;)V

    invoke-static {p0}, Lcom/rphub/app/PatchEngine;->cacheVersionTag(Landroid/content/Context;)Ljava/lang/String;

    move-result-object v3

    invoke-direct {v1, v2, v3}, Ljava/io/File;-><init>(Ljava/io/File;Ljava/lang/String;)V

    .line 290
    invoke-virtual {v1}, Ljava/io/File;->listFiles()[Ljava/io/File;

    move-result-object v1

    const/4 v2, 0x0

    if-eqz v1, :cond_2

    .line 293
    array-length v3, v1

    const/4 v4, 0x0

    const/4 v5, 0x0

    :goto_0
    if-lt v4, v3, :cond_0

    goto :goto_1

    :cond_0
    aget-object v6, v1, v4

    .line 294
    invoke-virtual {v6}, Ljava/io/File;->isFile()Z

    move-result v7

    if-eqz v7, :cond_1

    invoke-virtual {v6}, Ljava/io/File;->getName()Ljava/lang/String;

    move-result-object v7

    const-string v8, ".raw"

    invoke-virtual {v7, v8}, Ljava/lang/String;->endsWith(Ljava/lang/String;)Z

    move-result v7

    if-eqz v7, :cond_1

    .line 295
    invoke-virtual {v6}, Ljava/io/File;->delete()Z

    move-result v6

    if-eqz v6, :cond_1

    add-int/lit8 v5, v5, 0x1

    :cond_1
    add-int/lit8 v4, v4, 0x1

    goto :goto_0

    :cond_2
    const/4 v5, 0x0

    .line 299
    :goto_1
    sget-object v1, Lcom/rphub/app/PatchEngine;->PATCHED_CACHE:Ljava/util/concurrent/ConcurrentHashMap;

    invoke-virtual {v1}, Ljava/util/concurrent/ConcurrentHashMap;->clear()V

    .line 300
    sget-object v1, Lcom/rphub/app/PatchEngine;->RAW_CACHE:Ljava/util/concurrent/ConcurrentHashMap;

    invoke-virtual {v1}, Ljava/util/concurrent/ConcurrentHashMap;->clear()V

    .line 301
    sget-object v1, Lcom/rphub/app/PatchEngine;->STAGED:Ljava/util/concurrent/ConcurrentHashMap;

    invoke-virtual {v1}, Ljava/util/concurrent/ConcurrentHashMap;->clear()V

    .line 302
    sput v2, Lcom/rphub/app/PatchEngine;->activeGeneration:I

    .line 305
    sput v2, Lcom/rphub/app/PatchEngine;->pageGeneration:I

    .line 306
    invoke-static {p0}, Lcom/rphub/app/PatchEngine;->deleteGenerationMarker(Landroid/content/Context;)V

    .line 307
    new-instance p0, Ljava/lang/StringBuilder;

    const-string v1, "patch cache cleared on request, files = "

    invoke-direct {p0, v1}, Ljava/lang/StringBuilder;-><init>(Ljava/lang/String;)V

    invoke-virtual {p0, v5}, Ljava/lang/StringBuilder;->append(I)Ljava/lang/StringBuilder;

    invoke-virtual {p0}, Ljava/lang/StringBuilder;->toString()Ljava/lang/String;

    move-result-object p0

    invoke-static {v0, p0}, Landroid/util/Log;->i(Ljava/lang/String;Ljava/lang/String;)I
    :try_end_0
    .catchall {:try_start_0 .. :try_end_0} :catchall_0

    goto :goto_2

    :catchall_0
    move-exception p0

    const-string v1, "clear patch cache failed"

    .line 309
    invoke-static {v0, v1, p0}, Landroid/util/Log;->w(Ljava/lang/String;Ljava/lang/String;Ljava/lang/Throwable;)I

    :goto_2
    return-void
.end method

.method public static clearRejectedGenerations(Landroid/content/Context;)V
    .locals 3

    const-string v0, "RPHubPatch"

    .line 1335
    :try_start_0
    invoke-static {p0}, Lcom/rphub/app/PatchEngine;->readRejected(Landroid/content/Context;)Ljava/util/List;

    move-result-object v1

    .line 1336
    invoke-interface {v1}, Ljava/util/List;->isEmpty()Z

    move-result v2

    if-nez v2, :cond_0

    .line 1337
    invoke-interface {v1}, Ljava/util/List;->clear()V

    .line 1338
    invoke-static {p0, v1}, Lcom/rphub/app/PatchEngine;->writeRejected(Landroid/content/Context;Ljava/util/List;)V

    :cond_0
    const-string p0, "generation blacklist cleared"

    .line 1340
    invoke-static {v0, p0}, Landroid/util/Log;->i(Ljava/lang/String;Ljava/lang/String;)I
    :try_end_0
    .catchall {:try_start_0 .. :try_end_0} :catchall_0

    goto :goto_0

    :catchall_0
    move-exception p0

    const-string v1, "clear blacklist failed"

    .line 1342
    invoke-static {v0, v1, p0}, Landroid/util/Log;->w(Ljava/lang/String;Ljava/lang/String;Ljava/lang/Throwable;)I

    :goto_0
    return-void
.end method

.method private static deleteGenerationMarker(Landroid/content/Context;)V
    .locals 5

    const-string v0, "RPHubPatch"

    .line 1160
    :try_start_0
    new-instance v1, Ljava/io/File;

    new-instance v2, Ljava/io/File;

    invoke-virtual {p0}, Landroid/content/Context;->getFilesDir()Ljava/io/File;

    move-result-object v3

    const-string v4, "patch-cache"

    invoke-direct {v2, v3, v4}, Ljava/io/File;-><init>(Ljava/io/File;Ljava/lang/String;)V

    invoke-static {p0}, Lcom/rphub/app/PatchEngine;->cacheVersionTag(Landroid/content/Context;)Ljava/lang/String;

    move-result-object p0

    invoke-direct {v1, v2, p0}, Ljava/io/File;-><init>(Ljava/io/File;Ljava/lang/String;)V

    .line 1161
    new-instance p0, Ljava/io/File;

    const-string v2, ".generation"

    invoke-direct {p0, v1, v2}, Ljava/io/File;-><init>(Ljava/io/File;Ljava/lang/String;)V

    .line 1162
    invoke-virtual {p0}, Ljava/io/File;->isFile()Z

    move-result v1

    if-eqz v1, :cond_0

    invoke-virtual {p0}, Ljava/io/File;->delete()Z

    move-result v1

    if-nez v1, :cond_0

    .line 1163
    new-instance v1, Ljava/lang/StringBuilder;

    const-string v2, "generation marker keep: "

    invoke-direct {v1, v2}, Ljava/lang/StringBuilder;-><init>(Ljava/lang/String;)V

    invoke-virtual {p0}, Ljava/io/File;->getName()Ljava/lang/String;

    move-result-object p0

    invoke-virtual {v1, p0}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    invoke-virtual {v1}, Ljava/lang/StringBuilder;->toString()Ljava/lang/String;

    move-result-object p0

    invoke-static {v0, p0}, Landroid/util/Log;->i(Ljava/lang/String;Ljava/lang/String;)I
    :try_end_0
    .catchall {:try_start_0 .. :try_end_0} :catchall_0

    goto :goto_0

    :catchall_0
    move-exception p0

    const-string v1, "generation marker delete failed"

    .line 1166
    invoke-static {v0, v1, p0}, Landroid/util/Log;->w(Ljava/lang/String;Ljava/lang/String;Ljava/lang/Throwable;)I

    :cond_0
    :goto_0
    return-void
.end method

.method private static diskChainFingerprint(Landroid/content/Context;)Ljava/lang/String;
    .locals 7

    const/4 v0, 0x0

    .line 1234
    :try_start_0
    invoke-static {p0}, Lcom/rphub/app/PatchEngine;->readGenerationMarker(Landroid/content/Context;)I

    move-result v1

    if-gtz v1, :cond_0

    return-object v0

    .line 1235
    :cond_0
    new-instance v1, Ljava/util/HashMap;

    invoke-direct {v1}, Ljava/util/HashMap;-><init>()V

    .line 1236
    sget-object v2, Lcom/rphub/app/PatchEngine;->BOOT_CHAIN_FILES:[Ljava/lang/String;

    array-length v3, v2

    const/4 v4, 0x0

    :goto_0
    if-lt v4, v3, :cond_1

    .line 1239
    invoke-static {v1}, Lcom/rphub/app/PatchEngine;->chainFingerprint(Ljava/util/Map;)Ljava/lang/String;

    move-result-object p0

    return-object p0

    .line 1236
    :cond_1
    aget-object v5, v2, v4

    .line 1237
    invoke-static {p0, v5}, Lcom/rphub/app/PatchEngine;->readCache(Landroid/content/Context;Ljava/lang/String;)Ljava/lang/String;

    move-result-object v6

    invoke-interface {v1, v5, v6}, Ljava/util/Map;->put(Ljava/lang/Object;Ljava/lang/Object;)Ljava/lang/Object;
    :try_end_0
    .catchall {:try_start_0 .. :try_end_0} :catchall_0

    add-int/lit8 v4, v4, 0x1

    goto :goto_0

    :catchall_0
    move-exception p0

    const-string v1, "RPHubPatch"

    const-string v2, "disk fingerprint failed"

    .line 1241
    invoke-static {v1, v2, p0}, Landroid/util/Log;->w(Ljava/lang/String;Ljava/lang/String;Ljava/lang/Throwable;)I

    return-object v0
.end method

.method public static downloadHookJs(Landroid/content/Context;)Ljava/lang/String;
    .locals 3

    .line 634
    sget-object v0, Lcom/rphub/app/PatchEngine;->downloadHookSource:Ljava/lang/String;

    if-eqz v0, :cond_0

    return-object v0

    :cond_0
    const/4 v0, 0x0

    :try_start_0
    const-string v1, "local-site/assets/native/download-hook.js"

    .line 637
    invoke-static {p0, v1}, Lcom/rphub/app/PatchEngine;->readAsset(Landroid/content/Context;Ljava/lang/String;)Ljava/lang/String;

    move-result-object p0

    if-eqz p0, :cond_2

    .line 638
    invoke-virtual {p0}, Ljava/lang/String;->trim()Ljava/lang/String;

    move-result-object v1

    invoke-virtual {v1}, Ljava/lang/String;->isEmpty()Z

    move-result v1

    if-eqz v1, :cond_1

    goto :goto_0

    .line 639
    :cond_1
    sput-object p0, Lcom/rphub/app/PatchEngine;->downloadHookSource:Ljava/lang/String;
    :try_end_0
    .catchall {:try_start_0 .. :try_end_0} :catchall_0

    return-object p0

    :cond_2
    :goto_0
    return-object v0

    :catchall_0
    move-exception p0

    const-string v1, "RPHubPatch"

    const-string v2, "download hook asset missing"

    .line 642
    invoke-static {v1, v2, p0}, Landroid/util/Log;->w(Ljava/lang/String;Ljava/lang/String;Ljava/lang/Throwable;)I

    return-object v0
.end method

.method private static extractBootModuleList(Ljava/lang/String;)Ljava/util/List;
    .locals 5
    .annotation system Ldalvik/annotation/Signature;
        value = {
            "(",
            "Ljava/lang/String;",
            ")",
            "Ljava/util/List<",
            "Ljava/lang/String;",
            ">;"
        }
    .end annotation

    .line 1627
    sget-object v0, Lcom/rphub/app/PatchEngine;->BOOT_MODULE_LIST_RE:Ljava/util/regex/Pattern;

    invoke-virtual {v0, p0}, Ljava/util/regex/Pattern;->matcher(Ljava/lang/CharSequence;)Ljava/util/regex/Matcher;

    move-result-object v0

    .line 1628
    :cond_0
    :goto_0
    invoke-virtual {v0}, Ljava/util/regex/Matcher;->find()Z

    move-result v1

    if-nez v1, :cond_1

    const/4 p0, 0x0

    return-object p0

    .line 1629
    :cond_1
    invoke-virtual {p0}, Ljava/lang/String;->length()I

    move-result v1

    invoke-virtual {v0}, Ljava/util/regex/Matcher;->end()I

    move-result v2

    add-int/lit16 v2, v2, 0x190

    invoke-static {v1, v2}, Ljava/lang/Math;->min(II)I

    move-result v1

    .line 1630
    invoke-virtual {v0}, Ljava/util/regex/Matcher;->end()I

    move-result v2

    invoke-virtual {p0, v2, v1}, Ljava/lang/String;->substring(II)Ljava/lang/String;

    move-result-object v1

    const-string v2, "document.write"

    .line 1631
    invoke-virtual {v1, v2}, Ljava/lang/String;->indexOf(Ljava/lang/String;)I

    move-result v1

    if-gez v1, :cond_2

    goto :goto_0

    :cond_2
    const/4 v1, 0x1

    .line 1632
    invoke-virtual {v0, v1}, Ljava/util/regex/Matcher;->group(I)Ljava/lang/String;

    move-result-object v2

    .line 1633
    sget-object v3, Lcom/rphub/app/PatchEngine;->BOOT_MODULE_ITEM_RE:Ljava/util/regex/Pattern;

    invoke-virtual {v3, v2}, Ljava/util/regex/Pattern;->matcher(Ljava/lang/CharSequence;)Ljava/util/regex/Matcher;

    move-result-object v2

    .line 1634
    new-instance v3, Ljava/util/ArrayList;

    invoke-direct {v3}, Ljava/util/ArrayList;-><init>()V

    .line 1635
    :goto_1
    invoke-virtual {v2}, Ljava/util/regex/Matcher;->find()Z

    move-result v4

    if-nez v4, :cond_3

    .line 1638
    invoke-interface {v3}, Ljava/util/List;->isEmpty()Z

    move-result v1

    if-nez v1, :cond_0

    return-object v3

    .line 1636
    :cond_3
    invoke-virtual {v2, v1}, Ljava/util/regex/Matcher;->group(I)Ljava/lang/String;

    move-result-object v4

    invoke-interface {v3, v4}, Ljava/util/List;->add(Ljava/lang/Object;)Z

    goto :goto_1
.end method

.method public static getActiveGeneration()I
    .locals 1

    .line 872
    sget v0, Lcom/rphub/app/PatchEngine;->activeGeneration:I

    return v0
.end method

.method public static getPromoteFailAt(Landroid/content/Context;)J
    .locals 4

    const-wide/16 v0, 0x0

    :try_start_0
    const-string v2, "rphub_promote_health"

    const/4 v3, 0x0

    .line 1453
    invoke-virtual {p0, v2, v3}, Landroid/content/Context;->getSharedPreferences(Ljava/lang/String;I)Landroid/content/SharedPreferences;

    move-result-object p0

    const-string v2, "fail_at"

    .line 1454
    invoke-interface {p0, v2, v0, v1}, Landroid/content/SharedPreferences;->getLong(Ljava/lang/String;J)J

    move-result-wide v0
    :try_end_0
    .catchall {:try_start_0 .. :try_end_0} :catchall_0

    :catchall_0
    return-wide v0
.end method

.method public static getPromoteFailNote(Landroid/content/Context;)Ljava/lang/String;
    .locals 3

    const-string v0, ""

    :try_start_0
    const-string v1, "rphub_promote_health"

    const/4 v2, 0x0

    .line 1443
    invoke-virtual {p0, v1, v2}, Landroid/content/Context;->getSharedPreferences(Ljava/lang/String;I)Landroid/content/SharedPreferences;

    move-result-object p0

    const-string v1, "fail_note"

    .line 1444
    invoke-interface {p0, v1, v0}, Landroid/content/SharedPreferences;->getString(Ljava/lang/String;Ljava/lang/String;)Ljava/lang/String;

    move-result-object p0
    :try_end_0
    .catchall {:try_start_0 .. :try_end_0} :catchall_0

    return-object p0

    :catchall_0
    return-object v0
.end method

.method public static getPromoteFailStreak(Landroid/content/Context;)I
    .locals 7

    const/4 v0, 0x0

    :try_start_0
    const-string v1, "rphub_promote_health"

    .line 1426
    invoke-virtual {p0, v1, v0}, Landroid/content/Context;->getSharedPreferences(Ljava/lang/String;I)Landroid/content/SharedPreferences;

    move-result-object p0

    const-string v1, "fail_streak"

    .line 1427
    invoke-interface {p0, v1, v0}, Landroid/content/SharedPreferences;->getInt(Ljava/lang/String;I)I

    move-result v1

    if-nez v1, :cond_0

    return v0

    :cond_0
    const-string v2, "fail_at"

    const-wide/16 v3, 0x0

    .line 1429
    invoke-interface {p0, v2, v3, v4}, Landroid/content/SharedPreferences;->getLong(Ljava/lang/String;J)J

    move-result-wide v5

    cmp-long p0, v5, v3

    if-lez p0, :cond_1

    .line 1430
    invoke-static {}, Ljava/lang/System;->currentTimeMillis()J

    move-result-wide v2

    sub-long/2addr v2, v5

    const-wide/32 v4, 0x240c8400

    cmp-long p0, v2, v4

    if-lez p0, :cond_1

    const-string p0, "RPHubPatch"

    .line 1431
    new-instance v2, Ljava/lang/StringBuilder;

    const-string v3, "promote failure streak is stale ("

    invoke-direct {v2, v3}, Ljava/lang/StringBuilder;-><init>(Ljava/lang/String;)V

    invoke-virtual {v2, v1}, Ljava/lang/StringBuilder;->append(I)Ljava/lang/StringBuilder;

    const-string v1, "), treating as 0"

    invoke-virtual {v2, v1}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    invoke-virtual {v2}, Ljava/lang/StringBuilder;->toString()Ljava/lang/String;

    move-result-object v1

    invoke-static {p0, v1}, Landroid/util/Log;->i(Ljava/lang/String;Ljava/lang/String;)I
    :try_end_0
    .catchall {:try_start_0 .. :try_end_0} :catchall_0

    return v0

    :cond_1
    return v1

    :catchall_0
    return v0
.end method

.method private static httpGet(Ljava/lang/String;)Ljava/lang/String;
    .locals 1
    .annotation system Ldalvik/annotation/Throws;
        value = {
            Ljava/lang/Exception;
        }
    .end annotation

    const/16 v0, 0x1388

    .line 2241
    invoke-static {p0, v0, v0}, Lcom/rphub/app/PatchEngine;->httpGetWithTimeout(Ljava/lang/String;II)Ljava/lang/String;

    move-result-object p0

    return-object p0
.end method

.method private static httpGetWithTimeout(Ljava/lang/String;II)Ljava/lang/String;
    .locals 1
    .annotation system Ldalvik/annotation/Throws;
        value = {
            Ljava/lang/Exception;
        }
    .end annotation

    .line 2245
    new-instance v0, Ljava/net/URL;

    invoke-direct {v0, p0}, Ljava/net/URL;-><init>(Ljava/lang/String;)V

    invoke-virtual {v0}, Ljava/net/URL;->openConnection()Ljava/net/URLConnection;

    move-result-object p0

    check-cast p0, Ljava/net/HttpURLConnection;

    .line 2247
    :try_start_0
    invoke-virtual {p0, p1}, Ljava/net/HttpURLConnection;->setConnectTimeout(I)V

    .line 2248
    invoke-virtual {p0, p2}, Ljava/net/HttpURLConnection;->setReadTimeout(I)V

    const/4 p1, 0x1

    .line 2249
    invoke-virtual {p0, p1}, Ljava/net/HttpURLConnection;->setInstanceFollowRedirects(Z)V

    const-string p1, "Cache-Control"

    const-string p2, "no-cache"

    .line 2250
    invoke-virtual {p0, p1, p2}, Ljava/net/HttpURLConnection;->setRequestProperty(Ljava/lang/String;Ljava/lang/String;)V

    .line 2251
    invoke-virtual {p0}, Ljava/net/HttpURLConnection;->getResponseCode()I

    move-result p1

    const/16 p2, 0xc8

    if-lt p1, p2, :cond_1

    const/16 p2, 0x12c

    if-lt p1, p2, :cond_0

    goto :goto_0

    .line 2253
    :cond_0
    invoke-virtual {p0}, Ljava/net/HttpURLConnection;->getInputStream()Ljava/io/InputStream;

    move-result-object p1

    invoke-static {p1}, Lcom/rphub/app/PatchEngine;->readAll(Ljava/io/InputStream;)Ljava/lang/String;

    move-result-object p1
    :try_end_0
    .catchall {:try_start_0 .. :try_end_0} :catchall_0

    .line 2255
    invoke-virtual {p0}, Ljava/net/HttpURLConnection;->disconnect()V

    return-object p1

    :cond_1
    :goto_0
    invoke-virtual {p0}, Ljava/net/HttpURLConnection;->disconnect()V

    const/4 p0, 0x0

    return-object p0

    :catchall_0
    move-exception p1

    invoke-virtual {p0}, Ljava/net/HttpURLConnection;->disconnect()V

    .line 2256
    throw p1
.end method

.method private static indexHtmlChainIntact(Ljava/lang/String;)Z
    .locals 7

    const/4 v0, 0x0

    if-eqz p0, :cond_a

    .line 1583
    invoke-virtual {p0}, Ljava/lang/String;->isEmpty()Z

    move-result v1

    if-eqz v1, :cond_0

    goto/16 :goto_3

    :cond_0
    const-string v1, "id=\"app\""

    .line 1584
    invoke-virtual {p0, v1}, Ljava/lang/String;->indexOf(Ljava/lang/String;)I

    move-result v1

    const-string v2, "RPHubPatch"

    if-gez v1, :cond_1

    const-string v1, "id=\'app\'"

    invoke-virtual {p0, v1}, Ljava/lang/String;->indexOf(Ljava/lang/String;)I

    move-result v1

    if-gez v1, :cond_1

    const-string p0, "index.html self-check: mount point missing"

    .line 1585
    invoke-static {v2, p0}, Landroid/util/Log;->w(Ljava/lang/String;Ljava/lang/String;)I

    return v0

    :cond_1
    const-string v1, "v-cloak"

    .line 1588
    invoke-virtual {p0, v1}, Ljava/lang/String;->indexOf(Ljava/lang/String;)I

    move-result v1

    if-gez v1, :cond_2

    const-string p0, "index.html self-check: v-cloak missing"

    .line 1589
    invoke-static {v2, p0}, Landroid/util/Log;->w(Ljava/lang/String;Ljava/lang/String;)I

    return v0

    .line 1592
    :cond_2
    invoke-static {p0}, Lcom/rphub/app/PatchEngine;->extractBootModuleList(Ljava/lang/String;)Ljava/util/List;

    move-result-object p0

    if-eqz p0, :cond_9

    .line 1593
    invoke-interface {p0}, Ljava/util/List;->isEmpty()Z

    move-result v1

    if-eqz v1, :cond_3

    goto :goto_2

    .line 1598
    :cond_3
    invoke-interface {p0}, Ljava/util/List;->iterator()Ljava/util/Iterator;

    move-result-object v1

    :cond_4
    invoke-interface {v1}, Ljava/util/Iterator;->hasNext()Z

    move-result v3

    if-nez v3, :cond_8

    .line 1604
    sget-object v3, Lcom/rphub/app/PatchEngine;->BOOT_CHAIN_FILES:[Ljava/lang/String;

    array-length v4, v3

    const/4 v1, 0x0

    :goto_0
    if-lt v1, v4, :cond_5

    const/4 p0, 0x1

    return p0

    :cond_5
    aget-object v5, v3, v1

    const-string v6, "index.html"

    .line 1605
    invoke-virtual {v6, v5}, Ljava/lang/String;->equals(Ljava/lang/Object;)Z

    move-result v6

    if-eqz v6, :cond_6

    goto :goto_1

    .line 1606
    :cond_6
    invoke-virtual {v5}, Ljava/lang/String;->length()I

    move-result v6

    add-int/lit8 v6, v6, -0x3

    invoke-virtual {v5, v0, v6}, Ljava/lang/String;->substring(II)Ljava/lang/String;

    move-result-object v6

    invoke-interface {p0, v6}, Ljava/util/List;->contains(Ljava/lang/Object;)Z

    move-result v6

    if-nez v6, :cond_7

    .line 1607
    new-instance p0, Ljava/lang/StringBuilder;

    const-string v1, "index.html self-check: official dropped module we still expect: "

    invoke-direct {p0, v1}, Ljava/lang/StringBuilder;-><init>(Ljava/lang/String;)V

    invoke-virtual {p0, v5}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    invoke-virtual {p0}, Ljava/lang/StringBuilder;->toString()Ljava/lang/String;

    move-result-object p0

    invoke-static {v2, p0}, Landroid/util/Log;->w(Ljava/lang/String;Ljava/lang/String;)I

    return v0

    :cond_7
    :goto_1
    add-int/lit8 v1, v1, 0x1

    goto :goto_0

    .line 1598
    :cond_8
    invoke-interface {v1}, Ljava/util/Iterator;->next()Ljava/lang/Object;

    move-result-object v3

    check-cast v3, Ljava/lang/String;

    .line 1599
    new-instance v4, Ljava/lang/StringBuilder;

    invoke-static {v3}, Ljava/lang/String;->valueOf(Ljava/lang/Object;)Ljava/lang/String;

    move-result-object v5

    invoke-direct {v4, v5}, Ljava/lang/StringBuilder;-><init>(Ljava/lang/String;)V

    const-string v5, ".js"

    invoke-virtual {v4, v5}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    invoke-virtual {v4}, Ljava/lang/StringBuilder;->toString()Ljava/lang/String;

    move-result-object v4

    invoke-static {v4}, Lcom/rphub/app/PatchEngine;->isBootChainKey(Ljava/lang/String;)Z

    move-result v4

    if-nez v4, :cond_4

    .line 1600
    new-instance p0, Ljava/lang/StringBuilder;

    const-string v1, "index.html self-check: official added module not in BOOT_CHAIN_FILES: "

    invoke-direct {p0, v1}, Ljava/lang/StringBuilder;-><init>(Ljava/lang/String;)V

    invoke-virtual {p0, v3}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    invoke-virtual {p0}, Ljava/lang/StringBuilder;->toString()Ljava/lang/String;

    move-result-object p0

    invoke-static {v2, p0}, Landroid/util/Log;->w(Ljava/lang/String;Ljava/lang/String;)I

    return v0

    :cond_9
    :goto_2
    const-string p0, "index.html self-check: boot module list not parseable"

    .line 1594
    invoke-static {v2, p0}, Landroid/util/Log;->w(Ljava/lang/String;Ljava/lang/String;)I

    :cond_a
    :goto_3
    return v0
.end method

.method private static interceptRemote(Landroid/content/Context;Ljava/lang/String;)Landroid/webkit/WebResourceResponse;
    .locals 9

    const/4 v0, 0x0

    .line 331
    :try_start_0
    sget-boolean v1, Lcom/rphub/app/PatchEngine;->safeModeDirect:Z

    if-eqz v1, :cond_0

    return-object v0

    :cond_0
    if-nez p1, :cond_1

    return-object v0

    .line 338
    :cond_1
    invoke-static {p1}, Lcom/rphub/app/PatchEngine;->isPlazaScript(Ljava/lang/String;)Z

    move-result v1

    if-eqz v1, :cond_4

    .line 339
    invoke-static {p0}, Lcom/rphub/app/PatchEngine;->downloadHookJs(Landroid/content/Context;)Ljava/lang/String;

    move-result-object p0

    if-nez p0, :cond_2

    return-object v0

    .line 341
    :cond_2
    invoke-static {}, Lcom/rphub/app/PatchEngine;->plazaScript()Ljava/lang/String;

    move-result-object p1

    if-nez p1, :cond_3

    return-object v0

    .line 344
    :cond_3
    new-instance v1, Ljava/lang/StringBuilder;

    invoke-static {p1}, Ljava/lang/String;->valueOf(Ljava/lang/Object;)Ljava/lang/String;

    move-result-object p1

    invoke-direct {v1, p1}, Ljava/lang/StringBuilder;-><init>(Ljava/lang/String;)V

    const-string p1, "\n;\n"

    invoke-virtual {v1, p1}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    invoke-virtual {v1, p0}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    invoke-virtual {v1}, Ljava/lang/StringBuilder;->toString()Ljava/lang/String;

    move-result-object p0

    const-string p1, "application/javascript"

    invoke-static {p0, p1}, Lcom/rphub/app/PatchEngine;->response(Ljava/lang/String;Ljava/lang/String;)Landroid/webkit/WebResourceResponse;

    move-result-object p0

    return-object p0

    .line 346
    :cond_4
    invoke-static {p1}, Lcom/rphub/app/PatchEngine;->resourceFor(Ljava/lang/String;)[Ljava/lang/String;

    move-result-object v1

    if-nez v1, :cond_5

    return-object v0

    :cond_5
    const/4 v2, 0x0

    .line 348
    aget-object v3, v1, v2

    const/4 v4, 0x1

    .line 349
    aget-object v5, v1, v4

    const/4 v6, 0x2

    .line 350
    aget-object v6, v1, v6

    const/4 v7, 0x3

    .line 351
    aget-object v1, v1, v7

    const-string v7, "1"

    invoke-virtual {v1, v7}, Ljava/lang/String;->equals(Ljava/lang/Object;)Z

    move-result v1

    if-eqz v1, :cond_11

    .line 374
    invoke-static {}, Lcom/rphub/app/PatchEngine;->pageMayServeCdn()Z

    move-result v1
    :try_end_0
    .catchall {:try_start_0 .. :try_end_0} :catchall_0

    const-string v7, "index.html"

    if-eqz v1, :cond_9

    .line 375
    :try_start_1
    sget-object v1, Lcom/rphub/app/PatchEngine;->PATCHED_CACHE:Ljava/util/concurrent/ConcurrentHashMap;

    invoke-virtual {v1, v3}, Ljava/util/concurrent/ConcurrentHashMap;->get(Ljava/lang/Object;)Ljava/lang/Object;

    move-result-object v1

    check-cast v1, Ljava/lang/String;

    if-eqz v1, :cond_7

    .line 377
    invoke-static {p0, p1, v3}, Lcom/rphub/app/PatchEngine;->scheduleRefresh(Landroid/content/Context;Ljava/lang/String;Ljava/lang/String;)V

    .line 379
    invoke-virtual {v7, v3}, Ljava/lang/String;->equals(Ljava/lang/Object;)Z

    move-result p0

    if-eqz p0, :cond_6

    .line 380
    invoke-static {v1, v2}, Lcom/rphub/app/PatchEngine;->markServingSeed(Ljava/lang/String;Z)Ljava/lang/String;

    move-result-object p0

    invoke-static {p0, v5}, Lcom/rphub/app/PatchEngine;->response(Ljava/lang/String;Ljava/lang/String;)Landroid/webkit/WebResourceResponse;

    move-result-object p0

    return-object p0

    .line 382
    :cond_6
    invoke-static {v1, v5}, Lcom/rphub/app/PatchEngine;->response(Ljava/lang/String;Ljava/lang/String;)Landroid/webkit/WebResourceResponse;

    move-result-object p0

    return-object p0

    .line 387
    :cond_7
    invoke-static {p0, v3}, Lcom/rphub/app/PatchEngine;->readCache(Landroid/content/Context;Ljava/lang/String;)Ljava/lang/String;

    move-result-object v1

    if-eqz v1, :cond_9

    .line 388
    invoke-virtual {v1}, Ljava/lang/String;->trim()Ljava/lang/String;

    move-result-object v8

    invoke-virtual {v8}, Ljava/lang/String;->isEmpty()Z

    move-result v8

    if-nez v8, :cond_9

    .line 389
    invoke-static {p0, v1, v3, v6, v4}, Lcom/rphub/app/PatchEngine;->patched(Landroid/content/Context;Ljava/lang/String;Ljava/lang/String;Ljava/lang/String;Z)Ljava/lang/String;

    move-result-object v1

    .line 390
    sget-object v4, Lcom/rphub/app/PatchEngine;->PATCHED_CACHE:Ljava/util/concurrent/ConcurrentHashMap;

    invoke-virtual {v4, v3, v1}, Ljava/util/concurrent/ConcurrentHashMap;->put(Ljava/lang/Object;Ljava/lang/Object;)Ljava/lang/Object;

    .line 391
    invoke-static {p0, p1, v3}, Lcom/rphub/app/PatchEngine;->scheduleRefresh(Landroid/content/Context;Ljava/lang/String;Ljava/lang/String;)V

    .line 392
    invoke-virtual {v7, v3}, Ljava/lang/String;->equals(Ljava/lang/Object;)Z

    move-result p0

    if-eqz p0, :cond_8

    .line 393
    invoke-static {v1, v2}, Lcom/rphub/app/PatchEngine;->markServingSeed(Ljava/lang/String;Z)Ljava/lang/String;

    move-result-object p0

    invoke-static {p0, v5}, Lcom/rphub/app/PatchEngine;->response(Ljava/lang/String;Ljava/lang/String;)Landroid/webkit/WebResourceResponse;

    move-result-object p0

    return-object p0

    .line 395
    :cond_8
    invoke-static {v1, v5}, Lcom/rphub/app/PatchEngine;->response(Ljava/lang/String;Ljava/lang/String;)Landroid/webkit/WebResourceResponse;

    move-result-object p0

    return-object p0

    .line 402
    :cond_9
    invoke-static {v3}, Lcom/rphub/app/PatchEngine;->isBootChainKey(Ljava/lang/String;)Z

    move-result v1

    if-eqz v1, :cond_e

    .line 403
    invoke-static {p0, v6}, Lcom/rphub/app/PatchEngine;->readAsset(Landroid/content/Context;Ljava/lang/String;)Ljava/lang/String;

    move-result-object v1

    if-eqz v1, :cond_b

    .line 407
    invoke-static {v1, v3}, Lcom/rphub/app/PatchEngine;->patchedSeed(Ljava/lang/String;Ljava/lang/String;)Ljava/lang/String;

    move-result-object v1

    .line 411
    invoke-static {p0, p1, v3}, Lcom/rphub/app/PatchEngine;->scheduleRefresh(Landroid/content/Context;Ljava/lang/String;Ljava/lang/String;)V

    .line 414
    invoke-virtual {v7, v3}, Ljava/lang/String;->equals(Ljava/lang/Object;)Z

    move-result p0

    if-eqz p0, :cond_a

    .line 415
    invoke-static {v1, v4}, Lcom/rphub/app/PatchEngine;->markServingSeed(Ljava/lang/String;Z)Ljava/lang/String;

    move-result-object p0

    invoke-static {p0, v5}, Lcom/rphub/app/PatchEngine;->response(Ljava/lang/String;Ljava/lang/String;)Landroid/webkit/WebResourceResponse;

    move-result-object p0

    return-object p0

    .line 417
    :cond_a
    invoke-static {v1, v5}, Lcom/rphub/app/PatchEngine;->response(Ljava/lang/String;Ljava/lang/String;)Landroid/webkit/WebResourceResponse;

    move-result-object p0

    return-object p0

    .line 420
    :cond_b
    invoke-static {p0, v3}, Lcom/rphub/app/PatchEngine;->readCache(Landroid/content/Context;Ljava/lang/String;)Ljava/lang/String;

    move-result-object v1

    if-eqz v1, :cond_d

    .line 422
    invoke-static {p0, v1, v3, v6, v4}, Lcom/rphub/app/PatchEngine;->patched(Landroid/content/Context;Ljava/lang/String;Ljava/lang/String;Ljava/lang/String;Z)Ljava/lang/String;

    move-result-object v1

    .line 423
    invoke-static {p0, p1, v3}, Lcom/rphub/app/PatchEngine;->scheduleRefresh(Landroid/content/Context;Ljava/lang/String;Ljava/lang/String;)V

    .line 425
    invoke-virtual {v7, v3}, Ljava/lang/String;->equals(Ljava/lang/Object;)Z

    move-result p0

    if-eqz p0, :cond_c

    .line 426
    invoke-static {v1, v4}, Lcom/rphub/app/PatchEngine;->markServingSeed(Ljava/lang/String;Z)Ljava/lang/String;

    move-result-object p0

    invoke-static {p0, v5}, Lcom/rphub/app/PatchEngine;->response(Ljava/lang/String;Ljava/lang/String;)Landroid/webkit/WebResourceResponse;

    move-result-object p0

    return-object p0

    .line 428
    :cond_c
    invoke-static {v1, v5}, Lcom/rphub/app/PatchEngine;->response(Ljava/lang/String;Ljava/lang/String;)Landroid/webkit/WebResourceResponse;

    move-result-object p0

    return-object p0

    :cond_d
    return-object v0

    .line 434
    :cond_e
    invoke-static {p0, v3}, Lcom/rphub/app/PatchEngine;->readCache(Landroid/content/Context;Ljava/lang/String;)Ljava/lang/String;

    move-result-object v1

    if-eqz v1, :cond_f

    .line 435
    invoke-virtual {v1}, Ljava/lang/String;->trim()Ljava/lang/String;

    move-result-object v2

    invoke-virtual {v2}, Ljava/lang/String;->isEmpty()Z

    move-result v2

    if-nez v2, :cond_f

    .line 436
    invoke-static {p0, v1, v3, v6, v4}, Lcom/rphub/app/PatchEngine;->patched(Landroid/content/Context;Ljava/lang/String;Ljava/lang/String;Ljava/lang/String;Z)Ljava/lang/String;

    move-result-object v1

    .line 437
    sget-object v2, Lcom/rphub/app/PatchEngine;->PATCHED_CACHE:Ljava/util/concurrent/ConcurrentHashMap;

    invoke-virtual {v2, v3, v1}, Ljava/util/concurrent/ConcurrentHashMap;->put(Ljava/lang/Object;Ljava/lang/Object;)Ljava/lang/Object;

    .line 438
    invoke-static {p0, p1, v3}, Lcom/rphub/app/PatchEngine;->scheduleRefresh(Landroid/content/Context;Ljava/lang/String;Ljava/lang/String;)V

    .line 439
    invoke-static {v1, v5}, Lcom/rphub/app/PatchEngine;->response(Ljava/lang/String;Ljava/lang/String;)Landroid/webkit/WebResourceResponse;

    move-result-object p0

    return-object p0

    .line 442
    :cond_f
    invoke-static {p0, v6}, Lcom/rphub/app/PatchEngine;->readAsset(Landroid/content/Context;Ljava/lang/String;)Ljava/lang/String;

    move-result-object v1

    if-eqz v1, :cond_10

    .line 445
    invoke-static {v1, v3}, Lcom/rphub/app/PatchEngine;->patchedSeed(Ljava/lang/String;Ljava/lang/String;)Ljava/lang/String;

    move-result-object v1

    .line 446
    sget-object v2, Lcom/rphub/app/PatchEngine;->PATCHED_CACHE:Ljava/util/concurrent/ConcurrentHashMap;

    invoke-virtual {v2, v3, v1}, Ljava/util/concurrent/ConcurrentHashMap;->put(Ljava/lang/Object;Ljava/lang/Object;)Ljava/lang/Object;

    .line 447
    invoke-static {p0, p1, v3}, Lcom/rphub/app/PatchEngine;->scheduleRefresh(Landroid/content/Context;Ljava/lang/String;Ljava/lang/String;)V

    .line 448
    invoke-static {v1, v5}, Lcom/rphub/app/PatchEngine;->response(Ljava/lang/String;Ljava/lang/String;)Landroid/webkit/WebResourceResponse;

    move-result-object p0

    return-object p0

    :cond_10
    return-object v0

    :cond_11
    const-string v1, "built-in-content.js"

    .line 472
    invoke-virtual {v1, v3}, Ljava/lang/String;->equals(Ljava/lang/Object;)Z

    move-result v1

    if-eqz v1, :cond_17

    .line 484
    invoke-static {}, Lcom/rphub/app/PatchEngine;->pageMayServeCdn()Z

    move-result v1

    if-eqz v1, :cond_14

    .line 485
    sget-object v1, Lcom/rphub/app/PatchEngine;->RAW_CACHE:Ljava/util/concurrent/ConcurrentHashMap;

    invoke-virtual {v1, v3}, Ljava/util/concurrent/ConcurrentHashMap;->get(Ljava/lang/Object;)Ljava/lang/Object;

    move-result-object v1

    check-cast v1, Ljava/lang/String;

    if-eqz v1, :cond_12

    .line 486
    invoke-virtual {v1}, Ljava/lang/String;->trim()Ljava/lang/String;

    move-result-object v2

    invoke-virtual {v2}, Ljava/lang/String;->isEmpty()Z

    move-result v2

    if-eqz v2, :cond_13

    .line 488
    :cond_12
    invoke-static {p0, v3}, Lcom/rphub/app/PatchEngine;->readCache(Landroid/content/Context;Ljava/lang/String;)Ljava/lang/String;

    move-result-object v1

    if-eqz v1, :cond_13

    .line 489
    invoke-virtual {v1}, Ljava/lang/String;->trim()Ljava/lang/String;

    move-result-object v2

    invoke-virtual {v2}, Ljava/lang/String;->isEmpty()Z

    move-result v2

    if-nez v2, :cond_13

    .line 490
    sget-object v2, Lcom/rphub/app/PatchEngine;->RAW_CACHE:Ljava/util/concurrent/ConcurrentHashMap;

    invoke-virtual {v2, v3, v1}, Ljava/util/concurrent/ConcurrentHashMap;->put(Ljava/lang/Object;Ljava/lang/Object;)Ljava/lang/Object;

    :cond_13
    if-eqz v1, :cond_14

    .line 493
    invoke-virtual {v1}, Ljava/lang/String;->trim()Ljava/lang/String;

    move-result-object v2

    invoke-virtual {v2}, Ljava/lang/String;->isEmpty()Z

    move-result v2

    if-nez v2, :cond_14

    .line 494
    invoke-static {p0, p1, v3}, Lcom/rphub/app/PatchEngine;->scheduleRefresh(Landroid/content/Context;Ljava/lang/String;Ljava/lang/String;)V

    .line 495
    invoke-static {v1, v5}, Lcom/rphub/app/PatchEngine;->response(Ljava/lang/String;Ljava/lang/String;)Landroid/webkit/WebResourceResponse;

    move-result-object p0

    return-object p0

    .line 499
    :cond_14
    invoke-static {p0, v6}, Lcom/rphub/app/PatchEngine;->readAsset(Landroid/content/Context;Ljava/lang/String;)Ljava/lang/String;

    move-result-object v1

    if-eqz v1, :cond_15

    .line 500
    invoke-virtual {v1}, Ljava/lang/String;->trim()Ljava/lang/String;

    move-result-object v2

    invoke-virtual {v2}, Ljava/lang/String;->isEmpty()Z

    move-result v2

    if-nez v2, :cond_15

    .line 501
    invoke-static {p0, p1, v3}, Lcom/rphub/app/PatchEngine;->scheduleRefresh(Landroid/content/Context;Ljava/lang/String;Ljava/lang/String;)V

    .line 502
    invoke-static {v1, v5}, Lcom/rphub/app/PatchEngine;->response(Ljava/lang/String;Ljava/lang/String;)Landroid/webkit/WebResourceResponse;

    move-result-object p0

    return-object p0

    .line 507
    :cond_15
    invoke-static {p1}, Lcom/rphub/app/PatchEngine;->httpGet(Ljava/lang/String;)Ljava/lang/String;

    move-result-object p1

    if-eqz p1, :cond_16

    .line 508
    invoke-virtual {p1}, Ljava/lang/String;->trim()Ljava/lang/String;

    move-result-object v1

    invoke-virtual {v1}, Ljava/lang/String;->isEmpty()Z

    move-result v1

    if-nez v1, :cond_16

    .line 509
    invoke-static {p0, v3, p1}, Lcom/rphub/app/PatchEngine;->writeCache(Landroid/content/Context;Ljava/lang/String;Ljava/lang/String;)V

    .line 510
    invoke-static {p1, v5}, Lcom/rphub/app/PatchEngine;->response(Ljava/lang/String;Ljava/lang/String;)Landroid/webkit/WebResourceResponse;

    move-result-object p0

    return-object p0

    :cond_16
    return-object v0

    :cond_17
    const-string v1, "character-index.html"

    .line 515
    invoke-virtual {v1, v3}, Ljava/lang/String;->equals(Ljava/lang/Object;)Z

    move-result v1

    if-nez v1, :cond_28

    const-string v1, "novel-index.html"

    invoke-virtual {v1, v3}, Ljava/lang/String;->equals(Ljava/lang/Object;)Z

    move-result v1

    if-eqz v1, :cond_18

    goto/16 :goto_0

    :cond_18
    const-string v1, "update-check.js"

    .line 540
    invoke-virtual {v1, v3}, Ljava/lang/String;->equals(Ljava/lang/Object;)Z

    move-result v1

    if-eqz v1, :cond_1e

    .line 543
    invoke-static {}, Lcom/rphub/app/PatchEngine;->pageMayServeCdn()Z

    move-result v1

    if-eqz v1, :cond_1b

    .line 544
    sget-object v1, Lcom/rphub/app/PatchEngine;->RAW_CACHE:Ljava/util/concurrent/ConcurrentHashMap;

    invoke-virtual {v1, v3}, Ljava/util/concurrent/ConcurrentHashMap;->get(Ljava/lang/Object;)Ljava/lang/Object;

    move-result-object v1

    check-cast v1, Ljava/lang/String;

    if-eqz v1, :cond_19

    .line 545
    invoke-virtual {v1}, Ljava/lang/String;->trim()Ljava/lang/String;

    move-result-object v2

    invoke-virtual {v2}, Ljava/lang/String;->isEmpty()Z

    move-result v2

    if-eqz v2, :cond_1a

    .line 547
    :cond_19
    invoke-static {p0, v3}, Lcom/rphub/app/PatchEngine;->readCache(Landroid/content/Context;Ljava/lang/String;)Ljava/lang/String;

    move-result-object v1

    if-eqz v1, :cond_1a

    .line 548
    invoke-virtual {v1}, Ljava/lang/String;->trim()Ljava/lang/String;

    move-result-object v2

    invoke-virtual {v2}, Ljava/lang/String;->isEmpty()Z

    move-result v2

    if-nez v2, :cond_1a

    .line 549
    sget-object v2, Lcom/rphub/app/PatchEngine;->RAW_CACHE:Ljava/util/concurrent/ConcurrentHashMap;

    invoke-virtual {v2, v3, v1}, Ljava/util/concurrent/ConcurrentHashMap;->put(Ljava/lang/Object;Ljava/lang/Object;)Ljava/lang/Object;

    :cond_1a
    if-eqz v1, :cond_1b

    .line 552
    invoke-virtual {v1}, Ljava/lang/String;->trim()Ljava/lang/String;

    move-result-object v2

    invoke-virtual {v2}, Ljava/lang/String;->isEmpty()Z

    move-result v2

    if-nez v2, :cond_1b

    .line 553
    invoke-static {p0, p1, v3}, Lcom/rphub/app/PatchEngine;->scheduleRefresh(Landroid/content/Context;Ljava/lang/String;Ljava/lang/String;)V

    .line 554
    invoke-static {v1, v5}, Lcom/rphub/app/PatchEngine;->response(Ljava/lang/String;Ljava/lang/String;)Landroid/webkit/WebResourceResponse;

    move-result-object p0

    return-object p0

    .line 558
    :cond_1b
    invoke-static {p0, v6}, Lcom/rphub/app/PatchEngine;->readAsset(Landroid/content/Context;Ljava/lang/String;)Ljava/lang/String;

    move-result-object v1

    if-eqz v1, :cond_1c

    .line 559
    invoke-virtual {v1}, Ljava/lang/String;->trim()Ljava/lang/String;

    move-result-object v2

    invoke-virtual {v2}, Ljava/lang/String;->isEmpty()Z

    move-result v2

    if-nez v2, :cond_1c

    .line 560
    invoke-static {p0, p1, v3}, Lcom/rphub/app/PatchEngine;->scheduleRefresh(Landroid/content/Context;Ljava/lang/String;Ljava/lang/String;)V

    .line 561
    invoke-static {v1, v5}, Lcom/rphub/app/PatchEngine;->response(Ljava/lang/String;Ljava/lang/String;)Landroid/webkit/WebResourceResponse;

    move-result-object p0

    return-object p0

    .line 563
    :cond_1c
    invoke-static {p0, v3}, Lcom/rphub/app/PatchEngine;->readCache(Landroid/content/Context;Ljava/lang/String;)Ljava/lang/String;

    move-result-object v1

    if-eqz v1, :cond_1d

    .line 564
    invoke-virtual {v1}, Ljava/lang/String;->trim()Ljava/lang/String;

    move-result-object v2

    invoke-virtual {v2}, Ljava/lang/String;->isEmpty()Z

    move-result v2

    if-nez v2, :cond_1d

    .line 565
    invoke-static {p0, p1, v3}, Lcom/rphub/app/PatchEngine;->scheduleRefresh(Landroid/content/Context;Ljava/lang/String;Ljava/lang/String;)V

    .line 566
    invoke-static {v1, v5}, Lcom/rphub/app/PatchEngine;->response(Ljava/lang/String;Ljava/lang/String;)Landroid/webkit/WebResourceResponse;

    move-result-object p0

    return-object p0

    :cond_1d
    return-object v0

    :cond_1e
    const-string v1, "cloud-backup.js"

    .line 578
    invoke-virtual {v1, v3}, Ljava/lang/String;->equals(Ljava/lang/Object;)Z

    move-result v1

    if-eqz v1, :cond_24

    .line 579
    invoke-static {}, Lcom/rphub/app/PatchEngine;->pageMayServeCdn()Z

    move-result v1

    if-eqz v1, :cond_21

    .line 580
    sget-object v1, Lcom/rphub/app/PatchEngine;->RAW_CACHE:Ljava/util/concurrent/ConcurrentHashMap;

    invoke-virtual {v1, v3}, Ljava/util/concurrent/ConcurrentHashMap;->get(Ljava/lang/Object;)Ljava/lang/Object;

    move-result-object v1

    check-cast v1, Ljava/lang/String;

    if-eqz v1, :cond_1f

    .line 581
    invoke-virtual {v1}, Ljava/lang/String;->trim()Ljava/lang/String;

    move-result-object v2

    invoke-virtual {v2}, Ljava/lang/String;->isEmpty()Z

    move-result v2

    if-eqz v2, :cond_20

    .line 583
    :cond_1f
    invoke-static {p0, v3}, Lcom/rphub/app/PatchEngine;->readCache(Landroid/content/Context;Ljava/lang/String;)Ljava/lang/String;

    move-result-object v1

    if-eqz v1, :cond_20

    .line 584
    invoke-virtual {v1}, Ljava/lang/String;->trim()Ljava/lang/String;

    move-result-object v2

    invoke-virtual {v2}, Ljava/lang/String;->isEmpty()Z

    move-result v2

    if-nez v2, :cond_20

    .line 585
    sget-object v2, Lcom/rphub/app/PatchEngine;->RAW_CACHE:Ljava/util/concurrent/ConcurrentHashMap;

    invoke-virtual {v2, v3, v1}, Ljava/util/concurrent/ConcurrentHashMap;->put(Ljava/lang/Object;Ljava/lang/Object;)Ljava/lang/Object;

    :cond_20
    if-eqz v1, :cond_21

    .line 588
    invoke-virtual {v1}, Ljava/lang/String;->trim()Ljava/lang/String;

    move-result-object v2

    invoke-virtual {v2}, Ljava/lang/String;->isEmpty()Z

    move-result v2

    if-nez v2, :cond_21

    .line 589
    invoke-static {p0, p1, v3}, Lcom/rphub/app/PatchEngine;->scheduleRefresh(Landroid/content/Context;Ljava/lang/String;Ljava/lang/String;)V

    .line 590
    invoke-static {v1, v5}, Lcom/rphub/app/PatchEngine;->response(Ljava/lang/String;Ljava/lang/String;)Landroid/webkit/WebResourceResponse;

    move-result-object p0

    return-object p0

    .line 594
    :cond_21
    invoke-static {p0, v6}, Lcom/rphub/app/PatchEngine;->readAsset(Landroid/content/Context;Ljava/lang/String;)Ljava/lang/String;

    move-result-object v1

    if-eqz v1, :cond_22

    .line 595
    invoke-virtual {v1}, Ljava/lang/String;->trim()Ljava/lang/String;

    move-result-object v2

    invoke-virtual {v2}, Ljava/lang/String;->isEmpty()Z

    move-result v2

    if-nez v2, :cond_22

    .line 596
    invoke-static {p0, p1, v3}, Lcom/rphub/app/PatchEngine;->scheduleRefresh(Landroid/content/Context;Ljava/lang/String;Ljava/lang/String;)V

    .line 597
    invoke-static {v1, v5}, Lcom/rphub/app/PatchEngine;->response(Ljava/lang/String;Ljava/lang/String;)Landroid/webkit/WebResourceResponse;

    move-result-object p0

    return-object p0

    .line 599
    :cond_22
    invoke-static {p0, v3}, Lcom/rphub/app/PatchEngine;->readCache(Landroid/content/Context;Ljava/lang/String;)Ljava/lang/String;

    move-result-object v1

    if-eqz v1, :cond_23

    .line 600
    invoke-virtual {v1}, Ljava/lang/String;->trim()Ljava/lang/String;

    move-result-object v2

    invoke-virtual {v2}, Ljava/lang/String;->isEmpty()Z

    move-result v2

    if-nez v2, :cond_23

    .line 601
    invoke-static {p0, p1, v3}, Lcom/rphub/app/PatchEngine;->scheduleRefresh(Landroid/content/Context;Ljava/lang/String;Ljava/lang/String;)V

    .line 602
    invoke-static {v1, v5}, Lcom/rphub/app/PatchEngine;->response(Ljava/lang/String;Ljava/lang/String;)Landroid/webkit/WebResourceResponse;

    move-result-object p0

    return-object p0

    :cond_23
    return-object v0

    .line 607
    :cond_24
    invoke-static {p0, v3}, Lcom/rphub/app/PatchEngine;->readCache(Landroid/content/Context;Ljava/lang/String;)Ljava/lang/String;

    move-result-object v1

    if-eqz v1, :cond_25

    .line 609
    invoke-static {p0, p1, v3}, Lcom/rphub/app/PatchEngine;->scheduleRefresh(Landroid/content/Context;Ljava/lang/String;Ljava/lang/String;)V

    .line 610
    invoke-static {v1, v5}, Lcom/rphub/app/PatchEngine;->response(Ljava/lang/String;Ljava/lang/String;)Landroid/webkit/WebResourceResponse;

    move-result-object p0

    return-object p0

    .line 613
    :cond_25
    invoke-static {p0, v6}, Lcom/rphub/app/PatchEngine;->readAsset(Landroid/content/Context;Ljava/lang/String;)Ljava/lang/String;

    move-result-object v1

    if-eqz v1, :cond_26

    .line 615
    invoke-static {p0, v3, v1}, Lcom/rphub/app/PatchEngine;->writeCache(Landroid/content/Context;Ljava/lang/String;Ljava/lang/String;)V

    .line 616
    invoke-static {p0, p1, v3}, Lcom/rphub/app/PatchEngine;->scheduleRefresh(Landroid/content/Context;Ljava/lang/String;Ljava/lang/String;)V

    .line 617
    invoke-static {v1, v5}, Lcom/rphub/app/PatchEngine;->response(Ljava/lang/String;Ljava/lang/String;)Landroid/webkit/WebResourceResponse;

    move-result-object p0

    return-object p0

    .line 620
    :cond_26
    invoke-static {p1}, Lcom/rphub/app/PatchEngine;->httpGet(Ljava/lang/String;)Ljava/lang/String;

    move-result-object p1

    if-nez p1, :cond_27

    return-object v0

    .line 622
    :cond_27
    invoke-static {p0, v3, p1}, Lcom/rphub/app/PatchEngine;->writeCache(Landroid/content/Context;Ljava/lang/String;Ljava/lang/String;)V

    .line 623
    invoke-static {p1, v5}, Lcom/rphub/app/PatchEngine;->response(Ljava/lang/String;Ljava/lang/String;)Landroid/webkit/WebResourceResponse;

    move-result-object p0

    return-object p0

    :cond_28
    :goto_0
    const/16 v1, 0x3e8

    const/16 v2, 0x5dc

    .line 516
    invoke-static {p1, v1, v2}, Lcom/rphub/app/PatchEngine;->httpGetWithTimeout(Ljava/lang/String;II)Ljava/lang/String;

    move-result-object v1

    if-eqz v1, :cond_29

    .line 517
    invoke-virtual {v1}, Ljava/lang/String;->trim()Ljava/lang/String;

    move-result-object v2

    invoke-virtual {v2}, Ljava/lang/String;->isEmpty()Z

    move-result v2

    if-nez v2, :cond_29

    .line 518
    invoke-static {p0, v3, v1}, Lcom/rphub/app/PatchEngine;->writeCache(Landroid/content/Context;Ljava/lang/String;Ljava/lang/String;)V

    .line 519
    invoke-static {v1, v5}, Lcom/rphub/app/PatchEngine;->response(Ljava/lang/String;Ljava/lang/String;)Landroid/webkit/WebResourceResponse;

    move-result-object p0

    return-object p0

    .line 522
    :cond_29
    invoke-static {p0, v3}, Lcom/rphub/app/PatchEngine;->readCache(Landroid/content/Context;Ljava/lang/String;)Ljava/lang/String;

    move-result-object v1

    if-eqz v1, :cond_2a

    .line 524
    invoke-static {v1, v5}, Lcom/rphub/app/PatchEngine;->response(Ljava/lang/String;Ljava/lang/String;)Landroid/webkit/WebResourceResponse;

    move-result-object p0

    return-object p0

    .line 527
    :cond_2a
    invoke-static {p0, v6}, Lcom/rphub/app/PatchEngine;->readAsset(Landroid/content/Context;Ljava/lang/String;)Ljava/lang/String;

    move-result-object v1

    if-eqz v1, :cond_2b

    .line 529
    invoke-static {p0, v3, v1}, Lcom/rphub/app/PatchEngine;->writeCache(Landroid/content/Context;Ljava/lang/String;Ljava/lang/String;)V

    .line 530
    invoke-static {p0, p1, v3}, Lcom/rphub/app/PatchEngine;->scheduleRefresh(Landroid/content/Context;Ljava/lang/String;Ljava/lang/String;)V

    .line 531
    invoke-static {v1, v5}, Lcom/rphub/app/PatchEngine;->response(Ljava/lang/String;Ljava/lang/String;)Landroid/webkit/WebResourceResponse;

    move-result-object p0
    :try_end_1
    .catchall {:try_start_1 .. :try_end_1} :catchall_0

    return-object p0

    :cond_2b
    return-object v0

    :catchall_0
    move-exception p0

    const-string p1, "RPHubPatch"

    const-string v1, "patch failed"

    .line 625
    invoke-static {p1, v1, p0}, Landroid/util/Log;->w(Ljava/lang/String;Ljava/lang/String;Ljava/lang/Throwable;)I

    return-object v0
.end method

.method private static isBootChainConsistent(Ljava/lang/String;Ljava/lang/String;)Z
    .locals 5

    const-string v0, "index.html"

    .line 1555
    invoke-virtual {v0, p0}, Ljava/lang/String;->equals(Ljava/lang/Object;)Z

    move-result v0

    if-eqz v0, :cond_0

    invoke-static {p1}, Lcom/rphub/app/PatchEngine;->indexHtmlChainIntact(Ljava/lang/String;)Z

    move-result p0

    return p0

    :cond_0
    const-string v0, "app.js"

    .line 1556
    invoke-virtual {v0, p0}, Ljava/lang/String;->equals(Ljava/lang/Object;)Z

    move-result v0

    if-eqz v0, :cond_1

    invoke-static {p1}, Lcom/rphub/app/PatchEngine;->appJsConsumesIntact(Ljava/lang/String;)Z

    move-result p0

    return p0

    .line 1558
    :cond_1
    sget-object v0, Lcom/rphub/app/PatchEngine;->BOOT_CHAIN_PROVIDES:Ljava/util/Map;

    invoke-interface {v0, p0}, Ljava/util/Map;->get(Ljava/lang/Object;)Ljava/lang/Object;

    move-result-object p0

    check-cast p0, [Ljava/lang/String;

    const/4 v0, 0x1

    if-nez p0, :cond_2

    return v0

    .line 1560
    :cond_2
    array-length v1, p0

    const/4 v2, 0x0

    const/4 v3, 0x0

    :goto_0
    if-lt v3, v1, :cond_3

    return v0

    :cond_3
    aget-object v4, p0, v3

    .line 1561
    invoke-virtual {p1, v4}, Ljava/lang/String;->indexOf(Ljava/lang/String;)I

    move-result v4

    if-gez v4, :cond_4

    return v2

    :cond_4
    add-int/lit8 v3, v3, 0x1

    goto :goto_0
.end method

.method private static isBootChainKey(Ljava/lang/String;)Z
    .locals 5

    .line 1348
    sget-object v0, Lcom/rphub/app/PatchEngine;->BOOT_CHAIN_FILES:[Ljava/lang/String;

    array-length v1, v0

    const/4 v2, 0x0

    const/4 v3, 0x0

    :goto_0
    if-lt v3, v1, :cond_0

    return v2

    :cond_0
    aget-object v4, v0, v3

    .line 1349
    invoke-virtual {v4, p0}, Ljava/lang/String;->equals(Ljava/lang/Object;)Z

    move-result v4

    if-eqz v4, :cond_1

    const/4 p0, 0x1

    return p0

    :cond_1
    add-int/lit8 v3, v3, 0x1

    goto :goto_0
.end method

.method private static isCriticalAnchor(Ljava/lang/String;I)Z
    .locals 0

    const/4 p0, 0x0

    return p0
.end method

.method private static isHtmlBalanced(Ljava/lang/String;)Z
    .locals 6

    const/4 v0, 0x1

    if-eqz p0, :cond_7

    .line 2105
    invoke-virtual {p0}, Ljava/lang/String;->isEmpty()Z

    move-result v1

    if-eqz v1, :cond_0

    goto/16 :goto_2

    .line 2106
    :cond_0
    sget-object v1, Lcom/rphub/app/PatchEngine;->HTML_SCRIPT_RE:Ljava/util/regex/Pattern;

    invoke-virtual {v1, p0}, Ljava/util/regex/Pattern;->matcher(Ljava/lang/CharSequence;)Ljava/util/regex/Matcher;

    move-result-object p0

    const-string v1, ""

    invoke-virtual {p0, v1}, Ljava/util/regex/Matcher;->replaceAll(Ljava/lang/String;)Ljava/lang/String;

    move-result-object p0

    .line 2107
    sget-object v2, Lcom/rphub/app/PatchEngine;->HTML_STYLE_RE:Ljava/util/regex/Pattern;

    invoke-virtual {v2, p0}, Ljava/util/regex/Pattern;->matcher(Ljava/lang/CharSequence;)Ljava/util/regex/Matcher;

    move-result-object p0

    invoke-virtual {p0, v1}, Ljava/util/regex/Matcher;->replaceAll(Ljava/lang/String;)Ljava/lang/String;

    move-result-object p0

    .line 2108
    sget-object v2, Lcom/rphub/app/PatchEngine;->HTML_COMMENT_RE:Ljava/util/regex/Pattern;

    invoke-virtual {v2, p0}, Ljava/util/regex/Pattern;->matcher(Ljava/lang/CharSequence;)Ljava/util/regex/Matcher;

    move-result-object p0

    invoke-virtual {p0, v1}, Ljava/util/regex/Matcher;->replaceAll(Ljava/lang/String;)Ljava/lang/String;

    move-result-object p0

    .line 2109
    new-instance v1, Ljava/util/ArrayDeque;

    invoke-direct {v1}, Ljava/util/ArrayDeque;-><init>()V

    .line 2110
    sget-object v2, Lcom/rphub/app/PatchEngine;->HTML_TAG_RE:Ljava/util/regex/Pattern;

    invoke-virtual {v2, p0}, Ljava/util/regex/Pattern;->matcher(Ljava/lang/CharSequence;)Ljava/util/regex/Matcher;

    move-result-object p0

    .line 2111
    :cond_1
    :goto_0
    invoke-virtual {p0}, Ljava/util/regex/Matcher;->find()Z

    move-result v2

    if-nez v2, :cond_2

    .line 2123
    invoke-virtual {v1}, Ljava/util/ArrayDeque;->isEmpty()Z

    move-result p0

    return p0

    :cond_2
    const/4 v2, 0x2

    .line 2112
    invoke-virtual {p0, v2}, Ljava/util/regex/Matcher;->group(I)Ljava/lang/String;

    move-result-object v2

    sget-object v3, Ljava/util/Locale;->ROOT:Ljava/util/Locale;

    invoke-virtual {v2, v3}, Ljava/lang/String;->toLowerCase(Ljava/util/Locale;)Ljava/lang/String;

    move-result-object v2

    .line 2113
    invoke-virtual {p0, v0}, Ljava/util/regex/Matcher;->group(I)Ljava/lang/String;

    move-result-object v3

    const-string v4, "/"

    invoke-virtual {v4, v3}, Ljava/lang/String;->equals(Ljava/lang/Object;)Z

    move-result v3

    const/4 v5, 0x4

    .line 2114
    invoke-virtual {p0, v5}, Ljava/util/regex/Matcher;->group(I)Ljava/lang/String;

    move-result-object v5

    invoke-virtual {v4, v5}, Ljava/lang/String;->equals(Ljava/lang/Object;)Z

    move-result v4

    .line 2115
    sget-object v5, Lcom/rphub/app/PatchEngine;->HTML_VOID_TAGS:Ljava/util/Set;

    invoke-interface {v5, v2}, Ljava/util/Set;->contains(Ljava/lang/Object;)Z

    move-result v5

    if-nez v5, :cond_1

    if-eqz v4, :cond_3

    goto :goto_0

    :cond_3
    if-nez v3, :cond_4

    .line 2117
    invoke-virtual {v1, v2}, Ljava/util/ArrayDeque;->push(Ljava/lang/Object;)V

    goto :goto_0

    .line 2119
    :cond_4
    invoke-virtual {v1}, Ljava/util/ArrayDeque;->isEmpty()Z

    move-result v3

    if-nez v3, :cond_6

    invoke-virtual {v1}, Ljava/util/ArrayDeque;->peek()Ljava/lang/Object;

    move-result-object v3

    check-cast v3, Ljava/lang/String;

    invoke-virtual {v3, v2}, Ljava/lang/String;->equals(Ljava/lang/Object;)Z

    move-result v2

    if-nez v2, :cond_5

    goto :goto_1

    .line 2120
    :cond_5
    invoke-virtual {v1}, Ljava/util/ArrayDeque;->pop()Ljava/lang/Object;

    goto :goto_0

    :cond_6
    :goto_1
    const/4 p0, 0x0

    return p0

    :cond_7
    :goto_2
    return v0
.end method

.method private static isPatchableKey(Ljava/lang/String;)Z
    .locals 1

    const-string v0, "index.html"

    .line 1729
    invoke-virtual {v0, p0}, Ljava/lang/String;->equals(Ljava/lang/Object;)Z

    move-result v0

    if-nez v0, :cond_0

    const-string v0, "app.js"

    .line 1730
    invoke-virtual {v0, p0}, Ljava/lang/String;->equals(Ljava/lang/Object;)Z

    move-result v0

    if-nez v0, :cond_0

    const-string v0, "core-utils.js"

    .line 1731
    invoke-virtual {v0, p0}, Ljava/lang/String;->equals(Ljava/lang/Object;)Z

    move-result v0

    if-nez v0, :cond_0

    const-string v0, "data-services.js"

    .line 1732
    invoke-virtual {v0, p0}, Ljava/lang/String;->equals(Ljava/lang/Object;)Z

    move-result v0

    if-nez v0, :cond_0

    const-string v0, "ui-components.js"

    .line 1733
    invoke-virtual {v0, p0}, Ljava/lang/String;->equals(Ljava/lang/Object;)Z

    move-result v0

    if-nez v0, :cond_0

    const-string v0, "runtime-services.js"

    .line 1734
    invoke-virtual {v0, p0}, Ljava/lang/String;->equals(Ljava/lang/Object;)Z

    move-result v0

    if-nez v0, :cond_0

    const-string v0, "api-utils.js"

    .line 1735
    invoke-virtual {v0, p0}, Ljava/lang/String;->equals(Ljava/lang/Object;)Z

    move-result p0

    if-nez p0, :cond_0

    const/4 p0, 0x0

    return p0

    :cond_0
    const/4 p0, 0x1

    return p0
.end method

.method private static isPlazaScript(Ljava/lang/String;)Z
    .locals 3

    const/4 v0, 0x0

    if-eqz p0, :cond_3

    .line 701
    invoke-virtual {p0}, Ljava/lang/String;->length()I

    move-result v1

    const/16 v2, 0x14

    if-ge v1, v2, :cond_0

    goto :goto_1

    :cond_0
    const-string v1, "https://rphforum.zeabur.app/"

    .line 702
    invoke-virtual {p0, v1}, Ljava/lang/String;->startsWith(Ljava/lang/String;)Z

    move-result v1

    if-nez v1, :cond_1

    return v0

    :cond_1
    const/16 v1, 0x3f

    .line 703
    invoke-virtual {p0, v1}, Ljava/lang/String;->indexOf(I)I

    move-result v1

    if-gez v1, :cond_2

    goto :goto_0

    .line 704
    :cond_2
    invoke-virtual {p0, v0, v1}, Ljava/lang/String;->substring(II)Ljava/lang/String;

    move-result-object p0

    :goto_0
    const-string v0, "/theme.js"

    .line 705
    invoke-virtual {p0, v0}, Ljava/lang/String;->endsWith(Ljava/lang/String;)Z

    move-result p0

    return p0

    :cond_3
    :goto_1
    return v0
.end method

.method private static isRejected(Landroid/content/Context;Ljava/lang/String;)Z
    .locals 0

    if-nez p1, :cond_0

    const/4 p0, 0x0

    return p0

    .line 1293
    :cond_0
    invoke-static {p0}, Lcom/rphub/app/PatchEngine;->readRejected(Landroid/content/Context;)Ljava/util/List;

    move-result-object p0

    invoke-interface {p0, p1}, Ljava/util/List;->contains(Ljava/lang/Object;)Z

    move-result p0

    return p0
.end method

.method public static isSafeModeDirect()Z
    .locals 1

    .line 140
    sget-boolean v0, Lcom/rphub/app/PatchEngine;->safeModeDirect:Z

    return v0
.end method

.method public static isServingSeed()Z
    .locals 1

    .line 894
    invoke-static {}, Lcom/rphub/app/PatchEngine;->pageMayServeCdn()Z

    move-result v0

    xor-int/lit8 v0, v0, 0x1

    return v0
.end method

.method private static jsBracketProfile(Ljava/lang/String;)[I
    .locals 12

    const/4 v0, 0x0

    if-nez p0, :cond_0

    return-object v0

    .line 2164
    :cond_0
    invoke-virtual {p0}, Ljava/lang/String;->length()I

    move-result v1

    const/4 v2, 0x0

    const/4 v3, 0x0

    const/4 v4, 0x0

    const/4 v5, 0x0

    const/4 v6, 0x0

    const/4 v7, 0x0

    :cond_1
    :goto_0
    const/4 v8, 0x1

    if-lt v3, v1, :cond_2

    const/4 p0, 0x4

    new-array p0, p0, [I

    aput v4, p0, v2

    aput v5, p0, v8

    const/4 v0, 0x2

    aput v6, p0, v0

    const/4 v0, 0x3

    aput v7, p0, v0

    return-object p0

    .line 2167
    :cond_2
    invoke-virtual {p0, v3}, Ljava/lang/String;->charAt(I)C

    move-result v9

    const/16 v10, 0x2f

    if-ne v9, v10, :cond_3

    add-int/lit8 v11, v3, 0x1

    if-ge v11, v1, :cond_3

    .line 2168
    invoke-virtual {p0, v11}, Ljava/lang/String;->charAt(I)C

    move-result v11

    if-ne v11, v10, :cond_3

    const/16 v8, 0xa

    .line 2169
    invoke-virtual {p0, v8, v3}, Ljava/lang/String;->indexOf(II)I

    move-result v3

    if-gez v3, :cond_c

    move v3, v1

    goto :goto_0

    :cond_3
    if-ne v9, v10, :cond_5

    add-int/lit8 v10, v3, 0x1

    if-ge v10, v1, :cond_5

    .line 2171
    invoke-virtual {p0, v10}, Ljava/lang/String;->charAt(I)C

    move-result v10

    const/16 v11, 0x2a

    if-ne v10, v11, :cond_5

    add-int/lit8 v3, v3, 0x2

    const-string v8, "*/"

    .line 2172
    invoke-virtual {p0, v8, v3}, Ljava/lang/String;->indexOf(Ljava/lang/String;I)I

    move-result v3

    if-gez v3, :cond_4

    return-object v0

    :cond_4
    add-int/lit8 v3, v3, 0x2

    goto :goto_0

    :cond_5
    const/16 v10, 0x27

    if-eq v9, v10, :cond_d

    const/16 v10, 0x22

    if-eq v9, v10, :cond_d

    const/16 v10, 0x60

    if-ne v9, v10, :cond_6

    goto :goto_3

    :cond_6
    const/16 v10, 0x7b

    if-ne v9, v10, :cond_7

    add-int/lit8 v4, v4, 0x1

    goto :goto_2

    :cond_7
    const/16 v10, 0x7d

    if-ne v9, v10, :cond_8

    add-int/lit8 v4, v4, -0x1

    if-gez v4, :cond_c

    :goto_1
    const/4 v7, 0x1

    goto :goto_2

    :cond_8
    const/16 v10, 0x28

    if-ne v9, v10, :cond_9

    add-int/lit8 v5, v5, 0x1

    goto :goto_2

    :cond_9
    const/16 v10, 0x29

    if-ne v9, v10, :cond_a

    add-int/lit8 v5, v5, -0x1

    if-gez v5, :cond_c

    goto :goto_1

    :cond_a
    const/16 v10, 0x5b

    if-ne v9, v10, :cond_b

    add-int/lit8 v6, v6, 0x1

    goto :goto_2

    :cond_b
    const/16 v10, 0x5d

    if-ne v9, v10, :cond_c

    add-int/lit8 v6, v6, -0x1

    if-gez v6, :cond_c

    goto :goto_1

    :cond_c
    :goto_2
    add-int/lit8 v3, v3, 0x1

    goto/16 :goto_0

    :cond_d
    :goto_3
    add-int/lit8 v3, v3, 0x1

    :goto_4
    if-lt v3, v1, :cond_e

    const/4 v8, 0x0

    goto :goto_5

    .line 2180
    :cond_e
    invoke-virtual {p0, v3}, Ljava/lang/String;->charAt(I)C

    move-result v10

    const/16 v11, 0x5c

    if-ne v10, v11, :cond_f

    add-int/lit8 v3, v3, 0x2

    goto :goto_4

    :cond_f
    if-ne v10, v9, :cond_d

    add-int/lit8 v3, v3, 0x1

    :goto_5
    if-nez v8, :cond_1

    return-object v0
.end method

.method static synthetic lambda$0(Ljava/lang/String;JLjava/lang/String;Landroid/content/Context;)V
    .locals 2

    const-string v0, "RPHubPatch"

    .line 937
    :try_start_0
    invoke-static {p3}, Lcom/rphub/app/PatchEngine;->httpGet(Ljava/lang/String;)Ljava/lang/String;

    move-result-object p3

    if-eqz p3, :cond_1

    .line 938
    invoke-virtual {p3}, Ljava/lang/String;->trim()Ljava/lang/String;

    move-result-object v1

    invoke-virtual {v1}, Ljava/lang/String;->isEmpty()Z

    move-result v1

    if-eqz v1, :cond_0

    goto :goto_0

    .line 943
    :cond_0
    invoke-static {p0, p3}, Lcom/rphub/app/PatchEngine;->isBootChainConsistent(Ljava/lang/String;Ljava/lang/String;)Z

    move-result v1

    if-nez v1, :cond_2

    .line 944
    new-instance p3, Ljava/lang/StringBuilder;

    const-string p4, "refresh rejected (boot-chain mismatch): "

    invoke-direct {p3, p4}, Ljava/lang/StringBuilder;-><init>(Ljava/lang/String;)V

    invoke-virtual {p3, p0}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    invoke-virtual {p3}, Ljava/lang/StringBuilder;->toString()Ljava/lang/String;

    move-result-object p3

    invoke-static {v0, p3}, Landroid/util/Log;->w(Ljava/lang/String;Ljava/lang/String;)I
    :try_end_0
    .catchall {:try_start_0 .. :try_end_0} :catchall_0

    .line 984
    :cond_1
    :goto_0
    sget-object p3, Lcom/rphub/app/PatchEngine;->REFRESH_ATTEMPTS:Ljava/util/concurrent/ConcurrentHashMap;

    invoke-static {p1, p2}, Ljava/lang/Long;->valueOf(J)Ljava/lang/Long;

    move-result-object p1

    invoke-virtual {p3, p0, p1}, Ljava/util/concurrent/ConcurrentHashMap;->remove(Ljava/lang/Object;Ljava/lang/Object;)Z

    return-void

    .line 954
    :cond_2
    :try_start_1
    invoke-static {p4, p0, p3}, Lcom/rphub/app/PatchEngine;->satisfiesCrossFileContract(Landroid/content/Context;Ljava/lang/String;Ljava/lang/String;)Z

    move-result v1

    if-nez v1, :cond_3

    .line 955
    new-instance p3, Ljava/lang/StringBuilder;

    const-string p4, "refresh rejected (cross-file contract): "

    invoke-direct {p3, p4}, Ljava/lang/StringBuilder;-><init>(Ljava/lang/String;)V

    invoke-virtual {p3, p0}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    invoke-virtual {p3}, Ljava/lang/StringBuilder;->toString()Ljava/lang/String;

    move-result-object p3

    invoke-static {v0, p3}, Landroid/util/Log;->w(Ljava/lang/String;Ljava/lang/String;)I

    goto :goto_0

    :cond_3
    const-string v1, "index.html"

    .line 966
    invoke-virtual {v1, p0}, Ljava/lang/String;->equals(Ljava/lang/Object;)Z

    move-result v1

    if-eqz v1, :cond_4

    invoke-static {p3}, Lcom/rphub/app/PatchEngine;->patchesBrokeHtml(Ljava/lang/String;)Z

    move-result v1

    if-eqz v1, :cond_4

    .line 967
    new-instance p3, Ljava/lang/StringBuilder;

    const-string p4, "refresh rejected (patch broke html balance): "

    invoke-direct {p3, p4}, Ljava/lang/StringBuilder;-><init>(Ljava/lang/String;)V

    invoke-virtual {p3, p0}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    invoke-virtual {p3}, Ljava/lang/StringBuilder;->toString()Ljava/lang/String;

    move-result-object p3

    invoke-static {v0, p3}, Landroid/util/Log;->w(Ljava/lang/String;Ljava/lang/String;)I

    goto :goto_0

    .line 980
    :cond_4
    invoke-static {p4, p0, p3}, Lcom/rphub/app/PatchEngine;->stageAndTryPromote(Landroid/content/Context;Ljava/lang/String;Ljava/lang/String;)V
    :try_end_1
    .catchall {:try_start_1 .. :try_end_1} :catchall_0

    goto :goto_1

    .line 982
    :catchall_0
    :try_start_2
    new-instance p3, Ljava/lang/StringBuilder;

    const-string p4, "refresh skipped: "

    invoke-direct {p3, p4}, Ljava/lang/StringBuilder;-><init>(Ljava/lang/String;)V

    invoke-virtual {p3, p0}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    invoke-virtual {p3}, Ljava/lang/StringBuilder;->toString()Ljava/lang/String;

    move-result-object p3

    invoke-static {v0, p3}, Landroid/util/Log;->i(Ljava/lang/String;Ljava/lang/String;)I
    :try_end_2
    .catchall {:try_start_2 .. :try_end_2} :catchall_1

    .line 984
    :goto_1
    sget-object p3, Lcom/rphub/app/PatchEngine;->REFRESH_ATTEMPTS:Ljava/util/concurrent/ConcurrentHashMap;

    invoke-static {p1, p2}, Ljava/lang/Long;->valueOf(J)Ljava/lang/Long;

    move-result-object p1

    invoke-virtual {p3, p0, p1}, Ljava/util/concurrent/ConcurrentHashMap;->remove(Ljava/lang/Object;Ljava/lang/Object;)Z

    return-void

    :catchall_1
    move-exception p3

    sget-object p4, Lcom/rphub/app/PatchEngine;->REFRESH_ATTEMPTS:Ljava/util/concurrent/ConcurrentHashMap;

    invoke-static {p1, p2}, Ljava/lang/Long;->valueOf(J)Ljava/lang/Long;

    move-result-object p1

    invoke-virtual {p4, p0, p1}, Ljava/util/concurrent/ConcurrentHashMap;->remove(Ljava/lang/Object;Ljava/lang/Object;)Z

    .line 985
    goto :goto_3

    :goto_2
    throw p3

    :goto_3
    goto :goto_2
.end method

.method public static declared-synchronized load(Landroid/content/Context;)V
    .locals 0
    return-void
.end method

.method private static markRejected(Landroid/content/Context;Ljava/lang/String;)V
    .locals 2

    if-nez p1, :cond_0

    return-void

    .line 1298
    :cond_0
    invoke-static {p0}, Lcom/rphub/app/PatchEngine;->readRejected(Landroid/content/Context;)Ljava/util/List;

    move-result-object v0

    .line 1299
    invoke-interface {v0, p1}, Ljava/util/List;->contains(Ljava/lang/Object;)Z

    move-result v1

    if-eqz v1, :cond_1

    return-void

    .line 1300
    :cond_1
    invoke-interface {v0, p1}, Ljava/util/List;->add(Ljava/lang/Object;)Z

    .line 1301
    invoke-static {p0, v0}, Lcom/rphub/app/PatchEngine;->writeRejected(Landroid/content/Context;Ljava/util/List;)V

    .line 1302
    new-instance p0, Ljava/lang/StringBuilder;

    const-string v0, "generation blacklisted: "

    invoke-direct {p0, v0}, Ljava/lang/StringBuilder;-><init>(Ljava/lang/String;)V

    invoke-virtual {p0, p1}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    invoke-virtual {p0}, Ljava/lang/StringBuilder;->toString()Ljava/lang/String;

    move-result-object p0

    const-string p1, "RPHubPatch"

    invoke-static {p1, p0}, Landroid/util/Log;->w(Ljava/lang/String;Ljava/lang/String;)I

    return-void
.end method

.method private static markServingSeed(Ljava/lang/String;Z)Ljava/lang/String;
    .locals 3

    if-eqz p0, :cond_3

    .line 913
    invoke-virtual {p0}, Ljava/lang/String;->isEmpty()Z

    move-result v0

    if-eqz v0, :cond_0

    goto :goto_0

    :cond_0
    const-string v0, "<head>"

    .line 914
    invoke-virtual {p0, v0}, Ljava/lang/String;->indexOf(Ljava/lang/String;)I

    move-result v0

    if-gez v0, :cond_1

    return-object p0

    .line 916
    :cond_1
    new-instance v1, Ljava/lang/StringBuilder;

    const-string v2, "<script>window.__rphubServingSeed="

    invoke-direct {v1, v2}, Ljava/lang/StringBuilder;-><init>(Ljava/lang/String;)V

    invoke-virtual {v1, p1}, Ljava/lang/StringBuilder;->append(Z)Ljava/lang/StringBuilder;

    const-string p1, ";</script>"

    invoke-virtual {v1, p1}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    invoke-virtual {v1}, Ljava/lang/StringBuilder;->toString()Ljava/lang/String;

    move-result-object p1

    const-string v1, "window.__rphubServingSeed"

    .line 917
    invoke-virtual {p0, v1}, Ljava/lang/String;->indexOf(Ljava/lang/String;)I

    move-result v1

    if-ltz v1, :cond_2

    return-object p0

    .line 918
    :cond_2
    new-instance v1, Ljava/lang/StringBuilder;

    const/4 v2, 0x0

    add-int/lit8 v0, v0, 0x6

    invoke-virtual {p0, v2, v0}, Ljava/lang/String;->substring(II)Ljava/lang/String;

    move-result-object v2

    invoke-static {v2}, Ljava/lang/String;->valueOf(Ljava/lang/Object;)Ljava/lang/String;

    move-result-object v2

    invoke-direct {v1, v2}, Ljava/lang/StringBuilder;-><init>(Ljava/lang/String;)V

    invoke-virtual {v1, p1}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    invoke-virtual {p0, v0}, Ljava/lang/String;->substring(I)Ljava/lang/String;

    move-result-object p0

    invoke-virtual {v1, p0}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    invoke-virtual {v1}, Ljava/lang/StringBuilder;->toString()Ljava/lang/String;

    move-result-object p0

    :cond_3
    :goto_0
    return-object p0
.end method

.method private static pageMayServeCdn()Z
    .locals 2

    .line 196
    sget v0, Lcom/rphub/app/PatchEngine;->pageGeneration:I

    if-lez v0, :cond_0

    .line 197
    sget v1, Lcom/rphub/app/PatchEngine;->activeGeneration:I

    if-ne v0, v1, :cond_0

    const/4 v0, 0x1

    return v0

    :cond_0
    const/4 v0, 0x0

    return v0
.end method

.method private static patched(Landroid/content/Context;Ljava/lang/String;Ljava/lang/String;Ljava/lang/String;Z)Ljava/lang/String;
    .locals 0

    if-nez p4, :cond_0

    return-object p1

    .line 822
    :cond_0
    invoke-static {p0, p2, p3}, Lcom/rphub/app/PatchEngine;->seedMissBaseline(Landroid/content/Context;Ljava/lang/String;Ljava/lang/String;)I

    move-result p4

    .line 823
    invoke-static {p1, p2, p4}, Lcom/rphub/app/PatchEngine;->applyLenient(Ljava/lang/String;Ljava/lang/String;I)Ljava/lang/String;

    move-result-object p4

    if-eqz p4, :cond_1

    return-object p4

    .line 827
    :cond_1
    invoke-static {p0, p3}, Lcom/rphub/app/PatchEngine;->readAsset(Landroid/content/Context;Ljava/lang/String;)Ljava/lang/String;

    move-result-object p0

    const-string p3, "RPHubPatch"

    if-nez p0, :cond_2

    .line 829
    new-instance p0, Ljava/lang/StringBuilder;

    const-string p4, "seed fallback missing: "

    invoke-direct {p0, p4}, Ljava/lang/StringBuilder;-><init>(Ljava/lang/String;)V

    invoke-virtual {p0, p2}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    invoke-virtual {p0}, Ljava/lang/StringBuilder;->toString()Ljava/lang/String;

    move-result-object p0

    invoke-static {p3, p0}, Landroid/util/Log;->w(Ljava/lang/String;Ljava/lang/String;)I

    return-object p1

    :cond_2
    const p4, 0x7fffffff

    .line 833
    invoke-static {p0, p2, p4}, Lcom/rphub/app/PatchEngine;->applyLenient(Ljava/lang/String;Ljava/lang/String;I)Ljava/lang/String;

    move-result-object p0

    if-eqz p0, :cond_3

    .line 835
    new-instance p1, Ljava/lang/StringBuilder;

    const-string p4, "seed fallback: "

    invoke-direct {p1, p4}, Ljava/lang/StringBuilder;-><init>(Ljava/lang/String;)V

    invoke-virtual {p1, p2}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    invoke-virtual {p1}, Ljava/lang/StringBuilder;->toString()Ljava/lang/String;

    move-result-object p1

    invoke-static {p3, p1}, Landroid/util/Log;->w(Ljava/lang/String;Ljava/lang/String;)I

    return-object p0

    .line 839
    :cond_3
    new-instance p0, Ljava/lang/StringBuilder;

    const-string p4, "seed fallback unusable, serving source: "

    invoke-direct {p0, p4}, Ljava/lang/StringBuilder;-><init>(Ljava/lang/String;)V

    invoke-virtual {p0, p2}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    invoke-virtual {p0}, Ljava/lang/StringBuilder;->toString()Ljava/lang/String;

    move-result-object p0

    invoke-static {p3, p0}, Landroid/util/Log;->w(Ljava/lang/String;Ljava/lang/String;)I

    return-object p1
.end method

.method private static patchedSeed(Ljava/lang/String;Ljava/lang/String;)Ljava/lang/String;
    .locals 2

    const v0, 0x7fffffff

    .line 863
    invoke-static {p0, p1, v0}, Lcom/rphub/app/PatchEngine;->applyLenient(Ljava/lang/String;Ljava/lang/String;I)Ljava/lang/String;

    move-result-object v0

    if-eqz v0, :cond_0

    return-object v0

    .line 866
    :cond_0
    new-instance v0, Ljava/lang/StringBuilder;

    const-string v1, "seed unpatched, serving seed as-is: "

    invoke-direct {v0, v1}, Ljava/lang/StringBuilder;-><init>(Ljava/lang/String;)V

    invoke-virtual {v0, p1}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    invoke-virtual {v0}, Ljava/lang/StringBuilder;->toString()Ljava/lang/String;

    move-result-object p1

    const-string v0, "RPHubPatch"

    invoke-static {v0, p1}, Landroid/util/Log;->w(Ljava/lang/String;Ljava/lang/String;)I

    return-object p0
.end method

.method private static patchesBrokeHtml(Ljava/lang/String;)Z
    .locals 3

    const/4 v0, 0x0

    .line 2133
    :try_start_0
    invoke-static {p0}, Lcom/rphub/app/PatchEngine;->isHtmlBalanced(Ljava/lang/String;)Z

    move-result v1

    if-nez v1, :cond_0

    return v0

    :cond_0
    const-string v1, "index.html"

    const v2, 0x7fffffff

    .line 2138
    invoke-static {p0, v1, v2}, Lcom/rphub/app/PatchEngine;->applyChecked(Ljava/lang/String;Ljava/lang/String;I)Lcom/rphub/app/PatchEngine$PatchOutcome;

    move-result-object p0

    iget-object p0, p0, Lcom/rphub/app/PatchEngine$PatchOutcome;->content:Ljava/lang/String;

    if-eqz p0, :cond_1

    .line 2139
    invoke-static {p0}, Lcom/rphub/app/PatchEngine;->isHtmlBalanced(Ljava/lang/String;)Z

    move-result p0
    :try_end_0
    .catchall {:try_start_0 .. :try_end_0} :catchall_0

    if-nez p0, :cond_1

    const/4 p0, 0x1

    return p0

    :cond_1
    return v0

    :catchall_0
    move-exception p0

    const-string v1, "RPHubPatch"

    const-string v2, "html balance check failed"

    .line 2141
    invoke-static {v1, v2, p0}, Landroid/util/Log;->w(Ljava/lang/String;Ljava/lang/String;Ljava/lang/Throwable;)I

    return v0
.end method

.method private static plazaScript()Ljava/lang/String;
    .locals 11

    .line 655
    invoke-static {}, Ljava/lang/System;->currentTimeMillis()J

    move-result-wide v0

    .line 656
    sget-object v2, Lcom/rphub/app/PatchEngine;->plazaScriptRaw:Ljava/lang/String;

    const-wide/32 v3, 0x1499700

    const-wide/16 v5, 0x0

    if-eqz v2, :cond_0

    .line 658
    sget-wide v7, Lcom/rphub/app/PatchEngine;->plazaScriptFetchedAt:J

    sub-long/2addr v0, v7

    cmp-long v7, v0, v3

    if-gez v7, :cond_1

    return-object v2

    .line 662
    :cond_0
    sget-wide v7, Lcom/rphub/app/PatchEngine;->plazaScriptFailedAt:J

    cmp-long v2, v7, v5

    if-eqz v2, :cond_1

    sget-wide v7, Lcom/rphub/app/PatchEngine;->plazaScriptFailedAt:J

    sub-long/2addr v0, v7

    const-wide/32 v7, 0xea60

    cmp-long v2, v0, v7

    if-gez v2, :cond_1

    const/4 v0, 0x0

    return-object v0

    .line 664
    :cond_1
    sget-object v0, Lcom/rphub/app/PatchEngine;->PLAZA_SCRIPT_LOCK:Ljava/lang/Object;

    monitor-enter v0

    .line 665
    :try_start_0
    sget-object v1, Lcom/rphub/app/PatchEngine;->plazaScriptRaw:Ljava/lang/String;

    .line 666
    invoke-static {}, Ljava/lang/System;->currentTimeMillis()J

    move-result-wide v7

    if-eqz v1, :cond_2

    .line 667
    sget-wide v9, Lcom/rphub/app/PatchEngine;->plazaScriptFetchedAt:J

    sub-long/2addr v7, v9

    cmp-long v2, v7, v3

    if-gez v2, :cond_2

    monitor-exit v0
    :try_end_0
    .catchall {:try_start_0 .. :try_end_0} :catchall_1

    return-object v1

    :cond_2
    :try_start_1
    const-string v1, "https://rphforum.zeabur.app/theme.js"

    const/16 v2, 0x5dc

    const/16 v3, 0x9c4

    .line 669
    invoke-static {v1, v2, v3}, Lcom/rphub/app/PatchEngine;->httpGetWithTimeout(Ljava/lang/String;II)Ljava/lang/String;

    move-result-object v1

    if-eqz v1, :cond_4

    .line 670
    invoke-virtual {v1}, Ljava/lang/String;->trim()Ljava/lang/String;

    move-result-object v2

    invoke-virtual {v2}, Ljava/lang/String;->isEmpty()Z

    move-result v2

    if-eqz v2, :cond_3

    goto :goto_0

    .line 674
    :cond_3
    sput-object v1, Lcom/rphub/app/PatchEngine;->plazaScriptRaw:Ljava/lang/String;

    .line 675
    invoke-static {}, Ljava/lang/System;->currentTimeMillis()J

    move-result-wide v2

    sput-wide v2, Lcom/rphub/app/PatchEngine;->plazaScriptFetchedAt:J

    .line 676
    sput-wide v5, Lcom/rphub/app/PatchEngine;->plazaScriptFailedAt:J
    :try_end_1
    .catchall {:try_start_1 .. :try_end_1} :catchall_0

    .line 677
    :try_start_2
    monitor-exit v0
    :try_end_2
    .catchall {:try_start_2 .. :try_end_2} :catchall_1

    return-object v1

    .line 671
    :cond_4
    :goto_0
    :try_start_3
    invoke-static {}, Ljava/lang/System;->currentTimeMillis()J

    move-result-wide v1

    sput-wide v1, Lcom/rphub/app/PatchEngine;->plazaScriptFailedAt:J

    .line 672
    sget-object v1, Lcom/rphub/app/PatchEngine;->plazaScriptRaw:Ljava/lang/String;
    :try_end_3
    .catchall {:try_start_3 .. :try_end_3} :catchall_0

    :try_start_4
    monitor-exit v0

    return-object v1

    :catchall_0
    move-exception v1

    .line 679
    invoke-static {}, Ljava/lang/System;->currentTimeMillis()J

    move-result-wide v2

    sput-wide v2, Lcom/rphub/app/PatchEngine;->plazaScriptFailedAt:J

    const-string v2, "RPHubPatch"

    const-string v3, "plaza theme.js fetch failed"

    .line 680
    invoke-static {v2, v3, v1}, Landroid/util/Log;->w(Ljava/lang/String;Ljava/lang/String;Ljava/lang/Throwable;)I

    .line 681
    sget-object v1, Lcom/rphub/app/PatchEngine;->plazaScriptRaw:Ljava/lang/String;

    monitor-exit v0

    return-object v1

    :catchall_1
    move-exception v1

    .line 664
    monitor-exit v0
    :try_end_4
    .catchall {:try_start_4 .. :try_end_4} :catchall_1

    throw v1
.end method

.method private static pruneLegacyCache(Landroid/content/Context;)V
    .locals 6

    const-string v0, "RPHubPatch"

    .line 316
    :try_start_0
    new-instance v1, Ljava/io/File;

    invoke-virtual {p0}, Landroid/content/Context;->getFilesDir()Ljava/io/File;

    move-result-object p0

    const-string v2, "patch-cache"

    invoke-direct {v1, p0, v2}, Ljava/io/File;-><init>(Ljava/io/File;Ljava/lang/String;)V

    .line 317
    invoke-virtual {v1}, Ljava/io/File;->listFiles()[Ljava/io/File;

    move-result-object p0

    if-nez p0, :cond_0

    return-void

    .line 319
    :cond_0
    array-length v1, p0

    const/4 v2, 0x0

    :goto_0
    if-lt v2, v1, :cond_1

    goto :goto_1

    :cond_1
    aget-object v3, p0, v2

    .line 320
    invoke-virtual {v3}, Ljava/io/File;->isFile()Z

    move-result v4

    if-eqz v4, :cond_2

    invoke-virtual {v3}, Ljava/io/File;->getName()Ljava/lang/String;

    move-result-object v4

    const-string v5, ".raw"

    invoke-virtual {v4, v5}, Ljava/lang/String;->endsWith(Ljava/lang/String;)Z

    move-result v4

    if-eqz v4, :cond_2

    .line 321
    invoke-virtual {v3}, Ljava/io/File;->delete()Z

    move-result v4

    if-nez v4, :cond_2

    new-instance v4, Ljava/lang/StringBuilder;

    const-string v5, "legacy cache keep: "

    invoke-direct {v4, v5}, Ljava/lang/StringBuilder;-><init>(Ljava/lang/String;)V

    invoke-virtual {v3}, Ljava/io/File;->getName()Ljava/lang/String;

    move-result-object v3

    invoke-virtual {v4, v3}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    invoke-virtual {v4}, Ljava/lang/StringBuilder;->toString()Ljava/lang/String;

    move-result-object v3

    invoke-static {v0, v3}, Landroid/util/Log;->i(Ljava/lang/String;Ljava/lang/String;)I
    :try_end_0
    .catchall {:try_start_0 .. :try_end_0} :catchall_0

    :cond_2
    add-int/lit8 v2, v2, 0x1

    goto :goto_0

    :catchall_0
    move-exception p0

    const-string v1, "legacy cache prune failed"

    .line 325
    invoke-static {v0, v1, p0}, Landroid/util/Log;->w(Ljava/lang/String;Ljava/lang/String;Ljava/lang/Throwable;)I

    :goto_1
    return-void
.end method

.method private static readAll(Ljava/io/InputStream;)Ljava/lang/String;
    .locals 3

    const/4 v0, 0x0

    .line 2260
    :try_start_0
    new-instance v1, Ljava/util/Scanner;

    const-string v2, "UTF-8"

    invoke-direct {v1, p0, v2}, Ljava/util/Scanner;-><init>(Ljava/io/InputStream;Ljava/lang/String;)V

    const-string p0, "\\A"

    invoke-virtual {v1, p0}, Ljava/util/Scanner;->useDelimiter(Ljava/lang/String;)Ljava/util/Scanner;

    move-result-object p0
    :try_end_0
    .catchall {:try_start_0 .. :try_end_0} :catchall_1

    .line 2261
    :try_start_1
    invoke-virtual {p0}, Ljava/util/Scanner;->hasNext()Z

    move-result v1

    if-eqz v1, :cond_0

    invoke-virtual {p0}, Ljava/util/Scanner;->next()Ljava/lang/String;

    move-result-object v1

    goto :goto_0

    :cond_0
    const-string v1, ""
    :try_end_1
    .catchall {:try_start_1 .. :try_end_1} :catchall_0

    :goto_0
    if-eqz p0, :cond_1

    .line 2262
    :try_start_2
    invoke-virtual {p0}, Ljava/util/Scanner;->close()V

    :cond_1
    return-object v1

    :catchall_0
    move-exception v0

    if-eqz p0, :cond_2

    invoke-virtual {p0}, Ljava/util/Scanner;->close()V

    :cond_2
    throw v0
    :try_end_2
    .catchall {:try_start_2 .. :try_end_2} :catchall_1

    :catchall_1
    move-exception p0

    if-eqz v0, :cond_3

    move-object p0, v0

    :cond_3
    throw p0
.end method

.method private static readAsset(Landroid/content/Context;Ljava/lang/String;)Ljava/lang/String;
    .locals 2

    const/4 v0, 0x0

    .line 1772
    :try_start_0
    invoke-virtual {p0}, Landroid/content/Context;->getAssets()Landroid/content/res/AssetManager;

    move-result-object p0

    invoke-virtual {p0, p1}, Landroid/content/res/AssetManager;->open(Ljava/lang/String;)Ljava/io/InputStream;

    move-result-object p0
    :try_end_0
    .catchall {:try_start_0 .. :try_end_0} :catchall_2

    .line 1773
    :try_start_1
    invoke-static {p0}, Lcom/rphub/app/PatchEngine;->readAll(Ljava/io/InputStream;)Ljava/lang/String;

    move-result-object p1

    .line 1774
    invoke-virtual {p1}, Ljava/lang/String;->isEmpty()Z

    move-result v1
    :try_end_1
    .catchall {:try_start_1 .. :try_end_1} :catchall_0

    if-eqz v1, :cond_0

    move-object p1, v0

    :cond_0
    if-eqz p0, :cond_1

    .line 1775
    :try_start_2
    invoke-virtual {p0}, Ljava/io/InputStream;->close()V
    :try_end_2
    .catchall {:try_start_2 .. :try_end_2} :catchall_2

    :cond_1
    return-object p1

    :catchall_0
    move-exception p1

    if-eqz p0, :cond_2

    :try_start_3
    invoke-virtual {p0}, Ljava/io/InputStream;->close()V

    :cond_2
    throw p1
    :try_end_3
    .catchall {:try_start_3 .. :try_end_3} :catchall_1

    :catchall_1
    move-exception p0

    goto :goto_0

    :catchall_2
    move-exception p0

    move-object p1, v0

    :goto_0
    if-eqz p1, :cond_3

    move-object p0, p1

    :cond_3
    :try_start_4
    throw p0
    :try_end_4
    .catchall {:try_start_4 .. :try_end_4} :catchall_3

    :catchall_3
    return-object v0
.end method

.method private static readCache(Landroid/content/Context;Ljava/lang/String;)Ljava/lang/String;
    .locals 7

    .line 1760
    invoke-static {p0, p1}, Lcom/rphub/app/PatchEngine;->cacheFile(Landroid/content/Context;Ljava/lang/String;)Ljava/io/File;

    move-result-object p0

    .line 1761
    invoke-virtual {p0}, Ljava/io/File;->isFile()Z

    move-result v0

    const/4 v1, 0x0

    if-eqz v0, :cond_3

    invoke-virtual {p0}, Ljava/io/File;->length()J

    move-result-wide v2

    const-wide/16 v4, 0x0

    cmp-long v0, v2, v4

    if-nez v0, :cond_0

    goto :goto_1

    .line 1762
    :cond_0
    :try_start_0
    new-instance v0, Ljava/io/FileInputStream;

    invoke-direct {v0, p0}, Ljava/io/FileInputStream;-><init>(Ljava/io/File;)V
    :try_end_0
    .catchall {:try_start_0 .. :try_end_0} :catchall_2

    .line 1763
    :try_start_1
    invoke-static {v0}, Lcom/rphub/app/PatchEngine;->readAll(Ljava/io/InputStream;)Ljava/lang/String;

    move-result-object p0

    .line 1764
    invoke-virtual {p0}, Ljava/lang/String;->isEmpty()Z

    move-result v2
    :try_end_1
    .catchall {:try_start_1 .. :try_end_1} :catchall_0

    if-eqz v2, :cond_1

    move-object p0, v1

    .line 1765
    :cond_1
    :try_start_2
    invoke-virtual {v0}, Ljava/io/InputStream;->close()V
    :try_end_2
    .catchall {:try_start_2 .. :try_end_2} :catchall_2

    return-object p0

    :catchall_0
    move-exception p0

    :try_start_3
    invoke-virtual {v0}, Ljava/io/InputStream;->close()V

    throw p0
    :try_end_3
    .catchall {:try_start_3 .. :try_end_3} :catchall_1

    :catchall_1
    move-exception v0

    move-object v6, v0

    move-object v0, p0

    move-object p0, v6

    goto :goto_0

    :catchall_2
    move-exception p0

    move-object v0, v1

    :goto_0
    if-eqz v0, :cond_2

    move-object p0, v0

    :cond_2
    :try_start_4
    throw p0
    :try_end_4
    .catchall {:try_start_4 .. :try_end_4} :catchall_3

    :catchall_3
    move-exception p0

    .line 1766
    new-instance v0, Ljava/lang/StringBuilder;

    const-string v2, "cache read failed: "

    invoke-direct {v0, v2}, Ljava/lang/StringBuilder;-><init>(Ljava/lang/String;)V

    invoke-virtual {v0, p1}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    invoke-virtual {v0}, Ljava/lang/StringBuilder;->toString()Ljava/lang/String;

    move-result-object p1

    const-string v0, "RPHubPatch"

    invoke-static {v0, p1, p0}, Landroid/util/Log;->w(Ljava/lang/String;Ljava/lang/String;Ljava/lang/Throwable;)I

    :cond_3
    :goto_1
    return-object v1
.end method

.method private static readGenerationMarker(Landroid/content/Context;)I
    .locals 5

    const/4 v0, 0x0

    .line 1125
    :try_start_0
    new-instance v1, Ljava/io/File;

    new-instance v2, Ljava/io/File;

    invoke-virtual {p0}, Landroid/content/Context;->getFilesDir()Ljava/io/File;

    move-result-object v3

    const-string v4, "patch-cache"

    invoke-direct {v2, v3, v4}, Ljava/io/File;-><init>(Ljava/io/File;Ljava/lang/String;)V

    invoke-static {p0}, Lcom/rphub/app/PatchEngine;->cacheVersionTag(Landroid/content/Context;)Ljava/lang/String;

    move-result-object p0

    invoke-direct {v1, v2, p0}, Ljava/io/File;-><init>(Ljava/io/File;Ljava/lang/String;)V

    .line 1126
    new-instance p0, Ljava/io/File;

    const-string v2, ".generation"

    invoke-direct {p0, v1, v2}, Ljava/io/File;-><init>(Ljava/io/File;Ljava/lang/String;)V

    .line 1127
    invoke-virtual {p0}, Ljava/io/File;->isFile()Z

    move-result v1
    :try_end_0
    .catchall {:try_start_0 .. :try_end_0} :catchall_2

    if-nez v1, :cond_0

    return v0

    :cond_0
    const/4 v1, 0x0

    .line 1129
    :try_start_1
    new-instance v2, Ljava/io/FileInputStream;

    invoke-direct {v2, p0}, Ljava/io/FileInputStream;-><init>(Ljava/io/File;)V
    :try_end_1
    .catchall {:try_start_1 .. :try_end_1} :catchall_1

    .line 1130
    :try_start_2
    invoke-static {v2}, Lcom/rphub/app/PatchEngine;->readAll(Ljava/io/InputStream;)Ljava/lang/String;

    move-result-object p0

    invoke-virtual {p0}, Ljava/lang/String;->trim()Ljava/lang/String;

    move-result-object p0
    :try_end_2
    .catchall {:try_start_2 .. :try_end_2} :catchall_0

    .line 1131
    :try_start_3
    invoke-virtual {v2}, Ljava/io/InputStream;->close()V
    :try_end_3
    .catchall {:try_start_3 .. :try_end_3} :catchall_1

    :try_start_4
    const-string v1, "generation="

    .line 1132
    invoke-virtual {p0, v1}, Ljava/lang/String;->startsWith(Ljava/lang/String;)Z

    move-result v1

    if-eqz v1, :cond_2

    const/16 v1, 0xb

    .line 1133
    invoke-virtual {p0, v1}, Ljava/lang/String;->substring(I)Ljava/lang/String;

    move-result-object p0

    invoke-virtual {p0}, Ljava/lang/String;->trim()Ljava/lang/String;

    move-result-object p0

    invoke-static {p0}, Ljava/lang/Integer;->parseInt(Ljava/lang/String;)I

    move-result p0
    :try_end_4
    .catchall {:try_start_4 .. :try_end_4} :catchall_2

    return p0

    :catchall_0
    move-exception p0

    move-object v1, p0

    .line 1131
    :try_start_5
    invoke-virtual {v2}, Ljava/io/InputStream;->close()V

    throw v1
    :try_end_5
    .catchall {:try_start_5 .. :try_end_5} :catchall_1

    :catchall_1
    move-exception p0

    if-eqz v1, :cond_1

    move-object p0, v1

    :cond_1
    :try_start_6
    throw p0
    :try_end_6
    .catchall {:try_start_6 .. :try_end_6} :catchall_2

    :catchall_2
    move-exception p0

    const-string v1, "RPHubPatch"

    const-string v2, "generation marker read failed"

    .line 1136
    invoke-static {v1, v2, p0}, Landroid/util/Log;->w(Ljava/lang/String;Ljava/lang/String;Ljava/lang/Throwable;)I

    :cond_2
    return v0
.end method

.method private static readRejected(Landroid/content/Context;)Ljava/util/List;
    .locals 6
    .annotation system Ldalvik/annotation/Signature;
        value = {
            "(",
            "Landroid/content/Context;",
            ")",
            "Ljava/util/List<",
            "Ljava/lang/String;",
            ">;"
        }
    .end annotation

    .line 1253
    new-instance v0, Ljava/util/ArrayList;

    invoke-direct {v0}, Ljava/util/ArrayList;-><init>()V

    .line 1255
    :try_start_0
    invoke-static {p0}, Lcom/rphub/app/PatchEngine;->rejectedFile(Landroid/content/Context;)Ljava/io/File;

    move-result-object p0

    .line 1256
    invoke-virtual {p0}, Ljava/io/File;->isFile()Z

    move-result v1

    if-eqz v1, :cond_4

    invoke-virtual {p0}, Ljava/io/File;->length()J

    move-result-wide v1
    :try_end_0
    .catchall {:try_start_0 .. :try_end_0} :catchall_2

    const-wide/16 v3, 0x0

    cmp-long v5, v1, v3

    if-nez v5, :cond_0

    goto :goto_1

    :cond_0
    const/4 v1, 0x0

    .line 1258
    :try_start_1
    new-instance v2, Ljava/io/FileInputStream;

    invoke-direct {v2, p0}, Ljava/io/FileInputStream;-><init>(Ljava/io/File;)V
    :try_end_1
    .catchall {:try_start_1 .. :try_end_1} :catchall_1

    .line 1259
    :try_start_2
    invoke-static {v2}, Lcom/rphub/app/PatchEngine;->readAll(Ljava/io/InputStream;)Ljava/lang/String;

    move-result-object p0
    :try_end_2
    .catchall {:try_start_2 .. :try_end_2} :catchall_0

    .line 1260
    :try_start_3
    invoke-virtual {v2}, Ljava/io/InputStream;->close()V
    :try_end_3
    .catchall {:try_start_3 .. :try_end_3} :catchall_1

    :try_start_4
    const-string v1, "\n"

    .line 1261
    invoke-virtual {p0, v1}, Ljava/lang/String;->split(Ljava/lang/String;)[Ljava/lang/String;

    move-result-object p0

    array-length v1, p0

    const/4 v2, 0x0

    :goto_0
    if-lt v2, v1, :cond_1

    goto :goto_2

    :cond_1
    aget-object v3, p0, v2

    .line 1262
    invoke-virtual {v3}, Ljava/lang/String;->trim()Ljava/lang/String;

    move-result-object v3

    .line 1263
    invoke-virtual {v3}, Ljava/lang/String;->isEmpty()Z

    move-result v4

    if-nez v4, :cond_2

    invoke-interface {v0, v3}, Ljava/util/List;->add(Ljava/lang/Object;)Z
    :try_end_4
    .catchall {:try_start_4 .. :try_end_4} :catchall_2

    :cond_2
    add-int/lit8 v2, v2, 0x1

    goto :goto_0

    :catchall_0
    move-exception v1

    .line 1260
    :try_start_5
    invoke-virtual {v2}, Ljava/io/InputStream;->close()V

    throw v1
    :try_end_5
    .catchall {:try_start_5 .. :try_end_5} :catchall_1

    :catchall_1
    move-exception p0

    if-eqz v1, :cond_3

    move-object p0, v1

    :cond_3
    :try_start_6
    throw p0
    :try_end_6
    .catchall {:try_start_6 .. :try_end_6} :catchall_2

    :cond_4
    :goto_1
    return-object v0

    :catchall_2
    move-exception p0

    const-string v1, "RPHubPatch"

    const-string v2, "rejected list read failed"

    .line 1266
    invoke-static {v1, v2, p0}, Landroid/util/Log;->w(Ljava/lang/String;Ljava/lang/String;Ljava/lang/Throwable;)I

    :goto_2
    return-object v0
.end method

.method private static recordPromoteFailure(Landroid/content/Context;Ljava/lang/String;)V
    .locals 7

    const-string v0, "streak_version_code"

    const-string v1, "RPHubPatch"

    :try_start_0
    const-string v2, "rphub_promote_health"

    const/4 v3, 0x0

    .line 1382
    invoke-virtual {p0, v2, v3}, Landroid/content/Context;->getSharedPreferences(Ljava/lang/String;I)Landroid/content/SharedPreferences;

    move-result-object v2

    .line 1383
    invoke-static {p0}, Lcom/rphub/app/PatchEngine;->appVersionCode(Landroid/content/Context;)I

    move-result p0

    .line 1384
    invoke-interface {v2, v0, v3}, Landroid/content/SharedPreferences;->getInt(Ljava/lang/String;I)I

    move-result v4
    :try_end_0
    .catchall {:try_start_0 .. :try_end_0} :catchall_0

    const-string v5, "fail_streak"

    const/4 v6, 0x1

    if-ne v4, p0, :cond_0

    .line 1385
    :try_start_1
    invoke-interface {v2, v5, v3}, Landroid/content/SharedPreferences;->getInt(Ljava/lang/String;I)I

    move-result v3

    add-int/2addr v6, v3

    .line 1386
    :cond_0
    invoke-interface {v2}, Landroid/content/SharedPreferences;->edit()Landroid/content/SharedPreferences$Editor;

    move-result-object v2

    .line 1387
    invoke-interface {v2, v5, v6}, Landroid/content/SharedPreferences$Editor;->putInt(Ljava/lang/String;I)Landroid/content/SharedPreferences$Editor;

    move-result-object v2

    .line 1388
    invoke-interface {v2, v0, p0}, Landroid/content/SharedPreferences$Editor;->putInt(Ljava/lang/String;I)Landroid/content/SharedPreferences$Editor;

    move-result-object p0

    const-string v0, "fail_note"

    if-nez p1, :cond_1

    const-string v2, ""

    goto :goto_0

    :cond_1
    move-object v2, p1

    .line 1389
    :goto_0
    invoke-interface {p0, v0, v2}, Landroid/content/SharedPreferences$Editor;->putString(Ljava/lang/String;Ljava/lang/String;)Landroid/content/SharedPreferences$Editor;

    move-result-object p0

    const-string v0, "fail_at"

    .line 1390
    invoke-static {}, Ljava/lang/System;->currentTimeMillis()J

    move-result-wide v2

    invoke-interface {p0, v0, v2, v3}, Landroid/content/SharedPreferences$Editor;->putLong(Ljava/lang/String;J)Landroid/content/SharedPreferences$Editor;

    move-result-object p0

    .line 1391
    invoke-interface {p0}, Landroid/content/SharedPreferences$Editor;->apply()V

    .line 1392
    new-instance p0, Ljava/lang/StringBuilder;

    const-string v0, "promote failure #"

    invoke-direct {p0, v0}, Ljava/lang/StringBuilder;-><init>(Ljava/lang/String;)V

    invoke-virtual {p0, v6}, Ljava/lang/StringBuilder;->append(I)Ljava/lang/StringBuilder;

    const-string v0, " recorded: "

    invoke-virtual {p0, v0}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    invoke-virtual {p0, p1}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    invoke-virtual {p0}, Ljava/lang/StringBuilder;->toString()Ljava/lang/String;

    move-result-object p0

    invoke-static {v1, p0}, Landroid/util/Log;->w(Ljava/lang/String;Ljava/lang/String;)I
    :try_end_1
    .catchall {:try_start_1 .. :try_end_1} :catchall_0

    goto :goto_1

    :catchall_0
    move-exception p0

    const-string p1, "record promote failure failed"

    .line 1394
    invoke-static {v1, p1, p0}, Landroid/util/Log;->w(Ljava/lang/String;Ljava/lang/String;Ljava/lang/Throwable;)I

    :goto_1
    return-void
.end method

.method private static recordPromoteSuccess(Landroid/content/Context;)V
    .locals 4

    const-string v0, "fail_streak"

    const-string v1, "RPHubPatch"

    :try_start_0
    const-string v2, "rphub_promote_health"

    const/4 v3, 0x0

    .line 1402
    invoke-virtual {p0, v2, v3}, Landroid/content/Context;->getSharedPreferences(Ljava/lang/String;I)Landroid/content/SharedPreferences;

    move-result-object p0

    .line 1403
    invoke-interface {p0, v0, v3}, Landroid/content/SharedPreferences;->getInt(Ljava/lang/String;I)I

    move-result v2

    if-nez v2, :cond_0

    return-void

    .line 1404
    :cond_0
    invoke-interface {p0}, Landroid/content/SharedPreferences;->edit()Landroid/content/SharedPreferences$Editor;

    move-result-object p0

    .line 1405
    invoke-interface {p0, v0, v3}, Landroid/content/SharedPreferences$Editor;->putInt(Ljava/lang/String;I)Landroid/content/SharedPreferences$Editor;

    move-result-object p0

    const-string v0, "fail_note"

    const-string v2, ""

    .line 1406
    invoke-interface {p0, v0, v2}, Landroid/content/SharedPreferences$Editor;->putString(Ljava/lang/String;Ljava/lang/String;)Landroid/content/SharedPreferences$Editor;

    move-result-object p0

    .line 1407
    invoke-interface {p0}, Landroid/content/SharedPreferences$Editor;->apply()V

    const-string p0, "promote failure streak cleared"

    .line 1408
    invoke-static {v1, p0}, Landroid/util/Log;->i(Ljava/lang/String;Ljava/lang/String;)I
    :try_end_0
    .catchall {:try_start_0 .. :try_end_0} :catchall_0

    goto :goto_0

    :catchall_0
    move-exception p0

    const-string v0, "clear promote failure streak failed"

    .line 1410
    invoke-static {v1, v0, p0}, Landroid/util/Log;->w(Ljava/lang/String;Ljava/lang/String;Ljava/lang/Throwable;)I

    :goto_0
    return-void
.end method

.method public static rejectCurrentGeneration(Landroid/content/Context;)V
    .locals 3

    const-string v0, "RPHubPatch"

    .line 1317
    :try_start_0
    invoke-static {p0}, Lcom/rphub/app/PatchEngine;->diskChainFingerprint(Landroid/content/Context;)Ljava/lang/String;

    move-result-object v1

    if-nez v1, :cond_0

    const-string v1, "no complete generation on disk, nothing to blacklist"

    .line 1319
    invoke-static {v0, v1}, Landroid/util/Log;->i(Ljava/lang/String;Ljava/lang/String;)I

    goto :goto_0

    .line 1321
    :cond_0
    invoke-static {p0, v1}, Lcom/rphub/app/PatchEngine;->markRejected(Landroid/content/Context;Ljava/lang/String;)V
    :try_end_0
    .catchall {:try_start_0 .. :try_end_0} :catchall_0

    goto :goto_0

    :catchall_0
    move-exception v1

    const-string v2, "reject current generation failed"

    .line 1324
    invoke-static {v0, v2, v1}, Landroid/util/Log;->w(Ljava/lang/String;Ljava/lang/String;Ljava/lang/Throwable;)I

    .line 1326
    :goto_0
    invoke-static {p0}, Lcom/rphub/app/PatchEngine;->clearPatchCache(Landroid/content/Context;)V

    return-void
.end method

.method private static rejectedFile(Landroid/content/Context;)Ljava/io/File;
    .locals 4

    .line 1247
    new-instance v0, Ljava/io/File;

    new-instance v1, Ljava/io/File;

    invoke-virtual {p0}, Landroid/content/Context;->getFilesDir()Ljava/io/File;

    move-result-object v2

    const-string v3, "patch-cache"

    invoke-direct {v1, v2, v3}, Ljava/io/File;-><init>(Ljava/io/File;Ljava/lang/String;)V

    invoke-static {p0}, Lcom/rphub/app/PatchEngine;->cacheVersionTag(Landroid/content/Context;)Ljava/lang/String;

    move-result-object p0

    invoke-direct {v0, v1, p0}, Ljava/io/File;-><init>(Ljava/io/File;Ljava/lang/String;)V

    .line 1248
    invoke-virtual {v0}, Ljava/io/File;->exists()Z

    move-result p0

    if-nez p0, :cond_0

    invoke-virtual {v0}, Ljava/io/File;->mkdirs()Z

    .line 1249
    :cond_0
    new-instance p0, Ljava/io/File;

    const-string v1, ".rejected"

    invoke-direct {p0, v0, v1}, Ljava/io/File;-><init>(Ljava/io/File;Ljava/lang/String;)V

    return-object p0
.end method

.method private static resourceFor(Ljava/lang/String;)[Ljava/lang/String;
    .locals 11

    const-string v0, "https://sta1n156.github.io/RP-Hub"

    .line 709
    invoke-virtual {p0, v0}, Ljava/lang/String;->startsWith(Ljava/lang/String;)Z

    move-result v0

    const/4 v1, 0x0

    const-string v2, "0"

    const-string v3, "application/javascript"

    const/4 v4, 0x3

    const/4 v5, 0x2

    const/4 v6, 0x1

    const/4 v7, 0x0

    const/4 v8, 0x4

    if-eqz v0, :cond_14

    .line 710
    invoke-static {p0}, Landroid/net/Uri;->parse(Ljava/lang/String;)Landroid/net/Uri;

    move-result-object p0

    invoke-virtual {p0}, Landroid/net/Uri;->getPath()Ljava/lang/String;

    move-result-object p0

    if-nez p0, :cond_0

    return-object v1

    :cond_0
    const-string v0, "/character/"

    .line 715
    invoke-virtual {p0, v0}, Ljava/lang/String;->endsWith(Ljava/lang/String;)Z

    move-result v0

    const-string v9, "text/html"

    if-nez v0, :cond_13

    const-string v0, "/character/index.html"

    invoke-virtual {p0, v0}, Ljava/lang/String;->endsWith(Ljava/lang/String;)Z

    move-result v0

    if-eqz v0, :cond_1

    goto/16 :goto_2

    :cond_1
    const-string v0, "/novel/"

    .line 718
    invoke-virtual {p0, v0}, Ljava/lang/String;->endsWith(Ljava/lang/String;)Z

    move-result v0

    if-nez v0, :cond_12

    const-string v0, "/novel/index.html"

    invoke-virtual {p0, v0}, Ljava/lang/String;->endsWith(Ljava/lang/String;)Z

    move-result v0

    if-eqz v0, :cond_2

    goto/16 :goto_1

    :cond_2
    const-string v0, "/"

    .line 721
    invoke-virtual {p0, v0}, Ljava/lang/String;->endsWith(Ljava/lang/String;)Z

    move-result v0

    const-string v10, "1"

    if-nez v0, :cond_11

    const-string v0, "/index.html"

    invoke-virtual {p0, v0}, Ljava/lang/String;->endsWith(Ljava/lang/String;)Z

    move-result v0

    if-eqz v0, :cond_3

    goto/16 :goto_0

    :cond_3
    const-string v0, "/assets/js/core-utils.js"

    .line 724
    invoke-virtual {p0, v0}, Ljava/lang/String;->endsWith(Ljava/lang/String;)Z

    move-result v0

    if-eqz v0, :cond_4

    new-array p0, v8, [Ljava/lang/String;

    const-string v0, "core-utils.js"

    aput-object v0, p0, v7

    aput-object v3, p0, v6

    const-string v0, "patch-seed/core-utils.js"

    aput-object v0, p0, v5

    aput-object v10, p0, v4

    return-object p0

    :cond_4
    const-string v0, "/assets/js/app.js"

    .line 727
    invoke-virtual {p0, v0}, Ljava/lang/String;->endsWith(Ljava/lang/String;)Z

    move-result v0

    if-eqz v0, :cond_5

    new-array p0, v8, [Ljava/lang/String;

    const-string v0, "app.js"

    aput-object v0, p0, v7

    aput-object v3, p0, v6

    const-string v0, "patch-seed/app.js"

    aput-object v0, p0, v5

    aput-object v10, p0, v4

    return-object p0

    :cond_5
    const-string v0, "/assets/js/data-services.js"

    .line 730
    invoke-virtual {p0, v0}, Ljava/lang/String;->endsWith(Ljava/lang/String;)Z

    move-result v0

    if-eqz v0, :cond_6

    new-array p0, v8, [Ljava/lang/String;

    const-string v0, "data-services.js"

    aput-object v0, p0, v7

    aput-object v3, p0, v6

    const-string v0, "patch-seed/data-services.js"

    aput-object v0, p0, v5

    aput-object v10, p0, v4

    return-object p0

    :cond_6
    const-string v0, "/assets/js/ui-components.js"

    .line 733
    invoke-virtual {p0, v0}, Ljava/lang/String;->endsWith(Ljava/lang/String;)Z

    move-result v0

    if-eqz v0, :cond_7

    new-array p0, v8, [Ljava/lang/String;

    const-string v0, "ui-components.js"

    aput-object v0, p0, v7

    aput-object v3, p0, v6

    const-string v0, "patch-seed/ui-components.js"

    aput-object v0, p0, v5

    aput-object v10, p0, v4

    return-object p0

    :cond_7
    const-string v0, "/assets/js/runtime-services.js"

    .line 736
    invoke-virtual {p0, v0}, Ljava/lang/String;->endsWith(Ljava/lang/String;)Z

    move-result v0

    if-eqz v0, :cond_8

    new-array p0, v8, [Ljava/lang/String;

    const-string v0, "runtime-services.js"

    aput-object v0, p0, v7

    aput-object v3, p0, v6

    const-string v0, "patch-seed/runtime-services.js"

    aput-object v0, p0, v5

    aput-object v10, p0, v4

    return-object p0

    :cond_8
    const-string v0, "/assets/js/api-utils.js"

    .line 739
    invoke-virtual {p0, v0}, Ljava/lang/String;->endsWith(Ljava/lang/String;)Z

    move-result v0

    if-eqz v0, :cond_9

    new-array p0, v8, [Ljava/lang/String;

    const-string v0, "api-utils.js"

    aput-object v0, p0, v7

    aput-object v3, p0, v6

    const-string v0, "patch-seed/api-utils.js"

    aput-object v0, p0, v5

    aput-object v10, p0, v4

    return-object p0

    :cond_9
    const-string v0, "/assets/js/built-in-content.js"

    .line 742
    invoke-virtual {p0, v0}, Ljava/lang/String;->endsWith(Ljava/lang/String;)Z

    move-result v0

    if-eqz v0, :cond_a

    new-array p0, v8, [Ljava/lang/String;

    const-string v0, "built-in-content.js"

    aput-object v0, p0, v7

    aput-object v3, p0, v6

    const-string v0, "patch-seed/built-in-content.js"

    aput-object v0, p0, v5

    aput-object v2, p0, v4

    return-object p0

    :cond_a
    const-string v0, "/assets/js/update-check.js"

    .line 745
    invoke-virtual {p0, v0}, Ljava/lang/String;->endsWith(Ljava/lang/String;)Z

    move-result v0

    if-eqz v0, :cond_b

    new-array p0, v8, [Ljava/lang/String;

    const-string v0, "update-check.js"

    aput-object v0, p0, v7

    aput-object v3, p0, v6

    const-string v0, "patch-seed/update-check.js"

    aput-object v0, p0, v5

    aput-object v2, p0, v4

    return-object p0

    :cond_b
    const-string v0, "/assets/js/cloud-backup.js"

    .line 752
    invoke-virtual {p0, v0}, Ljava/lang/String;->endsWith(Ljava/lang/String;)Z

    move-result v0

    if-eqz v0, :cond_c

    new-array p0, v8, [Ljava/lang/String;

    const-string v0, "cloud-backup.js"

    aput-object v0, p0, v7

    aput-object v3, p0, v6

    const-string v0, "patch-seed/cloud-backup.js"

    aput-object v0, p0, v5

    aput-object v2, p0, v4

    return-object p0

    :cond_c
    const-string v0, "/assets/css/styles.css"

    .line 755
    invoke-virtual {p0, v0}, Ljava/lang/String;->endsWith(Ljava/lang/String;)Z

    move-result v0

    const-string v9, "text/css"

    if-eqz v0, :cond_d

    new-array p0, v8, [Ljava/lang/String;

    const-string v0, "styles.css"

    aput-object v0, p0, v7

    aput-object v9, p0, v6

    const-string v0, "patch-seed/styles.css"

    aput-object v0, p0, v5

    aput-object v2, p0, v4

    return-object p0

    :cond_d
    const-string v0, "/assets/js/theme.js"

    .line 762
    invoke-virtual {p0, v0}, Ljava/lang/String;->endsWith(Ljava/lang/String;)Z

    move-result v0

    if-eqz v0, :cond_e

    new-array p0, v8, [Ljava/lang/String;

    const-string v0, "theme.js"

    aput-object v0, p0, v7

    aput-object v3, p0, v6

    const-string v0, "patch-seed/theme.js"

    aput-object v0, p0, v5

    aput-object v2, p0, v4

    return-object p0

    :cond_e
    const-string v0, "/assets/js/tailwind-theme.js"

    .line 765
    invoke-virtual {p0, v0}, Ljava/lang/String;->endsWith(Ljava/lang/String;)Z

    move-result v0

    if-eqz v0, :cond_f

    new-array p0, v8, [Ljava/lang/String;

    const-string v0, "tailwind-theme.js"

    aput-object v0, p0, v7

    aput-object v3, p0, v6

    const-string v0, "patch-seed/tailwind-theme.js"

    aput-object v0, p0, v5

    aput-object v2, p0, v4

    return-object p0

    :cond_f
    const-string v0, "/assets/css/theme.css"

    .line 768
    invoke-virtual {p0, v0}, Ljava/lang/String;->endsWith(Ljava/lang/String;)Z

    move-result p0

    if-eqz p0, :cond_10

    new-array p0, v8, [Ljava/lang/String;

    const-string v0, "theme.css"

    aput-object v0, p0, v7

    aput-object v9, p0, v6

    const-string v0, "patch-seed/theme.css"

    aput-object v0, p0, v5

    aput-object v2, p0, v4

    return-object p0

    :cond_10
    return-object v1

    :cond_11
    :goto_0
    new-array p0, v8, [Ljava/lang/String;

    const-string v0, "index.html"

    aput-object v0, p0, v7

    aput-object v9, p0, v6

    const-string v0, "patch-seed/index.html"

    aput-object v0, p0, v5

    aput-object v10, p0, v4

    return-object p0

    :cond_12
    :goto_1
    new-array p0, v8, [Ljava/lang/String;

    const-string v0, "novel-index.html"

    aput-object v0, p0, v7

    aput-object v9, p0, v6

    const-string v0, "patch-seed/novel-index.html"

    aput-object v0, p0, v5

    aput-object v2, p0, v4

    return-object p0

    :cond_13
    :goto_2
    new-array p0, v8, [Ljava/lang/String;

    const-string v0, "character-index.html"

    aput-object v0, p0, v7

    aput-object v9, p0, v6

    const-string v0, "patch-seed/character-index.html"

    aput-object v0, p0, v5

    aput-object v2, p0, v4

    return-object p0

    :cond_14
    const-string v0, "https://cdn.tailwindcss.com"

    .line 774
    invoke-virtual {p0, v0}, Ljava/lang/String;->equals(Ljava/lang/Object;)Z

    move-result v0

    if-nez v0, :cond_20

    const-string v0, "https://cdn.tailwindcss.com?"

    invoke-virtual {p0, v0}, Ljava/lang/String;->startsWith(Ljava/lang/String;)Z

    move-result v0

    if-eqz v0, :cond_15

    goto/16 :goto_8

    :cond_15
    const-string v0, "https://unpkg.com/vue@3/dist/vue.global.prod.js"

    .line 777
    invoke-virtual {p0, v0}, Ljava/lang/String;->equals(Ljava/lang/Object;)Z

    move-result v0

    if-nez v0, :cond_1f

    const-string v0, "https://unpkg.com/vue@3/dist/vue.global.prod.js?"

    invoke-virtual {p0, v0}, Ljava/lang/String;->startsWith(Ljava/lang/String;)Z

    move-result v0

    if-eqz v0, :cond_16

    goto/16 :goto_7

    :cond_16
    const-string v0, "https://cdn.jsdelivr.net/npm/marked/marked.min.js"

    .line 780
    invoke-virtual {p0, v0}, Ljava/lang/String;->equals(Ljava/lang/Object;)Z

    move-result v0

    if-nez v0, :cond_1e

    const-string v0, "https://cdn.jsdelivr.net/npm/marked/marked.min.js?"

    invoke-virtual {p0, v0}, Ljava/lang/String;->startsWith(Ljava/lang/String;)Z

    move-result v0

    if-eqz v0, :cond_17

    goto :goto_6

    :cond_17
    const-string v0, "https://cdn.jsdelivr.net/npm/dompurify@3.0.6/dist/purify.min.js"

    .line 783
    invoke-virtual {p0, v0}, Ljava/lang/String;->equals(Ljava/lang/Object;)Z

    move-result v0

    if-nez v0, :cond_1d

    const-string v0, "https://cdn.jsdelivr.net/npm/dompurify@3.0.6/dist/purify.min.js?"

    invoke-virtual {p0, v0}, Ljava/lang/String;->startsWith(Ljava/lang/String;)Z

    move-result v0

    if-eqz v0, :cond_18

    goto :goto_5

    :cond_18
    const-string v0, "https://cdn.jsdelivr.net/npm/sortablejs@latest/Sortable.min.js"

    .line 786
    invoke-virtual {p0, v0}, Ljava/lang/String;->equals(Ljava/lang/Object;)Z

    move-result v0

    if-nez v0, :cond_1c

    const-string v0, "https://cdn.jsdelivr.net/npm/sortablejs@latest/Sortable.min.js?"

    invoke-virtual {p0, v0}, Ljava/lang/String;->startsWith(Ljava/lang/String;)Z

    move-result v0

    if-eqz v0, :cond_19

    goto :goto_4

    :cond_19
    const-string v0, "https://cdn.jsdelivr.net/npm/localforage@1.10.0/dist/localforage.min.js"

    .line 789
    invoke-virtual {p0, v0}, Ljava/lang/String;->equals(Ljava/lang/Object;)Z

    move-result v0

    if-nez v0, :cond_1b

    const-string v0, "https://cdn.jsdelivr.net/npm/localforage@1.10.0/dist/localforage.min.js?"

    invoke-virtual {p0, v0}, Ljava/lang/String;->startsWith(Ljava/lang/String;)Z

    move-result p0

    if-eqz p0, :cond_1a

    goto :goto_3

    :cond_1a
    return-object v1

    :cond_1b
    :goto_3
    new-array p0, v8, [Ljava/lang/String;

    const-string v0, "cdn-localforage.js"

    aput-object v0, p0, v7

    aput-object v3, p0, v6

    const-string v0, "local-site/assets/vendor/localforage.min.js"

    aput-object v0, p0, v5

    aput-object v2, p0, v4

    return-object p0

    :cond_1c
    :goto_4
    new-array p0, v8, [Ljava/lang/String;

    const-string v0, "cdn-sortable.js"

    aput-object v0, p0, v7

    aput-object v3, p0, v6

    const-string v0, "local-site/assets/vendor/sortable.min.js"

    aput-object v0, p0, v5

    aput-object v2, p0, v4

    return-object p0

    :cond_1d
    :goto_5
    new-array p0, v8, [Ljava/lang/String;

    const-string v0, "cdn-purify.js"

    aput-object v0, p0, v7

    aput-object v3, p0, v6

    const-string v0, "local-site/assets/vendor/purify.min.js"

    aput-object v0, p0, v5

    aput-object v2, p0, v4

    return-object p0

    :cond_1e
    :goto_6
    new-array p0, v8, [Ljava/lang/String;

    const-string v0, "cdn-marked.js"

    aput-object v0, p0, v7

    aput-object v3, p0, v6

    const-string v0, "local-site/assets/vendor/marked.min.js"

    aput-object v0, p0, v5

    aput-object v2, p0, v4

    return-object p0

    :cond_1f
    :goto_7
    new-array p0, v8, [Ljava/lang/String;

    const-string v0, "cdn-vue.js"

    aput-object v0, p0, v7

    aput-object v3, p0, v6

    const-string v0, "local-site/assets/vendor/vue.global.prod.js"

    aput-object v0, p0, v5

    aput-object v2, p0, v4

    return-object p0

    :cond_20
    :goto_8
    new-array p0, v8, [Ljava/lang/String;

    const-string v0, "cdn-tailwind.js"

    aput-object v0, p0, v7

    aput-object v3, p0, v6

    const-string v0, "local-site/assets/vendor/tailwind.js"

    aput-object v0, p0, v5

    aput-object v2, p0, v4

    return-object p0
.end method

.method private static response(Ljava/lang/String;Ljava/lang/String;)Landroid/webkit/WebResourceResponse;
    .locals 2

    .line 922
    new-instance v0, Ljava/io/ByteArrayInputStream;

    sget-object v1, Ljava/nio/charset/StandardCharsets;->UTF_8:Ljava/nio/charset/Charset;

    invoke-virtual {p0, v1}, Ljava/lang/String;->getBytes(Ljava/nio/charset/Charset;)[B

    move-result-object p0

    invoke-direct {v0, p0}, Ljava/io/ByteArrayInputStream;-><init>([B)V

    .line 923
    new-instance p0, Landroid/webkit/WebResourceResponse;

    const-string v1, "utf-8"

    invoke-direct {p0, p1, v1, v0}, Landroid/webkit/WebResourceResponse;-><init>(Ljava/lang/String;Ljava/lang/String;Ljava/io/InputStream;)V

    .line 924
    new-instance p1, Ljava/util/HashMap;

    invoke-direct {p1}, Ljava/util/HashMap;-><init>()V

    const-string v0, "Cache-Control"

    const-string v1, "no-store"

    .line 925
    invoke-interface {p1, v0, v1}, Ljava/util/Map;->put(Ljava/lang/Object;Ljava/lang/Object;)Ljava/lang/Object;

    .line 926
    invoke-virtual {p0, p1}, Landroid/webkit/WebResourceResponse;->setResponseHeaders(Ljava/util/Map;)V

    return-object p0
.end method

.method private static satisfiesCrossFileContract(Landroid/content/Context;Ljava/lang/String;Ljava/lang/String;)Z
    .locals 3

    .line 1501
    sget-object v0, Lcom/rphub/app/PatchEngine;->CROSS_FILE_CONTRACTS:Ljava/util/Map;

    invoke-interface {v0, p1}, Ljava/util/Map;->get(Ljava/lang/Object;)Ljava/lang/Object;

    move-result-object p1

    check-cast p1, [Ljava/lang/String;

    const/4 v0, 0x1

    if-nez p1, :cond_0

    return v0

    :cond_0
    const/4 v1, 0x0

    .line 1503
    aget-object v2, p1, v1

    .line 1504
    aget-object p1, p1, v0

    .line 1507
    invoke-virtual {p2, p1}, Ljava/lang/String;->indexOf(Ljava/lang/String;)I

    move-result p2

    if-gez p2, :cond_1

    return v0

    .line 1511
    :cond_1
    sget-object p2, Lcom/rphub/app/PatchEngine;->STAGED:Ljava/util/concurrent/ConcurrentHashMap;

    invoke-virtual {p2, v2}, Ljava/util/concurrent/ConcurrentHashMap;->get(Ljava/lang/Object;)Ljava/lang/Object;

    move-result-object p2

    check-cast p2, Ljava/lang/String;

    if-nez p2, :cond_2

    .line 1514
    :try_start_0
    invoke-static {p0, v2}, Lcom/rphub/app/PatchEngine;->readCache(Landroid/content/Context;Ljava/lang/String;)Ljava/lang/String;

    move-result-object p2
    :try_end_0
    .catchall {:try_start_0 .. :try_end_0} :catchall_0

    goto :goto_0

    :catchall_0
    nop

    :cond_2
    :goto_0
    if-nez p2, :cond_3

    return v0

    .line 1519
    :cond_3
    invoke-virtual {p2, p1}, Ljava/lang/String;->indexOf(Ljava/lang/String;)I

    move-result p0

    if-gez p0, :cond_4

    return v1

    :cond_4
    return v0
.end method

.method private static scheduleRefresh(Landroid/content/Context;Ljava/lang/String;Ljava/lang/String;)V
    .locals 0
    return-void
.end method

.method private static seedMissBaseline(Landroid/content/Context;Ljava/lang/String;Ljava/lang/String;)I
    .locals 2

    .line 1838
    sget-object v0, Lcom/rphub/app/PatchEngine;->SEED_MISS_BASELINE:Ljava/util/concurrent/ConcurrentHashMap;

    invoke-virtual {v0, p1}, Ljava/util/concurrent/ConcurrentHashMap;->get(Ljava/lang/Object;)Ljava/lang/Object;

    move-result-object v0

    check-cast v0, Ljava/lang/Integer;

    if-eqz v0, :cond_0

    .line 1839
    invoke-virtual {v0}, Ljava/lang/Integer;->intValue()I

    move-result p0

    return p0

    .line 1840
    :cond_0
    invoke-static {p0, p2}, Lcom/rphub/app/PatchEngine;->readAsset(Landroid/content/Context;Ljava/lang/String;)Ljava/lang/String;

    move-result-object p0

    const-string p2, "RPHubPatch"

    if-nez p0, :cond_1

    .line 1844
    new-instance p0, Ljava/lang/StringBuilder;

    const-string v0, "seed baseline unavailable: "

    invoke-direct {p0, v0}, Ljava/lang/StringBuilder;-><init>(Ljava/lang/String;)V

    invoke-virtual {p0, p1}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    invoke-virtual {p0}, Ljava/lang/StringBuilder;->toString()Ljava/lang/String;

    move-result-object p0

    invoke-static {p2, p0}, Landroid/util/Log;->w(Ljava/lang/String;Ljava/lang/String;)I

    const/4 p0, 0x0

    return p0

    :cond_1
    const v0, 0x7fffffff

    .line 1847
    invoke-static {p0, p1, v0}, Lcom/rphub/app/PatchEngine;->applyChecked(Ljava/lang/String;Ljava/lang/String;I)Lcom/rphub/app/PatchEngine$PatchOutcome;

    move-result-object p0

    iget p0, p0, Lcom/rphub/app/PatchEngine$PatchOutcome;->missing:I

    .line 1848
    sget-object v0, Lcom/rphub/app/PatchEngine;->SEED_MISS_BASELINE:Ljava/util/concurrent/ConcurrentHashMap;

    invoke-static {p0}, Ljava/lang/Integer;->valueOf(I)Ljava/lang/Integer;

    move-result-object v1

    invoke-virtual {v0, p1, v1}, Ljava/util/concurrent/ConcurrentHashMap;->put(Ljava/lang/Object;Ljava/lang/Object;)Ljava/lang/Object;

    .line 1849
    new-instance v0, Ljava/lang/StringBuilder;

    const-string v1, "seed miss baseline "

    invoke-direct {v0, v1}, Ljava/lang/StringBuilder;-><init>(Ljava/lang/String;)V

    invoke-virtual {v0, p1}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    const-string p1, " = "

    invoke-virtual {v0, p1}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    invoke-virtual {v0, p0}, Ljava/lang/StringBuilder;->append(I)Ljava/lang/StringBuilder;

    invoke-virtual {v0}, Ljava/lang/StringBuilder;->toString()Ljava/lang/String;

    move-result-object p1

    invoke-static {p2, p1}, Landroid/util/Log;->i(Ljava/lang/String;Ljava/lang/String;)I

    return p0
.end method

.method public static setSafeModeDirect(Z)V
    .locals 2

    .line 135
    sput-boolean p0, Lcom/rphub/app/PatchEngine;->safeModeDirect:Z

    .line 136
    new-instance v0, Ljava/lang/StringBuilder;

    const-string v1, "safeModeDirect set to "

    invoke-direct {v0, v1}, Ljava/lang/StringBuilder;-><init>(Ljava/lang/String;)V

    invoke-virtual {v0, p0}, Ljava/lang/StringBuilder;->append(Z)Ljava/lang/StringBuilder;

    invoke-virtual {v0}, Ljava/lang/StringBuilder;->toString()Ljava/lang/String;

    move-result-object p0

    const-string v0, "RPHubPatch"

    invoke-static {v0, p0}, Landroid/util/Log;->i(Ljava/lang/String;Ljava/lang/String;)I

    return-void
.end method

.method private static stageAndTryPromote(Landroid/content/Context;Ljava/lang/String;Ljava/lang/String;)V
    .locals 8

    .line 1023
    invoke-static {p1}, Lcom/rphub/app/PatchEngine;->isBootChainKey(Ljava/lang/String;)Z

    move-result v0

    if-nez v0, :cond_0

    .line 1025
    invoke-static {p0, p1, p2}, Lcom/rphub/app/PatchEngine;->writeCache(Landroid/content/Context;Ljava/lang/String;Ljava/lang/String;)V

    return-void

    .line 1028
    :cond_0
    sget-object v0, Lcom/rphub/app/PatchEngine;->STAGED:Ljava/util/concurrent/ConcurrentHashMap;

    invoke-virtual {v0, p1, p2}, Ljava/util/concurrent/ConcurrentHashMap;->put(Ljava/lang/Object;Ljava/lang/Object;)Ljava/lang/Object;

    .line 1029
    sget-object p1, Lcom/rphub/app/PatchEngine;->BOOT_CHAIN_FILES:[Ljava/lang/String;

    array-length p2, p1

    const/4 v0, 0x0

    const/4 v1, 0x0

    :goto_0
    if-lt v1, p2, :cond_b

    .line 1036
    sget-object v2, Lcom/rphub/app/PatchEngine;->GENERATION_LOCK:Ljava/lang/Object;

    monitor-enter v2

    .line 1038
    :try_start_0
    sget-object p1, Lcom/rphub/app/PatchEngine;->BOOT_CHAIN_FILES:[Ljava/lang/String;

    array-length p2, p1

    const/4 v1, 0x0

    :goto_1
    if-lt v1, p2, :cond_9

    .line 1049
    new-instance p1, Ljava/util/HashMap;

    invoke-direct {p1}, Ljava/util/HashMap;-><init>()V

    .line 1050
    sget-object p2, Lcom/rphub/app/PatchEngine;->BOOT_CHAIN_FILES:[Ljava/lang/String;

    array-length v1, p2

    const/4 v3, 0x0

    :goto_2
    if-lt v3, v1, :cond_5

    .line 1077
    sget-object p2, Lcom/rphub/app/PatchEngine;->STAGED:Ljava/util/concurrent/ConcurrentHashMap;

    invoke-static {p2}, Lcom/rphub/app/PatchEngine;->chainFingerprint(Ljava/util/Map;)Ljava/lang/String;

    move-result-object p2

    .line 1078
    invoke-static {p0, p2}, Lcom/rphub/app/PatchEngine;->isRejected(Landroid/content/Context;Ljava/lang/String;)Z

    move-result v1

    if-eqz v1, :cond_1

    const-string p1, "RPHubPatch"

    .line 1079
    new-instance v0, Ljava/lang/StringBuilder;

    const-string v1, "generation rejected (blacklisted after white screen): "

    invoke-direct {v0, v1}, Ljava/lang/StringBuilder;-><init>(Ljava/lang/String;)V

    invoke-virtual {v0, p2}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    invoke-virtual {v0}, Ljava/lang/StringBuilder;->toString()Ljava/lang/String;

    move-result-object v0

    invoke-static {p1, v0}, Landroid/util/Log;->w(Ljava/lang/String;Ljava/lang/String;)I

    .line 1080
    sget-object p1, Lcom/rphub/app/PatchEngine;->STAGED:Ljava/util/concurrent/ConcurrentHashMap;

    invoke-virtual {p1}, Ljava/util/concurrent/ConcurrentHashMap;->clear()V

    .line 1081
    new-instance p1, Ljava/lang/StringBuilder;

    const-string v0, "blacklisted after white screen: "

    invoke-direct {p1, v0}, Ljava/lang/StringBuilder;-><init>(Ljava/lang/String;)V

    invoke-virtual {p1, p2}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    invoke-virtual {p1}, Ljava/lang/StringBuilder;->toString()Ljava/lang/String;

    move-result-object p1

    invoke-static {p0, p1}, Lcom/rphub/app/PatchEngine;->recordPromoteFailure(Landroid/content/Context;Ljava/lang/String;)V

    .line 1082
    monitor-exit v2

    return-void

    .line 1085
    :cond_1
    sget-object p2, Lcom/rphub/app/PatchEngine;->BOOT_CHAIN_FILES:[Ljava/lang/String;

    array-length v1, p2

    :goto_3
    if-lt v0, v1, :cond_2

    .line 1102
    sget p1, Lcom/rphub/app/PatchEngine;->activeGeneration:I

    add-int/lit8 p1, p1, 0x1

    invoke-static {p0, p1}, Lcom/rphub/app/PatchEngine;->writeGenerationMarker(Landroid/content/Context;I)V

    .line 1103
    sget p1, Lcom/rphub/app/PatchEngine;->generationSerial:I

    add-int/lit8 p1, p1, 0x1

    sput p1, Lcom/rphub/app/PatchEngine;->generationSerial:I

    sput p1, Lcom/rphub/app/PatchEngine;->activeGeneration:I

    .line 1109
    sget-object p1, Lcom/rphub/app/PatchEngine;->STAGED:Ljava/util/concurrent/ConcurrentHashMap;

    invoke-virtual {p1}, Ljava/util/concurrent/ConcurrentHashMap;->clear()V

    .line 1111
    invoke-static {p0}, Lcom/rphub/app/PatchEngine;->recordPromoteSuccess(Landroid/content/Context;)V

    const-string p0, "RPHubPatch"

    .line 1112
    new-instance p1, Ljava/lang/StringBuilder;

    const-string p2, "boot chain promoted to CDN generation "

    invoke-direct {p1, p2}, Ljava/lang/StringBuilder;-><init>(Ljava/lang/String;)V

    sget p2, Lcom/rphub/app/PatchEngine;->activeGeneration:I

    invoke-virtual {p1, p2}, Ljava/lang/StringBuilder;->append(I)Ljava/lang/StringBuilder;

    const-string p2, " ("

    .line 1113
    invoke-virtual {p1, p2}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    sget-object p2, Lcom/rphub/app/PatchEngine;->BOOT_CHAIN_FILES:[Ljava/lang/String;

    array-length p2, p2

    invoke-virtual {p1, p2}, Ljava/lang/StringBuilder;->append(I)Ljava/lang/StringBuilder;

    const-string p2, " files, atomic, staged cleared)"

    invoke-virtual {p1, p2}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    invoke-virtual {p1}, Ljava/lang/StringBuilder;->toString()Ljava/lang/String;

    move-result-object p1

    .line 1112
    invoke-static {p0, p1}, Landroid/util/Log;->i(Ljava/lang/String;Ljava/lang/String;)I

    .line 1036
    monitor-exit v2

    return-void

    .line 1085
    :cond_2
    aget-object v3, p2, v0

    .line 1086
    sget-object v4, Lcom/rphub/app/PatchEngine;->STAGED:Ljava/util/concurrent/ConcurrentHashMap;

    invoke-virtual {v4, v3}, Ljava/util/concurrent/ConcurrentHashMap;->get(Ljava/lang/Object;)Ljava/lang/Object;

    move-result-object v4

    check-cast v4, Ljava/lang/String;

    if-nez v4, :cond_3

    goto :goto_4

    .line 1088
    :cond_3
    invoke-static {p0, v3, v4}, Lcom/rphub/app/PatchEngine;->writeCache(Landroid/content/Context;Ljava/lang/String;Ljava/lang/String;)V

    .line 1093
    invoke-static {v3}, Lcom/rphub/app/PatchEngine;->isPatchableKey(Ljava/lang/String;)Z

    move-result v5

    if-eqz v5, :cond_4

    .line 1095
    sget-object v4, Lcom/rphub/app/PatchEngine;->PATCHED_CACHE:Ljava/util/concurrent/ConcurrentHashMap;

    invoke-interface {p1, v3}, Ljava/util/Map;->get(Ljava/lang/Object;)Ljava/lang/Object;

    move-result-object v5

    check-cast v5, Ljava/lang/String;

    invoke-virtual {v4, v3, v5}, Ljava/util/concurrent/ConcurrentHashMap;->put(Ljava/lang/Object;Ljava/lang/Object;)Ljava/lang/Object;

    goto :goto_4

    .line 1097
    :cond_4
    sget-object v5, Lcom/rphub/app/PatchEngine;->RAW_CACHE:Ljava/util/concurrent/ConcurrentHashMap;

    invoke-virtual {v5, v3, v4}, Ljava/util/concurrent/ConcurrentHashMap;->put(Ljava/lang/Object;Ljava/lang/Object;)Ljava/lang/Object;

    :goto_4
    add-int/lit8 v0, v0, 0x1

    goto :goto_3

    .line 1050
    :cond_5
    aget-object v4, p2, v3

    .line 1051
    invoke-static {v4}, Lcom/rphub/app/PatchEngine;->isPatchableKey(Ljava/lang/String;)Z

    move-result v5

    if-nez v5, :cond_6

    goto/16 :goto_6

    .line 1052
    :cond_6
    new-instance v5, Ljava/lang/StringBuilder;

    const-string v6, "patch-seed/"

    invoke-direct {v5, v6}, Ljava/lang/StringBuilder;-><init>(Ljava/lang/String;)V

    invoke-virtual {v5, v4}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    invoke-virtual {v5}, Ljava/lang/StringBuilder;->toString()Ljava/lang/String;

    move-result-object v5

    invoke-static {p0, v4, v5}, Lcom/rphub/app/PatchEngine;->seedMissBaseline(Landroid/content/Context;Ljava/lang/String;Ljava/lang/String;)I

    move-result v5

    .line 1053
    sget-object v6, Lcom/rphub/app/PatchEngine;->STAGED:Ljava/util/concurrent/ConcurrentHashMap;

    invoke-virtual {v6, v4}, Ljava/util/concurrent/ConcurrentHashMap;->get(Ljava/lang/Object;)Ljava/lang/Object;

    move-result-object v6

    check-cast v6, Ljava/lang/String;

    invoke-static {v6, v4, v5}, Lcom/rphub/app/PatchEngine;->applyChecked(Ljava/lang/String;Ljava/lang/String;I)Lcom/rphub/app/PatchEngine$PatchOutcome;

    move-result-object v6

    .line 1054
    iget-boolean v7, v6, Lcom/rphub/app/PatchEngine$PatchOutcome;->qualityOk:Z

    if-nez v7, :cond_8

    const-string p1, "RPHubPatch"

    .line 1055
    new-instance p2, Ljava/lang/StringBuilder;

    const-string v0, "generation rejected (patch quality): "

    invoke-direct {p2, v0}, Ljava/lang/StringBuilder;-><init>(Ljava/lang/String;)V

    invoke-virtual {p2, v4}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    const-string v0, " applied="

    .line 1056
    invoke-virtual {p2, v0}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    iget v0, v6, Lcom/rphub/app/PatchEngine$PatchOutcome;->applied:I

    invoke-virtual {p2, v0}, Ljava/lang/StringBuilder;->append(I)Ljava/lang/StringBuilder;

    const-string v0, " missing="

    .line 1057
    invoke-virtual {p2, v0}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    iget v0, v6, Lcom/rphub/app/PatchEngine$PatchOutcome;->missing:I

    invoke-virtual {p2, v0}, Ljava/lang/StringBuilder;->append(I)Ljava/lang/StringBuilder;

    const-string v0, " baseline="

    .line 1058
    invoke-virtual {p2, v0}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    invoke-virtual {p2, v5}, Ljava/lang/StringBuilder;->append(I)Ljava/lang/StringBuilder;

    const-string v0, " ("

    .line 1059
    invoke-virtual {p2, v0}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    iget-object v0, v6, Lcom/rphub/app/PatchEngine$PatchOutcome;->qualityNote:Ljava/lang/String;

    invoke-virtual {p2, v0}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    const-string v0, ")"

    invoke-virtual {p2, v0}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    invoke-virtual {p2}, Ljava/lang/StringBuilder;->toString()Ljava/lang/String;

    move-result-object p2

    .line 1055
    invoke-static {p1, p2}, Landroid/util/Log;->w(Ljava/lang/String;Ljava/lang/String;)I

    .line 1062
    sget-object p1, Lcom/rphub/app/PatchEngine;->STAGED:Ljava/util/concurrent/ConcurrentHashMap;

    invoke-virtual {p1}, Ljava/util/concurrent/ConcurrentHashMap;->clear()V

    .line 1066
    new-instance p1, Ljava/lang/StringBuilder;

    const-string p2, "patch quality: "

    invoke-direct {p1, p2}, Ljava/lang/StringBuilder;-><init>(Ljava/lang/String;)V

    invoke-virtual {p1, v4}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    const-string p2, " missing="

    .line 1067
    invoke-virtual {p1, p2}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    iget p2, v6, Lcom/rphub/app/PatchEngine$PatchOutcome;->missing:I

    invoke-virtual {p1, p2}, Ljava/lang/StringBuilder;->append(I)Ljava/lang/StringBuilder;

    const-string p2, " baseline="

    .line 1068
    invoke-virtual {p1, p2}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    invoke-virtual {p1, v5}, Ljava/lang/StringBuilder;->append(I)Ljava/lang/StringBuilder;

    .line 1069
    iget-object p2, v6, Lcom/rphub/app/PatchEngine$PatchOutcome;->qualityNote:Ljava/lang/String;

    if-nez p2, :cond_7

    const-string p2, ""

    goto :goto_5

    :cond_7
    new-instance p2, Ljava/lang/StringBuilder;

    const-string v0, " ("

    invoke-direct {p2, v0}, Ljava/lang/StringBuilder;-><init>(Ljava/lang/String;)V

    iget-object v0, v6, Lcom/rphub/app/PatchEngine$PatchOutcome;->qualityNote:Ljava/lang/String;

    invoke-virtual {p2, v0}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    const-string v0, ")"

    invoke-virtual {p2, v0}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    invoke-virtual {p2}, Ljava/lang/StringBuilder;->toString()Ljava/lang/String;

    move-result-object p2

    :goto_5
    invoke-virtual {p1, p2}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    invoke-virtual {p1}, Ljava/lang/StringBuilder;->toString()Ljava/lang/String;

    move-result-object p1

    .line 1066
    invoke-static {p0, p1}, Lcom/rphub/app/PatchEngine;->recordPromoteFailure(Landroid/content/Context;Ljava/lang/String;)V

    .line 1070
    monitor-exit v2

    return-void

    .line 1072
    :cond_8
    iget-object v5, v6, Lcom/rphub/app/PatchEngine$PatchOutcome;->content:Ljava/lang/String;

    invoke-interface {p1, v4, v5}, Ljava/util/Map;->put(Ljava/lang/Object;Ljava/lang/Object;)Ljava/lang/Object;

    :goto_6
    add-int/lit8 v3, v3, 0x1

    goto/16 :goto_2

    .line 1038
    :cond_9
    aget-object v3, p1, v1

    .line 1039
    sget-object v4, Lcom/rphub/app/PatchEngine;->STAGED:Ljava/util/concurrent/ConcurrentHashMap;

    invoke-virtual {v4, v3}, Ljava/util/concurrent/ConcurrentHashMap;->containsKey(Ljava/lang/Object;)Z

    move-result v3

    if-nez v3, :cond_a

    monitor-exit v2

    return-void

    :cond_a
    add-int/lit8 v1, v1, 0x1

    goto/16 :goto_1

    :catchall_0
    move-exception p0

    .line 1036
    monitor-exit v2
    :try_end_0
    .catchall {:try_start_0 .. :try_end_0} :catchall_0

    throw p0

    .line 1029
    :cond_b
    aget-object v2, p1, v1

    .line 1030
    sget-object v3, Lcom/rphub/app/PatchEngine;->STAGED:Ljava/util/concurrent/ConcurrentHashMap;

    invoke-virtual {v3, v2}, Ljava/util/concurrent/ConcurrentHashMap;->containsKey(Ljava/lang/Object;)Z

    move-result v3

    if-nez v3, :cond_c

    .line 1031
    new-instance p0, Ljava/lang/StringBuilder;

    const-string p1, "generation staged "

    invoke-direct {p0, p1}, Ljava/lang/StringBuilder;-><init>(Ljava/lang/String;)V

    sget-object p1, Lcom/rphub/app/PatchEngine;->STAGED:Ljava/util/concurrent/ConcurrentHashMap;

    invoke-virtual {p1}, Ljava/util/concurrent/ConcurrentHashMap;->size()I

    move-result p1

    invoke-virtual {p0, p1}, Ljava/lang/StringBuilder;->append(I)Ljava/lang/StringBuilder;

    const-string p1, "/"

    invoke-virtual {p0, p1}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    sget-object p1, Lcom/rphub/app/PatchEngine;->BOOT_CHAIN_FILES:[Ljava/lang/String;

    array-length p1, p1

    invoke-virtual {p0, p1}, Ljava/lang/StringBuilder;->append(I)Ljava/lang/StringBuilder;

    const-string p1, ", waiting: "

    .line 1032
    invoke-virtual {p0, p1}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    invoke-virtual {p0, v2}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    invoke-virtual {p0}, Ljava/lang/StringBuilder;->toString()Ljava/lang/String;

    move-result-object p0

    const-string p1, "RPHubPatch"

    .line 1031
    invoke-static {p1, p0}, Landroid/util/Log;->i(Ljava/lang/String;Ljava/lang/String;)I

    return-void

    :cond_c
    add-int/lit8 v1, v1, 0x1

    goto/16 :goto_0
.end method

.method private static toHex([B)Ljava/lang/String;
    .locals 5

    .line 1222
    new-instance v0, Ljava/lang/StringBuilder;

    array-length v1, p0

    mul-int/lit8 v1, v1, 0x2

    invoke-direct {v0, v1}, Ljava/lang/StringBuilder;-><init>(I)V

    .line 1223
    array-length v1, p0

    const/4 v2, 0x0

    :goto_0
    if-lt v2, v1, :cond_0

    .line 1228
    invoke-virtual {v0}, Ljava/lang/StringBuilder;->toString()Ljava/lang/String;

    move-result-object p0

    return-object p0

    .line 1223
    :cond_0
    aget-byte v3, p0, v2

    and-int/lit16 v3, v3, 0xff

    const/16 v4, 0x10

    if-ge v3, v4, :cond_1

    const/16 v4, 0x30

    .line 1225
    invoke-virtual {v0, v4}, Ljava/lang/StringBuilder;->append(C)Ljava/lang/StringBuilder;

    .line 1226
    :cond_1
    invoke-static {v3}, Ljava/lang/Integer;->toHexString(I)Ljava/lang/String;

    move-result-object v3

    invoke-virtual {v0, v3}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    add-int/lit8 v2, v2, 0x1

    goto :goto_0
.end method

.method private static warmPlazaScript()V
    .locals 2

    .line 689
    :try_start_0
    sget-object v0, Lcom/rphub/app/PatchEngine;->REFRESH_EXECUTOR:Ljava/util/concurrent/ExecutorService;

    new-instance v1, Lcom/rphub/app/PatchEngine$2;

    invoke-direct {v1}, Lcom/rphub/app/PatchEngine$2;-><init>()V

    invoke-interface {v0, v1}, Ljava/util/concurrent/ExecutorService;->execute(Ljava/lang/Runnable;)V
    :try_end_0
    .catchall {:try_start_0 .. :try_end_0} :catchall_0

    :catchall_0
    return-void
.end method

.method private static warmSeedBaselines(Landroid/content/Context;)V
    .locals 2

    .line 260
    :try_start_0
    invoke-virtual {p0}, Landroid/content/Context;->getApplicationContext()Landroid/content/Context;

    move-result-object p0

    .line 261
    sget-object v0, Lcom/rphub/app/PatchEngine;->REFRESH_EXECUTOR:Ljava/util/concurrent/ExecutorService;

    new-instance v1, Lcom/rphub/app/PatchEngine$1;

    invoke-direct {v1, p0}, Lcom/rphub/app/PatchEngine$1;-><init>(Landroid/content/Context;)V

    invoke-interface {v0, v1}, Ljava/util/concurrent/ExecutorService;->execute(Ljava/lang/Runnable;)V
    :try_end_0
    .catchall {:try_start_0 .. :try_end_0} :catchall_0

    :catchall_0
    return-void
.end method

.method private static writeCache(Landroid/content/Context;Ljava/lang/String;Ljava/lang/String;)V
    .locals 5

    const/4 v0, 0x0

    .line 1783
    :try_start_0
    invoke-static {p0, p1}, Lcom/rphub/app/PatchEngine;->cacheFile(Landroid/content/Context;Ljava/lang/String;)Ljava/io/File;

    move-result-object p0

    .line 1784
    new-instance v1, Ljava/io/File;

    invoke-virtual {p0}, Ljava/io/File;->getParentFile()Ljava/io/File;

    move-result-object v2

    new-instance v3, Ljava/lang/StringBuilder;

    invoke-virtual {p0}, Ljava/io/File;->getName()Ljava/lang/String;

    move-result-object v4

    invoke-static {v4}, Ljava/lang/String;->valueOf(Ljava/lang/Object;)Ljava/lang/String;

    move-result-object v4

    invoke-direct {v3, v4}, Ljava/lang/StringBuilder;-><init>(Ljava/lang/String;)V

    const-string v4, ".tmp"

    invoke-virtual {v3, v4}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    invoke-virtual {v3}, Ljava/lang/StringBuilder;->toString()Ljava/lang/String;

    move-result-object v3

    invoke-direct {v1, v2, v3}, Ljava/io/File;-><init>(Ljava/io/File;Ljava/lang/String;)V

    .line 1785
    new-instance v2, Ljava/io/FileOutputStream;

    invoke-direct {v2, v1}, Ljava/io/FileOutputStream;-><init>(Ljava/io/File;)V
    :try_end_0
    .catchall {:try_start_0 .. :try_end_0} :catchall_1

    .line 1786
    :try_start_1
    sget-object v3, Ljava/nio/charset/StandardCharsets;->UTF_8:Ljava/nio/charset/Charset;

    invoke-virtual {p2, v3}, Ljava/lang/String;->getBytes(Ljava/nio/charset/Charset;)[B

    move-result-object p2

    invoke-virtual {v2, p2}, Ljava/io/FileOutputStream;->write([B)V

    .line 1787
    invoke-virtual {v2}, Ljava/io/FileOutputStream;->flush()V

    .line 1788
    invoke-virtual {v2}, Ljava/io/FileOutputStream;->getFD()Ljava/io/FileDescriptor;

    move-result-object p2

    invoke-virtual {p2}, Ljava/io/FileDescriptor;->sync()V

    .line 1789
    invoke-virtual {v2}, Ljava/io/FileOutputStream;->close()V
    :try_end_1
    .catchall {:try_start_1 .. :try_end_1} :catchall_0

    .line 1791
    :try_start_2
    invoke-virtual {p0}, Ljava/io/File;->exists()Z

    move-result p2

    if-eqz p2, :cond_0

    invoke-virtual {p0}, Ljava/io/File;->delete()Z

    .line 1792
    :cond_0
    invoke-virtual {v1, p0}, Ljava/io/File;->renameTo(Ljava/io/File;)Z

    move-result p0

    if-nez p0, :cond_1

    invoke-virtual {v1}, Ljava/io/File;->delete()Z
    :try_end_2
    .catchall {:try_start_2 .. :try_end_2} :catchall_1

    goto :goto_1

    :catchall_0
    move-exception p0

    move-object v0, v2

    goto :goto_0

    :catchall_1
    move-exception p0

    :goto_0
    :try_start_3
    const-string p2, "RPHubPatch"

    .line 1794
    new-instance v1, Ljava/lang/StringBuilder;

    const-string v2, "cache write failed: "

    invoke-direct {v1, v2}, Ljava/lang/StringBuilder;-><init>(Ljava/lang/String;)V

    invoke-virtual {v1, p1}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    invoke-virtual {v1}, Ljava/lang/StringBuilder;->toString()Ljava/lang/String;

    move-result-object p1

    invoke-static {p2, p1, p0}, Landroid/util/Log;->w(Ljava/lang/String;Ljava/lang/String;Ljava/lang/Throwable;)I
    :try_end_3
    .catchall {:try_start_3 .. :try_end_3} :catchall_3

    if-eqz v0, :cond_1

    .line 1798
    :try_start_4
    invoke-virtual {v0}, Ljava/io/FileOutputStream;->close()V
    :try_end_4
    .catchall {:try_start_4 .. :try_end_4} :catchall_2

    :catchall_2
    :cond_1
    :goto_1
    return-void

    :catchall_3
    move-exception p0

    if-eqz v0, :cond_2

    :try_start_5
    invoke-virtual {v0}, Ljava/io/FileOutputStream;->close()V
    :try_end_5
    .catchall {:try_start_5 .. :try_end_5} :catchall_4

    .line 1802
    :catchall_4
    :cond_2
    throw p0
.end method

.method private static writeGenerationMarker(Landroid/content/Context;I)V
    .locals 4

    .line 1143
    :try_start_0
    new-instance v0, Ljava/io/File;

    new-instance v1, Ljava/io/File;

    invoke-virtual {p0}, Landroid/content/Context;->getFilesDir()Ljava/io/File;

    move-result-object v2

    const-string v3, "patch-cache"

    invoke-direct {v1, v2, v3}, Ljava/io/File;-><init>(Ljava/io/File;Ljava/lang/String;)V

    invoke-static {p0}, Lcom/rphub/app/PatchEngine;->cacheVersionTag(Landroid/content/Context;)Ljava/lang/String;

    move-result-object p0

    invoke-direct {v0, v1, p0}, Ljava/io/File;-><init>(Ljava/io/File;Ljava/lang/String;)V

    .line 1144
    invoke-virtual {v0}, Ljava/io/File;->exists()Z

    move-result p0

    if-nez p0, :cond_0

    invoke-virtual {v0}, Ljava/io/File;->mkdirs()Z
    :try_end_0
    .catchall {:try_start_0 .. :try_end_0} :catchall_2

    :cond_0
    const/4 p0, 0x0

    .line 1147
    :try_start_1
    new-instance v1, Ljava/io/FileOutputStream;

    new-instance v2, Ljava/io/File;

    const-string v3, ".generation"

    invoke-direct {v2, v0, v3}, Ljava/io/File;-><init>(Ljava/io/File;Ljava/lang/String;)V

    invoke-direct {v1, v2}, Ljava/io/FileOutputStream;-><init>(Ljava/io/File;)V
    :try_end_1
    .catchall {:try_start_1 .. :try_end_1} :catchall_1

    .line 1148
    :try_start_2
    new-instance p0, Ljava/lang/StringBuilder;

    const-string v0, "generation="

    invoke-direct {p0, v0}, Ljava/lang/StringBuilder;-><init>(Ljava/lang/String;)V

    invoke-virtual {p0, p1}, Ljava/lang/StringBuilder;->append(I)Ljava/lang/StringBuilder;

    const-string p1, "\n"

    invoke-virtual {p0, p1}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    invoke-virtual {p0}, Ljava/lang/StringBuilder;->toString()Ljava/lang/String;

    move-result-object p0

    sget-object p1, Ljava/nio/charset/StandardCharsets;->UTF_8:Ljava/nio/charset/Charset;

    invoke-virtual {p0, p1}, Ljava/lang/String;->getBytes(Ljava/nio/charset/Charset;)[B

    move-result-object p0

    invoke-virtual {v1, p0}, Ljava/io/FileOutputStream;->write([B)V

    .line 1149
    invoke-virtual {v1}, Ljava/io/FileOutputStream;->flush()V
    :try_end_2
    .catchall {:try_start_2 .. :try_end_2} :catchall_0

    .line 1151
    :try_start_3
    invoke-virtual {v1}, Ljava/io/FileOutputStream;->close()V

    goto :goto_1

    :catchall_0
    move-exception p0

    goto :goto_0

    :catchall_1
    move-exception p1

    move-object v1, p0

    move-object p0, p1

    :goto_0
    if-eqz v1, :cond_1

    invoke-virtual {v1}, Ljava/io/FileOutputStream;->close()V

    .line 1152
    :cond_1
    throw p0
    :try_end_3
    .catchall {:try_start_3 .. :try_end_3} :catchall_2

    :catchall_2
    move-exception p0

    const-string p1, "RPHubPatch"

    const-string v0, "generation marker write failed"

    .line 1154
    invoke-static {p1, v0, p0}, Landroid/util/Log;->w(Ljava/lang/String;Ljava/lang/String;Ljava/lang/Throwable;)I

    :goto_1
    return-void
.end method

.method private static writeRejected(Landroid/content/Context;Ljava/util/List;)V
    .locals 3
    .annotation system Ldalvik/annotation/Signature;
        value = {
            "(",
            "Landroid/content/Context;",
            "Ljava/util/List<",
            "Ljava/lang/String;",
            ">;)V"
        }
    .end annotation

    const/4 v0, 0x0

    .line 1275
    :try_start_0
    new-instance v1, Ljava/io/FileOutputStream;

    invoke-static {p0}, Lcom/rphub/app/PatchEngine;->rejectedFile(Landroid/content/Context;)Ljava/io/File;

    move-result-object p0

    invoke-direct {v1, p0}, Ljava/io/FileOutputStream;-><init>(Ljava/io/File;)V
    :try_end_0
    .catchall {:try_start_0 .. :try_end_0} :catchall_1

    .line 1276
    :try_start_1
    new-instance p0, Ljava/lang/StringBuilder;

    invoke-direct {p0}, Ljava/lang/StringBuilder;-><init>()V

    const/4 v0, 0x0

    .line 1277
    invoke-interface {p1}, Ljava/util/List;->size()I

    move-result v2

    add-int/lit8 v2, v2, -0x14

    invoke-static {v0, v2}, Ljava/lang/Math;->max(II)I

    move-result v0

    .line 1278
    :goto_0
    invoke-interface {p1}, Ljava/util/List;->size()I

    move-result v2

    if-lt v0, v2, :cond_0

    .line 1281
    invoke-virtual {p0}, Ljava/lang/StringBuilder;->toString()Ljava/lang/String;

    move-result-object p0

    sget-object p1, Ljava/nio/charset/StandardCharsets;->UTF_8:Ljava/nio/charset/Charset;

    invoke-virtual {p0, p1}, Ljava/lang/String;->getBytes(Ljava/nio/charset/Charset;)[B

    move-result-object p0

    invoke-virtual {v1, p0}, Ljava/io/FileOutputStream;->write([B)V

    .line 1282
    invoke-virtual {v1}, Ljava/io/FileOutputStream;->flush()V
    :try_end_1
    .catchall {:try_start_1 .. :try_end_1} :catchall_0

    .line 1284
    :try_start_2
    invoke-virtual {v1}, Ljava/io/FileOutputStream;->close()V
    :try_end_2
    .catchall {:try_start_2 .. :try_end_2} :catchall_2

    goto :goto_2

    .line 1279
    :cond_0
    :try_start_3
    invoke-interface {p1, v0}, Ljava/util/List;->get(I)Ljava/lang/Object;

    move-result-object v2

    check-cast v2, Ljava/lang/String;

    invoke-virtual {p0, v2}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    const/16 v2, 0xa

    invoke-virtual {p0, v2}, Ljava/lang/StringBuilder;->append(C)Ljava/lang/StringBuilder;
    :try_end_3
    .catchall {:try_start_3 .. :try_end_3} :catchall_0

    add-int/lit8 v0, v0, 0x1

    goto :goto_0

    :catchall_0
    move-exception p0

    move-object v0, v1

    goto :goto_1

    :catchall_1
    move-exception p0

    :goto_1
    if-eqz v0, :cond_1

    .line 1284
    :try_start_4
    invoke-virtual {v0}, Ljava/io/FileOutputStream;->close()V

    .line 1285
    :cond_1
    throw p0
    :try_end_4
    .catchall {:try_start_4 .. :try_end_4} :catchall_2

    :catchall_2
    move-exception p0

    const-string p1, "RPHubPatch"

    const-string v0, "rejected list write failed"

    .line 1287
    invoke-static {p1, v0, p0}, Landroid/util/Log;->w(Ljava/lang/String;Ljava/lang/String;Ljava/lang/Throwable;)I

    :goto_2
    return-void
.end method

.method public static intercept(Landroid/content/Context;Ljava/lang/String;)Landroid/webkit/WebResourceResponse;
    .locals 1
    invoke-static {p0, p1}, Lcom/rphub/app/LocalAssets;->intercept(Landroid/content/Context;Ljava/lang/String;)Landroid/webkit/WebResourceResponse;
    move-result-object v0
    if-eqz v0, :remote
    return-object v0
    :remote
    invoke-static {p0, p1}, Lcom/rphub/app/PatchEngine;->interceptRemote(Landroid/content/Context;Ljava/lang/String;)Landroid/webkit/WebResourceResponse;
    move-result-object v0
    return-object v0
.end method
