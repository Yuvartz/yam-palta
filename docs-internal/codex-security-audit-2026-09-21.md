מצאתי **XSS ממשי במסלול שמות החופים**, אפשרות לשליחת בקשות שרת ליעדים לא מאושרים, והגנה חסרה מפני ניצול שירות ההתראות. **לא נמצא ממצא קריטי מבוסס.**

הבדיקה כללה קריאה מלאה של הקבצים שביקשת, בדיקות מבודדות בזיכרון ומבחני המדיניות הקיימים — **10/10 עברו**. לא שיניתי קבצים ולא שלחתי התראות אמיתיות. הגישה לאתר ול־Worker החי נכשלה, ולכן הממצאים מתייחסים לקוד המקומי, לא לאימות הפריסה.

מספרי השורות להלן הם בקבצים המקוריים, לפני יישום ההצעות. במהלך הבדיקה נוסף מבחוץ SRI לטעינת QR בשורה 2356; התייחסתי לשינוי הזה, אך לא הצלחתי לאמת את ה־hash מול קובץ ה־CDN.

**1. גבוה — XSS בשם חוף לאחר הרשמה להתראות**

מיקום: [docs/index.html:2805](E:/AIBOMBA/6_YamPlata_v2/weather-app/docs/index.html:2805). מקורות הקלט: שורות 2995, 3025, 3033–3035; שמירה נוספת בשורה 2837.

שמות החופים עוברים escaping בכפתורי המיקום ובבאנר, אבל `refreshNotifyBtn()` משבץ את `rec.name || beachName` ישירות ב־`innerHTML`.

Payload קצר שעובר גם את מגבלת 60 התווים של ה־Worker:

```html
<img src=x onerror=alert(1)>
```

מסלול: הוספת חוף בשם הזה → הרשמה מוצלחת להתראות → רינדור `notifyHelp`. שם שמוחזר מ־Nominatim יכול לעבור באותו מסלול לאחר שהמשתמש מאשר הוספה.

בהקלדה עצמית מדובר ב־self-XSS; מקור Nominatim מוסיף גבול אמון חיצוני. לא מצאתי קישור `?b=` שמזריק לבדו שם שרירותי למכשיר חדש.

ההשפעה כאן: גישה לנתוני המיקומים המקומיים, למנוי ה־Push, לתוכן הדף ולפעולות האפליקציה תחת `yamplata.com`. אין בקוד הדפדפן מפתח VAPID פרטי לגניבה.

**תיקון מדויק בשורה 2805:**

```diff
- ${rec.name || beachName}
+ ${esc(rec.name || beachName)}
```

זהו שינוי של הביטוי בתוך אותה תבנית בלבד. `textContent` בשורה 2799 כבר בטוח.

---

**2. גבוה — יעד ה־Push מאפשר בקשות שרת לכתובת HTTPS שרירותית**

מיקום: [workers/push/src/index.js:31](E:/AIBOMBA/6_YamPlata_v2/weather-app/workers/push/src/index.js:31), שורות 35–38, 110–119, 127–142.

`validSub()` מאמת רק תחילית `https://` וקיום מחרוזות. משתמש יכול לרשום endpoint בשליטתו עם מפתחות הצפנה תקינים ולגרום ל־Worker לבצע אליו POST באמצעות `/test` או ה־cron. בנוסף, `fetch()` אינו אוסר הפניות.

זה **SSRF/ניצול בקשות יוצאות**, אך לא הוכחה לגישה לרשת פנימית או לשירות metadata של Cloudflare. גוף הבקשה הוא הודעת Push מוצפנת, לא גוף שרירותי; המפתח הפרטי אינו נשלח.

**החלף את `validSub` בשורה 31:**

```js
function pushEndpoint(value) {
  if (typeof value !== "string" || value.length > 2048) return null;
  try {
    const u = new URL(value);
    const h = u.hostname;
    const allowed =
      h === "fcm.googleapis.com" ||
      h === "updates.push.services.mozilla.com" ||
      h.endsWith(".push.apple.com") ||
      h.endsWith(".notify.windows.com");

    if (
      u.protocol !== "https:" || !allowed ||
      u.username || u.password || u.port || u.hash
    ) return null;

    return u;
  } catch {
    return null;
  }
}

function decodeKey(value, bytes) {
  if (typeof value !== "string" || !/^[A-Za-z0-9_-]+$/.test(value))
    return null;
  try {
    const s = value.replace(/-/g, "+").replace(/_/g, "/");
    const out = Uint8Array.from(
      atob(s + "=".repeat((4 - s.length % 4) % 4)),
      c => c.charCodeAt(0)
    );
    return out.length === bytes ? out : null;
  } catch {
    return null;
  }
}

async function validSub(s) {
  if (!s || !pushEndpoint(s.endpoint)) return false;
  const auth = decodeKey(s.keys?.auth, 16);
  const publicKey = decodeKey(s.keys?.p256dh, 65);
  if (!auth || !publicKey || publicKey[0] !== 4) return false;
  try {
    await crypto.subtle.importKey(
      "raw", publicKey,
      { name: "ECDH", namedCurve: "P-256" },
      false, []
    );
    return true;
  } catch {
    return false;
  }
}
```

בשורות 112 ו־129 החלף `validSub(sub)` ב־`await validSub(sub)`.

בתחילת `sendPush()` הוסף בדיקה גם לרשומות שכבר נמצאות ב־KV:

```js
if (!(await validSub(sub))) throw new Error("invalid subscription");
```

החלף שורה 38:

```js
const res = await fetch(sub.endpoint, {
  ...init,
  redirect: "error",
  signal: AbortSignal.timeout(8000),
});
```

