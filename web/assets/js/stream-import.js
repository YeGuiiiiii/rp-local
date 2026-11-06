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

  // scripts/stream-import/client.mjs
  var readSession = (db, id) => resultOf(db.transaction("restore_sessions").objectStore("restore_sessions").get(id));
  var webText = (value) => String(value ?? "");
  var cancelled = (signal) => {
    if (signal?.aborted) throw new DOMException("\u5BFC\u5165\u5DF2\u53D6\u6D88", "AbortError");
  };
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
  async function apply(id, { beforeApply, restoreValue, signal, progress }) {
    const db = await window.RPHubStorage.initDB();
    const session = await readSession(db, id);
    if (session?.state !== "complete") throw new Error("\u6682\u5B58\u6570\u636E\u4E0D\u53EF\u7528\uFF0C\u8BF7\u91CD\u65B0\u9009\u62E9\u6587\u4EF6");
    const extras = await prepareExtras(db, session);
    cancelled(signal);
    await beforeApply();
    await window.RPLocalStore?.flush();
    window.RPHubStorage.setWritesPaused(true);
    window.RPLocalStore?.setWebWritesPaused(true);
    let journaled = false, committed = false, recoveryRequired = false;
    try {
      const journal = {
        id,
        state: "applying",
        web: extras.web,
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
        const deleted = new Set(session.deleted);
        const records = session.plan.filter((item) => !item.key.startsWith("__ls__:") && !item.key.startsWith("rp_hub_b1_memory_state_") && !deleted.has(item.key));
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
              tx.objectStore("restore_sessions").put({ id, state: "applied", web: extras.web });
              return;
            }
            const record = records[index];
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
                  progress?.(index + 1, records.length);
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
    } catch (error) {
      if (journaled && !committed) {
        try {
          await recover(db);
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
  window.RPStreamImport = { upgrade, database, recover, apply, readSession, removeSession };
})();
