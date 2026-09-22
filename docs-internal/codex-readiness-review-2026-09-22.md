הסקירה מתייחסת ל־**HEAD ‏`33c0131`, גרסה v36**. לא שיניתי קבצים. הרצתי את הבדיקות הקיימות: **12/12 עברו**, וביצעתי בדיקות נוספות בזיכרון בלבד.

**גבולות האימות:** הקוד, הנתונים המקומיים והחישובים להלן נבדקו. תיעוד המכסות נבדק מול הספקים. לא הצלחתי לקרוא את האתר החי, `/health` או נקודות ISRAMAR מסביבת הבדיקה; לכן מספר המנויים בפועל, תוכנית Cloudflare, צריכת CPU, הגדרות Pages ותקינות הפריסה נשארו לא מאומתים. רשימת meduzot הייתה נגישה. לא בוצעה בדיקת iPhone או VoiceOver פיזית.

## 1. יציבות ארוכת טווח ושחיקה תפעולית

**א. חוסם השקה ללא השגחה: עדכון Git אינו מבטיח עדכון של האתר**

מקורות: [.github/workflows/buoy.yml:22–38](E:/AIBOMBA/6_YamPlata_v2/weather-app/.github/workflows/buoy.yml:22), [jellyfish.yml:21–37](E:/AIBOMBA/6_YamPlata_v2/weather-app/.github/workflows/jellyfish.yml:21), [beach-pages.yml:22–38](E:/AIBOMBA/6_YamPlata_v2/weather-app/.github/workflows/beach-pages.yml:22).

שלושת התהליכים משתמשים ב־checkout עם אישורי ברירת המחדל ודוחפים commit. אין בהם שלב פריסת Pages. **לפי GitHub, commits שנדחפים באמצעות `GITHUB_TOKEN` אינם מפעילים בניית GitHub Pages.** בהנחת הפרסום מענף `docs/` שתיארת, הנתונים יכולים להתעדכן במאגר ולהישאר ישנים באתר עד הדחיפה הידנית הבאה. זו מסקנה מהקוד ומתיעוד GitHub; הגדרת הפרסום בחשבון לא נבדקה. [תיעוד GitHub](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site).

**התיקון המומלץ:** להחליף את שלושת מסלולי `git commit/push` בתהליך פרסום אחד: checkout, יצירת הנתונים והעמודים בתיקיית העבודה, `upload-pages-artifact` עבור `docs`, ואז `deploy-pages`. ב־Settings → Pages לבחור GitHub Actions.

ליבת התצורה:

```yaml
permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages-publish
  cancel-in-progress: false

# בתוך job עם environment: github-pages,
# אחרי checkout ו-setup-node:
steps:
  # ... checkout + setup-node ...
  - run: node scripts/fetch-buoy.mjs
  - run: node scripts/fetch-jellyfish.mjs
  - run: node scripts/build-beach-pages.mjs
  - uses: actions/upload-pages-artifact@v3
    with:
      path: docs
      retention-days: 1
  - uses: actions/deploy-pages@v4
```

הפתרון הפשוט ביותר לתחזוקה הוא ריצה שעתית מאוחדת, למשל בדקה 17. הוא מעלה את תקציב Open-Meteo של יצירת העמודים מ־320 ל־960 בקשות ביום, אך פותר גם את בעיית הפרסום וגם את צמיחת היסטוריית Git. יש לקבע את גרסאות הפעולות ל־SHA בעת הכנת הפאץ׳.

---

**ב. חוסם התחייבות לצמיחה: אין כיום תקרת מנויים גבוהה ובטוחה במסלול החינמי**

מקורות: [workers/push/src/index.js:265–299](E:/AIBOMBA/6_YamPlata_v2/weather-app/workers/push/src/index.js:265), [policy.js:61–64](E:/AIBOMBA/6_YamPlata_v2/weather-app/workers/push/src/policy.js:61), [wrangler.toml:14–15](E:/AIBOMBA/6_YamPlata_v2/weather-app/workers/push/wrangler.toml:14).

התיקון ל־`stateSignature()` תקין: שינוי ב־`lastSeen` בלבד כבר אינו גורם לכתיבה. אבל **מגבלת שתי התראות onset ביום אינה מגבלת שתי כתיבות ביום**. חציית 80 או 98 בשני הכיוונים משנה את החתימה גם בלילה וגם לאחר מיצוי מכסת ההתראות.

נסמן:

- `N` — מספר מנויים.
- `W` — מספר שינויי חתימה ממוצע למנוי ביום.
- `U` — כתיבות נוספות: הרשמות, החלפות חוף ו־rotation.

החישוב הוא:

```text
96 ריצות ביום
96 כתיבות meta:cron ביום
כתיבות יומיות = 96 + N×W + U
תקרת KV לפי כתיבות = floor((1000−96−U)/W)
```

ללא כתיבות ניהול נוספות:

| שינויי מצב למנוי ביום | תקרת מנויים לפי כתיבות בלבד |
|---:|---:|
| 2 | 452 |
| 4 | 226 |
| 8 | 113 |
| 24 | 37 |
| 96 | **9** |

**המספר השמרני המפורש הוא 9 מנויים מבחינת מכסת הכתיבות**, אם רוצים לעמוד גם ביום שבו החתימה משתנה בכל ריצה. זו אינה תחזית לשימוש רגיל, ואינה הבטחת קיבולת כוללת: CPU ובקשות יוצאות יכולים להגביל קודם. בלי מדידת `W` בפועל אי אפשר להציג בכנות מספר יחיד גבוה יותר.

מגבלות נוספות:

- **קריאות KV:** כ־`96×(N+1)` ביום, לפני `/health` והרשמות. תקרת הקריאות לבדה היא כ־1,040 מנויים.
- **בקשות `list`:** כבר יש 96 ביום. כל `/health` מוסיף אחת. ניטור מדי דקה יביא ל־`1440+96=1536`, מעל מכסת 1,000 פעולות list ביום.
- **בקשות יוצאות בכל cron:** `2B+P`, כאשר `B` מספר קבוצות החופים ו־`P` מספר ניסיונות Push. במסלול Free הגבול הוא 50: למשל, 17 מנויים בחופים שונים שמקבלים התראה יחד דורשים `34+17=51`. גם 25 חופים בלי התראות ממלאים את התקציב.
- **CPU:** במסלול Free התקציב המתועד הוא **10ms גם ל־Cron Trigger**. פענוח תחזיות, ניקוד והצפנת מספר הודעות בתוך invocation אחד מחייבים מדידה; לא ניתן להסיק מקוד בלבד שהדבר עומד בתקציב.
- `list({limit:1000})` אינו מדפדף. מעל 1,000 רשומות חלק מהמנויים לא ייבדקו, וגם `/health` יציג ספירה חלקית. קיימת בנוסף מגבלת 1,000 פעולות KV בכל invocation.

