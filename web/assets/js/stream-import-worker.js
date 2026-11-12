(() => {
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
  var scalarTokens = /* @__PURE__ */ new Set([tokenType_default.STRING, tokenType_default.NUMBER, tokenType_default.TRUE, tokenType_default.FALSE, tokenType_default.NULL]);
  var openTokens = /* @__PURE__ */ new Set([tokenType_default.LEFT_BRACE, tokenType_default.LEFT_BRACKET]);
  var closeTokens = /* @__PURE__ */ new Set([tokenType_default.RIGHT_BRACE, tokenType_default.RIGHT_BRACKET]);
  var utf8 = new TextEncoder();
  var BackupStreamDecoder = class {
    constructor({ emit, maxUnitBytes = 32 * 1024 * 1024 } = {}) {
      this.emit = emit;
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
      const active = { path, parser, start: info.offset, accept };
      this.active = active;
      parser.onValue = ({ value, stack }) => {
        if (stack.length) return;
        const bytes = utf8.encode(JSON.stringify(value)).length;
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
      }
      const location = this.locate(path);
      if (location) {
        const relative = location.relative;
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
          if (shouldSkipEntryKey(record.key)) {
            record.skipped = true;
            record.count = 0;
            record.skipStart = typeof info.offset === "number" ? info.offset : this.bytes;
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
    token(info) {
      const frame = this.frames.at(-1);
      const token = info.token;
      const keyToken = frame?.kind === "object" && frame.expectKey && token === tokenType_default.STRING;
      if (keyToken && ["__proto__", "constructor", "prototype"].includes(info.value)) {
        throw this.failure("\u5907\u4EFD\u5305\u542B\u4E0D\u5B89\u5168\u7684\u5BF9\u8C61\u5C5E\u6027\u540D\uFF1A" + info.value);
      }
      this.validator.write(info);
      this.lastToken = info.offset;
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
      } else if (!wasActive && !closeTokens.has(token)) this.route(this.currentPath(), info);
      if (openTokens.has(token)) {
        const path = this.currentPath();
        if (!this.frames.length && token !== tokenType_default.LEFT_BRACE) throw this.failure("\u5907\u4EFD\u6839\u8282\u70B9\u5FC5\u987B\u662F\u5BF9\u8C61", path);
        if (this.frames.length >= this.depthLimit) throw this.failure("\u5907\u4EFD\u5D4C\u5957\u5C42\u7EA7\u8FC7\u6DF1", path);
        this.frames.push({ path, kind: token === tokenType_default.LEFT_BRACE ? "object" : "array", index: 0, key: void 0, expectKey: true });
      } else if (closeTokens.has(token)) {
        const closed = this.frames.pop();
        const location = this.locate(closed.path);
        if (location && !location.relative.length) this.completeRecord(location, info.offset);
        if (location?.mapKey && location.relative.length === 1 && location.relative[0] === "value" && closed.kind === "array") this.completeRecord(location, info.offset);
        if (!this.frames.length) this.rootClosed = true;
      }
    }
    write(bytes) {
      try {
        const text = this.textDecoder.decode(bytes, { stream: true });
        if (text) this.tokenizer.write(text);
        this.bytes += bytes.byteLength;
        const earliest = this.active?.start ?? this.lastToken;
        if (this.bytes - earliest > this.maxUnitBytes + bytes.byteLength) {
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
      try {
        const tail = this.textDecoder.decode();
        if (tail) this.tokenizer.write(tail);
        if (!this.tokenizer.isEnded) this.tokenizer.end();
      } catch (_) {
        throw this.failure("\u6587\u4EF6\u7ED3\u5C3E\u4E0D\u5B8C\u6574\uFF0C\u539F\u6570\u636E\u672A\u6539\u52A8");
      }
      if (!this.rootClosed || this.active || this.records.size) throw this.failure("\u5907\u4EFD\u4E0D\u5B8C\u6574\uFF0C\u4E0D\u80FD\u542F\u7528");
      if (this.metadata.type !== "rp-hub-complete-backup" && !this.metadata.__rphub_backup__ && !Object.keys(this.entryCounts).some((key) => key.startsWith("database:"))) {
        throw this.failure("\u672A\u8BC6\u522B\u4E3A RP-Hub \u5168\u91CF\u5907\u4EFD");
      }
      const source = this.sawEntries ? "entries" : ["database:RPHubDB", "database:main", "database:SillyTavernDB"].find((key) => this.entryCounts[key] > 0);
      if (!source || !this.entryCounts[source]) throw this.failure("\u5907\u4EFD\u6CA1\u6709\u53EF\u7528\u7684\u4E3B\u5E93\u6761\u76EE");
      return { source, metadata: this.metadata, counts: this.entryCounts, maxUnitBytes: this.maxUnit, skipped: this.skippedEntries };
    }
  };

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
  async function validate(db, session, source, wait2, maxCollectionBytes = 128 * 1048576) {
    const last = /* @__PURE__ */ new Map();
    await each(db, "restore_records", rangeOf(session, source), (item) => {
      last.set(item.key, item);
      if (last.size > 1e5) throw new Error("\u5907\u4EFD\u5B58\u50A8\u9879\u8D85\u8FC7 10 \u4E07\u9879");
    });
    const deleted = /* @__PURE__ */ new Set();
    const summary = { records: last.size, cards: 0, messages: 0, memories: 0 };
    for (const [key, record] of last) {
      await wait2();
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

  // scripts/stream-import/worker.mjs
  var paused = false;
  var resume;
  var running = false;
  var wait = async () => {
    while (paused) await new Promise((resolve) => {
      resume = resolve;
    });
  };
  self.onmessage = async ({ data }) => {
    if (data.type === "pause") {
      paused = true;
      return;
    }
    if (data.type === "resume") {
      paused = false;
      resume?.();
      return;
    }
    if (data.type !== "import" || running) return;
    running = true;
    const MB2 = 1048576;
    const UNIT_CAP = 128 * MB2;
    const base = profile(data.profile);
    const asked = data.limits || {};
    const limits = {
      ...base,
      unitBytes: Math.min(UNIT_CAP, Math.max(base.unitBytes, Number(asked.unitBytes) || 0)),
      chunkBytes: Math.max(base.chunkBytes, Math.min(4 * MB2, Number(asked.chunkBytes) || 0)),
      collectionBytes: Math.max(base.collectionBytes, Number(asked.collectionBytes) || 0)
    };
    const session = { id: data.id, name: data.file?.name || data.name, state: "reading", bytes: data.file?.size || data.bytes || 0, read: 0 };
    let db, timer, lastNotice = 0, phase = "\u5206\u5757\u8BFB\u53D6\u4E0E\u6821\u9A8C";
    const progress = (nextPhase) => {
      if (nextPhase) phase = nextPhase;
      if (performance.now() - lastNotice < 200 && !nextPhase) return;
      lastNotice = performance.now();
      postMessage({ type: "progress", read: session.read, bytes: session.bytes, phase });
    };
    const heartbeat = setInterval(() => progress(), 1e3);
    const readWithTimeout = (promise) => Promise.race([promise, new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error("\u8BFB\u53D6\u6587\u4EF6\u8D85\u65F6\uFF0C\u8BF7\u5C06\u5907\u4EFD\u4FDD\u5B58\u5230\u8BBE\u5907\u672C\u5730\u540E\u91CD\u8BD5")), 3e4);
    })]).finally(() => clearTimeout(timer));
    try {
      db = await database();
      await saveSession(db, session);
      const sink = new StagingSink(db, session.id);
      const parser = new BackupStreamDecoder({ emit: (item) => sink.emit(item), maxUnitBytes: limits.unitBytes });
      const chunks = async function* () {
        const file = data.file;
        if (data.stream) {
          const reader = data.stream.getReader();
          try {
            for (; ; ) {
              await wait();
              const item = await readWithTimeout(reader.read());
              if (item.done) break;
              yield item.value;
            }
          } finally {
            await reader.cancel().catch(() => {
            });
          }
          return;
        }
        for (let offset = 0; offset < file.size; offset += limits.chunkBytes) {
          await wait();
          yield new Uint8Array(await readWithTimeout(file.slice(offset, offset + limits.chunkBytes).arrayBuffer()));
        }
      };
      let pendingBytes = 0;
      for await (const buffer of chunks()) {
        await wait();
        parser.write(buffer);
        pendingBytes += buffer.byteLength;
        if (pendingBytes >= limits.chunkBytes) {
          await sink.flush();
          pendingBytes = 0;
          await new Promise((resolve) => setTimeout(resolve, 0));
        }
        session.read += buffer.byteLength;
        progress();
      }
      const parsed = parser.end();
      await sink.flush();
      progress("\u6838\u5BF9\u89D2\u8272\u5361\u3001\u804A\u5929\u4E0E\u8BB0\u5FC6");
      Object.assign(session, await validate(db, session.id, parsed.source, wait, limits.collectionBytes), { source: parsed.source, state: "complete" });
      await saveSession(db, session);
      postMessage({ type: "complete", summary: session.summary, bytes: session.read, skipped: parsed.skipped || [], unitLimit: limits.unitBytes });
    } catch (error) {
      postMessage({
        type: "failed",
        message: error.name === "QuotaExceededError" ? "\u8BBE\u5907\u5B58\u50A8\u7A7A\u95F4\u4E0D\u8DB3\uFF0C\u539F\u6570\u636E\u672A\u6539\u52A8" : error.message,
        path: typeof error.path === "string" ? error.path : "",
        offset: typeof error.offset === "number" ? error.offset : 0,
        unitLimit: limits.unitBytes
      });
    } finally {
      clearInterval(heartbeat);
      db?.close();
      running = false;
    }
  };
  postMessage({ type: "ready" });
})();
