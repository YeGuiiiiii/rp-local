(() => {
  // scripts/stream-import/storage.mjs
  var stores = {
    restore_sessions: "id",
    restore_units: ["session", "source", "entry", "part"],
    restore_records: ["session", "source", "entry"],
    restore_web: ["session", "key"],
    restore_companions: ["session", "database", "store", "part"]
  };
  function upgrade(db) {
    if (!db.objectStoreNames.contains("store")) db.createObjectStore("store");
    for (const [name, keyPath] of Object.entries(stores)) {
      if (!db.objectStoreNames.contains(name)) db.createObjectStore(name, { keyPath });
    }
  }
  var resultOf = (request) => new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  var completed = (tx) => new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onabort = () => reject(tx.error || new Error("\u5BFC\u5165\u5DF2\u53D6\u6D88"));
    tx.onerror = () => {
    };
  });
  var rangeOf = (...keys) => IDBKeyRange.bound(keys, [...keys, []]);
  var database = () => new Promise((resolve, reject) => {
    const request = indexedDB.open("RPHubDB", 2);
    let settled = false;
    const timer = setTimeout(() => fail(new Error("\u6253\u5F00\u6570\u636E\u5E93\u8D85\u65F6\uFF0C\u8BF7\u5173\u95ED\u5176\u4ED6\u8F6F\u4EF6\u9875\u9762\u540E\u91CD\u8BD5")), 15e3);
    function fail(error) {
      settled = true;
      clearTimeout(timer);
      reject(error);
    }
    request.onupgradeneeded = () => upgrade(request.result);
    request.onblocked = () => fail(new Error("\u6570\u636E\u5E93\u88AB\u5176\u4ED6\u9875\u9762\u5360\u7528\uFF0C\u8BF7\u5173\u95ED\u5176\u4ED6\u9875\u9762\u540E\u91CD\u8BD5"));
    request.onerror = () => fail(request.error);
    request.onsuccess = () => {
      clearTimeout(timer);
      const db = request.result;
      if (settled) {
        db.close();
        return;
      }
      db.onversionchange = () => db.close();
      resolve(db);
    };
  });
  async function saveSession(db, session) {
    const tx = db.transaction("restore_sessions", "readwrite");
    tx.objectStore("restore_sessions").put(session);
    await completed(tx);
  }
  async function removeSession(db, id) {
    const tx = db.transaction(Object.keys(stores), "readwrite");
    tx.objectStore("restore_sessions").delete(id);
    for (const name of Object.keys(stores).slice(1)) tx.objectStore(name).delete(rangeOf(id));
    await completed(tx);
  }
  async function each(db, name, range, fn) {
    const tx = db.transaction(name);
    const done = completed(tx);
    const request = tx.objectStore(name).openCursor(range);
    let failure;
    request.onsuccess = () => {
      const cursor = request.result;
      if (!cursor) return;
      try {
        fn(cursor.value);
        cursor.continue();
      } catch (error) {
        failure = error;
        tx.abort();
      }
    };
    try {
      await done;
    } catch (error) {
      throw failure || error;
    }
  }
  var StagingSink = class {
    constructor(db, session) {
      Object.assign(this, { db, session, queue: [] });
    }
    emit(item) {
      this.queue.push(item);
    }
    async flush() {
      if (!this.queue.length) return;
      const tx = this.db.transaction(Object.keys(stores).slice(1), "readwrite");
      const names = { unit: "restore_units", record: "restore_records", localStorage: "restore_web", companion: "restore_companions" };
      for (const { kind, ...item } of this.queue) {
        tx.objectStore(names[kind]).put({ ...item, session: this.session });
      }
      await completed(tx);
      this.queue.length = 0;
    }
  };
  async function validate(db, session, source, wait, maxCollectionBytes = 128 * 1048576) {
    const last = /* @__PURE__ */ new Map();
    await each(db, "restore_records", rangeOf(session, source), (item) => {
      last.set(item.key, item);
      if (last.size > 1e5) throw new Error("\u5907\u4EFD\u5B58\u50A8\u9879\u8D85\u8FC7 10 \u4E07\u9879");
    });
    const deleted = /* @__PURE__ */ new Set();
    const summary = { records: last.size, cards: 0, messages: 0, memories: 0 };
    for (const [key, record] of last) {
      await wait();
      if (key.startsWith("rp_hub_b1_memory_state_")) {
        const meta = (await resultOf(db.transaction("restore_units").objectStore("restore_units").get([session, source, record.entry, 0])))?.value;
        const scope = key.slice("rp_hub_b1_memory_state_".length);
        if (!scope || !meta || meta.schema !== 1 || !/^[a-f0-9]{32}$/.test(meta.revision) || typeof meta.deleted !== "boolean")
          throw new Error("\u8BB0\u5FC6\u7248\u672C\u8BB0\u5F55\u635F\u574F\uFF1A" + key);
        const body = "rp_hub_classic_memories_" + scope;
        if (meta.deleted) deleted.add(body);
        else if (!last.get(body)?.array) throw new Error("\u8BB0\u5FC6\u7248\u672C\u8BB0\u5F55\u7F3A\u5C11\u6B63\u6587\uFF1A" + body);
      }
      if (key.startsWith("rp_hub_classic_memories_") && !record.array) throw new Error("\u8BB0\u5FC6\u6B63\u6587\u5FC5\u987B\u662F\u6570\u7EC4\uFF1A" + key);
      if (key === "rp_hub_characters" && !record.array) throw new Error("\u89D2\u8272\u5361\u96C6\u5408\u5FC5\u987B\u662F\u6570\u7EC4");
      let bytes = 0, count = 0;
      await each(db, "restore_units", rangeOf(session, source, record.entry), (unit) => {
        bytes += unit.bytes;
        count++;
        if (key === "rp_hub_characters" && (!unit.value || typeof unit.value !== "object" || Array.isArray(unit.value)))
          throw new Error("\u89D2\u8272\u5361\u5185\u5BB9\u4E0D\u662F\u5BF9\u8C61");
      });
      if (count !== record.count) throw new Error("\u6682\u5B58\u8BB0\u5F55\u4E0D\u5B8C\u6574\uFF1A" + key);
      if (key !== "rp_hub_characters" && bytes > maxCollectionBytes)
        throw new Error("\u5355\u4E2A\u6570\u636E\u96C6\u5408\u8D85\u8FC7 " + maxCollectionBytes / 1048576 + " MB\uFF0C\u8BF7\u5207\u6362\u8BFB\u53D6\u6863\u4F4D\u6216\u62C6\u5206\u5907\u4EFD\uFF1A" + key);
      if (key === "rp_hub_characters") summary.cards = record.count;
      if (key.startsWith("rp_hub_chat_") && record.array) summary.messages += record.count;
      if (key.startsWith("rp_hub_classic_memories_")) summary.memories += record.count;
    }
    for (const key of deleted) summary.memories -= last.get(key)?.count || 0;
    return { plan: [...last.values()], deleted: [...deleted], summary };
  }

  // scripts/stream-import/profiles.mjs
  var MB = 1048576;
  var profiles = Object.freeze([
    { id: "light", name: "\u7701\u5185\u5B58", chunkBytes: 65536, unitBytes: 16 * MB, collectionBytes: 64 * MB },
    { id: "balanced", name: "\u5747\u8861", chunkBytes: 262144, unitBytes: 32 * MB, collectionBytes: 128 * MB },
    { id: "fast", name: "\u9AD8\u901F", chunkBytes: MB, unitBytes: 64 * MB, collectionBytes: 256 * MB }
  ]);
  var profile = (id) => profiles.find((item) => item.id === id) || profiles[1];

  // scripts/stream-import/client.mjs
  var readSession = (db, id) => resultOf(db.transaction("restore_sessions").objectStore("restore_sessions").get(id));
  var webText = (value) => String(value ?? "");
  var cancelled = (signal) => {
    if (signal?.aborted) throw new DOMException("\u5BFC\u5165\u5DF2\u53D6\u6D88", "AbortError");
  };
  async function stageEntries(entries, { limits = profile() } = {}) {
    const db = await window.RPHubStorage.initDB(), id = crypto.randomUUID().replaceAll("-", "");
    const sink = new StagingSink(db, id), encoder = new TextEncoder();
    try {
      await saveSession(db, { id, state: "reading" });
      let index = 0;
      for await (const entry of entries) {
        const array = Array.isArray(entry.value) || !!entry.value?.[Symbol.asyncIterator];
        let part = 0;
        const write = async (value) => {
          const bytes = encoder.encode(JSON.stringify(value)).length;
          const maxBytes = entry.key === "rp_hub_characters" ? profiles.at(-1).unitBytes : limits.unitBytes;
          if (bytes > maxBytes) throw new Error("\u5355\u6761\u4E91\u7AEF\u6570\u636E\u8D85\u8FC7 " + maxBytes / 1048576 + " MB\uFF0C\u539F\u6570\u636E\u672A\u6539\u52A8");
          sink.emit({ kind: "unit", source: "entries", entry: index, part: part++, value, bytes });
          await sink.flush();
        };
        if (array) {
          for await (const value of entry.value) await write(value);
        } else await write(entry.value);
        sink.emit({ kind: "record", source: "entries", entry: index++, key: entry.key, hasValue: true, array, count: part });
        await sink.flush();
      }
      const result = await validate(db, id, "entries", async () => {
      }, limits.collectionBytes);
      await saveSession(db, { id, ...result, source: "entries", state: "complete" });
      return id;
    } catch (error) {
      await removeSession(db, id);
      throw error;
    }
  }
  async function momentsDb() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open("sf_moments_db", 1);
      let settled = false;
      const timer = setTimeout(() => {
        settled = true;
        reject(new Error("\u540D\u573A\u9762\u6570\u636E\u5E93\u6253\u5F00\u8D85\u65F6"));
      }, 15e3);
      req.onupgradeneeded = () => {
        if (!req.result.objectStoreNames.contains("moments")) req.result.createObjectStore("moments");
      };
      req.onsuccess = () => {
        clearTimeout(timer);
        if (settled) req.result.close();
        else resolve(req.result);
      };
      req.onerror = () => {
        clearTimeout(timer);
        reject(req.error);
      };
      req.onblocked = () => {
        settled = true;
        clearTimeout(timer);
        reject(new Error("\u540D\u573A\u9762\u6570\u636E\u5E93\u88AB\u5176\u4ED6\u9875\u9762\u5360\u7528"));
      };
    });
  }
  async function writeMoments(value) {
    const db = await momentsDb();
    try {
      const tx = db.transaction("moments", "readwrite");
      if (value === void 0) tx.objectStore("moments").delete("list");
      else tx.objectStore("moments").put(value, "list");
      await completed(tx);
    } finally {
      db.close();
    }
  }
  function writeWeb(items) {
    for (const { key, value } of items) {
      if (value === null) localStorage.removeItem(key);
      else localStorage.setItem(key, value);
      if (localStorage.getItem(key) !== value) throw new Error("\u504F\u597D\u8BBE\u7F6E\u5199\u5165\u5931\u8D25\uFF1A" + key);
    }
  }
  async function discardPreparedCards(db, session) {
    if (!session.cardRevision) return;
    const tx = db.transaction("store", "readwrite"), store = tx.objectStore("store");
    for (const prefix of ["__rp_card__:", "__rp_card_image__:"]) {
      const start = prefix + session.cardRevision + ":";
      store.delete(IDBKeyRange.bound(start, start + "\uFFFF"));
    }
    await completed(tx);
  }
  async function recover(db) {
    const sessions = await resultOf(db.transaction("restore_sessions").objectStore("restore_sessions").getAll());
    for (const session of sessions) {
      if (session.state === "applying" || session.state === "applied") {
        window.RPLocalStore?.setWebWritesPaused(true);
        try {
          const items = session.state === "applying" ? session.oldWeb : session.web;
          if (session.state === "applying" && session.hasMoments) await writeMoments(session.oldMoments);
          writeWeb(items);
          for (const { key, value } of items) {
            if (value === null) await window.RPLocalStore?.remove("__ls__:" + key);
            else await window.RPLocalStore?.save("__ls__:" + key, value);
          }
        } finally {
          window.RPLocalStore?.setWebWritesPaused(false);
        }
      }
      if (session.state !== "applied") await discardPreparedCards(db, session);
      await removeSession(db, session.id);
    }
  }
  async function prepareExtras(db, session) {
    const web = /* @__PURE__ */ new Map();
    await each(db, "restore_web", rangeOf(session.id), (item) => web.set(item.key, webText(item.value)));
    for (const record of session.plan.filter((item) => item.key.startsWith("__ls__:"))) {
      const unit = await resultOf(db.transaction("restore_units").objectStore("restore_units").get([session.id, session.source, record.entry, 0]));
      if (record.array) throw new Error("\u504F\u597D\u8BBE\u7F6E\u683C\u5F0F\u9519\u8BEF\uFF1A" + record.key);
      web.set(record.key.slice(7), webText(unit?.value));
    }
    if ([...web].reduce((total, [key, value]) => total + (key.length + value.length) * 2, 0) > 16 * 1048576)
      throw new Error("\u504F\u597D\u8BBE\u7F6E\u4F53\u79EF\u8D85\u8FC7 16 MB");
    const groups = /* @__PURE__ */ new Map();
    let bytes = 0;
    await each(db, "restore_companions", rangeOf(session.id), (item) => {
      const priority2 = item.database === "sf_moments_db" && item.store === "moments" ? 0 : item.database === "SakuraMomentsDB" && item.store === "moments" ? 1 : item.database === "moments" && item.store === "list" ? 2 : -1;
      if (priority2 < 0) return;
      bytes += item.bytes;
      if (bytes > 32 * 1048576) throw new Error("\u540D\u573A\u9762\u6570\u636E\u8D85\u8FC7 32 MB\uFF0C\u8BF7\u4F7F\u7528\u539F\u6709\u5BFC\u5165");
      if (!groups.has(priority2)) groups.set(priority2, []);
      const record = item.value;
      const value = record && typeof record === "object" && Object.hasOwn(record, "v") ? record.v : record;
      if ((record?.k ?? record?.key) === "list" && Array.isArray(value)) groups.get(priority2).push(...value);
      else groups.get(priority2).push(value);
    });
    const priority = [...groups.keys()].sort()[0];
    return { web: [...web].map(([key, value]) => ({ key, value })), moments: groups.get(priority) };
  }
  async function prepareCharacters(db, session, restoreValue, signal, progress) {
    const record = session.plan.find((item) => item.key === "rp_hub_characters");
    if (!record) return null;
    await discardPreparedCards(db, session);
    session.cardRevision = crypto.randomUUID().replaceAll("-", "");
    await saveSession(db, session);
    const cards = [], ids = /* @__PURE__ */ new Set();
    for (let part = 0; part < record.count; part++) {
      cancelled(signal);
      const unit = await resultOf(db.transaction("restore_units").objectStore("restore_units").get([session.id, session.source, record.entry, part]));
      const card = restoreValue(unit?.value);
      if (!card || card.rphubCardStub === 1 || card.avatar?.rphubCardImage === 1)
        throw new Error("\u5907\u4EFD\u7F3A\u5C11\u5B8C\u6574\u89D2\u8272\u5361\u5185\u5BB9\uFF0C\u539F\u6570\u636E\u672A\u6539\u52A8");
      const uuid = card.uuid || crypto.randomUUID();
      if (ids.has(uuid)) throw new Error("\u89D2\u8272\u5361\u6807\u8BC6\u91CD\u590D\uFF0C\u539F\u6570\u636E\u672A\u6539\u52A8");
      ids.add(uuid);
      const summary = {
        ...await window.RPHubStorage.toCharacterStub(card),
        uuid,
        rphubCardRevision: session.cardRevision
      };
      cards.push(summary);
      window.RPLocalStore?.assignFolders(cards, false);
      Object.assign(card, { uuid, importedName: summary.importedName, storageFolder: summary.storageFolder });
      const suffix = session.cardRevision + ":" + uuid;
      const tx = db.transaction("store", "readwrite"), store = tx.objectStore("store");
      if (typeof card.avatar === "string" && card.avatar.startsWith("data:") && card.avatar.length >= 65536) {
        store.put({ uuid, storageFolder: card.storageFolder, avatar: card.avatar }, "__rp_card_image__:" + suffix);
        card.avatar = { rphubCardImage: 1 };
      }
      store.put(card, "__rp_card__:" + suffix);
      await completed(tx);
      progress?.(part + 1);
    }
    return { rphubCardLibrary: 1, cards };
  }
  async function apply(id, { beforeApply, restoreValue, signal, progress }) {
    const db = await window.RPHubStorage.initDB();
    const session = await readSession(db, id);
    if (session?.state !== "complete") throw new Error("\u6682\u5B58\u6570\u636E\u4E0D\u53EF\u7528\uFF0C\u8BF7\u91CD\u65B0\u9009\u62E9\u6587\u4EF6");
    const deleted = new Set(session.deleted);
    const records = session.plan.filter((item) => !item.key.startsWith("__ls__:") && item.key !== "__rp_local_mirror_revision" && !item.key.startsWith("rp_hub_b1_memory_state_") && !deleted.has(item.key));
    const cardCount = session.plan.find((item) => item.key === "rp_hub_characters")?.count || 0;
    const totalWork = cardCount + records.length + 1;
    const extras = await prepareExtras(db, session);
    cancelled(signal);
    await beforeApply();
    await window.RPLocalStore?.flush();
    window.RPHubStorage.setWritesPaused(true);
    window.RPLocalStore?.setWebWritesPaused(true);
    let journaled = false, committed = false, recoveryRequired = false;
    try {
      const oldCardKeys = cardCount || session.plan.some((item) => item.key === "rp_hub_characters") ? (await window.RPHubStorage.readStorageKeys(db)).filter((key) => key.startsWith("__rp_card__:") || key.startsWith("__rp_card_image__:")) : [];
      const characters = await prepareCharacters(
        db,
        session,
        restoreValue,
        signal,
        (done) => progress?.(done, totalWork, "\u6B63\u5728\u6574\u7406\u89D2\u8272\u5361 " + done + " / " + cardCount)
      );
      const journal = {
        id,
        state: "applying",
        web: extras.web,
        cardRevision: session.cardRevision,
        oldWeb: extras.web.map(({ key }) => ({ key, value: localStorage.getItem(key) })),
        hasMoments: extras.moments !== void 0
      };
      if (journal.hasMoments) {
        const moments = await momentsDb();
        try {
          journal.oldMoments = await resultOf(moments.transaction("moments").objectStore("moments").get("list"));
        } finally {
          moments.close();
        }
      }
      await saveSession(db, journal);
      journaled = true;
      cancelled(signal);
      if (journal.hasMoments) await writeMoments(extras.moments.map((value) => restoreValue(value)));
      cancelled(signal);
      await new Promise((resolve, reject) => {
        const tx = db.transaction(["store", "restore_units", "restore_sessions"], "readwrite");
        const store = tx.objectStore("store");
        store.delete("__rp_local_mirror_revision");
        oldCardKeys.forEach((key) => store.delete(key));
        let failure;
        const abort = () => {
          try {
            tx.abort();
          } catch (_) {
          }
        };
        signal?.addEventListener("abort", abort, { once: true });
        tx.oncomplete = () => {
          signal?.removeEventListener("abort", abort);
          committed = true;
          resolve();
        };
        tx.onabort = () => {
          signal?.removeEventListener("abort", abort);
          reject(failure || tx.error || new DOMException("\u5BFC\u5165\u5DF2\u53D6\u6D88", "AbortError"));
        };
        tx.onerror = () => {
        };
        const fail = (error) => {
          failure = error;
          abort();
        };
        for (const key of deleted) {
          for (const entry of window.RPHubStorage.prepareRestoredMemoryEntries([
            {
              key: key.replace("rp_hub_classic_memories_", "rp_hub_b1_memory_state_"),
              value: { schema: 1, revision: crypto.randomUUID().replaceAll("-", ""), deleted: true }
            }
          ])) store.put(entry.value, entry.key);
          store.delete(key);
        }
        const next = (index) => {
          try {
            cancelled(signal);
            if (index === records.length) {
              writeWeb(extras.web);
              tx.objectStore("restore_sessions").put({
                id,
                state: "applied",
                web: extras.web,
                cardRevision: session.cardRevision
              });
              return;
            }
            const record = records[index];
            if (record.key === "rp_hub_characters") {
              store.put(characters, record.key);
              progress?.(cardCount + index + 1, totalWork);
              next(index + 1);
              return;
            }
            let value = record.array ? [] : void 0;
            const req = tx.objectStore("restore_units").openCursor(rangeOf(id, session.source, record.entry));
            req.onsuccess = () => {
              try {
                const cursor = req.result;
                if (cursor) {
                  const item = restoreValue(cursor.value.value);
                  if (record.array) value.push(item);
                  else value = item;
                  cursor.continue();
                } else {
                  for (const entry of window.RPHubStorage.prepareRestoredMemoryEntries([
                    { key: record.key, value }
                  ])) store.put(entry.value, entry.key);
                  value = null;
                  progress?.(cardCount + index + 1, totalWork);
                  next(index + 1);
                }
              } catch (error) {
                fail(error);
              }
            };
          } catch (error) {
            fail(error);
          }
        };
        next(0);
      });
      progress?.(totalWork - 1, totalWork, "\u6B63\u5728\u4FDD\u5B58\u672C\u673A\u5B58\u6863");
      await window.RPHubStorage.syncLocalFiles?.();
      await removeSession(db, id);
      progress?.(totalWork, totalWork);
    } catch (error) {
      if (committed) {
        error.recoveryRequired = true;
        error.message = "\u672C\u673A\u5B58\u6863\u4FDD\u5B58\u672A\u5B8C\u6210\uFF0C\u8BF7\u91CD\u65B0\u6253\u5F00\u8F6F\u4EF6\u7EE7\u7EED\u6062\u590D\uFF1A" + error.message;
      }
      if (!committed) {
        try {
          if (journaled) await recover(db);
          else await discardPreparedCards(db, session);
        } catch (rollbackError) {
          recoveryRequired = true;
          const failure = new Error("\u6062\u590D\u539F\u6570\u636E\u672A\u5B8C\u6210\uFF0C\u8BF7\u91CD\u65B0\u6253\u5F00\u8F6F\u4EF6\u81EA\u52A8\u6062\u590D\uFF1A" + rollbackError.message);
          failure.recoveryRequired = true;
          throw failure;
        }
      }
      throw error;
    } finally {
      if (!committed && !recoveryRequired) {
        window.RPHubStorage.setWritesPaused(false);
        window.RPLocalStore?.setWebWritesPaused(false);
      }
    }
  }
  window.RPStreamImport = { upgrade, database, recover, apply, stageEntries, readSession, removeSession, profile, profiles };
})();
