/*
 * JADSTACK LOTTO V35 — I18N CACHE / REQUEST LOOP PATCH
 */
(function () {
  'use strict';

  const L = (window.Lotri = window.Lotri || {});
  const I = (L.i18n = L.i18n || {});
  const V = (L.v34 = L.v34 || {});

  const LANGS = ['fr', 'ht', 'en'];
  const LANG_KEY = 'jl:lang';
  const CACHE_PREFIX = 'jl:i18n:dict:v35:';
  const CTX_KEY = 'jl:i18n:context:v35';

  const CACHE_TTL = 7 * 24 * 60 * 60 * 1000;
  const CTX_TTL = 15 * 60 * 1000;

  const memory = Object.create(null);
  const pending = Object.create(null);

  let contextPromise = null;
  let switching = false;
  let bootLocked = false;

  function safeGet(key) {
    try {
      return localStorage.getItem(key);
    } catch (_) {
      return null;
    }
  }

  function safeSet(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch (_) {}
  }

  function safeJsonGet(key) {
    const raw = safeGet(key);
    if (!raw) return null;

    try {
      return JSON.parse(raw);
    } catch (_) {
      return null;
    }
  }

  function safeJsonSet(key, value) {
    try {
      safeSet(key, JSON.stringify(value));
    } catch (_) {}
  }

  function validLang(code) {
    return LANGS.includes(code) ? code : 'fr';
  }

  function currentLang() {
    const saved = safeGet(LANG_KEY);

    if (LANGS.includes(saved)) {
      return saved;
    }

    return validLang(
      I.current ||
      (V.ctx && V.ctx.effective) ||
      'fr'
    );
  }

  function cacheKey(code) {
    return CACHE_PREFIX + validLang(code);
  }

  function readDictCache(code) {
    code = validLang(code);

    if (memory[code]) {
      return memory[code];
    }

    const item = safeJsonGet(cacheKey(code));

    if (
      !item ||
      !item.data ||
      typeof item.data !== 'object'
    ) {
      return null;
    }

    memory[code] = item.data;

    return item.data;
  }

  function writeDictCache(code, data) {
    code = validLang(code);

    if (
      !data ||
      typeof data !== 'object'
    ) {
      return;
    }

    memory[code] = data;

    safeJsonSet(cacheKey(code), {
      version: 35,
      lang: code,
      savedAt: Date.now(),
      data: data
    });
  }

  function isFresh(code) {
    const item = safeJsonGet(
      cacheKey(validLang(code))
    );

    return !!(
      item &&
      item.data &&
      (
        Date.now() -
        Number(item.savedAt || 0)
      ) < CACHE_TTL
    );
  }

  /*
   * Cache translation lookup
   */
  if (
    typeof L.t === 'function' &&
    !L.t.__v35CachePatched
  ) {
    const originalT = L.t;

    const patchedT = function (key, fallback) {
      const d = I._cachedDict;

      if (d && key) {
        let v =
          typeof d[key] === 'string'
            ? d[key]
            : undefined;

        if (v === undefined) {
          v = String(key)
            .split('.')
            .reduce(
              (o, k) =>
                o && o[k] !== undefined
                  ? o[k]
                  : undefined,
              d
            );
        }

        if (
          typeof v === 'string' &&
          v
        ) {
          return v;
        }
      }

      return originalT.call(
        L,
        key,
        fallback
      );
    };

    patchedT.__v35CachePatched = true;

    L.t = patchedT;
  }

  /*
   * Apply cached dictionary immediately.
   */
  function applyCached(code, data) {
    if (!data) {
      return false;
    }

    try {
      I._cachedDict = data;
      I.current = code;

      document.documentElement.lang = code;

      if (typeof I.apply === 'function') {
        I.apply(document);
      }

      try {
        if (
          L.v33 &&
          typeof L.v33.apply === 'function'
        ) {
          L.v33.apply(document.body);
        }
      } catch (_) {}

      return true;

    } catch (_) {
      return false;
    }
  }

  /*
   * Patch I.load
   */
  const originalLoad = I.load;

  if (
    typeof originalLoad === 'function' &&
    !originalLoad.__v35CachePatched
  ) {
    const patchedLoad = async function (
      code,
      opts
    ) {
      code = validLang(code);
      opts = opts || {};

      /*
       * Menm lang lan deja chaje:
       * pa fè okenn request.
       */
      if (
        !opts.force &&
        I.current === code &&
        I._lastLoadedLang === code &&
        I._lastLoadedDict
      ) {
        return I._lastLoadedDict;
      }

      /*
       * Si gen yon request pou lang sa deja,
       * retounen menm Promise la.
       */
      if (
        pending[code] &&
        !opts.force
      ) {
        return pending[code];
      }

      const cached = readDictCache(code);

      /*
       * Cache toujou fre:
       * ZERO RPC.
       */
      if (
        cached &&
        isFresh(code) &&
        !opts.force
      ) {
        I._lastLoadedLang = code;
        I._lastLoadedDict = cached;

        applyCached(
          code,
          cached
        );

        return cached;
      }

      /*
       * Menm si cache ekspire,
       * montre ansyen tradiksyon an touswit.
       */
      if (
        cached &&
        !opts.force
      ) {
        applyCached(
          code,
          cached
        );
      }

      const run = (async () => {
        try {
          const result =
            await originalLoad.call(
              I,
              code
            );

          const data =
            result &&
            typeof result === 'object'
              ? result
              : null;

          if (
            data &&
            Object.keys(data).length
          ) {
            writeDictCache(
              code,
              data
            );

            I._lastLoadedDict =
              data;
          } else if (cached) {
            I._lastLoadedDict =
              cached;
          }

          I._lastLoadedLang =
            code;

          return (
            data ||
            cached ||
            {}
          );

        } catch (err) {

          /*
           * Offline:
           * sèvi ak cache.
           */
          if (cached) {
            applyCached(
              code,
              cached
            );

            I._lastLoadedLang =
              code;

            I._lastLoadedDict =
              cached;

            return cached;
          }

          throw err;

        } finally {
          delete pending[code];
        }
      })();

      pending[code] = run;

      return run;
    };

    patchedLoad.__v35CachePatched =
      true;

    I.load = patchedLoad;
    L.loadLang = patchedLoad;
  }

  /*
   * Cache V34 language context.
   */
  const originalContext =
    typeof V.loadContext === 'function'
      ? V.loadContext
      : null;

  if (
    originalContext &&
    !originalContext.__v35CachePatched
  ) {
    const patchedContext =
      async function (opts) {
        opts = opts || {};

        if (
          contextPromise &&
          !opts.force
        ) {
          return contextPromise;
        }

        if (!opts.force) {
          const cached =
            safeJsonGet(CTX_KEY);

          if (
            cached &&
            cached.data &&
            (
              Date.now() -
              Number(
                cached.savedAt || 0
              )
            ) < CTX_TTL
          ) {
            V.ctx = Object.assign(
              V.ctx || {},
              cached.data
            );

            const eff =
              validLang(
                V.ctx.user_pref ||
                V.ctx.effective ||
                safeGet(LANG_KEY) ||
                'fr'
              );

            safeSet(
              LANG_KEY,
              eff
            );

            return V.ctx;
          }
        }

        contextPromise =
          (async () => {
            try {
              const ctx =
                await originalContext.call(
                  V,
                  opts
                );

              if (
                ctx &&
                typeof ctx === 'object'
              ) {
                safeJsonSet(
                  CTX_KEY,
                  {
                    savedAt: Date.now(),
                    data: ctx
                  }
                );
              }

              return ctx;

            } finally {
              contextPromise = null;
            }
          })();

        return contextPromise;
      };

    patchedContext.__v35CachePatched =
      true;

    V.loadContext =
      patchedContext;
  }

  /*
   * Prevent duplicate language switching.
   */
  const originalSetLang =
    typeof V.setLang === 'function'
      ? V.setLang
      : null;

  if (
    originalSetLang &&
    !originalSetLang.__v35CachePatched
  ) {
    const patchedSetLang =
      async function (
        code,
        opts
      ) {
        code = validLang(code);
        opts = opts || {};

        /*
         * Gen yon switch deja:
         * pa lanse yon lòt.
         */
        if (switching) {
          if (V._switchPromise) {
            return V._switchPromise;
          }
        }

        /*
         * Menm lang:
         * pa fè request.
         */
        if (
          !opts.force &&
          currentLang() === code &&
          I._lastLoadedLang === code
        ) {
          applyCached(
            code,
            readDictCache(code)
          );

          return code;
        }

        switching = true;

        V._switchPromise =
          (async () => {
            try {

              /*
               * Sere lang lokalman an premye.
               */
              safeSet(
                LANG_KEY,
                code
              );

              document.documentElement.lang =
                code;

              const result =
                await originalSetLang.call(
                  V,
                  code,
                  opts
                );

              /*
               * Mete nouvo lang nan context cache.
               */
              safeJsonSet(
                CTX_KEY,
                {
                  savedAt: Date.now(),
                  data: Object.assign(
                    {},
                    V.ctx || {},
                    {
                      user_pref: code,
                      effective: code
                    }
                  )
                }
              );

              return result;

            } finally {
              switching = false;
              V._switchPromise = null;
            }
          })();

        return V._switchPromise;
      };

    patchedSetLang.__v35CachePatched =
      true;

    V.setLang =
      patchedSetLang;
  }

  /*
   * Prevent old V30 picker
   * from creating duplicate calls.
   */
  if (
    L.v30 &&
    typeof L.v30.setLang === 'function' &&
    !L.v30.setLang.__v35CachePatched
  ) {
    const old =
      L.v30.setLang;

    L.v30.setLang =
      function (code) {
        code = validLang(code);

        if (
          currentLang() === code &&
          I._lastLoadedLang === code
        ) {
          return Promise.resolve(code);
        }

        return V.setLang(code);
      };

    L.v30.setLang.__v35CachePatched =
      true;
  }

  /*
   * Manual cache controls.
   */
  L.i18nCache = {

    clear: function (code) {

      if (code) {
        code = validLang(code);

        delete memory[code];

        try {
          localStorage.removeItem(
            cacheKey(code)
          );
        } catch (_) {}

        return;
      }

      LANGS.forEach(function (c) {
        delete memory[c];

        try {
          localStorage.removeItem(
            cacheKey(c)
          );
        } catch (_) {}
      });

      try {
        localStorage.removeItem(
          CTX_KEY
        );
      } catch (_) {}
    },

    status: function () {
      return {
        lang: currentLang(),

        cached: LANGS.reduce(
          function (o, c) {
            o[c] =
              !!readDictCache(c);

            return o;
          },
          {}
        ),

        contextCached:
          !!safeJsonGet(CTX_KEY)
      };
    }
  };

  /*
   * Premye load:
   * si cache egziste,
   * itilize li touswit.
   */
  function warmStart() {

    if (bootLocked) {
      return;
    }

    bootLocked = true;

    const code =
      currentLang();

    const cached =
      readDictCache(code);

    if (cached) {
      applyCached(
        code,
        cached
      );
    }
  }

  if (
    document.readyState ===
    'loading'
  ) {
    document.addEventListener(
      'DOMContentLoaded',
      warmStart,
      { once: true }
    );
  } else {
    warmStart();
  }

  console.info(
    '[JADSTACK] I18N V35 cache patch active'
  );

})();