[מגבלות Workers](https://developers.cloudflare.com/workers/platform/limits/), [מכסות KV](https://developers.cloudflare.com/kv/platform/pricing/), [מגבלות פעולות KV](https://developers.cloudflare.com/kv/platform/limits/).

**תיקון מעשי לבעלים יחיד:** לעבור ל־Workers Paid, שמתחיל ב־$5 לחודש, ולהשאיר את דילוג הכתיבות. זה זול ופשוט יותר מהנדסת המערכת סביב 1,000 כתיבות ו־10ms. עדיין צריך עיבוד במנות לפני מאות מנויים, ודפדוף באמצעות `cursor` לפני 1,000. [תמחור Cloudflare](https://developers.cloudflare.com/workers/platform/pricing/).

בפאץ׳ עצמו:

1. להוסיף ל־`meta:cron` את `stateWrites`, ‏`forecastRequests`, ‏`attempted` ו־`processed`.
2. להחליף את הספירה החיה ב־`/health` בספירת הריצה האחרונה, עם זמן המדידה.
3. לשמור pagination cursor ולתחום כל מנת עיבוד; לא להוסיף רק לולאת pagination בלתי מוגבלת לאותו invocation.
4. למחוק את ההבטחה “free tier is plenty” ב־`wrangler.toml:1`.

---

**ג. גבוה: כשל Push עלול להישמר כאילו ההתראה נשלחה**

מקורות: [policy.js:88–120](E:/AIBOMBA/6_YamPlata_v2/weather-app/workers/push/src/policy.js:88), [index.js:276–289](E:/AIBOMBA/6_YamPlata_v2/weather-app/workers/push/src/index.js:276).

`decide()` מוסיפה מראש את מזהי האירועים ל־`sent`. אם שירות Push מחזיר 429 או 500, ה־Worker מגדיל `errors` — ואז שומר את אותו state. בריצה הבאה האירוע מסומן ככבר נשלח. גם מעבר `lastCalm` כבר נצרך.

**תיקון מדויק באזור הלולאה:**

- להתחיל `acknowledged` מ־`rec.state.sent`.
- להוסיף אליו `e.id` **רק אחרי 2xx**.
- עבור אירוע deluxe שנוצר מ־onset, להוסיף אז גם את מזהה ה־deluxe היומי שהמדיניות מוסיפה בשורה 88.
- במקרה כשל זמני לשמור את `lastCalm/lastScore` הקודמים, ואת מזהי ההצלחות בלבד.
- לתפוס חריגות בנפרד לכל שליחה, כדי שהצלחה קודמת באותה ריצה לא תישכח.
- להשאיר 404/410 כמחיקה.

כלומר, ה־state הנשמר צריך להיות:

```js
const nextState = {
  ...(hadTransientFailure ? rec.state : state),
  sent: [...acknowledged].slice(-SENT_KEEP),
};
```

יש לבדוק שני אירועים באותה ריצה: הראשון מצליח והשני נכשל. KV ושליחת Push אינם טרנזקציה משותפת, ולכן גם אחרי התיקון אין הבטחת exactly-once במקרה קריסה בין שליחה לשמירה; אין לטעון אחרת בהערת `policy.js:10–11`.

---

**ד. גבוה: כשלים בשאיבת נתונים יכולים להיות “ירוקים” לבעלים**

מקורות: [fetch-jellyfish.mjs:87–103](E:/AIBOMBA/6_YamPlata_v2/weather-app/scripts/fetch-jellyfish.mjs:87), [fetch-buoy.mjs:45–63](E:/AIBOMBA/6_YamPlata_v2/weather-app/scripts/fetch-buoy.mjs:45), [build-beach-pages.mjs:203–223](E:/AIBOMBA/6_YamPlata_v2/weather-app/scripts/build-beach-pages.mjs:203).

- parser חשוד של מדוזות מדפיס שגיאה ועושה `return`: התהליך מסתיים בהצלחה.
- מצוף ללא גובה גל עושה אותו דבר אם קיים קובץ קודם.
- בניית עמודים תופסת כל כשל וממשיכה. אפילו אם **כל החופים נכשלו**, נכתב sitemap עם `lastmod` חדש והתהליך מצליח.
- `updated` של מדוזות נשאר קבוע כאשר התוכן לא השתנה. לכן אי אפשר לדעת אם “אין דיווחים חדשים” או “השאיבה הפסיקה”.

**תיקון:**

```js
// במקום console.error(...) ואז return במסלול parse חשוד:
throw new Error("upstream payload failed validation");
```

בבניית העמודים לצבור `failures`, ולהגדיר `process.exitCode = 1` אם אינו ריק. לעדכן sitemap רק לפי עמודים שנבנו בהצלחה, או לפרסם את כל האתר רק כאשר כל הבנייה הצליחה.

להוסיף נתון תפעולי נפרד:

```js
{
  checkedAt,       // השאיבה האחרונה שנבדקה בהצלחה
  contentUpdatedAt,
  sourceMeasuredAt,
  status
}
```

אחרי המעבר לפרסום artifacts אין סיבה להימנע מעדכון `checkedAt` כדי לחסוך commits.

**התרעה זולה:** בדיקה חיצונית כל חמש דקות של heartbeat ה־cron ושל manifest פרסום. להתריע כאשר cron ישן מ־45 דקות, פרסום ישן מ־4 שעות, או יש שגיאות. ניטור מתוך אותו workflow בלבד לא יגלה שה־workflow עצמו חדל לרוץ.

---

**ה. תקציב Open-Meteo: סביר להתחלה, אך יקר יותר ממספר קריאות `fetch`**

מקורות: [docs/index.html:1281–1339](E:/AIBOMBA/6_YamPlata_v2/weather-app/docs/index.html:1281), [index.html:2085–2097](E:/AIBOMBA/6_YamPlata_v2/weather-app/docs/index.html:2085), [index.html:2273–2281](E:/AIBOMBA/6_YamPlata_v2/weather-app/docs/index.html:2273), [build-beach-pages.mjs:21–27](E:/AIBOMBA/6_YamPlata_v2/weather-app/scripts/build-beach-pages.mjs:21), [Worker:88–93](E:/AIBOMBA/6_YamPlata_v2/weather-app/workers/push/src/index.js:88), [video/render.mjs:40–55](E:/AIBOMBA/6_YamPlata_v2/weather-app/tools/video/render.mjs:40).

המגבלות הנוכחיות: 600 לדקה, 5,000 לשעה, 10,000 ליום ו־300,000 לחודש. “קריאה” יכולה להיות משוקללת לפי משתנים, מודלים ומשך הזמן. [תמחור Open-Meteo](https://open-meteo.com/en/pricing).

לפי [מחשבון הספק בקוד המקור](https://github.com/open-meteo/open-meteo-website/blob/main/src/routes/en/pricing/%2Bpage.svelte), אומדן המשקל למיקום אחד הוא:

```text
max(1, variables × models / 10 × max(1, days / 14))
```

| שימוש | HTTP | אומדן יחידות מכסה |
|---|---:|---:|
| טעינת החוף הראשי | 3 | `3.5 marine + 1.2 weather + 1 sun = 5.7` |
| סריקת חוף נוסף | 2 | 2 |
| פתיחה עם שני החופים המובנים, בלי climatology | 5 | **7.7** |
| climatology לחמש שנים, ללא cache | 1 | כ־13 |
| פתיחה ראשונה עם climatology | 6 | **כ־20.7** |
| יצירת עמודים כיום: 10 חופים × 4 × 8 | 320 ביום | כ־320 |
| cron עבור `B` קבוצות חופים | `2×96×B` ביום | **192B** |
| וידאו ישראל, 18 חופים | 36 | כ־36 |
| וידאו world, ‏26 חופים | 52 | כ־52 |
| וידאו planet, ‏134 חופים | 268 | כ־268 |
| רענון תחזיות הפאנל | 20 | כ־20 |

דוגמה: עשרה חופים ב־Worker, הבנייה הנוכחית ווידאו ישראל אחד:

```text
192×10 + 320 + 36 = 2,276 יחידות ביום
```

נשארות כ־7,724: כ־1,003 פתיחות עם cache climatology, או כ־373 פתיחות ראשונות. פאנל פתוח יממה מוסיף `20×96=1,920`.

זה **תקציב מוצר מצטבר לצורכי תכנון**, לא טענה שכל הבקשות נאכפות תחת מונה IP יחיד: דפדפנים, GitHub ו־Cloudflare יוצאים מכתובות שונות. מנגנון האכיפה המדויק והתעבורה בפועל לא אומתו.

**תיקונים:**

- ב־Worker לשמור תחזית משותפת לחוף למשך שעה. כרגע ה־`Map` נוצר מחדש בכל cron, ו־`cacheTtl:600` קצר מהמרווח של 900 שניות. כך בסיס התחזיות יורד מ־`192B` לכ־`48B` ביום.
- לשמור ב־Map גם Promise שנכשל: כרגע כשל תחזית גורם לניסיון חוזר עבור כל מנוי באותו חוף.
- בסריקת הדפדפן להגביל concurrency לשני חופים.
- ב־climatology להוסיף negative-cache גם לכשל HTTP, למשל שעה, כדי ש־400/429 קבוע לא יחזור בכל רענון.
- בווידאו לנסות שוב רק 429/5xx/שגיאות רשת; כיום גם 400 מקבל ארבעה ניסיונות.

---

**ו. Git ו־Actions: הצמיחה אמיתית, אבל אין בסיס לטעון לג׳יגבייט דחוס בשנה**

מקורות: [שלושת לוחות הזמנים](E:/AIBOMBA/6_YamPlata_v2/weather-app/.github/workflows/beach-pages.yml:5), [כתיבת עמודים:212–222](E:/AIBOMBA/6_YamPlata_v2/weather-app/scripts/build-beach-pages.mjs:212), [קטלוג העמודים:13](E:/AIBOMBA/6_YamPlata_v2/weather-app/scripts/build-beach-pages.mjs:13).

תיקון קטן להנחת הבדיקה: כרגע יש **10 חופים × שתי שפות = 20 עמודי חוף**, ועוד index באנגלית ו־sitemap — 22 תוצרים, לא 22 חופים.

מדידות מקומיות:

- 20 עמודי החוף: 150,577 בייט.
- index באנגלית ו־sitemap: עוד 17,095 בייט.
- jellyfish JSON: ‏35,567 בייט.
- buoy JSON: ‏413 בייט.

בהנחה שכל ריצה משנה תוכן:

```text
commits/year = (24 + 24 + 8) × 365 = 20,440
תמונות תוכן גולמיות:
167,672×2,920 + 35,567×8,760 + 413×8,760 ≈ 805MB/year
```

זה **אינו** גודל Git לאחר דחיסת delta. דגמתי diffs דחוסים מההיסטוריה:

- SEO: ממוצע כ־10.7KB, שמונה commits.
- מצוף: כ־352 בייט, עשרה commits.
- מדוזות: כ־720 בייט, עשרה commits.

הכפלה בתדירות המרבית נותנת כ־41MB לשנה של diffs דחוסים, לפני commits/trees ובלי לדמות pack אמיתי. **אומדן תכנון סביר: סדר גודל של עשרות MB, בערך 50–100MB בשנה לאחר packing**, עם אי־ודאות; בפועל פיד שלא השתנה אינו יוצר commit. ה־SEO כן משתנה בכל בנייה בגלל זמני העדכון.

**המיתון הקונקרטי:** פרסום artifacts כמפורט בסעיף א׳, ללא commits של תחזיות ופידים. מעבר לענף אחר באותו repository אינו מסלק את ההיסטוריה הגדלה.

**דקות Actions:** ‏56 jobs ביום, 1,680 בחודש בן 30 יום. אם כל job מחויב בדקה אחת: 1,680 דקות; שתי דקות: 3,360. במאגר ציבורי על runners רגילים השימוש חינם; במאגר פרטי צריך לבדוק את מכסת התוכנית. נראות המאגר וזמני הריצות לא אומתו. [חיוב GitHub Actions](https://docs.github.com/en/billing/concepts/product-billing/github-actions).

גם לאחר הסרת commits אוטומטיים, אין להתעלם מהשבתת schedules במאגר ציבורי לאחר 60 יום ללא פעילות. יש לנטר heartbeat מבחוץ; התזמון גם עלול להתעכב או להישמט בעומס. [תיעוד schedules](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows).

---

**ז. תלות במקורות חיצוניים והתרעה מוקדמת**

| מקור וקוד | התנהגות בעת שבירה | נראות לבעלים ותיקון |
|---|---|---|
| meduzot: [fetch-jellyfish.mjs:56–77](E:/AIBOMBA/6_YamPlata_v2/weather-app/scripts/fetch-jellyfish.mjs:56) | שינוי class/markup עלול לרוקן שדות או רשומות. סף מספר הרשומות אינו מגלה אובדן `species`, תאריך או מיקום. | להוסיף בדיקות schema ותאריכים, שיעור שדות חסרים ו־fixture HTML. parse חשוד צריך exit לא־אפס. להפריד `checkedAt` משינוי תוכן. |
| ISRAMAR: [Worker:97–118](E:/AIBOMBA/6_YamPlata_v2/weather-app/workers/push/src/index.js:97), [app:1455–1464](E:/AIBOMBA/6_YamPlata_v2/weather-app/docs/index.html:1455) | תחנה כושלת מדולגת; מדידה מעל תשע שעות מוסתרת. התחזית ממשיכה. זה fallback תקין, אך המשתמש אינו יודע שאיבד מדידה. | manifest בריאות נפרד לכל תחנה, כולל `measuredAt` ושגיאה אחרונה. לגבי התחנה שמושבתת מינואר: זו עובדה שסיפקת, לא אימות חי שלי. אין להחשיב אי־זמינות מוכרת כתקרית חדשה בכל ריצה. |
| המרת נתון מצוף: [Worker:102](E:/AIBOMBA/6_YamPlata_v2/weather-app/workers/push/src/index.js:102) | `Number(null)` ו־`Number("")` מחזירים אפס. שדה חסר יכול להפוך ל״מדידת ים שטוח״. | לפני ההמרה: `if (raw == null || raw === "") return null;`. בסקריפט המצוף כבר קיימת הגנת null; להשוות אליה את ה־Worker. |
| שמות מודלים: [palata.js:89–99](E:/AIBOMBA/6_YamPlata_v2/weather-app/docs/palata.js:89), [app:1239–1243](E:/AIBOMBA/6_YamPlata_v2/weather-app/docs/index.html:1239) | פרמטר שנדחה ב־400 מפיל את הבקשה כולה; עמודות שנעלמות מפעילות fallback או משאירות נתונים חסרים. | בדיקת canary יומית למתכון הראשי **וגם** למתכון המורחב של האפליקציה; לבדוק ערכים מספריים לכל מקור, לא רק HTTP 200. לרכז את השמות ב־`Palata.RECIPE`. |
| Nominatim: [app:3004–3014](E:/AIBOMBA/6_YamPlata_v2/weather-app/docs/index.html:3004) | התור מוגבל ללשונית אחת. עשרה משתמשים עדיין יכולים ליצור עשר בקשות בשנייה. חסימה משבשת זיהוי שם, לא את כל התחזית. | מגבלת הספק היא לכל האפליקציה. להעביר ל־proxy עם תור גלובלי של 1,100ms ו־cache, וכתובת ספק מתוך config. הפתרון הזול ביותר עד אז: להסתפק בשם ידני במקום reverse-geocoding אוטומטי. |
| cdnjs: [app:2369–2385](E:/AIBOMBA/6_YamPlata_v2/weather-app/docs/index.html:2369) | QR נכשל עם הודעה מפורשת; שיתוף קישור נשאר זמין. | אין כשל ליבה. לארח את הספרייה הקטנה מקומית ולשנות `s.src` לנתיב מקומי. |
| Google Fonts: [app:56–58](E:/AIBOMBA/6_YamPlata_v2/weather-app/docs/index.html:56), [video/template.html:6–7](E:/AIBOMBA/6_YamPlata_v2/weather-app/tools/video/template.html:6) | באפליקציה יש fallback ל־system fonts. בווידאו התוצר יכול להיווצר עם גופן אחר. | באפליקציה אפשר להמתין. בווידאו לארח WOFF2 מקומית ולהחליף המתנת 400ms ב־`await document.fonts.ready`, עם timeout ושגיאה ברורה אם הגופן הנדרש חסר. |

ל־Nominatim כבר יש attribution וקצב מקומי; הבעיה היא היקף המגבלה, לא היעדר מוחלט של טיפול. [מדיניות Nominatim](https://operations.osmfoundation.org/policies/nominatim/).

---

**ח. זמן, DST וגבולות יום ושנה**

**מה תקין:** [app:1144–1147](E:/AIBOMBA/6_YamPlata_v2/weather-app/docs/index.html:1144), [policy.js:17–21](E:/AIBOMBA/6_YamPlata_v2/weather-app/workers/push/src/policy.js:17), [beaches.mjs:208–220](E:/AIBOMBA/6_YamPlata_v2/weather-app/scripts/lib/beaches.mjs:208).

- `Intl` עם `Asia/Jerusalem` מתחשב בשינוי השעון.
- 19:00 נשארת 19:00 בישראל; אין צורך לשנות את cron ה־UTC.
- שעות השקט 21:00–06:00 תקינות ביחס לשעון הישראלי.
- `addDays()` במדיניות ובקטלוג עוברת נכון מ־31.12.2026 ל־1.1.2027.
- שתי הופעות 01:30 ב־25.10.2026 נמצאות בשעות השקט. לא מצאתי שם כפילות Push מוכחת.
- `localNowFromOffset()` אינו כשלעצמו באג DST כאשר ה־offset טרי ומתאים לרגע הנוכחי. אין להשתמש בו להמרת זמן עתידי אחרי החלפת שעון.

הממצאים:

| מיקום | תרחיש קונקרטי | תיקון |
|---|---|---|
| [fetch-jellyfish.mjs:40–53](E:/AIBOMBA/6_YamPlata_v2/weather-app/scripts/fetch-jellyfish.mjs:40) | `25.10.2026 00:30` מופק כ־`+02:00`, אף שבחצות עדיין `+03:00`. ב־`26.03.2027 00:30` מופק `+03:00` במקום `+02:00`. שוחזר בזיכרון. | במקום לבדוק offset על `local+"Z"`, לנסות UTC מועמד בהיסט 3 ו־2 שעות, ולבחור מועמד ש־`Intl` מחזיר ממנו בדיוק את התאריך והשעה המקומיים. שעה כפולה בסתיו מחייבת מדיניות מפורשת; אין במקור מספיק מידע להבחין בין שתי ההופעות. |
| [app:1956–1964](E:/AIBOMBA/6_YamPlata_v2/weather-app/docs/index.html:1956) | fallback לנתונים ישנים ללא offset משתמש ב־offset של פתיחת הלשונית, גם עבור דיווח מצדו השני של מעבר השעון. | להשתמש באותה פונקציית המרה לפי **תאריך הדיווח**, או להסיר תמיכה בפורמט ללא אזור אחרי מיגרציה של הנתונים. |
| [app:1711–1714](E:/AIBOMBA/6_YamPlata_v2/weather-app/docs/index.html:1711) | סריקת הירח תמיד אורכת 24 שעות: ב־25.10.2026 היום הישראלי בן 25 שעות, וב־26.03.2027 בן 23. חלון החיפוש חסר שעה או כולל שעה מהיום הבא. לא מצאתי מכך תוצאת ירח שגויה בתל אביב בשני התאריכים שנבדקו. | לחשב `end = israelMidnightUTC(addDays(dateStr,1))` ולסרוק עד `end`, במקום `24*60`. |
| [beaches.mjs:192](E:/AIBOMBA/6_YamPlata_v2/weather-app/scripts/lib/beaches.mjs:192), [video:49–63](E:/AIBOMBA/6_YamPlata_v2/weather-app/tools/video/render.mjs:49) | כל מהדורת סיני משתמשת ב־Jerusalem. ב־25.10.2026 צהרי UTC הם 14:00 בישראל ו־15:00 בקהיר; ב־26.03.2027 היחס הפוך. שעות הסרטון אינן בהכרח שעות החוף. | להוסיף timezone לכל חוף: ישראל `Asia/Jerusalem`, מצרים `Africa/Cairo`; להשתמש בו גם בבקשה וגם ב־`Intl` של `now`. לחלופין לכתוב במפורש ״שעון ישראל״ בכל תוצר סיני. |
| [app:1865–1867](E:/AIBOMBA/6_YamPlata_v2/weather-app/docs/index.html:1865) | הערת ״שעון ישראל״ מופיעה רק לפי `lon < 33`, ולכן לא מופיעה בסיני כאשר השעונים שונים. | להציג תמיד את אזור הזמן שבו השעות מוצגות; לא להסיק timezone מקו אורך. |
| [policy.js:78–120](E:/AIBOMBA/6_YamPlata_v2/weather-app/workers/push/src/policy.js:78) | ים שנרגע ב־05:00 מעדכן `lastCalm=true` ללא שליחה. ב־06:00 לא נשלחת התראה, כי המעבר כבר נצרך. שוחזר. | אם הכוונה היא לגלות בבוקר חלון שנפתח בלילה, להוסיף `pendingOnset` bounded לחתימה; לקבוע אותו במעבר שקט ולצרוך ב־06:00 אם החלון עדיין עומד בתנאים. |
| [app:2091–2111](E:/AIBOMBA/6_YamPlata_v2/weather-app/docs/index.html:2091) | cache climatology יכול לעבור לשנה החדשה ולהמשיך להציג חלון שנים קודם כ״השנים האחרונות״; `getFullYear()` משתמש גם באזור הזמן של המכשיר. | לכלול `endYear` בנתון ובבדיקת cache, ולחשב אותו מ־`israelNow().dateStr`. להציג את טווח השנים בפועל. |

תצוגת תחזיות לפי מחרוזות זמן ללא offset אינה יכולה להבחין בין שתי השעות החוזרות. ב־[palata.js:116–120](E:/AIBOMBA/6_YamPlata_v2/weather-app/docs/palata.js:116) וב־[currentHourData:1344](E:/AIBOMBA/6_YamPlata_v2/weather-app/docs/index.html:1344) זו מגבלה של הייצוג. לא אימתתי כיצד ה־API החי מקודד את המעבר; הפתרון העמיד הוא `timeformat=unixtime`, חיבור סדרות לפי epoch והפקת שעה מקומית באמצעות `Intl`.

---

**ט. מצב מתמשך: מה מוגבל ומה נשאר לנצח**

- **`sent` מוגבל כראוי:** [policy.js:15,118–120](E:/AIBOMBA/6_YamPlata_v2/weather-app/workers/push/src/policy.js:118). נשמרים לכל היותר 40 מזהים. אין כאן גידול בלתי מוגבל, וה־IDs כוללים תאריך מלא. אין צורך בתיקון בגלל גודל.
- **רשומות מכשירים עלולות להישאר לנצח:** [index.js:215–218,279–283](E:/AIBOMBA/6_YamPlata_v2/weather-app/workers/push/src/index.js:215). מחיקה מתבצעת רק כשנשלח Push ומתקבל 404/410. מכשיר שלא זוכה עוד לאירועים ממשיך להיקרא בכל cron. להוסיף `lastClientSeenAt` ו־`lastDeliveryAcceptedAt`; ניקוי לאחר תקופת חוסר פעילות מוגדרת, למשל 180 יום, לפי המאוחר מביניהם. **לא להשתמש ב־`updatedAt`**, שה־cron עצמו מחדש.
- **reconcile אינו מחדש רישום תקין־לכאורה:** [app:2873–2879](E:/AIBOMBA/6_YamPlata_v2/weather-app/docs/index.html:2873). אם השרת איבד רשומה והדפדפן לא השתנה, לא תישלח הרשמה נוספת. להוסיף לתנאי `Date.now()-rec.at > 24*3600000`; `subscribePush()` כבר יודע לרשום מחדש. יש לכלול זאת לפני הוספת TTL.
- **cache API מוגבל:** [sw.js:19,46–56](E:/AIBOMBA/6_YamPlata_v2/weather-app/docs/sw.js:19). יש תקרה של 60 ו־normalization לפרמטרי פידים; גרסאות ישנות נמחקות. לא מצאתי דליפת cache בלתי מוגבלת במסלול התחזיות הרגיל.
- **localStorage כן מצטבר:** [app:1998–2030](E:/AIBOMBA/6_YamPlata_v2/weather-app/docs/index.html:1998), [2089–2112](E:/AIBOMBA/6_YamPlata_v2/weather-app/docs/index.html:2089). מפתח feedback לכל חוף/יום ומפתח climatology לכל קואורדינטה. למחוק `yp-fb-*` ישנים מ־30 יום ו־`yp-clim-*` ישנים מ־90 יום, ולהגביל climatology ל־50 מקומות. לעטוף את כל פעולות האחסון ב־try/catch; כרגע חלק מהקריאות והכתיבות יכולות להפיל init אם האחסון אינו זמין.
- **וידאו:** [render.mjs:129–158](E:/AIBOMBA/6_YamPlata_v2/weather-app/tools/video/render.mjs:129). `out` אינו מנוקה; frames נמחקים רק אחרי הצלחה. כרגע נמדדו 38 קבצים, כ־16.7MB. להוסיף `--retain-days` לתוצרים אוטומטיים, ולנקות את תיקיית frames של הריצה ב־`finally`, לאחר בדיקת הגבול שכבר קיימת. אלה אינם נכנסים ל־Git בזכות `.gitignore`.

## 2. נכונות ואמינות המידע המוצג

**א. גבוה: דיווח “אין מדוזות” נספר כאזהרת מדוזות**

מקורות: [docs/data/jellyfish.json:1087–1099](E:/AIBOMBA/6_YamPlata_v2/weather-app/docs/data/jellyfish.json:1087), [app:1967–1975](E:/AIBOMBA/6_YamPlata_v2/weather-app/docs/index.html:1967), [fetch-jellyfish.mjs:66–74](E:/AIBOMBA/6_YamPlata_v2/weather-app/scripts/fetch-jellyfish.mjs:66).

בקובץ הנוכחי, דיווח `25846` בהרצליה מכיל `species: "אין מדוזות"`. `nearbyJelly()` בודקת רק מקום וגיל, ולכן בזמן שהדיווח טרי הוא מפעיל את אותה אזהרה כמו תצפית חיובית. גם רשומות ללא species נספרות כראיה חיובית. הדיווח המסוים כבר ישן כיום; **הכשל במסלול מאומת**, לא טענה שהוא מפעיל אזהרה ברגע זה.

**תיקון:**

```js
const presence =
  species === "אין מדוזות" ? "absent" :
  species ? "present" : "unknown";
```

לשמור `presence` בפיד ולדרוש `r.presence === "present"` באזהרות. רשומה לא מסווגת תוצג כמידע חסר, לא כנוכחות ולא כהיעדר. בהמשך יש לפרסר את כל המינים בדיווח, ולא רק את הראשון.

בנוסף, סולם “זהירות מוגברת” נגזר ממספר דיווחים ולא מכמות מדוזות: עדיף להציג “5 דיווחים בקרבת מקום” כדי שהנתון יהיה מובן.

---

**ב. גבוה: נתונים שמורים יכולים להפעיל באנר אופטימי בלי סימון stale**

מקורות: [app:1336–1340](E:/AIBOMBA/6_YamPlata_v2/weather-app/docs/index.html:1336), [2267–2282](E:/AIBOMBA/6_YamPlata_v2/weather-app/docs/index.html:2267), [2035–2045](E:/AIBOMBA/6_YamPlata_v2/weather-app/docs/index.html:2035).

המסלול הראשי מזהה `X-YP-Cache: stale`, מציג אזהרה ומונע התראה מקומית — **זה תקין**. אבל:

- `fetchSingle()` של הסריקה מתעלמת מהכותרת.
- כשל סריקה משאיר `dataCache` ישן.
- `recomputeAlert()` אינו בודק את גיל הנתון.
- פיד המדוזות מתעלם מ־`updated` ומסימון stale; לאחר שהדיווחים מזדקנים האזהרה פשוט נעלמת.

**תיקון:** להחזיר מכל fetch גם `{stale,fetchedAt}`, ולשמור metadata לצד כל `dataCache[k]`. באנר השוואת חופים ישתמש רק ברשומות שאינן stale וצעירות משעה. בפיד המדוזות להציג “המידע אינו מעודכן” אם השאיבה אינה טרייה, גם כאשר אין דיווחים בטווח.

להחליף גם את הטקסט בשורה 2271:

```text
כ־X% מהשעות שנבדקו צפויות עם מדד פלטה 8.0 ומעלה
```

“X% מהזמן מתאים לשחייה” הוא ניסוח רחב יותר ממה שהמדד מודד, והסריקה משתמשת בשעות 06–19 קבועות גם בחורף.

---

**ג. גבוה: עמודי החופים יכולים להמציא רצף רגוע דרך שעה חסרה**

מקור: [build-beach-pages.mjs:35–44](E:/AIBOMBA/6_YamPlata_v2/weather-app/scripts/build-beach-pages.mjs:35).

`summarize()` מסלקת שעות עם `score == null` **לפני** חיפוש רצף. בדיקה של:

```text
06:00 → 90
07:00 → null
08:00 → 90
```

החזירה 100% וחלון 06:00–09:00. זו מסקנה שאינה נתמכת בנתונים.

**תיקון מדויק:**

- להשאיר שעות חסרות במערך שעליו מחפשים רצפים.
- לקטוע רצף ב־null או כאשר השעה הבאה אינה עוקבת.
- לחשב בנפרד `knownHours`, ‏`expectedHours` ו־`coverage`.
- להחזיר `pct:null` אם אין שעות ידועות, ולא `0`.
- כאשר הכיסוי חלקי, להציג “X% מתוך Y שעות עם נתונים”, או להימנע מהאחוז.

גם [app:1361–1369](E:/AIBOMBA/6_YamPlata_v2/weather-app/docs/index.html:1361) מציגה אפס או מורידה את האחוז כשהמידע חסר. להשתמש באותו מנגנון סיכום משותף.

---

**ד. בינוני: “עכשיו”, “התחזיות מסכימות” ו“תואם לתחזית” נאמרים לעיתים בלי בסיס מספיק**

מקורות: [app:1344–1345](E:/AIBOMBA/6_YamPlata_v2/weather-app/docs/index.html:1344), [1211–1219](E:/AIBOMBA/6_YamPlata_v2/weather-app/docs/index.html:1211), [1465–1479](E:/AIBOMBA/6_YamPlata_v2/weather-app/docs/index.html:1465).

שלושה תיקונים קטנים:

1. `nearestHourData()` יכולה להחזיר שעה עתידית, וה־hero והמדדים מציגים אותה כמצב הנוכחי. **להשתמש ב־`currentHourData()` בכרטיסי “עכשיו”**; להשאיר חיפוש עתידי רק בכרטיסי תחזית עם תווית שעה מפורשת.
2. בדיקת מודל יחיד משתמשת ב־`&&`: אם לגלים מודל אחד ולרוח שניים, עדיין ייתכן “התחזיות מסכימות”. להציג זמינות לכל גורם, או לפחות לשנות ל־`||` ולנוסח “בחלק מהנתונים זמין מודל יחיד”.
3. כשאין `fc`, מצב המצוף מקבל `kind:"ok"` והטקסט אומר “תואם לתחזית”. להוסיף `kind:"measurement-only"` ולהציג מדידה בלי טענת התאמה.

---

**ה. גבוה לבעלים: הפאנל יכול להראות מערכת בריאה כשאינה כזו**

מקורות: [panel:159–173](E:/AIBOMBA/6_YamPlata_v2/weather-app/docs/panel/index.html:159), [192–206](E:/AIBOMBA/6_YamPlata_v2/weather-app/docs/panel/index.html:192), [sw.js:89–95,129–134](E:/AIBOMBA/6_YamPlata_v2/weather-app/docs/sw.js:89).

- `cPush` מקבל ירוק לפי גיל cron ומפתחות בלבד, גם כאשר `lastCron.errors > 0`.
- `loadSite()` אינה בודקת `res.ok`.
- בריאות עמודי החופים נגזרת מ־sitemap, שמתעדכן גם אם העמודים נכשלו.
- בקשות הפאנל עם `cache:"no-store"` ל־`sw.js`, ל־sitemap ול־HTML עדיין יכולות להיתפס ב־`cacheFirst` של ה־Service Worker. ה־SW אינו מכבד את בקשת העקיפה.

**תיקונים:**

```js
// בתחילת fetch handler של ה-SW:
if (req.cache === "no-store") {
  e.respondWith(fetch(req));
  return;
}
```

בפאנל: לבדוק `r.ok`, להוריד מצב בריאות כשיש שגיאות, ולקרוא manifest עם `generatedAt` וסטטוס לכל מקור. ב־`/health` להחזיר `ok:false` ו־503 כשה־cron חסר/ישן או שהריצה נכשלה, במקום `ok:true` קבוע.

---

**ו. בינוני: עמוד סטטי אומר “עכשיו” גם אחרי שהזמן חלף**

מקורות: [build-beach-pages.mjs:51–55,87–89](E:/AIBOMBA/6_YamPlata_v2/weather-app/scripts/build-beach-pages.mjs:51), [154–155](E:/AIBOMBA/6_YamPlata_v2/weather-app/scripts/build-beach-pages.mjs:154), [208](E:/AIBOMBA/6_YamPlata_v2/weather-app/scripts/build-beach-pages.mjs:208).

גם במצב תקין הנתון יכול להיות בן כמעט שלוש שעות; אם הפרסום נעצר, “היום” ו“עכשיו” נשארים ימים. קיימת חותמת עדכון, אבל הכותרות ממשיכות לטעון לנוכחיות.

**תיקון:** להחליף “עכשיו” ב־“תחזית לשעה HH:00 בתאריך …”, לפי `cur.time`, ולהסיר את fallback שמחליף שעה נוכחית חסרה בשעה עתידית בלי לומר זאת. להוסיף `generatedAt` ב־ISO ותווית “התחזית לא עודכנה” אחרי ארבע שעות. `lastmod` צריך לשקף בנייה מוצלחת של העמוד המסוים.

---

**ז. נמוך, אך כדאי לתקן לפני פרסום סרטונים**

מקורות: [video/render.mjs:81–108](E:/AIBOMBA/6_YamPlata_v2/weather-app/tools/video/render.mjs:81), [app:2099–2121](E:/AIBOMBA/6_YamPlata_v2/weather-app/docs/index.html:2099).

- בווידאו כל ציון מ־98 נקרא “10 עגול”, גם כשהמספר המוצג הוא 9.8. להשתמש ב־`top.best.score === 100` לטקסט “10”; בשאר המקרים להציג את המספר בפועל.
- `board.sub` אומר “השעה הכי שטוחה של הבוקר” גם תחת `--target now`. לבחור את הטקסט לפי `TARGET`.
- climatology מחפשת שיא רק ביוני–אוקטובר גם בחוף מותאם בחצי הכדור הדרומי. אם ממשיכים לתמוך בכל העולם, לחשב שיא שנתי עם סף כיסוי שנתי; אחרת לתחום את התכונה גאוגרפית ולקרוא לה “שיא הקיץ שנצפה”, לא שיא שנתי.

## 3. נגישות ומציאות של שימוש בנייד

**א. בינוני: חלון הוספת מקום עלול להיחתך במסך נמוך או כשהמקלדת פתוחה**

מקורות: [app:442–450](E:/AIBOMBA/6_YamPlata_v2/weather-app/docs/index.html:442), [706](E:/AIBOMBA/6_YamPlata_v2/weather-app/docs/index.html:706), [864–880](E:/AIBOMBA/6_YamPlata_v2/weather-app/docs/index.html:864).

החלון ממורכז, אין לו `max-height` או גלילה פנימית, וגלילת הגוף נעולה. המבנה מאפשר מצב שבו כפתורי “הוסף/ביטול” יוצאים מהשטח הנגיש. זה ממצא CSS; לא שחזור על iPhone.

**פאץ׳ מוצע:**

```css
.modal-back {
  overflow-y: auto;
}
.modal {
  max-height: calc(100dvh - 40px);
  overflow-y: auto;
  overscroll-behavior: contain;
}
.field input,
.field select {
  font-size: 16px;
  min-width: 0;
}
.row2 .field {
  min-width: 0;
}
```

לבדוק לאחר מכן 320×568, ‏375×667 ומקלדת פתוחה. הכפתורים העליונים הם 34px במסכים קטנים, [שורות 628–633](E:/AIBOMBA/6_YamPlata_v2/weather-app/docs/index.html:628); להגדיל אזור לחיצה ל־44px כשאפשר. איני מסווג 34px לבדו ככשל WCAG אוטומטי.

---

**ב. בינוני: נשארו אובדן פוקוס ושם נגיש שאינו כולל את הציון**

מקורות: [app:1526–1531](E:/AIBOMBA/6_YamPlata_v2/weather-app/docs/index.html:1526), [2034](E:/AIBOMBA/6_YamPlata_v2/weather-app/docs/index.html:2034), [2443–2461](E:/AIBOMBA/6_YamPlata_v2/weather-app/docs/index.html:2443), [panel:103](E:/AIBOMBA/6_YamPlata_v2/weather-app/docs/panel/index.html:103).

- `aria-label` של כפתור המדד מחליף את שמו הנגיש ואינו כולל את המספר. לשנות ל־`מדד הפלטה X מתוך 10 — הצג פירוט`, או “אין נתונים”.
- `toggleJelly()` בונה מחדש את ה־hero, כולל הכפתור הממוקד. לשחזר פוקוס כפי שכבר נעשה ב־`toggleScore()`.
- סרטון הפתיחה אינו משתמש במנגנון `inert`/העברת הפוקוס של שאר המודלים. להעביר פוקוס ל־`.intro-skip`, להפוך את `.wrap` ל־inert, לשחזר בסגירה ולהוסיף Escape.
- בפאנל להוסיף `<label for="gcToken">טוקן קריאה ל־GoatCounter</label>`; placeholder ארוך אינו תווית טובה.

**מה כבר תקין:** המודלים הרגילים מקבלים פוקוס, משביתים את הרקע עם `inert`, משחזרים פוקוס ונסגרים ב־Escape — [שורות 2954–2964](E:/AIBOMBA/6_YamPlata_v2/weather-app/docs/index.html:2954), [3123–3128](E:/AIBOMBA/6_YamPlata_v2/weather-app/docs/index.html:3123). שורות השבוע ניתנות להפעלה ב־Enter/Space ומציגות חלופה טקסטואלית לגרף — [2193–2203](E:/AIBOMBA/6_YamPlata_v2/weather-app/docs/index.html:2193). אין כאן צורך לשכתב את כל מערכת הנגישות.

---

**ג. נמוך: reduced-motion כמעט מלא, אך גלילה חלקה עוקפת אותו**

מקור: [app:2034](E:/AIBOMBA/6_YamPlata_v2/weather-app/docs/index.html:2034).

לשנות:

```js
l.scrollIntoView({
  behavior: REDUCED.matches ? "auto" : "smooth",
  block: "center",
});
```

הטיפול הקיים באנימציות, count-up וסרטון הפתיחה רחב וטוב: [720–724](E:/AIBOMBA/6_YamPlata_v2/weather-app/docs/index.html:720), [1551–1553](E:/AIBOMBA/6_YamPlata_v2/weather-app/docs/index.html:1551), [2446](E:/AIBOMBA/6_YamPlata_v2/weather-app/docs/index.html:2446).

**RTL וניגודיות:** `dir="rtl"` וטווחים מבודדים ב־`bdi` קיימים. צבעי הדרגות ב־[palata.js:48–55](E:/AIBOMBA/6_YamPlata_v2/weather-app/docs/palata.js:48), מול רקע הכרטיס `#141b2a`, נתנו בחישוב ניגודיות **5.72:1 עד 12.25:1**; צבע הטקסט המשני נתן 5.88:1. לא מצאתי כשל ניגודיות בצבעי הבסיס האלה. זו אינה בדיקה של כל שילובי opacity/gradient ולא אישור נגישות מלא.

## 4. ביצועים

**א. בינוני: אסטרטגיית cache יכולה לערבב HTML חדש עם JavaScript ישן**

מקורות: [sw.js:21,89–95](E:/AIBOMBA/6_YamPlata_v2/weather-app/docs/sw.js:89), [app:943](E:/AIBOMBA/6_YamPlata_v2/weather-app/docs/index.html:943).

HTML נטען network-first, אבל `palata.js?v=36` נשלף עם `ignoreSearch:true`. Service Worker ישן יכול להחזיר את `palata.js` הישן למרות שינוי פרמטר הגרסה. ההערה “fresh HTML never runs a stale cached palata.js” אינה נכונה.

**תיקון:**

```js
const SHELL_ESSENTIAL = [
  "./",
  "manifest.json",
  `palata.js?v=${VERSION.slice(1)}`,
];

// cacheFirst:
const hit = await cache.match(req); // בלי ignoreSearch
```

יש לעדכן באותו release את query הגרסה באפליקציה ובפאנל. עדיף בהמשך filename עם hash. לבדוק שדרוג כאשר ה־SW הקודם עדיין שולט בעמוד; בדיקת דפדפן נקי אינה מכסה את התרחיש.

---

**ב. payload: אינו חוסם השקה, אבל אפשר לחסוך הורדות מיותרות**

מקורות: [app:1–3160](E:/AIBOMBA/6_YamPlata_v2/weather-app/docs/index.html:1), [sw.js:21–32](E:/AIBOMBA/6_YamPlata_v2/weather-app/docs/sw.js:21), [app:884–888](E:/AIBOMBA/6_YamPlata_v2/weather-app/docs/index.html:884).

מדידות קבצים מקומיות:

| רכיב | גודל |
|---|---:|
| `index.html` | 268.5KB; כ־81.1KB ב־gzip מקומי |
| `palata.js` | 10.9KB; כ־4.7KB ב־gzip |
| תמונות optional שמורדות בהתקנת SW | כ־546KB |
| סרטון פתיחה | 75.4KB WebM או 88.4KB MP4 |
| poster | 20.6KB |

אלה גדלים מקומיים, לא מדידת transfer או LCP באתר החי. גודל ה־HTML לבדו אינו חריג מספיק כדי לחסום השקה.

**תיקונים:** להעביר את סרטון הפתיחה ל־`preload="none"` ולהציב sources רק כש־`maybeIntro()` אכן בוחרת להציגו. לשקול הורדת אייקוני 512px רק בעת צורך במקום precache לכל משתמש. חילוץ CSS/JS לקבצים נפרדים יעזור ל־cache ולתחזוקה, אך אינו תיקון דחוף.

---

**ג. בקשות רשת וזמני המתנה חשובים יותר מכרטיס השבוע**

מקורות: [app:1289](E:/AIBOMBA/6_YamPlata_v2/weather-app/docs/index.html:1289), [2173–2204](E:/AIBOMBA/6_YamPlata_v2/weather-app/docs/index.html:2173), [panel:212–239,281–288](E:/AIBOMBA/6_YamPlata_v2/weather-app/docs/panel/index.html:212).

- פתיחה רגילה עם שני חופים: **5 בקשות Open-Meteo**, או 6 עם climatology לא שמורה. הרענון הראשי כל 15 דקות מוסיף שלוש; סריקת חופים אחרים מתחדשת בערך פעם בשעה.
- כרטיס השבוע מכיל **84 עמודות בלבד**. יש ניקוד חוזר וסריקות מערך, אך אין כאן מבנה בלתי מוגבל או ראיה לצוואר בקבוק משמעותי. פירוט ימים נטען רק בפתיחה; חישוב הירח כבר memoized.
- הפאנל מבצע 20 בקשות תחזית, שבע בקשות מערכת, ועד ארבע ל־GoatCounter: **27–31 בקשות לרענון**, ועוד אחת אם המצוף נופל ל־fallback. התחזיות רצות שני fetch במקביל לכל חוף, והחופים עצמם בטור — אין burst של 20 בקשות יחד.
- הפאנל ממשיך לרענן כשהלשונית מוסתרת.
- במסלולי תחזית מרכזיים אין timeout; ב־SW fallback מתרחש רק לאחר ש־fetch נכשל. רשת תקועה עלולה להשאיר skeleton או cron ממתין זמן רב.

**פאץ׳:** להשתמש ב־`AbortSignal.timeout(12000)` בבקשות תחזית, ולוודא שהוא חל גם על קריאת הגוף. ב־SW להשתמש ב־timeout קצר יותר, למשל שמונה שניות, ואז fallback שמסומן stale. בפאנל:

```js
setInterval(() => {
  if (!document.hidden) refreshAll();
}, 15 * 60 * 1000);
```

להוסיף guard נגד רענונים חופפים ו־refresh בעת חזרה אחרי התיישנות. אין צורך בשכתוב כרטיס השבוע לפני ההשקה.

## 5. בריאות הקוד למתחזק יחיד

**א. נוסחת הציון כבר אינה משוכפלת — הממצא הישן סגור**

מקורות: [app:1182–1199](E:/AIBOMBA/6_YamPlata_v2/weather-app/docs/index.html:1182), [palata.js:38–45](E:/AIBOMBA/6_YamPlata_v2/weather-app/docs/palata.js:38).

ב־HEAD הנוכחי:

- `palataIndex()` קוראת ל־`Palata.scoreOf`.
- `palataBreakdown()` מייצרת הסבר לגורמים; היא אינה מחברת בעצמה את הציון הסופי.

**אין צורך בתיקון נוסף של הכפילות הזאת.**

עם זאת, מתכון הקלט עדיין משוכפל: [app:1239–1328](E:/AIBOMBA/6_YamPlata_v2/weather-app/docs/index.html:1239) מול [palata.js:89–124](E:/AIBOMBA/6_YamPlata_v2/weather-app/docs/palata.js:89). כאשר המודלים המועדפים חסרים, האפליקציה עשויה ליפול ל־EWAM/GWAM/GFS בעוד המתכון המשותף משתמש בקבוצה אחרת. לכן “אותו ציון בכל המשטחים” אינו מובטח בכל מסלול fallback.

**תיקון:** לחשב את ארבעת קלטי הציון באפליקציה באמצעות `Palata.blendHourly(marine,weather)`. את המודלים הנוספים להשאיר לחישוב spread ונתוני תצוגה בלבד. להשתמש ב־`Palata.median` גם במסלול התצוגה; ה־median המקומי עדיין מסנן רק null, ובבדיקה עם מחרוזות מספריות החזיר `NaN`.

---

**ב. גבוה: הבדיקות עוברות, אך אינן מכסות את התקלות התפעוליות**

מקור: [workers/push/test/policy.test.mjs:19–127](E:/AIBOMBA/6_YamPlata_v2/weather-app/workers/push/test/policy.test.mjs:19).

12 הבדיקות הקיימות מועילות: ניקוד, onset, cap, quiet, deluxe, ערב, blending ו־stateSignature. חסרות בדיקות למסירה, אחסון, parsing, פרסום ו־offline. בשלושת ה־workflows אין הרצת tests.

**פאץ׳ מוצע:** להוסיף workflow לבדיקות על push ו־pull request, עם:

```yaml
- run: node --test workers/push/test/*.test.mjs
```

ולהוסיף בדיקות ממוקדות, לפי הסיכון:

1. Push מחזיר 429/500: האירוע אינו מסומן כנשלח; הצלחה אחרת באותה ריצה נשמרת.
2. רשומת שרת חסרה עם browser subscription תקין: reconcile רושם מחדש.
3. יותר מעמוד KV אחד ומיצוי תקציב מנה.
4. DST ב־25.10.2026 וב־26.3.2027, מעבר שנה, ו־05:00→06:00.
5. שעה חסרה בתוך חלון רגוע; יום ללא אף ציון.
6. fixture מדוזות עם “אין מדוזות”, שדה חסר ושינוי markup.
7. SW ישן מול HTML חדש, offline ו־`cache:"no-store"`.
8. כשל בכל חופי SEO: exit לא־אפס וללא `lastmod` חדש.

אין צורך להוסיף בדיקות שמעתיקות כל פרט עיצובי; אלה תרחישים שיכולים לשבור שירות ללא התרעה.

---

**ג. נמוך: הערות מיושנות וקוד מת מקשים על תחזוקה**

מקורות: [Worker:18](E:/AIBOMBA/6_YamPlata_v2/weather-app/workers/push/src/index.js:18), [panel:258](E:/AIBOMBA/6_YamPlata_v2/weather-app/docs/panel/index.html:258), [app:989–999](E:/AIBOMBA/6_YamPlata_v2/weather-app/docs/index.html:989), [sw.js:148–150](E:/AIBOMBA/6_YamPlata_v2/weather-app/docs/sw.js:148).

- `FORECAST_TTL_MS` מוגדר ואינו בשימוש.
- `d1` בפאנל מחושב ואינו בשימוש.
- הערות Push עדיין מתארות Google Form/Sheet ו־`send-push.mjs`, אף שהמערכת משתמשת ב־Worker.
- ההערה בפאנל על טוקן ב־localStorage כבר אינה תואמת למימוש בזיכרון.

**תיקון:** למחוק את המשתנים הלא־משומשים ולעדכן את ההערות לארכיטקטורה בפועל. אין הצדקה לשכתוב framework לצורך השקה.

## 6. פסק דין: READY OR NOT

**NOT READY להפעלה ללא השגחה. המוצר קרוב, אבל שרשרת הפרסום והאמינות התפעולית עדיין אינן סגורות.**

לפני שמחשיבים אותו כמושק:

1. להבטיח פרסום Pages מפורש של התוצרים, ולוודא ששתי ריצות אוטומטיות רצופות מתעדכנות באתר ללא push ידני.
2. לתקן שמירת הצלחות/כשלי Push, ולבחור קיבולת נתמכת — מעשית, Workers Paid עם מדידת CPU ומכסות.
3. להפוך כשלי שאיבה ובנייה לכשלים נראים, עם heartbeat והתרעה חיצונית.
4. לתקן “אין מדוזות” כאזהרה, רצפים דרך נתונים חסרים ובאנר שמתבסס על נתונים ישנים.
5. לתקן עקיפת גרסת `palata.js` ב־SW, ולבדוק שדרוג/offline במכשיר שכבר התקין את האתר.

**יכול להמתין:** פיצול הקובץ הגדול, אופטימיזציה נוספת של השבוע, ליטוש גרפים ופינוי היסטוריית Git שכבר קיימת. תיקוני DST הקטנים צריכים להיכנס לפני 25 באוקטובר.

**בדיקה חודשית קצרה:** שימוש ו־CPU ב־Cloudflare, מספר רשומות ומסירות כושלות, schedules פעילים ב־GitHub, גיל הפרסום והפידים, canary למודלים, קבלת Push באייפון מותקן, ופתיחה offline אחרי עדכון גרסה.

לאחר תיקוני החסימה האלה, אין בקוד שנבדק סיבה לדרוש שכתוב גדול לפני השקה.

Codex session ID: 01a0c874-3f8e-77b0-8c38-22cae00ef678
Resume in Codex: codex resume 01a0c874-3f8e-77b0-8c38-22cae00ef678
