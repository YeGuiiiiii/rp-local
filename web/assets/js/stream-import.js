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
  var STAGING_DB_NAME = "RPHubStagingDB";
  var deleteStagingDatabase = () => new Promise((resolve) => {
    let request;
    try {
      request = indexedDB.deleteDatabase(STAGING_DB_NAME);
    } catch (error) {
      resolve(false);
      return;
    }
    const done = () => resolve(true);
    request.onsuccess = done;
    request.onerror = done;
    request.onblocked = done;
  });
  var database = () => new Promise((resolve, reject) => {
    const request = indexedDB.open(STAGING_DB_NAME, 1);
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
      this.tally = /* @__PURE__ */ new Map();
    }
    emit(item) {
      this.queue.push(item);
    }
    async flush() {
      if (!this.queue.length) return;
      const id = (item) => JSON.stringify([item.source, item.entry]);
      const prepared = [];
      for (const { kind, ...item } of this.queue) {
        if (kind === "unit") {
          const key = id(item);
          const tally = this.tally.get(key) || { count: 0, bytes: 0 };
          tally.count += 1;
          tally.bytes += Number(item.bytes) || 0;
          this.tally.set(key, tally);
        } else if (kind === "record") {
          const tally = this.tally.get(id(item)) || { count: 0, bytes: 0 };
          this.tally.delete(id(item));
          if (tally.count !== item.count)
            throw new Error("\u6682\u5B58\u8BB0\u5F55\u4E0D\u5B8C\u6574\uFF1A" + item.key);
          item.bytes = tally.bytes;
        }
        prepared.push([kind, item]);
      }
      const tx = this.db.transaction(Object.keys(stores).slice(1), "readwrite");
      const names = { unit: "restore_units", record: "restore_records", localStorage: "restore_web", companion: "restore_companions" };
      for (const [kind, item] of prepared) {
        tx.objectStore(names[kind]).put({ ...item, session: this.session });
      }
      await completed(tx);
      this.queue.length = 0;
    }
  };
  async function validate(db, session, source, wait, maxCollectionBytes = 128 * 1048576, onStep) {
    const last = /* @__PURE__ */ new Map();
    await each(db, "restore_records", rangeOf(session, source), (item) => {
      last.set(item.key, item);
      if (last.size > 1e5) throw new Error("\u5907\u4EFD\u5B58\u50A8\u9879\u8D85\u8FC7 10 \u4E07\u9879");
    });
    const deleted = /* @__PURE__ */ new Set();
    const summary = { records: last.size, cards: 0, messages: 0, memories: 0 };
    let done = 0;
    for (const [key, record] of last) {
      await wait();
      onStep?.(++done, last.size);
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
      let bytes = Number(record.bytes);
      if (!Number.isFinite(bytes)) {
        bytes = 0;
        let count = 0;
        await each(db, "restore_units", rangeOf(session, source, record.entry), (unit) => {
          bytes += Number(unit.bytes) || 0;
          count++;
        });
        if (count !== record.count) throw new Error("\u6682\u5B58\u8BB0\u5F55\u4E0D\u5B8C\u6574\uFF1A" + key);
      }
      if (key !== "rp_hub_characters" && !key.startsWith("rp_hub_chat_") && bytes > maxCollectionBytes)
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

  // scripts/ui-build/node_modules/@noble/hashes/esm/utils.js
  function isBytes(a) {
    return a instanceof Uint8Array || ArrayBuffer.isView(a) && a.constructor.name === "Uint8Array";
  }
  function abytes(b, ...lengths) {
    if (!isBytes(b))
      throw new Error("Uint8Array expected");
    if (lengths.length > 0 && !lengths.includes(b.length))
      throw new Error("Uint8Array expected of length " + lengths + ", got length=" + b.length);
  }
  function aexists(instance, checkFinished = true) {
    if (instance.destroyed)
      throw new Error("Hash instance has been destroyed");
    if (checkFinished && instance.finished)
      throw new Error("Hash#digest() has already been called");
  }
  function aoutput(out, instance) {
    abytes(out);
    const min = instance.outputLen;
    if (out.length < min) {
      throw new Error("digestInto() expects output buffer of length at least " + min);
    }
  }
  function clean(...arrays) {
    for (let i = 0; i < arrays.length; i++) {
      arrays[i].fill(0);
    }
  }
  function createView(arr) {
    return new DataView(arr.buffer, arr.byteOffset, arr.byteLength);
  }
  function rotr(word, shift) {
    return word << 32 - shift | word >>> shift;
  }
  var hasHexBuiltin = /* @__PURE__ */ (() => (
    // @ts-ignore
    typeof Uint8Array.from([]).toHex === "function" && typeof Uint8Array.fromHex === "function"
  ))();
  var hexes = /* @__PURE__ */ Array.from({ length: 256 }, (_, i) => i.toString(16).padStart(2, "0"));
  function bytesToHex(bytes) {
    abytes(bytes);
    if (hasHexBuiltin)
      return bytes.toHex();
    let hex = "";
    for (let i = 0; i < bytes.length; i++) {
      hex += hexes[bytes[i]];
    }
    return hex;
  }
  function utf8ToBytes(str) {
    if (typeof str !== "string")
      throw new Error("string expected");
    return new Uint8Array(new TextEncoder().encode(str));
  }
  function toBytes(data) {
    if (typeof data === "string")
      data = utf8ToBytes(data);
    abytes(data);
    return data;
  }
  var Hash = class {
  };
  function createHasher(hashCons) {
    const hashC = (msg) => hashCons().update(toBytes(msg)).digest();
    const tmp = hashCons();
    hashC.outputLen = tmp.outputLen;
    hashC.blockLen = tmp.blockLen;
    hashC.create = () => hashCons();
    return hashC;
  }

  // scripts/ui-build/node_modules/@noble/hashes/esm/_md.js
  function setBigUint64(view, byteOffset, value, isLE) {
    if (typeof view.setBigUint64 === "function")
      return view.setBigUint64(byteOffset, value, isLE);
    const _32n = BigInt(32);
    const _u32_max = BigInt(4294967295);
    const wh = Number(value >> _32n & _u32_max);
    const wl = Number(value & _u32_max);
    const h = isLE ? 4 : 0;
    const l = isLE ? 0 : 4;
    view.setUint32(byteOffset + h, wh, isLE);
    view.setUint32(byteOffset + l, wl, isLE);
  }
  function Chi(a, b, c) {
    return a & b ^ ~a & c;
  }
  function Maj(a, b, c) {
    return a & b ^ a & c ^ b & c;
  }
  var HashMD = class extends Hash {
    constructor(blockLen, outputLen, padOffset, isLE) {
      super();
      this.finished = false;
      this.length = 0;
      this.pos = 0;
      this.destroyed = false;
      this.blockLen = blockLen;
      this.outputLen = outputLen;
      this.padOffset = padOffset;
      this.isLE = isLE;
      this.buffer = new Uint8Array(blockLen);
      this.view = createView(this.buffer);
    }
    update(data) {
      aexists(this);
      data = toBytes(data);
      abytes(data);
      const { view, buffer, blockLen } = this;
      const len = data.length;
      for (let pos = 0; pos < len; ) {
        const take = Math.min(blockLen - this.pos, len - pos);
        if (take === blockLen) {
          const dataView = createView(data);
          for (; blockLen <= len - pos; pos += blockLen)
            this.process(dataView, pos);
          continue;
        }
        buffer.set(data.subarray(pos, pos + take), this.pos);
        this.pos += take;
        pos += take;
        if (this.pos === blockLen) {
          this.process(view, 0);
          this.pos = 0;
        }
      }
      this.length += data.length;
      this.roundClean();
      return this;
    }
    digestInto(out) {
      aexists(this);
      aoutput(out, this);
      this.finished = true;
      const { buffer, view, blockLen, isLE } = this;
      let { pos } = this;
      buffer[pos++] = 128;
      clean(this.buffer.subarray(pos));
      if (this.padOffset > blockLen - pos) {
        this.process(view, 0);
        pos = 0;
      }
      for (let i = pos; i < blockLen; i++)
        buffer[i] = 0;
      setBigUint64(view, blockLen - 8, BigInt(this.length * 8), isLE);
      this.process(view, 0);
      const oview = createView(out);
      const len = this.outputLen;
      if (len % 4)
        throw new Error("_sha2: outputLen should be aligned to 32bit");
      const outLen = len / 4;
      const state = this.get();
      if (outLen > state.length)
        throw new Error("_sha2: outputLen bigger than state");
      for (let i = 0; i < outLen; i++)
        oview.setUint32(4 * i, state[i], isLE);
    }
    digest() {
      const { buffer, outputLen } = this;
      this.digestInto(buffer);
      const res = buffer.slice(0, outputLen);
      this.destroy();
      return res;
    }
    _cloneInto(to) {
      to || (to = new this.constructor());
      to.set(...this.get());
      const { blockLen, buffer, length, finished, destroyed, pos } = this;
      to.destroyed = destroyed;
      to.finished = finished;
      to.length = length;
      to.pos = pos;
      if (length % blockLen)
        to.buffer.set(buffer);
      return to;
    }
    clone() {
      return this._cloneInto();
    }
  };
  var SHA256_IV = /* @__PURE__ */ Uint32Array.from([
    1779033703,
    3144134277,
    1013904242,
    2773480762,
    1359893119,
    2600822924,
    528734635,
    1541459225
  ]);

  // scripts/ui-build/node_modules/@noble/hashes/esm/sha2.js
  var SHA256_K = /* @__PURE__ */ Uint32Array.from([
    1116352408,
    1899447441,
    3049323471,
    3921009573,
    961987163,
    1508970993,
    2453635748,
    2870763221,
    3624381080,
    310598401,
    607225278,
    1426881987,
    1925078388,
    2162078206,
    2614888103,
    3248222580,
    3835390401,
    4022224774,
    264347078,
    604807628,
    770255983,
    1249150122,
    1555081692,
    1996064986,
    2554220882,
    2821834349,
    2952996808,
    3210313671,
    3336571891,
    3584528711,
    113926993,
    338241895,
    666307205,
    773529912,
    1294757372,
    1396182291,
    1695183700,
    1986661051,
    2177026350,
    2456956037,
    2730485921,
    2820302411,
    3259730800,
    3345764771,
    3516065817,
    3600352804,
    4094571909,
    275423344,
    430227734,
    506948616,
    659060556,
    883997877,
    958139571,
    1322822218,
    1537002063,
    1747873779,
    1955562222,
    2024104815,
    2227730452,
    2361852424,
    2428436474,
    2756734187,
    3204031479,
    3329325298
  ]);
  var SHA256_W = /* @__PURE__ */ new Uint32Array(64);
  var SHA256 = class extends HashMD {
    constructor(outputLen = 32) {
      super(64, outputLen, 8, false);
      this.A = SHA256_IV[0] | 0;
      this.B = SHA256_IV[1] | 0;
      this.C = SHA256_IV[2] | 0;
      this.D = SHA256_IV[3] | 0;
      this.E = SHA256_IV[4] | 0;
      this.F = SHA256_IV[5] | 0;
      this.G = SHA256_IV[6] | 0;
      this.H = SHA256_IV[7] | 0;
    }
    get() {
      const { A, B, C, D, E, F, G, H } = this;
      return [A, B, C, D, E, F, G, H];
    }
    // prettier-ignore
    set(A, B, C, D, E, F, G, H) {
      this.A = A | 0;
      this.B = B | 0;
      this.C = C | 0;
      this.D = D | 0;
      this.E = E | 0;
      this.F = F | 0;
      this.G = G | 0;
      this.H = H | 0;
    }
    process(view, offset) {
      for (let i = 0; i < 16; i++, offset += 4)
        SHA256_W[i] = view.getUint32(offset, false);
      for (let i = 16; i < 64; i++) {
        const W15 = SHA256_W[i - 15];
        const W2 = SHA256_W[i - 2];
        const s0 = rotr(W15, 7) ^ rotr(W15, 18) ^ W15 >>> 3;
        const s1 = rotr(W2, 17) ^ rotr(W2, 19) ^ W2 >>> 10;
        SHA256_W[i] = s1 + SHA256_W[i - 7] + s0 + SHA256_W[i - 16] | 0;
      }
      let { A, B, C, D, E, F, G, H } = this;
      for (let i = 0; i < 64; i++) {
        const sigma1 = rotr(E, 6) ^ rotr(E, 11) ^ rotr(E, 25);
        const T1 = H + sigma1 + Chi(E, F, G) + SHA256_K[i] + SHA256_W[i] | 0;
        const sigma0 = rotr(A, 2) ^ rotr(A, 13) ^ rotr(A, 22);
        const T2 = sigma0 + Maj(A, B, C) | 0;
        H = G;
        G = F;
        F = E;
        E = D + T1 | 0;
        D = C;
        C = B;
        B = A;
        A = T1 + T2 | 0;
      }
      A = A + this.A | 0;
      B = B + this.B | 0;
      C = C + this.C | 0;
      D = D + this.D | 0;
      E = E + this.E | 0;
      F = F + this.F | 0;
      G = G + this.G | 0;
      H = H + this.H | 0;
      this.set(A, B, C, D, E, F, G, H);
    }
    roundClean() {
      clean(SHA256_W);
    }
    destroy() {
      this.set(0, 0, 0, 0, 0, 0, 0, 0);
      clean(this.buffer);
    }
  };
  var sha256 = /* @__PURE__ */ createHasher(() => new SHA256());

  // scripts/ui-build/node_modules/@streamparser/json/dist/mjs/utils/utf-8.js
  var charset;
  (function(charset2) {
    charset2[charset2["BACKSPACE"] = 8] = "BACKSPACE";
    charset2[charset2["FORM_FEED"] = 12] = "FORM_FEED";
    charset2[charset2["NEWLINE"] = 10] = "NEWLINE";
    charset2[charset2["CARRIAGE_RETURN"] = 13] = "CARRIAGE_RETURN";
    charset2[charset2["TAB"] = 9] = "TAB";
    charset2[charset2["SPACE"] = 32] = "SPACE";
    charset2[charset2["EXCLAMATION_MARK"] = 33] = "EXCLAMATION_MARK";
    charset2[charset2["QUOTATION_MARK"] = 34] = "QUOTATION_MARK";
    charset2[charset2["NUMBER_SIGN"] = 35] = "NUMBER_SIGN";
    charset2[charset2["DOLLAR_SIGN"] = 36] = "DOLLAR_SIGN";
    charset2[charset2["PERCENT_SIGN"] = 37] = "PERCENT_SIGN";
    charset2[charset2["AMPERSAND"] = 38] = "AMPERSAND";
    charset2[charset2["APOSTROPHE"] = 39] = "APOSTROPHE";
    charset2[charset2["LEFT_PARENTHESIS"] = 40] = "LEFT_PARENTHESIS";
    charset2[charset2["RIGHT_PARENTHESIS"] = 41] = "RIGHT_PARENTHESIS";
    charset2[charset2["ASTERISK"] = 42] = "ASTERISK";
    charset2[charset2["PLUS_SIGN"] = 43] = "PLUS_SIGN";
    charset2[charset2["COMMA"] = 44] = "COMMA";
    charset2[charset2["HYPHEN_MINUS"] = 45] = "HYPHEN_MINUS";
    charset2[charset2["FULL_STOP"] = 46] = "FULL_STOP";
    charset2[charset2["SOLIDUS"] = 47] = "SOLIDUS";
    charset2[charset2["DIGIT_ZERO"] = 48] = "DIGIT_ZERO";
    charset2[charset2["DIGIT_ONE"] = 49] = "DIGIT_ONE";
    charset2[charset2["DIGIT_TWO"] = 50] = "DIGIT_TWO";
    charset2[charset2["DIGIT_THREE"] = 51] = "DIGIT_THREE";
    charset2[charset2["DIGIT_FOUR"] = 52] = "DIGIT_FOUR";
    charset2[charset2["DIGIT_FIVE"] = 53] = "DIGIT_FIVE";
    charset2[charset2["DIGIT_SIX"] = 54] = "DIGIT_SIX";
    charset2[charset2["DIGIT_SEVEN"] = 55] = "DIGIT_SEVEN";
    charset2[charset2["DIGIT_EIGHT"] = 56] = "DIGIT_EIGHT";
    charset2[charset2["DIGIT_NINE"] = 57] = "DIGIT_NINE";
    charset2[charset2["COLON"] = 58] = "COLON";
    charset2[charset2["SEMICOLON"] = 59] = "SEMICOLON";
    charset2[charset2["LESS_THAN_SIGN"] = 60] = "LESS_THAN_SIGN";
    charset2[charset2["EQUALS_SIGN"] = 61] = "EQUALS_SIGN";
    charset2[charset2["GREATER_THAN_SIGN"] = 62] = "GREATER_THAN_SIGN";
    charset2[charset2["QUESTION_MARK"] = 63] = "QUESTION_MARK";
    charset2[charset2["COMMERCIAL_AT"] = 64] = "COMMERCIAL_AT";
    charset2[charset2["LATIN_CAPITAL_LETTER_A"] = 65] = "LATIN_CAPITAL_LETTER_A";
    charset2[charset2["LATIN_CAPITAL_LETTER_B"] = 66] = "LATIN_CAPITAL_LETTER_B";
    charset2[charset2["LATIN_CAPITAL_LETTER_C"] = 67] = "LATIN_CAPITAL_LETTER_C";
    charset2[charset2["LATIN_CAPITAL_LETTER_D"] = 68] = "LATIN_CAPITAL_LETTER_D";
    charset2[charset2["LATIN_CAPITAL_LETTER_E"] = 69] = "LATIN_CAPITAL_LETTER_E";
    charset2[charset2["LATIN_CAPITAL_LETTER_F"] = 70] = "LATIN_CAPITAL_LETTER_F";
    charset2[charset2["LATIN_CAPITAL_LETTER_G"] = 71] = "LATIN_CAPITAL_LETTER_G";
    charset2[charset2["LATIN_CAPITAL_LETTER_H"] = 72] = "LATIN_CAPITAL_LETTER_H";
    charset2[charset2["LATIN_CAPITAL_LETTER_I"] = 73] = "LATIN_CAPITAL_LETTER_I";
    charset2[charset2["LATIN_CAPITAL_LETTER_J"] = 74] = "LATIN_CAPITAL_LETTER_J";
    charset2[charset2["LATIN_CAPITAL_LETTER_K"] = 75] = "LATIN_CAPITAL_LETTER_K";
    charset2[charset2["LATIN_CAPITAL_LETTER_L"] = 76] = "LATIN_CAPITAL_LETTER_L";
    charset2[charset2["LATIN_CAPITAL_LETTER_M"] = 77] = "LATIN_CAPITAL_LETTER_M";
    charset2[charset2["LATIN_CAPITAL_LETTER_N"] = 78] = "LATIN_CAPITAL_LETTER_N";
    charset2[charset2["LATIN_CAPITAL_LETTER_O"] = 79] = "LATIN_CAPITAL_LETTER_O";
    charset2[charset2["LATIN_CAPITAL_LETTER_P"] = 80] = "LATIN_CAPITAL_LETTER_P";
    charset2[charset2["LATIN_CAPITAL_LETTER_Q"] = 81] = "LATIN_CAPITAL_LETTER_Q";
    charset2[charset2["LATIN_CAPITAL_LETTER_R"] = 82] = "LATIN_CAPITAL_LETTER_R";
    charset2[charset2["LATIN_CAPITAL_LETTER_S"] = 83] = "LATIN_CAPITAL_LETTER_S";
    charset2[charset2["LATIN_CAPITAL_LETTER_T"] = 84] = "LATIN_CAPITAL_LETTER_T";
    charset2[charset2["LATIN_CAPITAL_LETTER_U"] = 85] = "LATIN_CAPITAL_LETTER_U";
    charset2[charset2["LATIN_CAPITAL_LETTER_V"] = 86] = "LATIN_CAPITAL_LETTER_V";
    charset2[charset2["LATIN_CAPITAL_LETTER_W"] = 87] = "LATIN_CAPITAL_LETTER_W";
    charset2[charset2["LATIN_CAPITAL_LETTER_X"] = 88] = "LATIN_CAPITAL_LETTER_X";
    charset2[charset2["LATIN_CAPITAL_LETTER_Y"] = 89] = "LATIN_CAPITAL_LETTER_Y";
    charset2[charset2["LATIN_CAPITAL_LETTER_Z"] = 90] = "LATIN_CAPITAL_LETTER_Z";
    charset2[charset2["LEFT_SQUARE_BRACKET"] = 91] = "LEFT_SQUARE_BRACKET";
    charset2[charset2["REVERSE_SOLIDUS"] = 92] = "REVERSE_SOLIDUS";
    charset2[charset2["RIGHT_SQUARE_BRACKET"] = 93] = "RIGHT_SQUARE_BRACKET";
    charset2[charset2["CIRCUMFLEX_ACCENT"] = 94] = "CIRCUMFLEX_ACCENT";
    charset2[charset2["LOW_LINE"] = 95] = "LOW_LINE";
    charset2[charset2["GRAVE_ACCENT"] = 96] = "GRAVE_ACCENT";
    charset2[charset2["LATIN_SMALL_LETTER_A"] = 97] = "LATIN_SMALL_LETTER_A";
    charset2[charset2["LATIN_SMALL_LETTER_B"] = 98] = "LATIN_SMALL_LETTER_B";
    charset2[charset2["LATIN_SMALL_LETTER_C"] = 99] = "LATIN_SMALL_LETTER_C";
    charset2[charset2["LATIN_SMALL_LETTER_D"] = 100] = "LATIN_SMALL_LETTER_D";
    charset2[charset2["LATIN_SMALL_LETTER_E"] = 101] = "LATIN_SMALL_LETTER_E";
    charset2[charset2["LATIN_SMALL_LETTER_F"] = 102] = "LATIN_SMALL_LETTER_F";
    charset2[charset2["LATIN_SMALL_LETTER_G"] = 103] = "LATIN_SMALL_LETTER_G";
    charset2[charset2["LATIN_SMALL_LETTER_H"] = 104] = "LATIN_SMALL_LETTER_H";
    charset2[charset2["LATIN_SMALL_LETTER_I"] = 105] = "LATIN_SMALL_LETTER_I";
    charset2[charset2["LATIN_SMALL_LETTER_J"] = 106] = "LATIN_SMALL_LETTER_J";
    charset2[charset2["LATIN_SMALL_LETTER_K"] = 107] = "LATIN_SMALL_LETTER_K";
    charset2[charset2["LATIN_SMALL_LETTER_L"] = 108] = "LATIN_SMALL_LETTER_L";
    charset2[charset2["LATIN_SMALL_LETTER_M"] = 109] = "LATIN_SMALL_LETTER_M";
    charset2[charset2["LATIN_SMALL_LETTER_N"] = 110] = "LATIN_SMALL_LETTER_N";
    charset2[charset2["LATIN_SMALL_LETTER_O"] = 111] = "LATIN_SMALL_LETTER_O";
    charset2[charset2["LATIN_SMALL_LETTER_P"] = 112] = "LATIN_SMALL_LETTER_P";
    charset2[charset2["LATIN_SMALL_LETTER_Q"] = 113] = "LATIN_SMALL_LETTER_Q";
    charset2[charset2["LATIN_SMALL_LETTER_R"] = 114] = "LATIN_SMALL_LETTER_R";
    charset2[charset2["LATIN_SMALL_LETTER_S"] = 115] = "LATIN_SMALL_LETTER_S";
    charset2[charset2["LATIN_SMALL_LETTER_T"] = 116] = "LATIN_SMALL_LETTER_T";
    charset2[charset2["LATIN_SMALL_LETTER_U"] = 117] = "LATIN_SMALL_LETTER_U";
    charset2[charset2["LATIN_SMALL_LETTER_V"] = 118] = "LATIN_SMALL_LETTER_V";
    charset2[charset2["LATIN_SMALL_LETTER_W"] = 119] = "LATIN_SMALL_LETTER_W";
    charset2[charset2["LATIN_SMALL_LETTER_X"] = 120] = "LATIN_SMALL_LETTER_X";
    charset2[charset2["LATIN_SMALL_LETTER_Y"] = 121] = "LATIN_SMALL_LETTER_Y";
    charset2[charset2["LATIN_SMALL_LETTER_Z"] = 122] = "LATIN_SMALL_LETTER_Z";
    charset2[charset2["LEFT_CURLY_BRACKET"] = 123] = "LEFT_CURLY_BRACKET";
    charset2[charset2["VERTICAL_LINE"] = 124] = "VERTICAL_LINE";
    charset2[charset2["RIGHT_CURLY_BRACKET"] = 125] = "RIGHT_CURLY_BRACKET";
    charset2[charset2["TILDE"] = 126] = "TILDE";
  })(charset || (charset = {}));
  var escapedSequences = {
    [charset.QUOTATION_MARK]: charset.QUOTATION_MARK,
    [charset.REVERSE_SOLIDUS]: charset.REVERSE_SOLIDUS,
    [charset.SOLIDUS]: charset.SOLIDUS,
    [charset.LATIN_SMALL_LETTER_B]: charset.BACKSPACE,
    [charset.LATIN_SMALL_LETTER_F]: charset.FORM_FEED,
    [charset.LATIN_SMALL_LETTER_N]: charset.NEWLINE,
    [charset.LATIN_SMALL_LETTER_R]: charset.CARRIAGE_RETURN,
    [charset.LATIN_SMALL_LETTER_T]: charset.TAB
  };

  // scripts/ui-build/node_modules/@streamparser/json/dist/mjs/utils/bufferedString.js
  var NonBufferedString = class {
    constructor() {
      this.decoder = new TextDecoder("utf-8");
      this.strings = [];
      this.byteLength = 0;
    }
    appendChar(char) {
      this.strings.push(String.fromCharCode(char));
      this.byteLength += 1;
    }
    appendBuf(buf, start = 0, end = buf.length) {
      this.strings.push(this.decoder.decode(buf.subarray(start, end)));
      this.byteLength += end - start;
    }
    reset() {
      this.strings = [];
      this.byteLength = 0;
    }
    toString() {
      return this.strings.join("");
    }
  };
  var BufferedString = class {
    constructor(bufferSize) {
      this.decoder = new TextDecoder("utf-8");
      this.bufferOffset = 0;
      this.string = "";
      this.byteLength = 0;
      this.buffer = new Uint8Array(bufferSize);
    }
    appendChar(char) {
      if (this.bufferOffset >= this.buffer.length)
        this.flushStringBuffer();
      this.buffer[this.bufferOffset++] = char;
      this.byteLength += 1;
    }
    appendBuf(buf, start = 0, end = buf.length) {
      const size = end - start;
      if (this.bufferOffset + size > this.buffer.length)
        this.flushStringBuffer();
      this.buffer.set(buf.subarray(start, end), this.bufferOffset);
      this.bufferOffset += size;
      this.byteLength += size;
    }
    flushStringBuffer() {
      this.string += this.decoder.decode(this.buffer.subarray(0, this.bufferOffset));
      this.bufferOffset = 0;
    }
    reset() {
      this.string = "";
      this.bufferOffset = 0;
      this.byteLength = 0;
    }
    toString() {
      this.flushStringBuffer();
      return this.string;
    }
  };

  // scripts/ui-build/node_modules/@streamparser/json/dist/mjs/utils/types/tokenType.js
  var TokenType;
  (function(TokenType2) {
    TokenType2[TokenType2["LEFT_BRACE"] = 0] = "LEFT_BRACE";
    TokenType2[TokenType2["RIGHT_BRACE"] = 1] = "RIGHT_BRACE";
    TokenType2[TokenType2["LEFT_BRACKET"] = 2] = "LEFT_BRACKET";
    TokenType2[TokenType2["RIGHT_BRACKET"] = 3] = "RIGHT_BRACKET";
    TokenType2[TokenType2["COLON"] = 4] = "COLON";
    TokenType2[TokenType2["COMMA"] = 5] = "COMMA";
    TokenType2[TokenType2["TRUE"] = 6] = "TRUE";
    TokenType2[TokenType2["FALSE"] = 7] = "FALSE";
    TokenType2[TokenType2["NULL"] = 8] = "NULL";
    TokenType2[TokenType2["STRING"] = 9] = "STRING";
    TokenType2[TokenType2["NUMBER"] = 10] = "NUMBER";
    TokenType2[TokenType2["SEPARATOR"] = 11] = "SEPARATOR";
  })(TokenType || (TokenType = {}));
  var tokenType_default = TokenType;

  // scripts/ui-build/node_modules/@streamparser/json/dist/mjs/tokenizer.js
  var TokenizerStates;
  (function(TokenizerStates2) {
    TokenizerStates2[TokenizerStates2["START"] = 0] = "START";
    TokenizerStates2[TokenizerStates2["ENDED"] = 1] = "ENDED";
    TokenizerStates2[TokenizerStates2["ERROR"] = 2] = "ERROR";
    TokenizerStates2[TokenizerStates2["TRUE1"] = 3] = "TRUE1";
    TokenizerStates2[TokenizerStates2["TRUE2"] = 4] = "TRUE2";
    TokenizerStates2[TokenizerStates2["TRUE3"] = 5] = "TRUE3";
    TokenizerStates2[TokenizerStates2["FALSE1"] = 6] = "FALSE1";
    TokenizerStates2[TokenizerStates2["FALSE2"] = 7] = "FALSE2";
    TokenizerStates2[TokenizerStates2["FALSE3"] = 8] = "FALSE3";
    TokenizerStates2[TokenizerStates2["FALSE4"] = 9] = "FALSE4";
    TokenizerStates2[TokenizerStates2["NULL1"] = 10] = "NULL1";
    TokenizerStates2[TokenizerStates2["NULL2"] = 11] = "NULL2";
    TokenizerStates2[TokenizerStates2["NULL3"] = 12] = "NULL3";
    TokenizerStates2[TokenizerStates2["STRING_DEFAULT"] = 13] = "STRING_DEFAULT";
    TokenizerStates2[TokenizerStates2["STRING_AFTER_BACKSLASH"] = 14] = "STRING_AFTER_BACKSLASH";
    TokenizerStates2[TokenizerStates2["STRING_UNICODE_DIGIT_1"] = 15] = "STRING_UNICODE_DIGIT_1";
    TokenizerStates2[TokenizerStates2["STRING_UNICODE_DIGIT_2"] = 16] = "STRING_UNICODE_DIGIT_2";
    TokenizerStates2[TokenizerStates2["STRING_UNICODE_DIGIT_3"] = 17] = "STRING_UNICODE_DIGIT_3";
    TokenizerStates2[TokenizerStates2["STRING_UNICODE_DIGIT_4"] = 18] = "STRING_UNICODE_DIGIT_4";
    TokenizerStates2[TokenizerStates2["STRING_INCOMPLETE_CHAR"] = 19] = "STRING_INCOMPLETE_CHAR";
    TokenizerStates2[TokenizerStates2["NUMBER_AFTER_INITIAL_MINUS"] = 20] = "NUMBER_AFTER_INITIAL_MINUS";
    TokenizerStates2[TokenizerStates2["NUMBER_AFTER_INITIAL_ZERO"] = 21] = "NUMBER_AFTER_INITIAL_ZERO";
    TokenizerStates2[TokenizerStates2["NUMBER_AFTER_INITIAL_NON_ZERO"] = 22] = "NUMBER_AFTER_INITIAL_NON_ZERO";
    TokenizerStates2[TokenizerStates2["NUMBER_AFTER_FULL_STOP"] = 23] = "NUMBER_AFTER_FULL_STOP";
    TokenizerStates2[TokenizerStates2["NUMBER_AFTER_DECIMAL"] = 24] = "NUMBER_AFTER_DECIMAL";
    TokenizerStates2[TokenizerStates2["NUMBER_AFTER_E"] = 25] = "NUMBER_AFTER_E";
    TokenizerStates2[TokenizerStates2["NUMBER_AFTER_E_AND_SIGN"] = 26] = "NUMBER_AFTER_E_AND_SIGN";
    TokenizerStates2[TokenizerStates2["NUMBER_AFTER_E_AND_DIGIT"] = 27] = "NUMBER_AFTER_E_AND_DIGIT";
    TokenizerStates2[TokenizerStates2["SEPARATOR"] = 28] = "SEPARATOR";
    TokenizerStates2[TokenizerStates2["BOM_OR_START"] = 29] = "BOM_OR_START";
    TokenizerStates2[TokenizerStates2["BOM"] = 30] = "BOM";
  })(TokenizerStates || (TokenizerStates = {}));
  function TokenizerStateToString(tokenizerState) {
    return [
      "START",
      "ENDED",
      "ERROR",
      "TRUE1",
      "TRUE2",
      "TRUE3",
      "FALSE1",
      "FALSE2",
      "FALSE3",
      "FALSE4",
      "NULL1",
      "NULL2",
      "NULL3",
      "STRING_DEFAULT",
      "STRING_AFTER_BACKSLASH",
      "STRING_UNICODE_DIGIT_1",
      "STRING_UNICODE_DIGIT_2",
      "STRING_UNICODE_DIGIT_3",
      "STRING_UNICODE_DIGIT_4",
      "STRING_INCOMPLETE_CHAR",
      "NUMBER_AFTER_INITIAL_MINUS",
      "NUMBER_AFTER_INITIAL_ZERO",
      "NUMBER_AFTER_INITIAL_NON_ZERO",
      "NUMBER_AFTER_FULL_STOP",
      "NUMBER_AFTER_DECIMAL",
      "NUMBER_AFTER_E",
      "NUMBER_AFTER_E_AND_SIGN",
      "NUMBER_AFTER_E_AND_DIGIT",
      "SEPARATOR",
      "BOM_OR_START",
      "BOM"
    ][tokenizerState];
  }
  var defaultOpts = {
    stringBufferSize: 0,
    numberBufferSize: 0,
    separator: void 0,
    emitPartialTokens: false
  };
  var TokenizerError = class _TokenizerError extends Error {
    constructor(message) {
      super(message);
      Object.setPrototypeOf(this, _TokenizerError.prototype);
    }
  };
  var Tokenizer = class {
    constructor(opts) {
      this.state = TokenizerStates.BOM_OR_START;
      this.bomIndex = 0;
      this.separatorIndex = 0;
      this.escapedCharsByteLength = 0;
      this.bytes_remaining = 0;
      this.bytes_in_sequence = 0;
      this.char_split_buffer = new Uint8Array(4);
      this.encoder = new TextEncoder();
      this.offset = -1;
      opts = Object.assign(Object.assign({}, defaultOpts), opts);
      this.emitPartialTokens = opts.emitPartialTokens === true;
      this.bufferedString = opts.stringBufferSize && opts.stringBufferSize > 4 ? new BufferedString(opts.stringBufferSize) : new NonBufferedString();
      this.bufferedNumber = opts.numberBufferSize && opts.numberBufferSize > 0 ? new BufferedString(opts.numberBufferSize) : new NonBufferedString();
      this.separator = opts.separator;
      this.separatorBytes = opts.separator ? this.encoder.encode(opts.separator) : void 0;
    }
    get isEnded() {
      return this.state === TokenizerStates.ENDED;
    }
    write(input) {
      try {
        let buffer;
        if (input instanceof Uint8Array) {
          buffer = input;
        } else if (typeof input === "string") {
          buffer = this.encoder.encode(input);
        } else if (Array.isArray(input)) {
          buffer = Uint8Array.from(input);
        } else if (ArrayBuffer.isView(input)) {
          buffer = new Uint8Array(input.buffer, input.byteOffset, input.byteLength);
        } else {
          throw new TypeError("Unexpected type. The `write` function only accepts Arrays, TypedArrays and Strings.");
        }
        for (let i = 0; i < buffer.length; i += 1) {
          const n = buffer[i];
          switch (this.state) {
            // @ts-expect-error fall through case
            case TokenizerStates.BOM_OR_START:
              if (input instanceof Uint8Array && n === 239) {
                this.bom = [239, 187, 191];
                this.bomIndex += 1;
                this.state = TokenizerStates.BOM;
                continue;
              }
              if (input instanceof Uint16Array) {
                if (n === 254) {
                  this.bom = [254, 255];
                  this.bomIndex += 1;
                  this.state = TokenizerStates.BOM;
                  continue;
                }
                if (n === 255) {
                  this.bom = [255, 254];
                  this.bomIndex += 1;
                  this.state = TokenizerStates.BOM;
                  continue;
                }
              }
              if (input instanceof Uint32Array) {
                if (n === 0) {
                  this.bom = [0, 0, 254, 255];
                  this.bomIndex += 1;
                  this.state = TokenizerStates.BOM;
                  continue;
                }
                if (n === 255) {
                  this.bom = [255, 254, 0, 0];
                  this.bomIndex += 1;
                  this.state = TokenizerStates.BOM;
                  continue;
                }
              }
            // eslint-disable-next-line no-fallthrough
            case TokenizerStates.START:
              this.offset += 1;
              if (this.separatorBytes && n === this.separatorBytes[0]) {
                if (this.separatorBytes.length === 1) {
                  this.state = TokenizerStates.START;
                  this.onToken({
                    token: tokenType_default.SEPARATOR,
                    value: this.separator,
                    offset: this.offset + this.separatorBytes.length - 1
                  });
                  continue;
                }
                this.state = TokenizerStates.SEPARATOR;
                continue;
              }
              if (n === charset.SPACE || n === charset.NEWLINE || n === charset.CARRIAGE_RETURN || n === charset.TAB) {
                continue;
              }
              if (n === charset.LEFT_CURLY_BRACKET) {
                this.onToken({
                  token: tokenType_default.LEFT_BRACE,
                  value: "{",
                  offset: this.offset
                });
                continue;
              }
              if (n === charset.RIGHT_CURLY_BRACKET) {
                this.onToken({
                  token: tokenType_default.RIGHT_BRACE,
                  value: "}",
                  offset: this.offset
                });
                continue;
              }
              if (n === charset.LEFT_SQUARE_BRACKET) {
                this.onToken({
                  token: tokenType_default.LEFT_BRACKET,
                  value: "[",
                  offset: this.offset
                });
                continue;
              }
              if (n === charset.RIGHT_SQUARE_BRACKET) {
                this.onToken({
                  token: tokenType_default.RIGHT_BRACKET,
                  value: "]",
                  offset: this.offset
                });
                continue;
              }
              if (n === charset.COLON) {
                this.onToken({
                  token: tokenType_default.COLON,
                  value: ":",
                  offset: this.offset
                });
                continue;
              }
              if (n === charset.COMMA) {
                this.onToken({
                  token: tokenType_default.COMMA,
                  value: ",",
                  offset: this.offset
                });
                continue;
              }
              if (n === charset.LATIN_SMALL_LETTER_T) {
                this.state = TokenizerStates.TRUE1;
                continue;
              }
              if (n === charset.LATIN_SMALL_LETTER_F) {
                this.state = TokenizerStates.FALSE1;
                continue;
              }
              if (n === charset.LATIN_SMALL_LETTER_N) {
                this.state = TokenizerStates.NULL1;
                continue;
              }
              if (n === charset.QUOTATION_MARK) {
                this.bufferedString.reset();
                this.escapedCharsByteLength = 0;
                this.state = TokenizerStates.STRING_DEFAULT;
                continue;
              }
              if (n >= charset.DIGIT_ONE && n <= charset.DIGIT_NINE) {
                this.bufferedNumber.reset();
                this.bufferedNumber.appendChar(n);
                this.state = TokenizerStates.NUMBER_AFTER_INITIAL_NON_ZERO;
                continue;
              }
              if (n === charset.DIGIT_ZERO) {
                this.bufferedNumber.reset();
                this.bufferedNumber.appendChar(n);
                this.state = TokenizerStates.NUMBER_AFTER_INITIAL_ZERO;
                continue;
              }
              if (n === charset.HYPHEN_MINUS) {
                this.bufferedNumber.reset();
                this.bufferedNumber.appendChar(n);
                this.state = TokenizerStates.NUMBER_AFTER_INITIAL_MINUS;
                continue;
              }
              break;
            // STRING
            case TokenizerStates.STRING_DEFAULT:
              if (n === charset.QUOTATION_MARK) {
                const string = this.bufferedString.toString();
                this.state = TokenizerStates.START;
                this.onToken({
                  token: tokenType_default.STRING,
                  value: string,
                  offset: this.offset
                });
                this.offset += this.escapedCharsByteLength + this.bufferedString.byteLength + 1;
                continue;
              }
              if (n === charset.REVERSE_SOLIDUS) {
                this.state = TokenizerStates.STRING_AFTER_BACKSLASH;
                continue;
              }
              if (n >= 128) {
                if (n >= 194 && n <= 223) {
                  this.bytes_in_sequence = 2;
                } else if (n <= 239) {
                  this.bytes_in_sequence = 3;
                } else {
                  this.bytes_in_sequence = 4;
                }
                if (this.bytes_in_sequence <= buffer.length - i) {
                  this.bufferedString.appendBuf(buffer, i, i + this.bytes_in_sequence);
                  i += this.bytes_in_sequence - 1;
                  continue;
                }
                this.bytes_remaining = i + this.bytes_in_sequence - buffer.length;
                this.char_split_buffer.set(buffer.subarray(i));
                i = buffer.length - 1;
                this.state = TokenizerStates.STRING_INCOMPLETE_CHAR;
                continue;
              }
              if (n >= charset.SPACE) {
                this.bufferedString.appendChar(n);
                continue;
              }
              break;
            case TokenizerStates.STRING_INCOMPLETE_CHAR:
              this.char_split_buffer.set(buffer.subarray(i, i + this.bytes_remaining), this.bytes_in_sequence - this.bytes_remaining);
              this.bufferedString.appendBuf(this.char_split_buffer, 0, this.bytes_in_sequence);
              i = this.bytes_remaining - 1;
              this.state = TokenizerStates.STRING_DEFAULT;
              continue;
            case TokenizerStates.STRING_AFTER_BACKSLASH:
              const controlChar = escapedSequences[n];
              if (controlChar) {
                this.bufferedString.appendChar(controlChar);
                this.escapedCharsByteLength += 1;
                this.state = TokenizerStates.STRING_DEFAULT;
                continue;
              }
              if (n === charset.LATIN_SMALL_LETTER_U) {
                this.unicode = "";
                this.state = TokenizerStates.STRING_UNICODE_DIGIT_1;
                continue;
              }
              break;
            case TokenizerStates.STRING_UNICODE_DIGIT_1:
            case TokenizerStates.STRING_UNICODE_DIGIT_2:
            case TokenizerStates.STRING_UNICODE_DIGIT_3:
              if (n >= charset.DIGIT_ZERO && n <= charset.DIGIT_NINE || n >= charset.LATIN_CAPITAL_LETTER_A && n <= charset.LATIN_CAPITAL_LETTER_F || n >= charset.LATIN_SMALL_LETTER_A && n <= charset.LATIN_SMALL_LETTER_F) {
                this.unicode += String.fromCharCode(n);
                this.state += 1;
                continue;
              }
              break;
            case TokenizerStates.STRING_UNICODE_DIGIT_4:
              if (n >= charset.DIGIT_ZERO && n <= charset.DIGIT_NINE || n >= charset.LATIN_CAPITAL_LETTER_A && n <= charset.LATIN_CAPITAL_LETTER_F || n >= charset.LATIN_SMALL_LETTER_A && n <= charset.LATIN_SMALL_LETTER_F) {
                const intVal = parseInt(this.unicode + String.fromCharCode(n), 16);
                let unicodeString;
                if (this.highSurrogate === void 0) {
                  if (intVal >= 55296 && intVal <= 56319) {
                    this.highSurrogate = intVal;
                    this.state = TokenizerStates.STRING_DEFAULT;
                    continue;
                  } else {
                    unicodeString = String.fromCharCode(intVal);
                  }
                } else {
                  if (intVal >= 56320 && intVal <= 57343) {
                    unicodeString = String.fromCharCode(this.highSurrogate, intVal);
                  } else {
                    unicodeString = String.fromCharCode(this.highSurrogate);
                  }
                  this.highSurrogate = void 0;
                }
                const unicodeBuffer = this.encoder.encode(unicodeString);
                this.bufferedString.appendBuf(unicodeBuffer);
                this.escapedCharsByteLength += 6 - unicodeBuffer.byteLength;
                this.state = TokenizerStates.STRING_DEFAULT;
                continue;
              }
              break;
            // Number
            case TokenizerStates.NUMBER_AFTER_INITIAL_MINUS:
              if (n === charset.DIGIT_ZERO) {
                this.bufferedNumber.appendChar(n);
                this.state = TokenizerStates.NUMBER_AFTER_INITIAL_ZERO;
                continue;
              }
              if (n >= charset.DIGIT_ONE && n <= charset.DIGIT_NINE) {
                this.bufferedNumber.appendChar(n);
                this.state = TokenizerStates.NUMBER_AFTER_INITIAL_NON_ZERO;
                continue;
              }
              break;
            case TokenizerStates.NUMBER_AFTER_INITIAL_ZERO:
              if (n === charset.FULL_STOP) {
                this.bufferedNumber.appendChar(n);
                this.state = TokenizerStates.NUMBER_AFTER_FULL_STOP;
                continue;
              }
              if (n === charset.LATIN_SMALL_LETTER_E || n === charset.LATIN_CAPITAL_LETTER_E) {
                this.bufferedNumber.appendChar(n);
                this.state = TokenizerStates.NUMBER_AFTER_E;
                continue;
              }
              i -= 1;
              this.state = TokenizerStates.START;
              this.emitNumber();
              continue;
            case TokenizerStates.NUMBER_AFTER_INITIAL_NON_ZERO:
              if (n >= charset.DIGIT_ZERO && n <= charset.DIGIT_NINE) {
                this.bufferedNumber.appendChar(n);
                continue;
              }
              if (n === charset.FULL_STOP) {
                this.bufferedNumber.appendChar(n);
                this.state = TokenizerStates.NUMBER_AFTER_FULL_STOP;
                continue;
              }
              if (n === charset.LATIN_SMALL_LETTER_E || n === charset.LATIN_CAPITAL_LETTER_E) {
                this.bufferedNumber.appendChar(n);
                this.state = TokenizerStates.NUMBER_AFTER_E;
                continue;
              }
              i -= 1;
              this.state = TokenizerStates.START;
              this.emitNumber();
              continue;
            case TokenizerStates.NUMBER_AFTER_FULL_STOP:
              if (n >= charset.DIGIT_ZERO && n <= charset.DIGIT_NINE) {
                this.bufferedNumber.appendChar(n);
                this.state = TokenizerStates.NUMBER_AFTER_DECIMAL;
                continue;
              }
              break;
            case TokenizerStates.NUMBER_AFTER_DECIMAL:
              if (n >= charset.DIGIT_ZERO && n <= charset.DIGIT_NINE) {
                this.bufferedNumber.appendChar(n);
                continue;
              }
              if (n === charset.LATIN_SMALL_LETTER_E || n === charset.LATIN_CAPITAL_LETTER_E) {
                this.bufferedNumber.appendChar(n);
                this.state = TokenizerStates.NUMBER_AFTER_E;
                continue;
              }
              i -= 1;
              this.state = TokenizerStates.START;
              this.emitNumber();
              continue;
            // @ts-expect-error fall through case
            case TokenizerStates.NUMBER_AFTER_E:
              if (n === charset.PLUS_SIGN || n === charset.HYPHEN_MINUS) {
                this.bufferedNumber.appendChar(n);
                this.state = TokenizerStates.NUMBER_AFTER_E_AND_SIGN;
                continue;
              }
            // eslint-disable-next-line no-fallthrough
            case TokenizerStates.NUMBER_AFTER_E_AND_SIGN:
              if (n >= charset.DIGIT_ZERO && n <= charset.DIGIT_NINE) {
                this.bufferedNumber.appendChar(n);
                this.state = TokenizerStates.NUMBER_AFTER_E_AND_DIGIT;
                continue;
              }
              break;
            case TokenizerStates.NUMBER_AFTER_E_AND_DIGIT:
              if (n >= charset.DIGIT_ZERO && n <= charset.DIGIT_NINE) {
                this.bufferedNumber.appendChar(n);
                continue;
              }
              i -= 1;
              this.state = TokenizerStates.START;
              this.emitNumber();
              continue;
            // TRUE
            case TokenizerStates.TRUE1:
              if (n === charset.LATIN_SMALL_LETTER_R) {
                this.state = TokenizerStates.TRUE2;
                continue;
              }
              break;
            case TokenizerStates.TRUE2:
              if (n === charset.LATIN_SMALL_LETTER_U) {
                this.state = TokenizerStates.TRUE3;
                continue;
              }
              break;
            case TokenizerStates.TRUE3:
              if (n === charset.LATIN_SMALL_LETTER_E) {
                this.state = TokenizerStates.START;
                this.onToken({
                  token: tokenType_default.TRUE,
                  value: true,
                  offset: this.offset
                });
                this.offset += 3;
                continue;
              }
              break;
            // FALSE
            case TokenizerStates.FALSE1:
              if (n === charset.LATIN_SMALL_LETTER_A) {
                this.state = TokenizerStates.FALSE2;
                continue;
              }
              break;
            case TokenizerStates.FALSE2:
              if (n === charset.LATIN_SMALL_LETTER_L) {
                this.state = TokenizerStates.FALSE3;
                continue;
              }
              break;
            case TokenizerStates.FALSE3:
              if (n === charset.LATIN_SMALL_LETTER_S) {
                this.state = TokenizerStates.FALSE4;
                continue;
              }
              break;
            case TokenizerStates.FALSE4:
              if (n === charset.LATIN_SMALL_LETTER_E) {
                this.state = TokenizerStates.START;
                this.onToken({
                  token: tokenType_default.FALSE,
                  value: false,
                  offset: this.offset
                });
                this.offset += 4;
                continue;
              }
              break;
            // NULL
            case TokenizerStates.NULL1:
              if (n === charset.LATIN_SMALL_LETTER_U) {
                this.state = TokenizerStates.NULL2;
                continue;
              }
              break;
            case TokenizerStates.NULL2:
              if (n === charset.LATIN_SMALL_LETTER_L) {
                this.state = TokenizerStates.NULL3;
                continue;
              }
              break;
            case TokenizerStates.NULL3:
              if (n === charset.LATIN_SMALL_LETTER_L) {
                this.state = TokenizerStates.START;
                this.onToken({
                  token: tokenType_default.NULL,
                  value: null,
                  offset: this.offset
                });
                this.offset += 3;
                continue;
              }
              break;
            case TokenizerStates.SEPARATOR:
              this.separatorIndex += 1;
              if (!this.separatorBytes || n !== this.separatorBytes[this.separatorIndex]) {
                break;
              }
              if (this.separatorIndex === this.separatorBytes.length - 1) {
                this.state = TokenizerStates.START;
                this.onToken({
                  token: tokenType_default.SEPARATOR,
                  value: this.separator,
                  offset: this.offset + this.separatorIndex
                });
                this.separatorIndex = 0;
              }
              continue;
            // BOM support
            case TokenizerStates.BOM:
              if (n === this.bom[this.bomIndex]) {
                if (this.bomIndex === this.bom.length - 1) {
                  this.state = TokenizerStates.START;
                  this.bom = void 0;
                  this.bomIndex = 0;
                  continue;
                }
                this.bomIndex += 1;
                continue;
              }
              break;
            case TokenizerStates.ENDED:
              if (n === charset.SPACE || n === charset.NEWLINE || n === charset.CARRIAGE_RETURN || n === charset.TAB) {
                continue;
              }
          }
          throw new TokenizerError(`Unexpected "${String.fromCharCode(n)}" at position "${i}" in state ${TokenizerStateToString(this.state)}`);
        }
        if (this.emitPartialTokens) {
          switch (this.state) {
            case TokenizerStates.TRUE1:
            case TokenizerStates.TRUE2:
            case TokenizerStates.TRUE3:
              this.onToken({
                token: tokenType_default.TRUE,
                value: true,
                offset: this.offset,
                partial: true
              });
              break;
            case TokenizerStates.FALSE1:
            case TokenizerStates.FALSE2:
            case TokenizerStates.FALSE3:
            case TokenizerStates.FALSE4:
              this.onToken({
                token: tokenType_default.FALSE,
                value: false,
                offset: this.offset,
                partial: true
              });
              break;
            case TokenizerStates.NULL1:
            case TokenizerStates.NULL2:
            case TokenizerStates.NULL3:
              this.onToken({
                token: tokenType_default.NULL,
                value: null,
                offset: this.offset,
                partial: true
              });
              break;
            case TokenizerStates.STRING_DEFAULT: {
              const string = this.bufferedString.toString();
              this.onToken({
                token: tokenType_default.STRING,
                value: string,
                offset: this.offset,
                partial: true
              });
              break;
            }
            case TokenizerStates.NUMBER_AFTER_INITIAL_ZERO:
            case TokenizerStates.NUMBER_AFTER_INITIAL_NON_ZERO:
            case TokenizerStates.NUMBER_AFTER_DECIMAL:
            case TokenizerStates.NUMBER_AFTER_E_AND_DIGIT:
              try {
                this.onToken({
                  token: tokenType_default.NUMBER,
                  value: this.parseNumber(this.bufferedNumber.toString()),
                  offset: this.offset,
                  partial: true
                });
              } catch (_a) {
              }
          }
        }
      } catch (err) {
        this.error(err);
      }
    }
    emitNumber() {
      this.onToken({
        token: tokenType_default.NUMBER,
        value: this.parseNumber(this.bufferedNumber.toString()),
        offset: this.offset
      });
      this.offset += this.bufferedNumber.byteLength - 1;
    }
    parseNumber(numberStr) {
      return Number(numberStr);
    }
    error(err) {
      if (this.state !== TokenizerStates.ENDED) {
        this.state = TokenizerStates.ERROR;
      }
      this.onError(err);
    }
    end() {
      switch (this.state) {
        case TokenizerStates.NUMBER_AFTER_INITIAL_ZERO:
        case TokenizerStates.NUMBER_AFTER_INITIAL_NON_ZERO:
        case TokenizerStates.NUMBER_AFTER_DECIMAL:
        case TokenizerStates.NUMBER_AFTER_E_AND_DIGIT:
          this.state = TokenizerStates.ENDED;
          this.emitNumber();
          this.onEnd();
          break;
        case TokenizerStates.BOM_OR_START:
        case TokenizerStates.START:
        case TokenizerStates.ERROR:
        case TokenizerStates.SEPARATOR:
          this.state = TokenizerStates.ENDED;
          this.onEnd();
          break;
        default:
          this.error(new TokenizerError(`Tokenizer ended in the middle of a token (state: ${TokenizerStateToString(this.state)}). Either not all the data was received or the data was invalid.`));
      }
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    onToken(parsedToken) {
      throw new TokenizerError(`Can't emit tokens before the "onToken" callback has been set up.`);
    }
    onError(err) {
      throw err;
    }
    onEnd() {
    }
  };

  // scripts/ui-build/node_modules/@streamparser/json/dist/mjs/utils/types/stackElement.js
  var TokenParserMode;
  (function(TokenParserMode2) {
    TokenParserMode2[TokenParserMode2["OBJECT"] = 0] = "OBJECT";
    TokenParserMode2[TokenParserMode2["ARRAY"] = 1] = "ARRAY";
  })(TokenParserMode || (TokenParserMode = {}));

  // scripts/ui-build/node_modules/@streamparser/json/dist/mjs/tokenparser.js
  var TokenParserState;
  (function(TokenParserState2) {
    TokenParserState2[TokenParserState2["VALUE"] = 0] = "VALUE";
    TokenParserState2[TokenParserState2["KEY"] = 1] = "KEY";
    TokenParserState2[TokenParserState2["COLON"] = 2] = "COLON";
    TokenParserState2[TokenParserState2["COMMA"] = 3] = "COMMA";
    TokenParserState2[TokenParserState2["ENDED"] = 4] = "ENDED";
    TokenParserState2[TokenParserState2["ERROR"] = 5] = "ERROR";
    TokenParserState2[TokenParserState2["SEPARATOR"] = 6] = "SEPARATOR";
  })(TokenParserState || (TokenParserState = {}));
  function TokenParserStateToString(state) {
    return ["VALUE", "KEY", "COLON", "COMMA", "ENDED", "ERROR", "SEPARATOR"][state];
  }
  var defaultOpts2 = {
    paths: void 0,
    keepStack: true,
    separator: void 0,
    emitPartialValues: false
  };
  var TokenParserError = class _TokenParserError extends Error {
    constructor(message) {
      super(message);
      Object.setPrototypeOf(this, _TokenParserError.prototype);
    }
  };
  var TokenParser = class {
    constructor(opts) {
      this.state = TokenParserState.VALUE;
      this.mode = void 0;
      this.key = void 0;
      this.value = void 0;
      this.stack = [];
      opts = Object.assign(Object.assign({}, defaultOpts2), opts);
      if (opts.paths) {
        this.paths = opts.paths.map((path) => {
          if (path === void 0 || path === "$*")
            return void 0;
          if (!path.startsWith("$"))
            throw new TokenParserError(`Invalid selector "${path}". Should start with "$".`);
          const pathParts = path.split(".").slice(1);
          if (pathParts.includes(""))
            throw new TokenParserError(`Invalid selector "${path}". ".." syntax not supported.`);
          return pathParts;
        });
      }
      this.keepStack = opts.keepStack || false;
      this.separator = opts.separator;
      if (!opts.emitPartialValues) {
        this.emitPartial = () => {
        };
      }
    }
    shouldEmit() {
      if (!this.paths)
        return true;
      return this.paths.some((path) => {
        var _a;
        if (path === void 0)
          return true;
        if (path.length !== this.stack.length)
          return false;
        for (let i = 0; i < path.length - 1; i++) {
          const selector2 = path[i];
          const key = this.stack[i + 1].key;
          if (selector2 === "*")
            continue;
          if (selector2 !== (key === null || key === void 0 ? void 0 : key.toString()))
            return false;
        }
        const selector = path[path.length - 1];
        if (selector === "*")
          return true;
        return selector === ((_a = this.key) === null || _a === void 0 ? void 0 : _a.toString());
      });
    }
    push() {
      this.stack.push({
        key: this.key,
        value: this.value,
        mode: this.mode,
        emit: this.shouldEmit()
      });
    }
    pop() {
      const value = this.value;
      let emit;
      ({
        key: this.key,
        value: this.value,
        mode: this.mode,
        emit
      } = this.stack.pop());
      this.state = this.mode !== void 0 ? TokenParserState.COMMA : TokenParserState.VALUE;
      this.emit(value, emit);
    }
    emit(value, emit) {
      if (!this.keepStack && this.value && this.stack.every((item) => !item.emit)) {
        delete this.value[this.key];
      }
      if (emit) {
        this.onValue({
          value,
          key: this.key,
          parent: this.value,
          stack: this.stack
        });
      }
      if (this.stack.length === 0) {
        if (this.separator) {
          this.state = TokenParserState.SEPARATOR;
        } else if (this.separator === void 0) {
          this.end();
        }
      }
    }
    emitPartial(value) {
      if (!this.shouldEmit())
        return;
      if (this.state === TokenParserState.KEY) {
        this.onValue({
          value: void 0,
          key: value,
          parent: this.value,
          stack: this.stack,
          partial: true
        });
        return;
      }
      this.onValue({
        value,
        key: this.key,
        parent: this.value,
        stack: this.stack,
        partial: true
      });
    }
    get isEnded() {
      return this.state === TokenParserState.ENDED;
    }
    write({ token, value, partial }) {
      try {
        if (partial) {
          this.emitPartial(value);
          return;
        }
        if (this.state === TokenParserState.VALUE) {
          if (token === tokenType_default.STRING || token === tokenType_default.NUMBER || token === tokenType_default.TRUE || token === tokenType_default.FALSE || token === tokenType_default.NULL) {
            if (this.mode === TokenParserMode.OBJECT) {
              this.value[this.key] = value;
              this.state = TokenParserState.COMMA;
            } else if (this.mode === TokenParserMode.ARRAY) {
              this.value.push(value);
              this.state = TokenParserState.COMMA;
            }
            this.emit(value, this.shouldEmit());
            return;
          }
          if (token === tokenType_default.LEFT_BRACE) {
            this.push();
            if (this.mode === TokenParserMode.OBJECT) {
              this.value = this.value[this.key] = {};
            } else if (this.mode === TokenParserMode.ARRAY) {
              const val = {};
              this.value.push(val);
              this.value = val;
            } else {
              this.value = {};
            }
            this.mode = TokenParserMode.OBJECT;
            this.state = TokenParserState.KEY;
            this.key = void 0;
            this.emitPartial();
            return;
          }
          if (token === tokenType_default.LEFT_BRACKET) {
            this.push();
            if (this.mode === TokenParserMode.OBJECT) {
              this.value = this.value[this.key] = [];
            } else if (this.mode === TokenParserMode.ARRAY) {
              const val = [];
              this.value.push(val);
              this.value = val;
            } else {
              this.value = [];
            }
            this.mode = TokenParserMode.ARRAY;
            this.state = TokenParserState.VALUE;
            this.key = 0;
            this.emitPartial();
            return;
          }
          if (this.mode === TokenParserMode.ARRAY && token === tokenType_default.RIGHT_BRACKET && this.value.length === 0) {
            this.pop();
            return;
          }
        }
        if (this.state === TokenParserState.KEY) {
          if (token === tokenType_default.STRING) {
            this.key = value;
            this.state = TokenParserState.COLON;
            this.emitPartial();
            return;
          }
          if (token === tokenType_default.RIGHT_BRACE && Object.keys(this.value).length === 0) {
            this.pop();
            return;
          }
        }
        if (this.state === TokenParserState.COLON) {
          if (token === tokenType_default.COLON) {
            this.state = TokenParserState.VALUE;
            return;
          }
        }
        if (this.state === TokenParserState.COMMA) {
          if (token === tokenType_default.COMMA) {
            if (this.mode === TokenParserMode.ARRAY) {
              this.state = TokenParserState.VALUE;
              this.key += 1;
              return;
            }
            if (this.mode === TokenParserMode.OBJECT) {
              this.state = TokenParserState.KEY;
              return;
            }
          }
          if (token === tokenType_default.RIGHT_BRACE && this.mode === TokenParserMode.OBJECT || token === tokenType_default.RIGHT_BRACKET && this.mode === TokenParserMode.ARRAY) {
            this.pop();
            return;
          }
        }
        if (this.state === TokenParserState.SEPARATOR) {
          if (token === tokenType_default.SEPARATOR && value === this.separator) {
            this.state = TokenParserState.VALUE;
            return;
          }
        }
        if (token === tokenType_default.SEPARATOR && this.state !== TokenParserState.SEPARATOR && Array.from(value).map((n) => n.charCodeAt(0)).every((n) => n === charset.SPACE || n === charset.NEWLINE || n === charset.CARRIAGE_RETURN || n === charset.TAB)) {
          return;
        }
        throw new TokenParserError(`Unexpected ${tokenType_default[token]} (${JSON.stringify(value)}) in state ${TokenParserStateToString(this.state)}`);
      } catch (err) {
        this.error(err);
      }
    }
    error(err) {
      if (this.state !== TokenParserState.ENDED) {
        this.state = TokenParserState.ERROR;
      }
      this.onError(err);
    }
    end() {
      if (this.state !== TokenParserState.VALUE && this.state !== TokenParserState.SEPARATOR || this.stack.length > 0) {
        this.error(new Error(`Parser ended in mid-parsing (state: ${TokenParserStateToString(this.state)}). Either not all the data was received or the data was invalid.`));
      } else {
        this.state = TokenParserState.ENDED;
        this.onEnd();
      }
    }
    /* eslint-disable-next-line @typescript-eslint/no-unused-vars */
    onValue(parsedElementInfo) {
      throw new TokenParserError(`Can't emit data before the "onValue" callback has been set up.`);
    }
    onError(err) {
      throw err;
    }
    onEnd() {
    }
  };

  // scripts/stream-import/decoder.mjs
  var modernKey = (key) => key.startsWith("silly_tavern_") ? "rp_hub_" + key.slice("silly_tavern_".length) : key;
  var shouldSkipEntryKey = (key) => {
    const raw = String(key || "");
    const logical = raw.startsWith("__ls__:") ? raw.slice("__ls__:".length) : raw;
    const modern = modernKey(logical);
    if (modern === "rp_hub_auto_backup_config") return false;
    return modern.startsWith("rp_hub_auto_backup_");
  };
  var legacyEntryPrefix = new TextEncoder().encode('{"key":"');
  var legacyKeyPrefix = new TextEncoder().encode("rp_hub_auto_backup_");
  var keptBackupKey = new TextEncoder().encode("rp_hub_auto_backup_config");
  var localStorageNeedles = [
    new TextEncoder().encode('"rp_hub_auto_backup_'),
    new TextEncoder().encode('"silly_tavern_auto_backup_')
  ];
  var isSpaceByte = (c) => c === 32 || c === 9 || c === 10 || c === 13;
  var NULL_BYTES = Uint8Array.from([110, 117, 108, 108]);
  var nextStructuralCodes = [123, 125, 91, 93];
  var trailingBackslashes = (bytes) => {
    let count = 0;
    for (let k = bytes.length - 1; k >= 0 && bytes[k] === BACKSLASH; k--) count++;
    return count;
  };
  var QUOTE = 34;
  var BACKSLASH = 92;
  var scanStringEnd = (bytes, from) => {
    for (let i = from; i < bytes.length; i++) {
      const c = bytes[i];
      if (c === BACKSLASH) {
        i++;
        continue;
      }
      if (c === QUOTE) return i;
    }
    return -1;
  };
  var decodeKeyBytes = (bytes, start, end) => {
    const raw = new TextDecoder().decode(bytes.subarray(start, end));
    if (raw.indexOf("\\") < 0) return raw;
    try {
      return JSON.parse('"' + raw + '"');
    } catch (_) {
      return raw;
    }
  };
  var equalsAt = (hay, at, needle) => {
    if (at + needle.length > hay.length) return false;
    for (let j = 0; j < needle.length; j++) if (hay[at + j] !== needle[j]) return false;
    return true;
  };
  var indexOfBytes = (hay, needle, from) => {
    const first = needle[0];
    let at = hay.indexOf(first, Math.max(0, from));
    while (at >= 0) {
      if (equalsAt(hay, at, needle)) return at;
      at = hay.indexOf(first, at + 1);
    }
    return -1;
  };
  var scalarTokens = /* @__PURE__ */ new Set([tokenType_default.STRING, tokenType_default.NUMBER, tokenType_default.TRUE, tokenType_default.FALSE, tokenType_default.NULL]);
  var openTokens = /* @__PURE__ */ new Set([tokenType_default.LEFT_BRACE, tokenType_default.LEFT_BRACKET]);
  var closeTokens = /* @__PURE__ */ new Set([tokenType_default.RIGHT_BRACE, tokenType_default.RIGHT_BRACKET]);
  var utf8 = new TextEncoder();
  var ASCII_RUN = /^[\x00-\x7f]*$/;
  var stringByteLength = (value) => {
    const length = value.length;
    if (length > 4096 && ASCII_RUN.test(value)) return length + 2;
    let bytes = 2;
    for (let i = 0; i < length; i++) {
      const code = value.charCodeAt(i);
      bytes += code < 128 ? 1 : code < 2048 ? 2 : code >= 55296 && code <= 57343 ? 2 : 3;
    }
    return bytes;
  };
  var BackupStreamDecoder = class {
    constructor(options = {}) {
      const { emit, maxUnitBytes = 32 * 1024 * 1024 } = options;
      this.emit = typeof emit === "function" ? emit : () => {
      };
      this.pick = options && Array.isArray(options.pick) && options.pick.length ? new Set(options.pick) : null;
      this.survey = !!(options && options.survey);
      this.stringSkip = null;
      this.maxUnitBytes = maxUnitBytes;
      this.frames = [];
      this.records = /* @__PURE__ */ new Map();
      this.metadata = {};
      this.entryCounts = { entries: 0 };
      this.bytes = 0;
      this.lastToken = 0;
      this.depthLimit = 96;
      this.active = null;
      this.maxUnit = 0;
      this.rootClosed = false;
      this.sawEntries = false;
      this.skippedEntries = [];
      this.spans = [];
      this.entrySkips = 0;
      this.entriesOpen = -1;
      this.entriesClose = -1;
      this.muted = null;
      this.pendingSkip = null;
      this.skipState = null;
      this.offsetAdjust = 0;
      this.tokenizer = new Tokenizer({ stringBufferSize: 64 * 1024, numberBufferSize: 128 });
      this.textDecoder = new TextDecoder("utf-8", { fatal: true });
      this.validator = new TokenParser({ paths: [], keepStack: false });
      this.tokenizer.onToken = (info) => this.token(info);
      this.tokenizer.onEnd = () => {
        if (!this.validator.isEnded) this.validator.end();
      };
    }
    failure(message, path = this.currentPath()) {
      const error = new Error(message);
      error.path = "$" + path.map((item) => typeof item === "number" ? `[${item}]` : `.${String(item).slice(0, 100)}`).join("");
      error.offset = this.lastToken;
      return error;
    }
    currentPath() {
      const frame = this.frames.at(-1);
      if (!frame) return [];
      return [...frame.path, frame.kind === "array" ? frame.index : frame.key];
    }
    locate(path) {
      if (path[0] === "entries" && typeof path[1] === "number") {
        return { source: "entries", id: path[1], relative: path.slice(2) };
      }
      if (path[0] === "databases" && ["RPHubDB", "main", "SillyTavernDB"].includes(path[1])) {
        const start = path[2] === "store" ? 3 : path[1] === "main" && typeof path[2] === "number" ? 2 : -1;
        if (start < 0 || path.length <= start) return null;
        const id = path[start];
        if (typeof id === "number") return { source: "database:" + path[1], id, relative: path.slice(start + 1) };
        return { source: "database:" + path[1], id, relative: ["value", ...path.slice(start + 1)], mapKey: id };
      }
      return null;
    }
    record(location) {
      const identity = JSON.stringify([location.source, location.id]);
      let record = this.records.get(identity);
      if (!record) {
        record = { source: location.source, entry: location.id, key: location.mapKey, hasValue: false, array: false, count: 0 };
        this.records.set(identity, record);
      }
      return record;
    }
    completeRecord(location, offset = this.lastToken) {
      const identity = JSON.stringify([location.source, location.id]);
      const record = this.records.get(identity);
      if (record && record.skipped) {
        this.skippedEntries.push({
          key: record.key,
          bytes: Math.max(0, offset - (record.skipStart || offset))
        });
        this.records.delete(identity);
        return;
      }
      if (!record || typeof record.key !== "string" || !record.key || !record.hasValue) {
        throw this.failure("\u5907\u4EFD\u6761\u76EE\u7F3A\u5C11\u6709\u6548\u7684\u5B58\u50A8\u952E\u6216 value");
      }
      record.key = record.key.startsWith("__ls__:") ? record.key : modernKey(record.key);
      this.emit({ kind: "record", ...record });
      this.entryCounts[record.source] = (this.entryCounts[record.source] || 0) + 1;
      this.records.delete(identity);
    }
    capture(path, info, accept) {
      const parser = new TokenParser({ paths: ["$"], keepStack: true });
      const active = { path, parser, start: info.offset + this.offsetAdjust, accept };
      this.active = active;
      parser.onValue = ({ value, stack }) => {
        if (stack.length) return;
        if (typeof value === "string" && value.length > this.maxUnitBytes)
          throw this.failure("\u5355\u6761\u8BB0\u5F55\u8D85\u8FC7 " + this.maxUnitBytes / 1048576 + " MB\uFF0C\u8BF7\u5207\u6362\u8BFB\u53D6\u6863\u4F4D\uFF1B\u539F\u6570\u636E\u672A\u6539\u52A8", path);
        const bytes = typeof value === "string" ? stringByteLength(value) : utf8.encode(JSON.stringify(value)).length;
        if (bytes > this.maxUnitBytes) throw this.failure("\u5355\u6761\u8BB0\u5F55\u8D85\u8FC7 " + this.maxUnitBytes / 1048576 + " MB\uFF0C\u8BF7\u5207\u6362\u8BFB\u53D6\u6863\u4F4D\uFF1B\u539F\u6570\u636E\u672A\u6539\u52A8", path);
        this.maxUnit = Math.max(this.maxUnit, bytes);
        active.accept(value, bytes);
        this.active = null;
      };
      parser.write(info);
    }
    route(path, info) {
      const token = info.token;
      if (path.length === 1 && ["type", "__rphub_backup__", "version"].includes(path[0]) && scalarTokens.has(token)) {
        this.metadata[path[0]] = info.value;
      }
      if (path.length === 1 && path[0] === "entries") {
        if (token !== tokenType_default.LEFT_BRACKET) throw this.failure("entries \u5FC5\u987B\u662F\u6570\u7EC4", path);
        this.sawEntries = true;
        this.entriesOpen = info.offset + this.offsetAdjust + 1;
      }
      const location = this.locate(path);
      if (location) {
        const relative = location.relative;
        if (!relative.length && token === tokenType_default.NULL) return;
        const record = this.record(location);
        if (!relative.length) {
          if (token !== tokenType_default.LEFT_BRACE) throw this.failure("\u5907\u4EFD\u6761\u76EE\u5FC5\u987B\u662F\u5BF9\u8C61", path);
          return;
        }
        if (relative.length === 1 && ["key", "k"].includes(relative[0])) {
          if (!scalarTokens.has(token) || typeof info.value !== "string") throw this.failure("\u5B58\u50A8\u952E\u5FC5\u987B\u662F\u5B57\u7B26\u4E32", path);
          record.key = info.value;
          return;
        }
        if (relative.length === 1 && ["value", "v"].includes(relative[0])) {
          record.hasValue = true;
          record.array = token === tokenType_default.LEFT_BRACKET;
          if (this.shouldSkipKey(record.key)) {
            record.skipped = true;
            record.count = 0;
            record.skipStart = typeof info.offset === "number" ? info.offset + this.offsetAdjust : this.bytes;
            return;
          }
          if (!record.array) {
            this.capture(path, info, (value, bytes) => {
              this.emit({ kind: "unit", source: record.source, entry: record.entry, part: 0, value, bytes });
              record.count = 1;
              if (location.mapKey) this.completeRecord(location);
            });
          }
          return;
        }
        if (relative.length === 2 && ["value", "v"].includes(relative[0]) && typeof relative[1] === "number" && record.array) {
          if (record.skipped) return;
          this.capture(path, info, (value, bytes) => {
            this.emit({ kind: "unit", source: record.source, entry: record.entry, part: relative[1], value, bytes });
            record.count++;
          });
          return;
        }
      }
      if (path.length === 3 && path[0] === "webStorage" && path[1] === "localStorage") {
        if (this.shouldSkipKey(path[2])) {
          if (token !== tokenType_default.NULL) this.mute(info, path[2]);
          return;
        }
        this.capture(path, info, (value, bytes) => {
          this.emit({ kind: "localStorage", key: path[2], value, bytes });
        });
      }
      if (path.length === 4 && path[0] === "databases" && !["RPHubDB", "main", "SillyTavernDB"].includes(path[1])) {
        this.capture(path, info, (value, bytes) => {
          this.emit({ kind: "companion", database: path[1], store: path[2], part: path[3], value, bytes });
        });
      }
    }
    // [rphub 2.9.038] 旧版自动备份快照还有第二个落脚点：webStorage.localStorage。
    //   导出端（app.js 的 collectLocalStorageDump）把整份 localStorage 原样写进这里，
    //   旧快照就是一条上百 MB 的字符串值。entries 里的旧快照 2.9.034/036 已经按字节跳过，
    //   但这条路径压根没走 shouldSkipEntryKey —— 整份旧包会被 TokenParser 组装出来，
    //   再 stringify + utf8 编码各复制一份，三份同时活着。带旧备份的外来包就是死在这里。
    //   这里只吞 token、不构造值：validator 照常校验结构，其余一概不落地。
    mute(info, key) {
      this.muted = { depth: 0, opened: false, key: String(key || ""), start: info.offset + this.offsetAdjust };
    }
    trackMuted(info) {
      const state = this.muted;
      const token = info.token;
      if (openTokens.has(token)) {
        state.depth++;
        state.opened = true;
        return;
      }
      if (closeTokens.has(token)) {
        state.depth--;
        if (state.opened && state.depth === 0) this.endMute();
        return;
      }
      if (!state.opened && state.depth === 0 && scalarTokens.has(token) && !info.partial) this.endMute();
    }
    endMute() {
      this.pendingSkip = { key: this.muted.key, start: this.muted.start };
      this.muted = null;
    }
    settleSkip() {
      if (!this.pendingSkip) return;
      const item = this.pendingSkip;
      this.pendingSkip = null;
      this.skippedEntries.push({ key: item.key, bytes: Math.max(0, this.lastToken - item.start) });
    }
    token(info) {
      const frame = this.frames.at(-1);
      const token = info.token;
      const keyToken = frame?.kind === "object" && frame.expectKey && token === tokenType_default.STRING;
      if (keyToken && ["__proto__", "constructor", "prototype"].includes(info.value)) {
        throw this.failure("\u5907\u4EFD\u5305\u542B\u4E0D\u5B89\u5168\u7684\u5BF9\u8C61\u5C5E\u6027\u540D\uFF1A" + info.value);
      }
      this.validator.write(info);
      this.lastToken = info.offset + this.offsetAdjust;
      this.settleSkip();
      const wasActive = !!this.active;
      if (wasActive) this.active.parser.write(info);
      if (keyToken) {
        frame.key = info.value;
        frame.expectKey = false;
        return;
      } else if (token === tokenType_default.COLON) return;
      else if (token === tokenType_default.COMMA) {
        if (frame.kind === "array") frame.index++;
        else frame.expectKey = true;
        return;
      } else if (!wasActive && !this.muted && !closeTokens.has(token)) this.route(this.currentPath(), info);
      if (openTokens.has(token)) {
        const path = this.currentPath();
        if (!this.frames.length && token !== tokenType_default.LEFT_BRACE) throw this.failure("\u5907\u4EFD\u6839\u8282\u70B9\u5FC5\u987B\u662F\u5BF9\u8C61", path);
        if (this.frames.length >= this.depthLimit) throw this.failure("\u5907\u4EFD\u5D4C\u5957\u5C42\u7EA7\u8FC7\u6DF1", path);
        this.frames.push({ path, kind: token === tokenType_default.LEFT_BRACE ? "object" : "array", index: 0, key: void 0, expectKey: true });
      } else if (closeTokens.has(token)) {
        const closed = this.frames.pop();
        if (closed && closed.kind === "array" && closed.path.length === 1 && closed.path[0] === "entries")
          this.entriesClose = info.offset + this.offsetAdjust;
        const location = this.locate(closed.path);
        if (location && !location.relative.length) this.completeRecord(location, info.offset + this.offsetAdjust);
        if (location?.mapKey && location.relative.length === 1 && location.relative[0] === "value" && closed.kind === "array") this.completeRecord(location, info.offset + this.offsetAdjust);
        if (!this.frames.length) this.rootClosed = true;
      }
      if (this.muted) this.trackMuted(info);
    }
    // [rphub 2.9.036] 分片喂 tokenizer：遇到旧版快照条目就在这里把整段字节吞掉，
    //   只补一个 null 占位。整段不产生任何 token，也不会长出一个 164MB 的对象。
    feedSlice(bytes, start, end) {
      if (end <= start) return;
      const text = this.textDecoder.decode(bytes.subarray(start, end), { stream: true });
      if (text) this.tokenizer.write(text);
    }
    atEntriesElement() {
      const frames = this.frames;
      const array = frames[1];
      return frames.length === 2 && array.kind === "array" && array.path.length === 1 && array.path[0] === "entries";
    }
    legacyKeyAt(bytes, hit) {
      const start = hit + legacyEntryPrefix.length;
      const stop = Math.min(bytes.length, start + 512);
      const end = scanStringEnd(bytes.subarray(0, stop), start);
      if (end < 0) return "";
      return decodeKeyBytes(bytes, start, end);
    }
    // 从条目对象的 '{' 起按字节找配对的 '}'，全程不构造字符串。
    // 下一个结构字节：引号 / 花括号 / 方括号，取最早的一个。全部走原生 indexOf。
    nextStructural(bytes, from) {
      let next = bytes.indexOf(QUOTE, from);
      if (next < 0) next = bytes.length;
      for (const code of nextStructuralCodes) {
        const at = bytes.indexOf(code, from);
        if (at >= 0 && at < next) next = at;
      }
      return next;
    }
    // [rphub 2.9.039] 导出端把整份 localStorage 原样写进 webStorage.localStorage，旧快照就是那里的
    //   一个「值是一整份旧包」的字符串成员。这条分支原先只有 mute（不构造值），可 tokenizer 会把
    //   大字符串整条建出来（实测 5MB 也只有一个 token），那一次分配躲不掉。所以改成和 entries
    //   一样：喂 tokenizer 之前按字节整段吞掉，只补 null 占位。
    inLocalStorageContainer() {
      const frames = this.frames;
      if (frames.length !== 3) return false;
      const local = frames[2];
      return local.kind === "object" && local.path.length === 2 && local.path[0] === "webStorage" && local.path[1] === "localStorage";
    }
    findLocalStorageSkip(bytes, from) {
      for (const needle of localStorageNeedles) {
        let at = indexOfBytes(bytes, needle, from);
        while (at >= 0) {
          let i = at - 1;
          while (i >= 0 && isSpaceByte(bytes[i])) i--;
          if (i < 0 || bytes[i] !== 123 && bytes[i] !== 44) {
            at = indexOfBytes(bytes, needle, at + 1);
            continue;
          }
          const keyStart = at + 1;
          const keyEnd = scanStringEnd(bytes, keyStart);
          if (keyEnd < 0) return null;
          let j = keyEnd + 1;
          while (j < bytes.length && isSpaceByte(bytes[j])) j++;
          if (bytes[j] !== 58) {
            at = indexOfBytes(bytes, needle, at + 1);
            continue;
          }
          j++;
          while (j < bytes.length && isSpaceByte(bytes[j])) j++;
          if (bytes[j] !== QUOTE) {
            at = indexOfBytes(bytes, needle, at + 1);
            continue;
          }
          const key = decodeKeyBytes(bytes, keyStart, keyEnd);
          if (!this.shouldSkipKey(key)) {
            at = indexOfBytes(bytes, needle, at + 1);
            continue;
          }
          return { hit: at, key, valueStart: j };
        }
      }
      return null;
    }
    // 该不该整段跳过：旧快照永远跳；auto_backup_config 永远留；
    //   survey 全跳（只清点体积）；有 pick 时未选中的也跳。
    shouldSkipKey(key) {
      const raw = String(key || "");
      if (shouldSkipEntryKey(raw)) return true;
      if (this.survey) return true;
      if (!this.pick) return false;
      const logical = modernKey(raw);
      if (logical === "rp_hub_auto_backup_config") return false;
      return !(this.pick.has(raw) || this.pick.has(logical));
    }
    skipLegacyString(bytes, from) {
      const state = this.stringSkip;
      const total = bytes.length;
      let i = state.started ? from : from + 1;
      state.started = true;
      while (i < total) {
        const q = bytes.indexOf(QUOTE, i);
        if (q < 0) {
          state.tail = trailingBackslashes(bytes);
          return total;
        }
        let backslashes = 0;
        for (let k = q - 1; k >= 0 && bytes[k] === BACKSLASH; k--) backslashes++;
        if (q === backslashes) backslashes += state.tail;
        state.tail = 0;
        i = q + 1;
        if ((backslashes & 1) === 0) {
          const skipped = this.bytes + q + 1 - state.start;
          this.skippedEntries.push({ key: state.key, bytes: skipped });
          this.offsetAdjust += skipped - 4;
          this.stringSkip = null;
          this.feedSlice(NULL_BYTES, 0, 4);
          return i;
        }
      }
      return total;
    }
    skipLegacyEntry(bytes, from) {
      const state = this.skipState;
      const total = bytes.length;
      let i = from;
      while (i < total) {
        if (state.inStr) {
          const q = bytes.indexOf(QUOTE, i);
          if (q < 0) {
            state.tail = trailingBackslashes(bytes);
            return total;
          }
          let backslashes = 0;
          for (let k = q - 1; k >= 0 && bytes[k] === BACKSLASH; k--) backslashes++;
          if (q === backslashes) backslashes += state.tail;
          state.tail = 0;
          i = q + 1;
          if ((backslashes & 1) === 0) state.inStr = false;
          continue;
        }
        const c = bytes[i];
        if (c === QUOTE) {
          state.inStr = true;
          i++;
          continue;
        }
        if (c === 123 || c === 91) {
          state.depth++;
          i++;
          continue;
        }
        if (c === 125 || c === 93) {
          state.depth--;
          i++;
          if (state.depth === 0) {
            const end = this.bytes + i;
            const skipped = end - state.start;
            if (this.survey) {
              this.spans.push({ key: state.key, start: state.start, end });
              this.entrySkips += 1;
            }
            this.skippedEntries.push({ key: state.key, bytes: skipped });
            this.offsetAdjust += skipped - 4;
            this.skipState = null;
            this.feedSlice(NULL_BYTES, 0, 4);
            return i;
          }
          continue;
        }
        const next = this.nextStructural(bytes, i);
        if (next >= total) {
          state.tail = 0;
          return total;
        }
        i = next;
      }
      return total;
    }
    write(bytes) {
      try {
        const total = bytes.byteLength;
        let from = 0;
        while (from < total) {
          if (this.skipState) {
            from = this.skipLegacyEntry(bytes, from);
            continue;
          }
          if (this.stringSkip) {
            from = this.skipLegacyString(bytes, from);
            continue;
          }
          let hit = indexOfBytes(bytes, legacyEntryPrefix, from);
          if (!this.pick && !this.survey) {
            while (hit >= 0) {
              const at = hit + legacyEntryPrefix.length;
              if (equalsAt(bytes, at, legacyKeyPrefix) && !equalsAt(bytes, at, keptBackupKey)) break;
              hit = indexOfBytes(bytes, legacyEntryPrefix, hit + 1);
            }
          }
          const local = this.findLocalStorageSkip(bytes, from);
          if (local && (hit < 0 || local.hit < hit)) {
            this.feedSlice(bytes, from, local.valueStart);
            this.stringSkip = { key: local.key, start: this.bytes + local.valueStart, tail: 0, started: false };
            from = this.skipLegacyString(bytes, local.valueStart);
            continue;
          }
          if (hit < 0) {
            this.feedSlice(bytes, from, total);
            break;
          }
          this.feedSlice(bytes, from, hit);
          if (!this.atEntriesElement()) {
            this.feedSlice(bytes, hit, hit + 1);
            from = hit + 1;
            continue;
          }
          const entryKey = this.legacyKeyAt(bytes, hit);
          if (!entryKey || !this.shouldSkipKey(entryKey)) {
            this.feedSlice(bytes, hit, hit + 1);
            from = hit + 1;
            continue;
          }
          this.skipState = { depth: 0, inStr: false, tail: 0, start: this.bytes + hit, key: entryKey };
          from = this.skipLegacyEntry(bytes, hit);
        }
        this.bytes += total;
        const earliest = this.active?.start ?? (this.skipState || this.stringSkip ? this.bytes : this.lastToken);
        if (this.bytes - earliest > this.maxUnitBytes + total) {
          throw this.failure("\u5F53\u524D\u5B57\u7B26\u4E32\u6216\u5355\u6761\u8BB0\u5F55\u8D85\u8FC7 " + this.maxUnitBytes / 1048576 + " MB\uFF0C\u8BF7\u5207\u6362\u8BFB\u53D6\u6863\u4F4D");
        }
      } catch (error) {
        if (error instanceof TokenizerError || error instanceof TokenParserError) {
          error.message = "JSON \u8BED\u6CD5\u9519\u8BEF\uFF0C\u6587\u4EF6\u53EF\u80FD\u635F\u574F\u6216\u5305\u542B\u591A\u4F59\u5185\u5BB9";
        }
        error.offset ??= this.lastToken;
        error.path ??= "$" + this.currentPath().map((part) => "." + String(part)).join("");
        throw error;
      }
    }
    end() {
      this.settleSkip();
      try {
        const tail = this.textDecoder.decode();
        if (tail) this.tokenizer.write(tail);
        if (!this.tokenizer.isEnded) this.tokenizer.end();
      } catch (_) {
        throw this.failure("\u6587\u4EF6\u7ED3\u5C3E\u4E0D\u5B8C\u6574\uFF0C\u539F\u6570\u636E\u672A\u6539\u52A8");
      }
      if (!this.rootClosed || this.active || this.records.size || this.skipState || this.muted || this.stringSkip)
        throw this.failure("\u5907\u4EFD\u4E0D\u5B8C\u6574\uFF0C\u4E0D\u80FD\u542F\u7528");
      if (this.metadata.type !== "rp-hub-complete-backup" && !this.metadata.__rphub_backup__ && !Object.keys(this.entryCounts).some((key) => key.startsWith("database:"))) {
        throw this.failure("\u672A\u8BC6\u522B\u4E3A RP-Hub \u5168\u91CF\u5907\u4EFD");
      }
      const source = this.sawEntries ? "entries" : ["database:RPHubDB", "database:main", "database:SillyTavernDB"].find((key) => this.entryCounts[key] > 0);
      if ((!source || !this.entryCounts[source]) && !this.survey && !this.pick)
        throw this.failure("\u5907\u4EFD\u6CA1\u6709\u53EF\u7528\u7684\u4E3B\u5E93\u6761\u76EE");
      const grouped = /* @__PURE__ */ new Map();
      for (const item of this.skippedEntries) {
        const key = String(item.key || "");
        if (!key) continue;
        const row = grouped.get(key) || { key, bytes: 0, count: 0 };
        row.bytes += Math.max(0, Number(item.bytes) || 0);
        row.count += 1;
        grouped.set(key, row);
      }
      const items = [...grouped.values()].sort((a, b) => b.bytes - a.bytes);
      let contiguous = this.survey && this.spans.length > 0;
      if (contiguous && this.entriesOpen >= 0 && this.entriesClose >= 0) {
        contiguous = this.spans[0].start === this.entriesOpen && this.spans[this.spans.length - 1].end === this.entriesClose;
        for (let i = 1; contiguous && i < this.spans.length; i++)
          if (this.spans[i].start - this.spans[i - 1].end !== 1) contiguous = false;
      } else contiguous = false;
      return {
        source,
        metadata: this.metadata,
        counts: this.entryCounts,
        maxUnitBytes: this.maxUnit,
        skipped: this.skippedEntries,
        items,
        spans: contiguous ? this.spans : [],
        entriesOpen: this.entriesOpen,
        entriesClose: this.entriesClose,
        indexed: contiguous
      };
    }
  };

  // scripts/stream-import/cloud.mjs
  async function* verifyChunks(chunks, piece) {
    const digest = sha256.create();
    let bytes = 0;
    for await (const chunk of chunks) {
      bytes += chunk.byteLength;
      if (bytes > piece.size) throw new Error("\u4E91\u7AEF\u6570\u636E\u5927\u5C0F\u5F02\u5E38\uFF0C\u539F\u6570\u636E\u672A\u6539\u52A8");
      digest.update(chunk);
      yield chunk;
    }
    if (bytes !== piece.size || bytesToHex(digest.digest()) !== piece.hash)
      throw new Error("\u4E91\u7AEF\u6570\u636E\u6821\u9A8C\u5931\u8D25\uFF0C\u539F\u6570\u636E\u672A\u6539\u52A8\uFF0C\u8BF7\u91CD\u65B0\u4E0A\u4F20\u5907\u4EFD");
  }
  async function* decodeChat(chunks, limits) {
    const encoder = new TextEncoder(), pending = [];
    const parser = new BackupStreamDecoder({ maxUnitBytes: limits.unitBytes, emit(item) {
      if (item.kind === "unit") pending.push(item.value);
      if (item.kind === "record" && !item.array) throw new Error("\u4E91\u7AEF\u804A\u5929\u5185\u5BB9\u4E0D\u5B8C\u6574");
    } });
    parser.write(encoder.encode('{"type":"rp-hub-complete-backup","entries":[{"key":"rp_hub_chat_cloud","value":'));
    for await (const chunk of chunks) {
      for (let offset = 0; offset < chunk.length; offset += limits.chunkBytes) {
        parser.write(chunk.subarray(offset, offset + limits.chunkBytes));
        while (pending.length) yield pending.shift();
      }
    }
    parser.write(encoder.encode("}]}"));
    parser.end();
  }

  // scripts/stream-import/client.mjs
  var readSession = (db, id) => resultOf(db.transaction("restore_sessions").objectStore("restore_sessions").get(id));
  var commitKey = (id) => "__rp_restore_commit__:" + id;
  var webText = (value) => String(value ?? "");
  var cancelled = (signal) => {
    if (signal?.aborted) throw new DOMException("\u5BFC\u5165\u5DF2\u53D6\u6D88", "AbortError");
  };
  async function stageEntries(entries, { limits = profile() } = {}) {
    const db = await database(), id = crypto.randomUUID().replaceAll("-", "");
    const sink = new StagingSink(db, id), encoder = new TextEncoder();
    try {
      await saveSession(db, { id, state: "reading" });
      let index = 0;
      for await (const entry of entries) {
        const array = Array.isArray(entry.value) || !!entry.value?.[Symbol.asyncIterator];
        let part = 0;
        const write = async (value) => {
          const bytes = encoder.encode(JSON.stringify(value)).length;
          const maxBytes = entry.key === "rp_hub_characters" ? Math.min(128 * 1048576, Math.max(profiles.at(-1).unitBytes, limits.unitBytes)) : limits.unitBytes;
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
      try {
        await removeSession(db, id);
      } catch (cleanupError) {
        console.warn("\u6E05\u7406\u5BFC\u5165\u6682\u5B58\u5931\u8D25:", cleanupError);
      }
      throw error;
    } finally {
      db.close();
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
  async function discardPreparedCards(main, session) {
    if (!session.cardRevision) return;
    const tx = main.transaction("store", "readwrite"), store = tx.objectStore("store");
    for (const prefix of ["__rp_card__:", "__rp_card_image__:"]) {
      const start = prefix + session.cardRevision + ":";
      store.delete(IDBKeyRange.bound(start, start + "\uFFFF"));
    }
    await completed(tx);
  }
  async function recoverSession(main, session) {
    const key = commitKey(session.id);
    const committed = session.state === "applied" || await resultOf(main.transaction("store").objectStore("store").get(key));
    if (session.state === "applying" || session.state === "applied") {
      if (committed && session.imageProviders)
        await window.RPImageProviders.persistConfig(session.imageProviders);
      const items = committed ? session.web : session.oldWeb;
      if (!committed && session.hasMoments) await writeMoments(session.oldMoments);
      writeWeb(items);
      for (const { key: key2, value } of items) {
        if (value === null) await window.RPLocalStore?.remove("__ls__:" + key2);
        else await window.RPLocalStore?.save("__ls__:" + key2, value);
      }
    }
    if (!committed) await discardPreparedCards(main, session);
  }
  async function recover(main) {
    const stage = await database();
    window.RPLocalStore?.setWebWritesPaused(true);
    try {
      const sessions = await resultOf(stage.transaction("restore_sessions").objectStore("restore_sessions").getAll());
      for (const session of sessions) {
        await recoverSession(main, session);
        await removeSession(stage, session.id);
      }
      const keys = await window.RPHubStorage.readStorageKeys(main);
      const markers = keys.filter((key) => key.startsWith("__rp_restore_commit__:"));
      if (markers.length) {
        const tx = main.transaction("store", "readwrite");
        markers.forEach((key) => tx.objectStore("store").delete(key));
        await completed(tx);
      }
    } finally {
      window.RPLocalStore?.setWebWritesPaused(false);
      stage.close();
    }
    const legacy = ["restore_sessions", "restore_units", "restore_records", "restore_web", "restore_companions"].filter((name) => main.objectStoreNames.contains(name));
    if (legacy.length) {
      try {
        const tx = main.transaction(legacy, "readwrite");
        legacy.forEach((name) => tx.objectStore(name).clear());
        await completed(tx);
      } catch (error) {
      }
    }
    await deleteStagingDatabase();
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
    let priority = Infinity, bytes = 0, moments;
    const maxMomentsBytes = Math.max(32 * 1048576, Number(session.unitBytes) || 0);
    await each(db, "restore_companions", rangeOf(session.id), (item) => {
      const rank = item.database === "sf_moments_db" && item.store === "moments" ? 0 : item.database === "SakuraMomentsDB" && item.store === "moments" ? 1 : item.database === "moments" && item.store === "list" ? 2 : -1;
      if (rank < 0 || rank > priority) return;
      if (rank < priority) {
        priority = rank;
        bytes = 0;
        moments = [];
      }
      bytes += item.bytes;
      if (bytes > maxMomentsBytes) return;
      const record = item.value;
      const value = record && typeof record === "object" && Object.hasOwn(record, "v") ? record.v : record;
      if ((record?.k ?? record?.key) === "list" && Array.isArray(value)) {
        for (const moment of value) moments.push(moment);
      } else moments.push(value);
    });
    if (bytes > maxMomentsBytes)
      throw new Error("\u540D\u573A\u9762\u6570\u636E\u8D85\u8FC7 " + maxMomentsBytes / 1048576 + " MB\uFF0C\u8BF7\u5207\u6362\u8BFB\u53D6\u6863\u4F4D\u6216\u62C6\u5206\u5907\u4EFD");
    return { web: [...web].map(([key, value]) => ({ key, value })), moments };
  }
  async function prepareCharacters(main, stage, session, restoreValue, signal, progress) {
    const record = session.plan.find((item) => item.key === "rp_hub_characters");
    if (!record) return null;
    await discardPreparedCards(main, session);
    session.cardRevision = crypto.randomUUID().replaceAll("-", "");
    await saveSession(stage, session);
    const cards = [], ids = /* @__PURE__ */ new Set();
    for (let part = 0; part < record.count; part++) {
      cancelled(signal);
      const unit = await resultOf(stage.transaction("restore_units").objectStore("restore_units").get([session.id, session.source, record.entry, part]));
      const card = restoreValue(unit?.value);
      if (!card || typeof card !== "object" || Array.isArray(card))
        throw new Error("\u89D2\u8272\u5361\u5185\u5BB9\u4E0D\u662F\u5BF9\u8C61\uFF0C\u539F\u6570\u636E\u672A\u6539\u52A8");
      if (card.rphubCardStub === 1 || card.avatar?.rphubCardImage === 1)
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
      const tx = main.transaction("store", "readwrite"), store = tx.objectStore("store");
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
    const main = await window.RPHubStorage.initDB(), stage = await database();
    let retain = false;
    try {
      await applySession(main, stage, id, { beforeApply, restoreValue, signal, progress });
    } catch (error) {
      retain = !!error.recoveryRequired;
      throw error;
    } finally {
      try {
        if (!retain) await removeSession(stage, id);
      } catch (error) {
        retain = true;
        console.warn("\u6E05\u7406\u5BFC\u5165\u6682\u5B58\u5931\u8D25:", error);
      } finally {
        stage.close();
      }
      if (!retain) {
        try {
          const tx = main.transaction("store", "readwrite");
          tx.objectStore("store").delete(commitKey(id));
          await completed(tx);
        } catch (error) {
          console.warn("\u6E05\u7406\u5BFC\u5165\u63D0\u4EA4\u6807\u8BB0\u5931\u8D25:", error);
        }
        await deleteStagingDatabase();
      }
    }
  }
  async function applySession(main, stage, id, { beforeApply, restoreValue, signal, progress }) {
    const session = await readSession(stage, id);
    if (session?.state !== "complete") throw new Error("\u6682\u5B58\u6570\u636E\u4E0D\u53EF\u7528\uFF0C\u8BF7\u91CD\u65B0\u9009\u62E9\u6587\u4EF6");
    const deleted = new Set(session.deleted);
    const records = session.plan.filter((item) => !item.key.startsWith("__ls__:") && item.key !== "__rp_local_mirror_revision" && !item.key.startsWith("__rp_restore_commit__:") && !item.key.startsWith("rp_hub_b1_memory_state_") && !deleted.has(item.key));
    const cardCount = session.plan.find((item) => item.key === "rp_hub_characters")?.count || 0;
    const totalWork = cardCount + records.length + 1;
    const extras = await prepareExtras(stage, session);
    cancelled(signal);
    await beforeApply();
    await window.RPLocalStore?.flush();
    window.RPHubStorage.setWritesPaused(true);
    window.RPLocalStore?.setWebWritesPaused(true);
    let journal, committed = false, recoveryRequired = false;
    const readRecordValue = async (record) => {
      if (!record.array) {
        const unit = await resultOf(stage.transaction("restore_units").objectStore("restore_units").get([session.id, session.source, record.entry, 0]));
        return restoreValue(unit?.value);
      }
      const value = [];
      const tx = stage.transaction("restore_units");
      const request = tx.objectStore("restore_units").openCursor(rangeOf(session.id, session.source, record.entry));
      await new Promise((resolve, reject) => {
        request.onsuccess = () => {
          const cursor = request.result;
          if (!cursor) {
            resolve();
            return;
          }
          try {
            value.push(restoreValue(cursor.value.value));
            cursor.continue();
          } catch (error) {
            reject(error);
          }
        };
        request.onerror = () => reject(request.error);
      });
      return value;
    };
    try {
      const settingsRecord = records.find((item) => item.key === "rp_hub_settings");
      const settings = settingsRecord && await readRecordValue(settingsRecord);
      const imageProviders = Object.hasOwn(settings ?? {}, "imageProviderBackup") ? window.RPImageProviders.validateConfig(settings.imageProviderBackup) : void 0;
      if (settings && typeof settings === "object") {
        delete settings.imageProviderBackup;
        if (imageProviders) settings.imageGenKey = imageProviders.profiles.find((item) => item.id === "builtin").key;
        else delete settings.imageGenKey;
      }
      const oldCardKeys = cardCount || session.plan.some((item) => item.key === "rp_hub_characters") ? (await window.RPHubStorage.readStorageKeys(main)).filter((key) => key.startsWith("__rp_card__:") || key.startsWith("__rp_card_image__:")) : [];
      const characters = await prepareCharacters(
        main,
        stage,
        session,
        restoreValue,
        signal,
        (done) => progress?.(done, totalWork, "\u6B63\u5728\u6574\u7406\u89D2\u8272\u5361 " + done + " / " + cardCount)
      );
      const snapshot = {
        id,
        state: "applying",
        web: extras.web,
        cardRevision: session.cardRevision,
        imageProviders,
        oldWeb: extras.web.map(({ key }) => ({ key, value: localStorage.getItem(key) })),
        hasMoments: extras.moments !== void 0
      };
      if (snapshot.hasMoments) {
        const moments = await momentsDb();
        try {
          snapshot.oldMoments = await resultOf(moments.transaction("moments").objectStore("moments").get("list"));
        } finally {
          moments.close();
        }
      }
      await saveSession(stage, snapshot);
      journal = snapshot;
      cancelled(signal);
      if (journal.hasMoments) await writeMoments(extras.moments.map((value) => restoreValue(value)));
      cancelled(signal);
      await new Promise((resolve, reject) => {
        const tx = main.transaction("store", "readwrite", { durability: "strict" });
        const store = tx.objectStore("store");
        const marker = commitKey(id);
        let failure, index = 0;
        const fail = (error) => {
          failure ||= error;
          try {
            tx.abort();
          } catch (_) {
          }
        };
        const abort = () => fail(new DOMException("\u5BFC\u5165\u5DF2\u53D6\u6D88", "AbortError"));
        const settle = (error) => {
          signal?.removeEventListener("abort", abort);
          if (error) reject(error);
          else resolve();
        };
        tx.oncomplete = () => settle();
        tx.onabort = () => settle(failure || tx.error || new Error("\u5BFC\u5165\u4E8B\u52A1\u5931\u8D25"));
        store.fail = fail;
        signal?.addEventListener("abort", abort, { once: true });
        const next = () => {
          cancelled(signal);
          if (index === records.length) {
            writeWeb(extras.web);
            store.put(true, marker);
            return;
          }
          const record = records[index];
          let ready = false, value, error;
          const load = record.key === "rp_hub_characters" ? Promise.resolve(characters) : record === settingsRecord ? Promise.resolve(settings) : readRecordValue(record);
          load.then((result) => {
            value = result;
            ready = true;
          }, (failure2) => {
            error = failure2;
            ready = true;
          });
          const pump = () => {
            store.get(marker).onsuccess = () => {
              try {
                cancelled(signal);
                if (!ready) {
                  pump();
                  return;
                }
                if (error) throw error;
                for (const entry of window.RPHubStorage.prepareRestoredMemoryEntries([{ key: record.key, value }]))
                  window.RPHubStorage.putStoredRecord(store, entry.value, entry.key);
                index++;
                progress?.(cardCount + index, totalWork);
                next();
              } catch (error2) {
                fail(error2);
              }
            };
          };
          pump();
        };
        try {
          store.delete("__rp_local_mirror_revision");
          oldCardKeys.forEach((key) => store.delete(key));
          for (const key of deleted) {
            for (const entry of window.RPHubStorage.prepareRestoredMemoryEntries([
              {
                key: key.replace("rp_hub_classic_memories_", "rp_hub_b1_memory_state_"),
                value: { schema: 1, revision: crypto.randomUUID().replaceAll("-", ""), deleted: true }
              }
            ])) store.put(entry.value, entry.key);
            window.RPHubStorage.deleteStoredRecord(store, key);
          }
          next();
        } catch (error) {
          fail(error);
        }
      });
      committed = true;
      progress?.(totalWork - 1, totalWork, "\u6B63\u5728\u5199\u5165\u672C\u673A\u5B58\u6863\uFF08\u53EA\u9700\u4E00\u6B21\uFF0C\u4E4B\u540E\u542F\u52A8\u66F4\u5FEB\uFF09");
      await (window.RPHubStorage.syncLocalFiles?.() ?? null);
      await recoverSession(main, journal);
      progress?.(totalWork, totalWork);
    } catch (error) {
      if (committed) {
        recoveryRequired = true;
        error.recoveryRequired = true;
        error.message = "\u672C\u673A\u5B58\u6863\u4FDD\u5B58\u672A\u5B8C\u6210\uFF0C\u8BF7\u91CD\u65B0\u6253\u5F00\u8F6F\u4EF6\u7EE7\u7EED\u6062\u590D\uFF1A" + error.message;
      }
      if (!committed) {
        try {
          if (journal) await recoverSession(main, journal);
          else await discardPreparedCards(main, session);
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
  window.RPStreamImport = { upgrade, database, recover, apply, stageEntries, readSession, removeSession, profile, profiles, verifyChunks, decodeChat };
})();
/*! Bundled license information:

@noble/hashes/esm/utils.js:
  (*! noble-hashes - MIT License (c) 2022 Paul Miller (paulmillr.com) *)
*/