רשימת הספקים צריכה להיבדק מול המכשירים הנתמכים בפועל; אין להרחיבה ל־`*.google.com` או לכל HTTPS כדי לפתור בעיית תאימות. Apple מתעדת את תחום `*.push.apple.com`; Mozilla מתעדת את endpoint שלה. [Apple](https://developer.apple.com/documentation/usernotifications/sending-web-push-notifications-in-web-apps-and-browsers), [Mozilla](https://mozilla-services.github.io/autopush-rs/http.html).

---

**3. גבוה — `/test` ללא אימות בעלות וללא הגבלת קצב; גם פעולות הניהול מסתפקות ב־endpoint**

מיקום: [workers/push/src/index.js:110](E:/AIBOMBA/6_YamPlata_v2/weather-app/workers/push/src/index.js:110), שורות 122–143.

מי שמכיר endpoint רשום יכול:

- להפעיל `/test` שוב ושוב, בלי לדעת את מפתחות המנוי.
- למחוק אותו באמצעות `/unsubscribe`.
- להעביר את הרשומה באמצעות `/rotate`.
- לדרוס מפתחות ומיקום באמצעות `/subscribe`.

**הסתייגות חשובה:** endpoints הם כתובות ארוכות שקשה לנחש; לא נמצא API שחושף את הרשימה. זהו ניצול לאחר דליפת endpoint, ולא ספאם לכל אדם לפי מספר טלפון. תג ההתראה הקבוע עשוי לגרום למערכת ההפעלה להחליף התראות, אך אינו מגביל שליחות.

פתרון מצומצם שמתאים למבנה הנוכחי: לדרוש גם את סוד `subscription.keys.auth` לפעולות ניהול, ולהגן על עדכון רשומה קיימת. זה מגן מפני דליפת endpoint בלבד; דליפת **כל** אובייקט המנוי עדיין נותנת את ההרשאה.

הוסף ליד פונקציות העזר:

```js
function sameAuth(a, b) {
  const x = decodeKey(a, 16), y = decodeKey(b, 16);
  if (!x || !y) return false;
  let different = 0;
  for (let i = 0; i < 16; i++) different |= x[i] ^ y[i];
  return different === 0;
}
```

אחרי קריאת `prev` בשורה 115:

```js
if (prev && (
  !sameAuth(sub.keys.auth, prev.sub?.keys?.auth) ||
  sub.keys.p256dh !== prev.sub?.keys?.p256dh
)) {
  return json({ error: "forbidden" }, 403, headers);
}
```

החלף את תוכן `/unsubscribe`:

```js
if (!pushEndpoint(body.endpoint))
  return json({ error: "bad endpoint" }, 400, headers);

const k = await keyFor(body.endpoint);
const rec = await env.SUBS.get(k, "json");
if (!rec || !sameAuth(body.auth, rec.sub?.keys?.auth))
  return json({ error: "forbidden" }, 403, headers);

await env.SUBS.delete(k);
return json({ ok: true }, 200, headers);
```

ב־`/test`, החלף את בדיקת `!rec` בשורה 140:

```js
if (!rec || !sameAuth(body.auth, rec.sub?.keys?.auth))
  return json({ error: "forbidden" }, 403, headers);

if (!(await env.TEST_LIMIT.limit({
  key: await keyFor(body.endpoint)
})).success) {
  return json({ error: "rate limited" }, 429, {
    ...headers, "retry-after": "60",
  });
}
```

ה־binding מופיע בסעיף הבא. עד שההקשחה בצד השרת והלקוח נפרסת יחד, אפשר לסגור זמנית את `/test` באמצעות החזרת `404` בתחילת המסלול.

ב־`/rotate`, אחרי קריאת הרשומה הישנה, **החלף את שורות 131–133**:

```js
if (!prev || !sameAuth(body.oldAuth, prev.sub?.keys?.auth))
  return json({ error: "forbidden" }, 403, headers);

const newK = await keyFor(sub.endpoint);
const occupied = newK === oldK
  ? prev
  : await env.SUBS.get(newK, "json");

if (occupied && (
  !sameAuth(sub.keys.auth, occupied.sub?.keys?.auth) ||
  sub.keys.p256dh !== occupied.sub?.keys?.p256dh
)) {
  return json({ error: "conflict" }, 409, headers);
}

prev.sub = {
  endpoint: sub.endpoint,
  keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth },
};
prev.updatedAt = new Date().toISOString();
await env.SUBS.put(newK, JSON.stringify(prev));
if (newK !== oldK) await env.SUBS.delete(oldK);
```

השורה האחרונה מתקנת גם באג שאומת בבדיקה: כיום rotation לאותו endpoint כותב את הרשומה ואז מוחק אותה.

**שינויי הלקוח הנלווים:**

ב־`docs/index.html`, לפני הבקשה בשורה 2708:

```js
const registration = await navigator.serviceWorker.ready;
const subscription = await registration.pushManager.getSubscription();
if (!subscription || subscription.endpoint !== rec.endpoint)
  throw new Error("subscription mismatch");
```

גוף הבקשה בשורה 2708:

```js
body: JSON.stringify({
  endpoint: subscription.endpoint,
  auth: subscription.toJSON().keys.auth,
})
```

גוף `/unsubscribe` בשורה 2846:

```js
body: JSON.stringify({
  endpoint: sub.endpoint,
  auth: sub.toJSON().keys.auth,
})
```

ב־[docs/sw.js:172](E:/AIBOMBA/6_YamPlata_v2/weather-app/docs/sw.js:172), גוף `/rotate`:

```js
body: JSON.stringify({
  oldEndpoint: e.oldSubscription.endpoint,
  oldAuth: e.oldSubscription.toJSON().keys.auth,
  subscription: sub.toJSON(),
})
```

אין לשמור את `auth` בלוגים או לשלוח אותו ל־analytics.

---

**4. גבוה — אפשרות למיצוי מכסות ה־Worker וה־KV**

מיקום: [workers/push/src/index.js:108](E:/AIBOMBA/6_YamPlata_v2/weather-app/workers/push/src/index.js:108), שורות 119, 151–168; [wrangler.toml:15](E:/AIBOMBA/6_YamPlata_v2/weather-app/workers/push/wrangler.toml:15).

אין הגבלת קצב או גודל JSON. אפשר להוסיף רשומות רבות; קואורדינטות שונות גוררות תחזיות נוספות ב־cron.

בנוסף, ה־cron כותב כל רשומה בכל ריצה: **96 כתיבות ביום למנוי**. בהנחת ריצות מוצלחות, **11 מנויים = 1,056 כתיבות**, עוד לפני הרשמות. במסלול החינמי מכסת KV היא 1,000 כתיבות ביום. [מגבלות KV](https://developers.cloudflare.com/kv/platform/limits/).

**הגבלת קצב ראשונית — להוסיף ל־`wrangler.toml`:**

```toml
[[ratelimits]]
name = "API_LIMIT"
namespace_id = "913370"
simple = { limit = 60, period = 60 }

[[ratelimits]]
name = "WRITE_LIMIT"
namespace_id = "913371"
simple = { limit = 10, period = 60 }

[[ratelimits]]
name = "TEST_LIMIT"
namespace_id = "913372"
simple = { limit = 1, period = 60 }
```

יש להקצות מזהי namespace ייחודיים בחשבון. אחרי טיפול ב־OPTIONS וב־health המצומצם, ולפני גישה לרשת או ל־KV:

```js
const ip = req.headers.get("CF-Connecting-IP");
if (!ip) return json({ error: "missing client address" }, 400, headers);

const limiter = req.method === "POST" ? env.WRITE_LIMIT : env.API_LIMIT;
if (!(await limiter.limit({ key: ip })).success) {
  return json({ error: "rate limited" }, 429, {
    ...headers, "retry-after": "60",
  });
}
```

זהו סף התחלתי, עם התאמה לפי שימוש אמיתי: כתובות IP משותפות נפוצות ברשת סלולרית. ה־binding מקומי למרכז הנתונים ועקבי בהשהיה; הוא אינו מכסה עולמית קשיחה. גרסת Wrangler הנעולה בריפו תומכת בו. [תיעוד Rate Limiting](https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/).

**הגבלת גוף הבקשה — הוסף עזר והשתמש בו במקום `req.json()`:**

```js
async function readJsonLimited(req, max = 8192) {
  const type = (req.headers.get("content-type") || "")
    .split(";")[0].trim().toLowerCase();

  if (type !== "application/json") throw 415;
  if (!req.body) throw 400;

  const reader = req.body.getReader();
  const buffer = new Uint8Array(max);
  let size = 0;

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (size + value.byteLength > max) {
        await reader.cancel();
        throw 413;
      }
      buffer.set(value, size);
      size += value.byteLength;
    }
  } finally {
    reader.releaseLock();
  }

  const body = JSON.parse(
    new TextDecoder("utf-8", { fatal: true })
      .decode(buffer.subarray(0, size))
  );
  if (!body || typeof body !== "object" || Array.isArray(body)) throw 400;
  return body;
}
```

החלפת שורה 108:

```js
let body;
try {
  body = await readJsonLimited(req);
} catch (e) {
  return json(
    { error: "invalid request body" },
    [400, 413, 415].includes(e) ? e : 400,
    headers
  );
}
```

זה גם מתקן `POST` עם JSON מסוג `null`, שכיום גורם לחריגה לא מטופלת.

**צמצום הכתיבות הקבועות — החלף שורות 167–168:**

```js
const policyState = s => JSON.stringify({
  lastCalm: s?.lastCalm ?? false,
  lastScore: s?.lastScore ?? null,
  sent: s?.sent ?? [],
});

if (policyState(rec.state) !== policyState(state)) {
  rec.state = state;
  rec.updatedAt = new Date().toISOString();
  await env.SUBS.put(k, JSON.stringify(rec));
}
```

התיקון מפחית כתיבות, אך אינו מבטיח התאמה למכסה בכל גודל קהל.

אסטרטגיית ההגנה המומלצת:

| אפשרות | התאמה לאפליקציה |
|---|---|
| מוני KV לפי IP | הגבלה רכה בלבד. `get` ואז `put` אינם אטומיים, קיימת מגבלת כתיבה לאותו מפתח, וכל בקשה עלולה לצרוך מכסה. לא להסתמך עליהם כהגנה הראשית. |
| Rate Limiting binding | בלימת פרצים בלי כתיבת מונה ל־KV בכל בקשה. לשלב IP רחב ו־endpoint מאומת ב־`/test`. |
| Turnstile | בהרשמה ראשונה ובפעולת בדיקה יזומה. לא ב־`pushsubscriptionchange` שרץ ברקע. השרת חייב לבדוק `success`, ‏`hostname` ו־`action`; widget לבדו אינו הגנה. |
| WAF | שימושי לפני הפעלת ה־Worker, דרך hostname תחת zone שבשליטתך. כלל ב־zone של `yamplata.com` אינו מגן אוטומטית על כתובת `workers.dev`. |
| Durable Object | מתאים לתקרה קשיחה לפי מנוי, מניעת מרוצים ואחסון מצב עקבי. |

במעבר ל־WAF דרך דומיין API פרטי לפרויקט, יש לסגור את מסלול `workers.dev` החלופי ולעדכן את שתי כתובות ה־API בלקוח. WAF Free מגביל את שדות הכללים; אין להעתיק כלל Enterprise שאינו זמין במסלול. [WAF](https://developers.cloudflare.com/waf/rate-limiting-rules/), [Turnstile](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/).

עוד שתי מגבלות: אין pagination מעבר ל־1,000 מנויים, וההבטחה ב־`policy.js:10`–11 למניעת כפילויות בריצות חופפות אינה מובטחת על KV. המבחנים בודקים הפעלות עוקבות, לא תחרות בין Workers. [עקביות KV](https://developers.cloudflare.com/kv/concepts/how-kv-works/).

---

**5. בינוני — `/expand` מאמת רק את ההפניה הראשונה**

מיקום: [workers/push/src/index.js:82](E:/AIBOMBA/6_YamPlata_v2/weather-app/workers/push/src/index.js:82), שורות 85–94.

הרשימה הראשונית מדויקת מבחינת hostname, אבל כל `Location` לאחר מכן מתקבל בלי בדיקת host, protocol, credentials או port.

בדיקה מבודדת עם תגובת `302` מדומה מ־`maps.app.goo.gl` אל `https://outside.example/a` אישרה שהקוד מבצע את הבקשה השנייה. לא נבדק קישור Google חי שמאפשר זאת, ולכן ניצול חיצוני תלוי בהפניה ניתנת לשליטה אצל אחד המארחים המותרים.

**החלף את גוף מסלול `/expand` בשורות 83–94:**

```js
if (!originOk) return json({ error: "origin not allowed" }, 403, headers);

const shortHosts = new Set(["maps.app.goo.gl", "goo.gl", "g.co"]);
const mapHosts = new Set([
  "maps.google.com", "www.google.com", "google.com",
  "maps.apple.com", "waze.com", "www.waze.com", "ul.waze.com",
]);

function allowedMapUrl(value, base) {
  const u = new URL(value, base);
  if (
    u.href.length > 4096 ||
    u.protocol !== "https:" || u.username || u.password || u.port
  ) throw new Error("bad URL");

  if (!shortHosts.has(u.hostname) && !mapHosts.has(u.hostname))
    throw new Error("bad host");

  // Do not expose generic Google redirect endpoints such as /url.
  if (
    ["www.google.com", "google.com"].includes(u.hostname) &&
    !/^\/maps(?:\/|$)/.test(u.pathname)
  ) throw new Error("bad path");

  return u;
}

try {
  let cur = allowedMapUrl(url.searchParams.get("u") || "");
  const seen = new Set();
  const signal = AbortSignal.timeout(8000);

  for (let hop = 0; hop < 6; hop++) {
    if (seen.has(cur.href)) throw new Error("redirect loop");
    seen.add(cur.href);

    const r = await fetch(cur.href, {
      redirect: "manual",
      signal,
      headers: { "user-agent": "YamPlata/1.0 (+https://yamplata.com)" },
    });
    const location = r.headers.get("location");
    await r.body?.cancel();

    if ([301, 302, 303, 307, 308].includes(r.status)) {
      if (!location) throw new Error("missing location");
      cur = allowedMapUrl(location, cur);
      continue;
    }

    if (!r.ok) throw new Error("upstream error");
    return json({ url: cur.href }, 200, headers);
  }
  return json({ error: "too many redirects" }, 400, headers);
} catch {
  return json({ error: "link cannot be expanded" }, 400, headers);
}
```

כתובות מפות מקומיות נוספות, אם יידרשו, יש להוסיף במפורש. עדיף שקישור לא נתמך ייכשל מאשר להרחיב ל־hostname שרירותי.

---

**6. נמוך — משטחי XSS נוספים דורשים כתיבה מוקדמת ל־localStorage**

מיקום: [docs/index.html:1106](E:/AIBOMBA/6_YamPlata_v2/weather-app/docs/index.html:1106), שורות 1426–1428, 2075–2076, 2105–2106.

שני מקרים:

- מפתח ברשומת `yp-locs` משובץ בתוך JavaScript של `onclick`. מפתח כמו `x');alert(1);//` מריץ קוד בלחיצה.
- `avgMax`, ‏`day` ו־`years` מתוך מטמון האקלים משובצים ללא escaping. למשל `avgMax` שמכיל `<img src=x onerror=alert(1)>`.

לא נמצא מסלול רגיל שנותן לתוקף מרוחק לכתוב את המפתחות האלה; אין לדרג זאת כמו ה־XSS בשם החוף. עם זאת, הם מאפשרים התמדה לאחר הזרקה אחרת.

**לפני `LS`, הוסף:**

```js
const validLocKey = k =>
  typeof k === "string" &&
  /^[a-z][a-z0-9_-]{0,39}$/.test(k) &&
  !["__proto__", "prototype", "constructor"].includes(k);
```

**החלף את getter של `customs`:**

```js
get customs() {
  try {
    const value = JSON.parse(localStorage.getItem("yp-locs") || "{}");
    if (!value || typeof value !== "object" || Array.isArray(value))
      return {};

    return Object.fromEntries(
      Object.entries(value).filter(([k, v]) =>
        validLocKey(k) &&
        !Object.hasOwn(BUILTIN, k) &&
        v && typeof v.name === "string" &&
        v.name.trim().length > 0 && v.name.length <= 60 &&
        Number.isFinite(v.lat) && Math.abs(v.lat) <= 90 &&
        Number.isFinite(v.lon) && Math.abs(v.lon) <= 180
      )
    );
  } catch {
    return {};
  }
},
```

בשורה 3034 הוסף לתנאי הדחייה:

```js
name.length > 60
```

בשורות 2105–2106 החלף את הביטויים:

```js
${d.avgMax}  → ${esc(d.avgMax)}
${d.day}     → ${esc(d.day)}
${d.years}   → ${esc(d.years)}
```

**פרמטר `?b=`:** לא נמצא reflected XSS. כן מתקבלים בטעות שמות תכונות מורשות כגון `constructor`, שעלולים לשבש את בחירת החוף. החלף שורות 2388–2390:

```js
const k = new URLSearchParams(location.search).get("b");
if (!validLocKey(k)) return;

if (Object.hasOwn(PRESETS, k) && !Object.hasOwn(LS.customs, k)) {
  const c = LS.customs;
  c[k] = { ...PRESETS[k] };
  LS.customs = c;
}
if (Object.hasOwn(allLocations(), k)) LS.loc = k;
```

---

**7. נמוך — CORS תקין בעיקרו; `/health` חושף מידע וצורך פעולת KV**

מיקום: [workers/push/src/index.js:25](E:/AIBOMBA/6_YamPlata_v2/weather-app/workers/push/src/index.js:25), שורות 79, 96–107; [wrangler.toml:26](E:/AIBOMBA/6_YamPlata_v2/weather-app/workers/push/wrangler.toml:26).

מה תקין:

- השוואת Origin היא התאמה מלאה, לא `includes` חלקי של hostname.
- אין `Access-Control-Allow-Origin: *` עם credentials.
- POST ו־`/expand` דוחים Origin שאינו ברשימה.
- `Origin: null` אינו מורשה.

אבל CORS אינו אימות זהות: לקוח שאינו דפדפן יכול להציב `Origin: https://yamplata.com`. הוספת בדיקת Origin לבדה לא מתקנת את סעיפים 2–4.

`/health` ציבורי, מקבל גם שיטות שאינן GET, מבצע `KV.list`, וחושף מספר רשומות ודגלי תצורה. הוא **אינו חושף מפתחות או endpoints**, והמספר גם אינו מדויק מעל 1,000 רשומות.

**החלף את מסלול health:**

```js
if (url.pathname === "/health") {
  if (req.method !== "GET")
    return json({ error: "method" }, 405, { ...headers, allow: "GET" });
  return json({ ok: true }, 200, {
    ...headers, "cache-control": "no-store",
  });
}
```

להקשחת production, החלף `ALLOWED_ORIGINS`:

```toml
ALLOWED_ORIGINS = "https://yamplata.com,https://www.yamplata.com"
```

localhost ו־GitHub Pages הישן צריכים להיות בהגדרות סביבת פיתוח נפרדת, אם עדיין נדרשים.

הוסף לכותרות ברירת המחדל של `json()`:

```js
"cache-control": "no-store",
"x-content-type-options": "nosniff",
"vary": "Origin",
```

**`/buoy`: לא נמצא SSRF נשלט משתמש.** הקואורדינטות בוחרות מבין שתי כתובות קבועות; הן אינן הופכות לכתובת fetch. היעדר בדיקת Origin כאן הוא גישה ציבורית לנתונים, לא עקיפת אימות לחשבון.

הקשחה מדויקת בשורות 97–98:

```js
const latRaw = url.searchParams.get("lat");
const lonRaw = url.searchParams.get("lon");
const lat = Number(latRaw), lon = Number(lonRaw);

if (
  !latRaw?.trim() || !lonRaw?.trim() ||
  !Number.isFinite(lat) || !Number.isFinite(lon) ||
  Math.abs(lat) > 90 || Math.abs(lon) > 180
) return json({ error: "bad coords" }, 400, headers);
```

בשורה 60 הוסף לאפשרויות `fetch`:

```js
redirect: "error",
signal: AbortSignal.timeout(8000),
```

---

**8. נמוך — SW מחליף את מטמון הבית בכל ניווט; יעד התראה אינו מוגבל**

מיקום: [docs/sw.js:106](E:/AIBOMBA/6_YamPlata_v2/weather-app/docs/sw.js:106), שורות 114, 117–119, 136, 179.

**מטמון:** כל ניווט שמחזיר 2xx נשמר בשם `"./"`, כולל `/tel-aviv/` או `/en/`. ביקור בדף כזה יכול לגרום להצגת דף אחר במקום האפליקציה כשאין רשת. לא נמצאה דרך עצמאית להרעיל מטמון של משתמש אחר או להזריק תוכן חוצה־מקור באתר הסטטי הנוכחי.

בתוך מסלול הניווט, לפני `e.respondWith`, הוסף:

```js
const scopeUrl = new URL(self.registration.scope);
const appPaths = new Set([
  scopeUrl.pathname,
  new URL("index.html", scopeUrl).pathname,
]);

if (url.origin !== scopeUrl.origin || !appPaths.has(url.pathname)) return;
```

החלף שורה 114:

```js
const finalUrl = new URL(res.url);
if (
  !res.redirected &&
  finalUrl.origin === scopeUrl.origin &&
  appPaths.has(finalUrl.pathname) &&
  /^text\/html\b/i.test(res.headers.get("content-type") || "")
) {
  e.waitUntil(caches.open(SHELL_CACHE).then(c => c.put("./", copy)));
}
```

ב־fallback השתמש במטמון המסוים, במקום בחיפוש בכל מטמוני המקור:

```js
const cache = await caches.open(SHELL_CACHE);
const hit = (await cache.match(req)) || (await cache.match("./"));
```

בשורה 136 החלף את בדיקת הסיומת:

```js
if (new Set([
  "api.open-meteo.com",
  "marine-api.open-meteo.com",
]).has(url.hostname)) {
  e.respondWith(networkFirst(e, req, API_CACHE, API_CACHE_MAX));
  return;
}
```

`endsWith("open-meteo.com")` הנוכחי מתאים גם ל־`evilopen-meteo.com`; לא נמצא שהאפליקציה מבקשת כיום כתובת כזו.

**notificationclick:** ניתן לפתוח URL חיצוני מתוך payload. כרגע ה־Worker יוצר URL מ־`APP_URL` קבוע ומ־`encodeURIComponent(beach.key)`, ולכן לא נמצא open redirect שניתן להפעיל באמצעות `?b=` בלבד. זו הקשחה נגד שולח Push שנפרץ או שימוש לרעה לאחר XSS.

החלף שורה 179:

```js
const base = new URL(self.registration.scope);
const safe = new URL(base.href);

try {
  const raw = e.notification.data?.url;
  const candidate = new URL(typeof raw === "string" ? raw : "./", base);
  const paths = [base.pathname, new URL("index.html", base).pathname];

  if (
    candidate.origin === base.origin &&
    candidate.protocol === "https:" &&
    !candidate.username && !candidate.password &&
    paths.includes(candidate.pathname)
  ) {
    const beach = candidate.searchParams.get("b");
    if (beach && /^[a-z0-9_-]{1,40}$/i.test(beach))
      safe.searchParams.set("b", beach);
  }
} catch {}

const target = safe.href;
```

לאחר תיקוני SW יש להעלות את `VERSION`.

---

**9. בינוני — Actions עם תגיות משתנות והרשאת כתיבה לאורך כל העבודה**

מיקום: [beach-pages.yml:10](E:/AIBOMBA/6_YamPlata_v2/weather-app/.github/workflows/beach-pages.yml:10), [buoy.yml:8](E:/AIBOMBA/6_YamPlata_v2/weather-app/.github/workflows/buoy.yml:8), [jellyfish.yml:8](E:/AIBOMBA/6_YamPlata_v2/weather-app/.github/workflows/jellyfish.yml:8).

לא נמצא script injection:

- אין הכנסת כותרת issue, גוף PR או תוכן scrape לתוך `run`.
- הנתונים נשמרים באמצעות `JSON.stringify`/`writeFile`, ואינם מורצים כ־shell.
- הטריגרים הם schedule ו־workflow_dispatch, ללא `pull_request_target`.

הסיכון הוא שרשרת אספקה: `@v4` ניתן להזזה, ו־checkout משאיר credentials זמינים לפקודות הבאות.

**בשלושת הקבצים החלף:**

```yaml
permissions:
  contents: read
```

ברמת ה־job שמבצע commit:

```yaml
if: github.ref == 'refs/heads/master'
permissions:
  contents: write
timeout-minutes: 10
```

החלף את שני ה־actions:

```yaml
- uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683 # v4.2.2
  with:
    ref: master
    persist-credentials: false

- uses: actions/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020 # v4.4.0
  with:
    node-version: 22
```

אלה commits מאומתים של קו v4, לא טענה שהם הגרסאות החדשות ביותר. מומלץ לעדכן pins דרך Dependabot. [checkout commit](https://github.com/actions/checkout/commit/11bd71901bbe5b1630ceea73d27597364c9af683), [setup-node commit](https://github.com/actions/setup-node/commit/49933ea5288caeca8642d1e84afbd3f7d6820020).

מכיוון ש־credentials אינם נשמרים, בשלב ה־commit בלבד הוסף:

```yaml
env:
  GH_TOKEN: ${{ github.token }}
```

ובתחילת `run` של אותו שלב:

```bash
auth="$(printf 'x-access-token:%s' "$GH_TOKEN" | base64 -w0)"
echo "::add-mask::$auth"
export GIT_CONFIG_COUNT=1
export GIT_CONFIG_KEY_0=http.https://github.com/.extraheader
export GIT_CONFIG_VALUE_0="AUTHORIZATION: basic $auth"
```

כך `git pull` ו־`git push` הקיימים ממשיכים לעבוד בלי credential קבוע ב־checkout.

זה מצמצם חשיפה, אך הרשאות הן ברמת job. לבידוד חזק יותר יש לפצל יצירת נתונים ל־job בעל `contents: read`, ולהעביר ל־job הכותב רק artifacts מאומתים עם רשימת נתיבים סגורה. [הנחיות GitHub](https://docs.github.com/en/actions/reference/security/secure-use).

זהות commit אינה הרשאה. אפשר לאחד בשלושת הקבצים:

```bash
git config user.name "github-actions[bot]"
git config user.email "41898282+github-actions[bot]@users.noreply.github.com"
```

---

**10. בינוני — סקריפט analytics חיצוני ללא SRI; CSP מוגבל כרגע בגלל inline handlers**

מיקום: [docs/index.html:2356](E:/AIBOMBA/6_YamPlata_v2/weather-app/docs/index.html:2356), שורה 2408; Google Fonts בשורה 58.

- **QR:** בתחילת הבדיקה לא היה SRI; בסיום כבר קיים שינוי מקומי עם `integrity` ו־`crossOrigin`. התאמת ה־hash לא אומתה.
- **GoatCounter:** `https://gc.zgo.at/count.js` נטען ללא SRI ויכול להשתנות. לקוד כזה יש אותן הרשאות DOM כמו לקוד האפליקציה. אין ראיה שהספק נפרץ.
- **Google Fonts:** ה־CSS אינו מקובע ב־SRI; זה אינו script עם הרשאות JavaScript. התוכן עשוי להשתנות לפי לקוח, ולכן אירוח מקומי של CSS ו־WOFF2 מתאים יותר לקיבוע.

ל־GoatCounter אפשר להוסיף SRI לאחר בדיקת גרסה. קוד זה **מדפיס בלבד** את שתי שורות ההקשחה מתוך הבייטים שהורדו:

```js
const response = await fetch("https://gc.zgo.at/count.js");
if (!response.ok) throw new Error(`HTTP ${response.status}`);

const bytes = new Uint8Array(await response.arrayBuffer());
const { createHash } = await import("node:crypto");
const hash = createHash("sha384").update(bytes).digest("base64");

console.log(`s.integrity = "sha384-${hash}";`);
console.log('s.crossOrigin = "anonymous";');
```

יש לבדוק את הקובץ שהורד מול גרסת upstream שנבחרה, ואז להוסיף את השורות לפני `appendChild` בשורה 2410. חישוב hash אוטומטי מחדש בכל טעינה אינו SRI מועיל. שינוי עתידי בסקריפט יפסיק את analytics עד לעדכון מאושר — זהו כשל סגור צפוי.

**CSP ב־meta אפשרי, אבל nonce קבוע באתר סטטי אינו פתרון.** nonce אמיתי צריך להיות בלתי צפוי ושונה בכל תגובה. Hash מתאים ל־inline script קבוע, אך אינו מאשר אוטומטית `onclick`, ‏`onerror`, ‏`onkeydown` ו־`ontouch*`. הם קיימים גם בתבניות הדינמיות.

מדיניות ביניים אפשרית, מיד אחרי `<meta charset>`:

```html
<meta http-equiv="Content-Security-Policy" content="
  default-src 'none';
  base-uri 'none';
  object-src 'none';
  script-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com https://gc.zgo.at;
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
  font-src 'self' https://fonts.gstatic.com;
  img-src 'self' data: blob: https://yuvartz.goatcounter.com;
  media-src 'self' blob:;
  connect-src 'self'
    https://api.open-meteo.com
    https://marine-api.open-meteo.com
    https://nominatim.openstreetmap.org
    https://yam-palata-push.yam-palata-push.workers.dev
    https://yuvartz.goatcounter.com
    https://docs.google.com;
  worker-src 'self';
  frame-src 'none';
  form-action 'none';
  upgrade-insecure-requests;
">
<meta name="referrer" content="strict-origin">
```

**המדיניות הזו אינה חוסמת את payload ה־XSS שבסעיף 1**, משום ש־`unsafe-inline` עדיין דרוש למבנה הנוכחי. היא כן מצמצמת מקורות טעינה וחיבורים ומונעת הזרקת `<base>`.

כדי להגיע למדיניות חזקה:

1. להעביר את כל event attributes ל־`addEventListener`, גם אלה שנוצרים בתבניות.
2. לאשר את בלוק `App` באמצעות hash שנוצר אחרי כל שינוי, או להעבירו לקובץ עצמי.
3. להסיר `unsafe-inline` מ־`script-src` ולהוסיף `script-src-attr 'none'`.
4. אפשר להשאיר בשלב ראשון `unsafe-inline` רק ל־styles, בגלל העיצוב הדינמי.

אין צורך ב־`eval` בקוד שנבדק. שימוש ב־`unsafe-hashes` אפשרי טכנית, אבל אינו בחירה טובה כאן בגלל ריבוי handlers דינמיים. [תיעוד CSP scripts](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/script-src).

**`frame-ancestors` אינו נתמך ב־meta.** גם `X-Frame-Options` אינו נהפך לכותרת HTTP באמצעות meta. לכן, במסגרת GitHub Pages כפי שהוגדרה, אין פתרון מלא נגד framing. `upgrade-insecure-requests` אינו תחליף לכך; headers כאלה דורשים שכבת הגשה/פרוקסי שמאפשרת אותם. [תיעוד frame-ancestors](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/frame-ancestors).

אם משלבים Turnstile, צריך לעדכן גם את CSP לטעינה ול־frame של `challenges.cloudflare.com`.

---

**11. בינוני — סביבת preview מצביעה ל־KV של production; כיסוי חלקי של קובצי סודות**

מיקום: [workers/push/wrangler.toml:19](E:/AIBOMBA/6_YamPlata_v2/weather-app/workers/push/wrangler.toml:19), שורה 20; [.gitignore:25](E:/AIBOMBA/6_YamPlata_v2/weather-app/.gitignore:25); `SETUP-PUSH.md:26`.

`id` ו־`preview_id` זהים. פיתוח מקומי רגיל משתמש באחסון מקומי, אבל שימוש ב־remote preview עלול לפעול מול מנויי production.

תיקון מיידי: **מחק את שורת `preview_id`**, ואת ההנחיה ב־`SETUP-PUSH.md:26` להעתיק אותו מזהה לשני השדות. לפני remote development יש להגדיר namespace נפרד.

`.gitignore` מגן על הקבצים הנוכחיים הידועים, אבל לא על `.env`, ‏`.dev.vars` במקומות אחרים או `.dev.vars.production`.

הוסף:

```gitignore
.env
.env.*
!.env.example
!.env.sample

.dev.vars
.dev.vars.*
!.dev.vars.example
!.dev.vars.sample

*.pem
*.key
.claude/settings.local.json
```

לא נמצאו בסריקת דפוסים של קובצי הטקסט המנוהלים מפתחות פרטיים או tokens גלויים. זו אינה בדיקה מלאה של כל ערכי הסודות בהיסטוריית Git. מפתח VAPID ציבורי ו־KV namespace ID **אינם סודות**.

**נוהל רוטציית VAPID:**

1. ליצור זוג מפתחות חדש בסביבה מקומית מהימנה; לא להדביק מפתח פרטי ל־README, לצ'אט או ל־commit.
2. להעלות את הפרטי דרך `wrangler secret put VAPID_PRIVATE_KEY`; לעדכן יחד את הציבורי ב־`wrangler.toml:24` וב־`docs/index.html:1004`.
3. מנויים ישנים קשורים למפתח הישן: צריך `unsubscribe()` ואז `subscribe()` עם הציבורי החדש. החלפת secret בשרת בלבד תשבור להם Push.
4. ב־`subscribePush()` יש להשוות את `subscription.options.applicationServerKey` למפתח החדש **לפני** תנאי הדילוג של שש השעות בשורה 2829. במקרה של שינוי, להסיר את המנוי הישן ולרשום חדש.
5. לפרוס HTML ו־SW עם גרסה חדשה; מכשירים שלא פתחו את האפליקציה לא יעברו רוטציה מיד. ה־SW הנוכחי משתמש במפתח הישן מתוך `oldSubscription.options`.
6. במקרה של דליפה, להפסיק שימוש במפתח הישן. אם זהו מעבר מתוכנן ללא דליפה, אפשר תקופת מעבר עם גרסת מפתח לכל מנוי.
7. אם סוד נכנס ל־Git: רוטציה קודמת לניקוי ההיסטוריה. הוספה ל־`.gitignore` אינה מבטלת חשיפה קודמת.

`VAPID_SUBJECT` הוא פרטי קשר בתוך פרוטוקול VAPID, לא סיסמת גישה.

---

**12. נמוך — מחיקה מקומית ב־tools/video נבנית מארגומנט לא מאומת**

מיקום: [tools/video/render.mjs:24](E:/AIBOMBA/6_YamPlata_v2/weather-app/tools/video/render.mjs:24), שורות 122, 138–150.

`TARGET` משובץ ב־`stamp`, שמשמש לנתיב `rm(..., recursive:true)`. למשל `--target "x/../../.."` יכול להוציא את נתיב המחיקה מתיקיית frames. חישוב נתיב בלבד אישר שהוא מתכנס לתיקיית `weather-app/tools`; לא בוצעה מחיקה.

זה כלי מקומי, והארגומנט מגיע מהאדם שמריץ אותו — **אין כאן RCE באתר הציבורי**.

אחרי שורה 26 הוסף:

```js
if (!Object.hasOwn(REGIONS, REGION))
  throw new Error("invalid region");
if (!["now", "tomorrow"].includes(TARGET))
  throw new Error("invalid target");
if (!Number.isFinite(DURATION) || DURATION < 1 || DURATION > 120)
  throw new Error("invalid duration");
if (!Number.isInteger(FPS) || FPS < 1 || FPS > 60)
  throw new Error("invalid fps");
if (!Number.isInteger(TOP_N) || TOP_N < 1 || TOP_N > 27)
  throw new Error("invalid beaches count");
```

החלף שורה 138:

```js
const framesRoot = path.resolve(here, "frames");
const frames = path.resolve(framesRoot, stamp);
if (path.dirname(frames) !== framesRoot)
  throw new Error("unsafe frames path");
```

`spawn("ffmpeg", args)` ללא shell תקין מבחינת הזרקת פקודות. `page.evaluate(d => window.render(d), data)` מעביר נתונים כארגומנט, ולא מייצר JavaScript באמצעות שרשור.

---

**סקירת XSS ושאר הקבצים — מה תקין ומה כדאי להקשיח**

| מקור/רכיב | מסקנה |
|---|---|
| שמות חופים בכפתורים ובבאנר | `esc(v.name)` ו־`esc(best.name)` תקינים; החריג הוא `notifyHelp`. |
| קישורי מפות מודבקים | מפוענחים לקואורדינטות; אינם נכנסים ל־HTML או לניווט ישיר. תשובת `/expand` עוברת פענוח מספרי. |
| Nominatim | השמה ל־`value` ול־`textContent` בטוחה; בהמשך השם מגיע לחריג של התראות. |
| `jellyfish.json` | `location` ו־metadata עוברים escaping, ו־URL מוגבל ל־`https://www.meduzot.co.il/`. Payload של תגית מוצג כטקסט. |
| `fetch-jellyfish.mjs` | פענוח entities אינו sanitizer, אבל הרינדור בלקוח עושה escaping. אין הרצת HTML או shell. |
| `fetch-buoy.mjs` | זה מקור JSON, לא scraper של HTML. המדידות מומרות למספרים עם טווח; שם ו־URL המקור קבועים. |
| שגיאות Worker ומצלמה | `toast` משתמש ב־`textContent`; פרטי שגיאת המצלמה עוברים `esc`. |
| `palata.js` | אין DOM sinks, ‏`eval` או fetch ל־host שמגיע מנתוני API. נוסחי התראות הם טקסט. |
| `build-beach-pages.mjs` | לא נמצא XSS נשלט־משתמש במסלול הקיים: שמות/slug מקטלוג קוד מקומי, ונתוני התחזית מוצגים בעיקר כמספרים. |
| `manifest.json`, ‏`robots.txt` | תקינים בהקשר שנבדק; scope/start_url מקומיים. `robots.txt` אינו מנגנון סודיות. |

שתי הקשחות קטנות נוספות:

ב־`docs/index.html:1460`, `esc()` מגן על attribute אבל אינו מאמת פרוטוקול URL. המקורות הקיימים מייצרים URL קבוע, ולכן לא נמצאה כאן הזרקה דרך scraper. אפשר לסגור את הפער:

```js
function buoySourceUrl(value) {
  try {
    const u = new URL(value);
    if (
      u.origin === "https://isramar.ocean.org.il" &&
      !u.username && !u.password
    ) return u.href;
  } catch {}
  return "https://isramar.ocean.org.il/";
}
```

ובתבנית:

```js
href="${esc(buoySourceUrl(buoy.sourceUrl))}"
```

ב־`scripts/build-beach-pages.mjs`, הוסף ליד `esc`:

```js
const jsonForHtml = value =>
  JSON.stringify(value).replace(/</g, "\\u003c");
```

השתמש בו במקום `JSON.stringify` **בתוך בלוקי JSON-LD בלבד**, בשורות 67, 68 ו־126. זה מונע סגירת `</script>` אם בעתיד שמות יגיעו ממקור חיצוני. כיום זו הקשחה, לא חולשה מרוחקת שהוכחה.

לסקריפטי האיסוף כדאי להוסיף timeout ו־`redirect: "error"` לבקשות הקבועות בשורות `fetch-jellyfish.mjs:84` ו־`fetch-buoy.mjs:34`, כדי למנוע ריצה תקועה או שינוי יעד בלתי צפוי.

---

**פרטיות — README מכיל כיום הבטחה לא נכונה**

מיקום: [README.md:68](E:/AIBOMBA/6_YamPlata_v2/weather-app/README.md:68), שורה 69; `SETUP-PUSH.md:53`–55. חומרה: **נמוך**.

המשפט „הכול נשמר מקומית בדפדפן” שגוי:

- מנויי Push, מפתחות המנוי ושם וקואורדינטות החוף נשמרים ב־Cloudflare KV.
- כאשר נוצר מיקום `geo`, קואורדינטות החוף יכולות להיות מיקום המשתמש עצמו, בקירוב לארבע ספרות עשרוניות.
- Google Forms משמש לדיווח, **לא להרשמת Push** במימוש הנוכחי.
- GoatCounter פעיל כרגע; אין לבלבל „ללא cookies” עם „ללא העברת מידע לצד שלישי”. בקשות רשת חושפות לספקים גם נתוני חיבור. [פרטיות GoatCounter](https://www.goatcounter.com/help/privacy).
- כיבוי Push שולח מחיקה באופן שאינו ממתין להצלחה; אין להבטיח שהרשומה תמיד נמחקת מיד.
- הסקריפט מפרסם גם `reporter` בדיווחי המדוזות, אף שהאפליקציה אינה מציגה אותו.

**החלף את פסקת הפרטיות ב־README בנוסח:**

> אין חשבון משתמש. העדפות ומיקומים מותאמים נשמרים בדפדפן. בקשת מיקום נעשית בעקבות שימוש ב״קרוב אליי״ או בעיבוד תמונה; אם אין חוף מוכר קרוב, עשוי להישמר מיקום המבוסס על קואורדינטות המשתמש. קואורדינטות החוף נשלחות ל־Open-Meteo ולשירות המצופים; פענוח קישור מפות עשוי לשלוח את הקישור ל־Cloudflare ואת הקואורדינטות ל־Nominatim.
>
> בהפעלת התראות נשמרים ב־Cloudflare KV כתובת מנוי ה־Push, מפתחות המנוי, שם וקואורדינטות החוף ומצב ההתראות. הקוד הנוכחי אינו מגדיר תקופת מחיקה קבועה. כיבוי ההתראות מבטל את המנוי בדפדפן ומבקש למחוק את הרשומה בשרת.
>
> התמונות מעובדות מקומית באמצעות canvas ואינן מועלות לשרת האפליקציה. שיתוף תמונה או טקסט מתבצע ביוזמת המשתמש באמצעות שירות השיתוף שנבחר; התמונה עשויה לכלול שם חוף ושעה.
>
> GoatCounter פעיל למדידת ביקורים ואירועי שימוש. Google Fonts וספריית QR נטענים מספקים חיצוניים. דיווח יזום על מצב הים נשלח ל־Google Forms עם שם החוף ונתוני התחזית. פרטי התקשורת והמידע שנשלח כפופים גם למדיניות הספקים.

לצמצום מידע לא נחוץ: מחק את קריאת `reporter` ב־`scripts/fetch-jellyfish.mjs:61`, ובשורה 73 החלף:

```diff
- id, reporter, location, lat, lon,
+ id, location, lat, lon,
```

הסרה מהפיד העתידי לא מוחקת עותקים שכבר קיימים בהיסטוריית Git.

**Top 5 לתיקון עכשיו**

1. להוסיף `esc()` לשם החוף ב־`notifyHelp`.
2. להגביל endpoints לספקי Push מוכרים, לאמת מפתחות ולאסור redirects בשליחה.
3. להגן על `/test` ועל פעולות ניהול המנוי באמצעות הוכחת בעלות והגבלת קצב.
4. לאמת כל חוליה בשרשרת `/expand`.
5. להגביל הרשמות וגודל JSON, ולצמצם את 96 כתיבות ה־KV היומיות לכל מנוי.

Codex session ID: 01a0c51d-170c-7450-beb8-02a6c0f45fcf
Resume in Codex: codex resume 01a0c51d-170c-7450-beb8-02a6c0f45fcf
