**1. אימות חלק A**

הבדיקה מתייחסת ל־**HEAD המקומי `5cc84ee`**. ניסיתי תחילה `git pull`, אך הוא נחסם בכתיבה ל־`.git/FETCH_HEAD`; גם `git ls-remote` נכשל בחיבור לרשת. קראתי את שלושת הדוחות הקודמים והשוויתי את השינויים המבוקשים. **לא שיניתי קבצים, לא פרסתי ולא שלחתי התראות.**

**המסקנה: קיימות שתי רגרסיות בהתראות, ו־`checkedAt` עדיין אינו מספק heartbeat כשהתוכן נשאר זהה. חסימת הפרסום החלקי כבר תוקנה ב־`5cc84ee`.**

**א. `runScheduled`: אישור רק אחרי 2xx — נכון; שמירת מצב המעבר — רגרסיה**

הוספת `e.id` ל־`acked` נעשית רק לאחר 2xx. הבעיה היא שכל כשל, לרבות כשל בהודעת ערב שאינה קשורה למעבר לרגיעה, מחזיר את `lastCalm/lastScore` למצב הקודם. ראו [index.js:280–301](E:/AIBOMBA/6_YamPlata_v2/weather-app/workers/push/src/index.js:280).

אלה ארבעת התרחישים שהתבקשו, שנבדקו גם בהרצת גוף `runScheduled` האמיתי בזיכרון עם `decide()` האמיתית ותחליפים לרשת ול־KV:

| תרחיש | מה קורה בפועל | פסק דין |
|---|---|---|
| **הראשון מצליח, השני נכשל** | ב־19:45, `lastCalm=false`, ציון 90 ורגיעה גם בשעות 20–21: נוצרים onset ו־evening. onset מקבל 201; evening מקבל 500. נשמר מזהה onset של שעה 19, אבל `lastCalm` נשאר false. ב־20:00 נוצר onset חדש עם סיומת `:20`, ולכן נשלחת שוב הודעה על אותו רצף רגיעה. | **רגרסיה משוחזרת.** |
| **404 באמצע הלולאה** | אחרי הצלחה ראשונה, 404 בשנייה גורם ל־`break`, למחיקת המנוי ול־`continue`. ההצלחות אינן נכתבות מחדש לרשומה שנמחקה. בריצה הבאה המנוי אינו ברשימה. | **תקין**, בהנחת הצלחת מחיקת KV. |
| **חריגה מ־`sendPush`** | החריגה נתפסת לכל הודעה; הלולאה ממשיכה והצלחות קודמות נשמרות. אם החריגה בהודעת הערב אחרי onset מוצלח, מתקבלת אותה כפילות במעבר 19:45→20:00. אם onset נכשל והערב מצליח, רק onset מנוסה שוב. | בידוד החריגה **תקין**, אבל שחזור המצב הרחב מדי **שגוי**. |
| **אין `sent` במצב המנוי** | גם המדיניות וגם `acked` משתמשים ב־`state.sent || []`; אין חריגה. אחרי הצלחה נשמר מערך המזהים. | **תקין.** |

הבסיס המדויק ליצירת onset חדש הוא [policy.js:75–88](E:/AIBOMBA/6_YamPlata_v2/weather-app/workers/push/src/policy.js:75): המזהה כולל **שעה**, וההחלטה תלויה ב־`!state.lastCalm`. הודעת הערב נוצרת בנפרד ב־[policy.js:100–114](E:/AIBOMBA/6_YamPlata_v2/weather-app/workers/push/src/policy.js:100). הטיפול בחריגה ובמחיקה נמצא ב־[index.js:284–295](E:/AIBOMBA/6_YamPlata_v2/weather-app/workers/push/src/index.js:284); ברירת המחדל ל־`sent` נמצאת גם ב־[policy.js:68](E:/AIBOMBA/6_YamPlata_v2/weather-app/workers/push/src/policy.js:68).

**הדיוק החשוב:** בתוך אותה שעה, מזהה onset שכבר אושר חוסם שליחה נוספת. הכפילות המשוחזרת היא של **אותו מעבר לרגיעה תחת מזהה שעתי חדש**, לא של אותו `e.id`. לדוגמה, אם 19:30 מצליח ו־19:45 נכשל שוב רק בערב, הכפילות מופיעה ב־20:00.

**ב. סמן deluxe — רגרסיה נוספת**

onset בציון 98 ומעלה מקבל `type: "deluxe"` ומזהה מסוג `...:onset:...`; המדיניות מוסיפה לצדו סמן deluxe יומי. ה־Worker מחפש דווקא `e.type === "onset"`, ולכן אינו שומר את הסמן במקרה הדרוש. ראו [policy.js:85–88](E:/AIBOMBA/6_YamPlata_v2/weather-app/workers/push/src/policy.js:85), [index.js:289–290](E:/AIBOMBA/6_YamPlata_v2/weather-app/workers/push/src/index.js:289).

רצף משוחזר:

1. 10:00: מעבר ממצב לא רגוע לציון 99; הודעת deluxe-onset מתקבלת.
2. 10:15: הציון יורד ל־90, כך שהים עדיין רגוע.
3. 10:30: הציון עולה ל־99.
4. סמן deluxe היומי חסר, ולכן נשלחת הודעת deluxe נוספת דרך [policy.js:92–96](E:/AIBOMBA/6_YamPlata_v2/weather-app/workers/push/src/policy.js:92).

**ג. `SENT_KEEP_HINT` מול `SENT_KEEP` — אותו ערך, ללא תקלה נוכחית**

שניהם **40**: [palata.js:144](E:/AIBOMBA/6_YamPlata_v2/weather-app/docs/palata.js:144), [policy.js:15](E:/AIBOMBA/6_YamPlata_v2/weather-app/workers/push/src/policy.js:15). השימוש ב־`Palata` עובד כרגע, אבל יוצר שני מקורות לאותו קבוע. נכון לייבא את `SENT_KEEP` ממודול המדיניות.

**הפאץ׳ המוצע לשתי הרגרסיות**

ב־[index.js:14](E:/AIBOMBA/6_YamPlata_v2/weather-app/workers/push/src/index.js:14):

```diff
-import { decide, israelParts, scoreHours, stateSignature } from "./policy.js";
+import { decide, israelParts, scoreHours, stateSignature, SENT_KEEP } from "./policy.js";
```

להחליף את שורות 280–295 בתוכן הבא:

```js
const acked = new Set(prevState.sent || []);
let gone = false, retryTransition = false;

for (const e of events) {
  let status;
  try {
    status = await sendPush(env, rec.sub, {
      title: e.title,
      body: e.body,
      tag: e.tag,
      url: e.url,
    });
  } catch (err) {
    if (e.type !== "evening") retryTransition = true;
    errors++;
    console.warn("push threw", rec.beach.key, e.type, err && err.message);
    continue;
  }

  if (status === 404 || status === 410) {
    gone = true;
    break;
  }

  if (status >= 200 && status < 300) {
    sent++;
    acked.add(e.id);

    // A deluxe onset acknowledges both its onset id and daily deluxe marker.
    if (
      e.type === "deluxe" &&
      e.id.startsWith(`${rec.beach.key}:onset:`)
    ) {
      acked.add(`${rec.beach.key}:deluxe:${now.dateStr}`);
    }
  } else {
    if (e.type !== "evening") retryTransition = true;
    errors++;
    console.warn("push status", status, rec.beach.key, e.type);
  }
}

if (gone) {
  await env.SUBS.delete(k);
  dropped++;
  continue;
}

// Evening retries depend on their sent id, not on lastCalm/lastScore.
const nextState = {
  ...(retryTransition ? prevState : state),
  sent: [...acked].slice(-SENT_KEEP),
};
```

ואפשר להסיר את הכפילות ב־[palata.js:144](E:/AIBOMBA/6_YamPlata_v2/weather-app/docs/palata.js:144):

```diff
-    SENT_KEEP_HINT: 40,   // how many notification ids a subscriber keeps (mirrors SENT_KEEP in the push policy)
```

התיקון נבדק בזיכרון ומנע את שני הרצפים לעיל. **12/12 מבחני המדיניות הקיימים עברו.** מגבלות הקריסה בין מסירה לכתיבת KV, שכבר תועדו, אינן מוצגות כאן כממצא חדש.

**ד. `checkedAt` בשני הפידים — אין רעש commits, אבל גם אין heartbeat תקין**

- **מדוזות:** ההשוואה היא של `reports` בלבד. כשהדיווחים זהים, שורה 103 יוצאת לפני הכתיבה בשורה 106. לכן `checkedAt` החדש כלל אינו נשמר. שימור `updated` בשורה 102 אינו משנה זאת. [fetch-jellyfish.mjs:97–106](E:/AIBOMBA/6_YamPlata_v2/weather-app/scripts/fetch-jellyfish.mjs:97).
- **מצוף:** אותה בעיה: `checkedAt` נוצר בשורה 52, אבל מדידה זהה גורמת ל־return בשורה 63 לפני הכתיבה. [fetch-buoy.mjs:50–68](E:/AIBOMBA/6_YamPlata_v2/weather-app/scripts/fetch-buoy.mjs:50).

בשתי בדיקות no-change בזיכרון התקבלו **אפס כתיבות**.

**פסק הדין:** החשש מ־commit בכל שעה **לא התממש בקוד הנוכחי**. ההבטחה ש־`checkedAt` מתקדם בכל בדיקה מוצלחת **אינה נכונה**.

אי אפשר גם לפרסם timestamp חדש בכל שעה באמצעות commit וגם להימנע מאותם commits. במסגרת הפרסום הקיים, הצעת ביניים מדויקת היא **heartbeat שפורסם לכל היותר פעם בשש שעות כשהתוכן זהה**, ועדכון מיידי כשהתוכן משתנה.

ב־`scripts/fetch-jellyfish.mjs`:

```diff
-  // keep the timestamp stable if reports are unchanged, so we don't create noise commits
+  // Preserve content time; publish an unchanged-feed heartbeat at most every six hours.
@@
-      if (JSON.stringify(prev.reports) === JSON.stringify(reports)) { console.log("no change"); return; }
+      if (JSON.stringify(prev.reports) === JSON.stringify(reports)) {
+        const age = Date.now() - Date.parse(prev.checkedAt);
+        if (Number.isFinite(age) && age >= 0 && age < 6 * 3600000) {
+          console.log("no change; published heartbeat is recent");
+          return;
+        }
+      }
```

ב־`scripts/fetch-buoy.mjs`:

```diff
-    checkedAt: new Date().toISOString(),   // advances on every successful run, even when the measurement is unchanged
+    checkedAt: new Date().toISOString(),   // time of the successful check published in this snapshot
@@
-  // Keep timestamps stable when the measurement is unchanged, to avoid noise commits.
+  // Preserve content time; publish an unchanged-feed heartbeat at most every six hours.
@@
-      if (JSON.stringify(prev.measured) === JSON.stringify(measured)) { console.log("no change"); return; }
+      if (JSON.stringify(prev.measured) === JSON.stringify(measured)) {
+        if (prev.updated) out.updated = prev.updated;
+        const age = Date.now() - Date.parse(prev.checkedAt);
+        if (Number.isFinite(age) && age >= 0 && age < 6 * 3600000) {
+          console.log("no change; published heartbeat is recent");
+          return;
+        }
+      }
```

זה שינוי משמעות מפורש: **הבדיקה האחרונה שפורסמה**, ולא בהכרח הריצה האחרונה. אם נדרש heartbeat מכל ריצה, צריך להסיר את יציאות ה־no-change ולפרסם מחוץ להיסטוריית Git, במסלול artifacts שכבר הוצע בדוח הקודם.

**ה. בניית דפי חופים — חסימת ההצלחה החלקית כבר אינה רלוונטית ב־HEAD**

ב־`f37fbbe` כשל חלקי אכן הסתיים ב־exitCode=1 ודילג על שלב ה־commit. `5cc84ee` החליף זאת באזהרה.

| מצב נוכחי | תוצאה |
|---|---|
| 10/10 הצליחו | exit 0; שלב commit יכול לרוץ. |
| 7/10 הצליחו עקב שלוש שגיאות תחזית | exit 0, אזהרת Actions, נכתבים שבעת זוגות העמודים; שלב commit יכול לרוץ. |
| 0/10 הצליחו | exit 1 לפני כתיבת sitemap; שלב commit מדולג. |

אומת בזיכרון מול לולאת הבנייה האמיתית. המקורות: [build-beach-pages.mjs:213–240](E:/AIBOMBA/6_YamPlata_v2/weather-app/scripts/build-beach-pages.mjs:213), [beach-pages.yml:28–38](E:/AIBOMBA/6_YamPlata_v2/weather-app/.github/workflows/beach-pages.yml:28).

**זו מדיניות סבירה לכשלי תחזית חלקיים. אין להוסיף `if: always()` לשלב commit**, משום שאז גם כשל מלא או כשל אחר עלולים לפרסם תוצרים לא שלמים. בעיית `lastmod` לכל הכתובות עדיין נראית ב־[שורות 229–233](E:/AIBOMBA/6_YamPlata_v2/weather-app/scripts/build-beach-pages.mjs:229); היא כבר תועדה בדוח הקודם ואינה ממצא חדש כאן.

**ו. כרטיס המדוזות בפאנל — מימוש נכון, תלוי בפיד שטרם תוקן**

הכרטיס משתמש ב־`checkedAt || updated`, מציג גיל תוכן בנפרד ומדרג בריאות לפי 8/26 שעות. ההפרדה נכונה. מקור התקלה הוא שהסקריפט אינו מפרסם בדיקות ללא שינוי. [panel/index.html:183–191](E:/AIBOMBA/6_YamPlata_v2/weather-app/docs/panel/index.html:183).

אם מאמצים את heartbeat בן שש השעות, החלפה מדויקת בתוך תבנית שורה 191:

```diff
-נבדק ${agoText(checked)}
+בדיקה אחרונה שפורסמה: ${agoText(checked)}
```

---

**2. ממצאים חדשים מחלק B**

**לא אישרתי חולשת אבטחה חדשה נוספת.** סרקתי את גבולות הקלט וה־HTML באפליקציה ובפאנל, מסלולי ה־Worker, ה־SW, סקריפטי הבנייה וכלי הווידאו. שתי תקלות ההתראות לעיל הן ממצאי אמינות; איני מציג אותן שוב כחולשות אבטחה. הממצאים והסיכונים המוכרים לא נספרו מחדש.

בדיקות התלויות:

| בדיקה | תוצאה |
|---|---|
| `workers/push`: ‏`npm audit --omit=dev` | הופעלה באמצעות `npm.cmd`; נכשלה בגישה ל־audit endpoint של npm. **אין תוצאת audit תקפה.** |
| `tools/video`: ‏`npm audit` | אותה תוצאה. |
| בדיקת lockfiles | Worker: ‏`@block65/webcrypto-web-push@2.0.0`, ‏`uint8array-extras@1.5.0`; וידאו: ‏`playwright@1.63.0`, ‏`playwright-core@1.63.0`. |

מקורות: [Worker lockfile:15–21](E:/AIBOMBA/6_YamPlata_v2/weather-app/workers/push/package-lock.json:15), [Worker lockfile:1432](E:/AIBOMBA/6_YamPlata_v2/weather-app/workers/push/package-lock.json:1432), [video lockfile:12–31](E:/AIBOMBA/6_YamPlata_v2/weather-app/tools/video/package-lock.json:12).

ה־advisory המאומת שמצאתי ל־Playwright, ‏**CVE-2025-59288 / GHSA-7mvr-c777-76hp**, חל על גרסאות **מתחת ל־1.55.1**, ולכן אינו חל על הגרסה הנעולה כאן. אין הצדקה להציע שדרוג בגללו. [ה־advisory](https://github.com/advisories/GHSA-7mvr-c777-76hp).

**אין פאץ׳ אבטחה חדש להציע על סמך ראיות הבדיקה הזאת.** אין לפרש זאת כ־“npm audit מצא אפס חולשות”.

---

**3. מוכנות לחנויות**

**חובה לפני הגשה**

**א. Digital Asset Links וקובץ `.nojekyll`**

במלאי הקבצים המקומי **אין** `docs/.nojekyll`, ‏`docs/_config.yml` או `docs/.well-known/assetlinks.json`. לקבצים שאינם קיימים אין מספר שורה שאפשר לצטט.

לא נמצאו ב־`docs/` קובצי Markdown, ‏front matter או שימושי Liquid של Jekyll. הדפים נכתבים כ־HTML מלא בסקריפט, ומפת האתר נכתבת במפורש: [build-beach-pages.mjs:66](E:/AIBOMBA/6_YamPlata_v2/weather-app/scripts/build-beach-pages.mjs:66), [222–233](E:/AIBOMBA/6_YamPlata_v2/weather-app/scripts/build-beach-pages.mjs:222). הדומיין מוגדר ב־[docs/CNAME:1](E:/AIBOMBA/6_YamPlata_v2/weather-app/docs/CNAME:1).

לכן **לא נמצאה תלות נוכחית בעיבוד Jekyll**. הוספת `.nojekyll` תבטל אותו ותאפשר פרסום הספרייה הנקודתית; היא אינה משנה את הדומיין או יוצרת מסלול פריסה חדש. Jekyll מסנן כברירת מחדל ספריות שמתחילות בנקודה. [תיעוד GitHub](https://docs.github.com/en/pages/setting-up-a-github-pages-site-with-jekyll/about-github-pages-and-jekyll).

קבצים מוצעים:

- **`docs/.nojekyll` — קובץ ריק, אפס בייטים.**
- **`docs/.well-known/assetlinks.json` — התוכן המלא:**

```json
[
  {
    "relation": [
      "delegate_permission/common.handle_all_urls"
    ],
    "target": {
      "namespace": "android_app",
      "package_name": "com.yamplata.app",
      "sha256_cert_fingerprints": [
        "REPLACE_WITH_PLAY_APP_SIGNING_CERT_SHA256"
      ]
    }
  }
]
```

יש להחליף את ה־placeholder בטביעת SHA-256 של **App signing key certificate ב־Play Console**. בדיקה של APK מקומי עשויה להשתמש בתעודה אחרת; אין להסתפק ב־upload key אם Play חותם מחדש.

תנאי הקבלה: URL מדויק ב־HTTPS, תשובת 200, ‏`Content-Type: application/json`, וללא redirect. בחבילת Android חייבת להיות גם ההצהרה ההפוכה לאתר. ללא אימות, הדפדפן יכול לפתוח Custom Tab עם סרגל כתובת. [Android Asset Links](https://developer.android.com/training/app-links/configure-assetlinks), [Chrome TWA](https://developer.chrome.com/docs/android/trusted-web-activity/quick-start).

**ב. חבילת Android והגדרות ההגשה**

לא נמצא בריפו פרויקט Android או `twa-manifest.json`; לכן אין עדיין חבילה שאפשר לאשר להגשה. הנתיב המומלץ הוא Bubblewrap או יצוא Android מ־PWABuilder, עם:

```text
Package ID: com.yamplata.app
Host: yamplata.com
Start URL: /
Web manifest: https://yamplata.com/manifest.json
App name: YAM PLATA
Notifications: enabled
```

פקודות מוצעות בלבד, לאחר יצירת ספריית פרויקט Android ייעודית:

```sh
bubblewrap init --manifest=https://yamplata.com/manifest.json
bubblewrap build
```

יש לייצר **AAB חתום** ולהגדיר בפרויקט שנוצר:

```groovy
android {
    compileSdkVersion 36

    defaultConfig {
        applicationId "com.yamplata.app"
        targetSdkVersion 36
    }
}
```

נכון למועד הבדיקה, אפליקציות חדשות ועדכונים ל־Google Play נדרשים ל־Android 16 / API 36 ומעלה מאז 31.8.2026. יש לוודא שגרסת כלי האריזה וה־Android Gradle Plugin שנבחרו תומכת בכך. [דרישות Target API](https://support.google.com/googleplay/android-developer/answer/11926878?hl=en-gb).

בנוסף נדרשים פרטי חנות, דירוג תוכן, הצהרות Data safety ומסלול הבדיקות שהחשבון מחויב בו. אלה הגדרות Console, לא תיקון ל־manifest של האתר.

**ג. מדיניות פרטיות ציבורית וקישור מתוך האפליקציה**

README אינו תחליף לדף פרטיות. שתי החנויות דורשות מדיניות נגישה וקישור מתוך האפליקציה; Google דורשת גם איש קשר ותיאור שמירה ומחיקה. [Google Play](https://support.google.com/googleplay/android-developer/answer/10144311?hl=en), [Apple 5.1.1](https://developer.apple.com/app-store/review/guidelines/#privacy).

אלה זרימות הנתונים שעליהן מבוסס הנוסח:

| נושא | מה אומת |
|---|---|
| מיקום | “קרוב אליי” בוחר חוף מוכר בטווח 40 ק״מ; אחרת שומר מיקום מעוגל לארבע ספרות אחרי הנקודה. [index.html:3073–3088](E:/AIBOMBA/6_YamPlata_v2/weather-app/docs/index.html:3073). |
| תחזיות ומצופים | קואורדינטות נשלחות לשירותי התחזית ול־Worker של המצופים. [index.html:1289](E:/AIBOMBA/6_YamPlata_v2/weather-app/docs/index.html:1289), [2053–2054](E:/AIBOMBA/6_YamPlata_v2/weather-app/docs/index.html:2053). ה־Worker בוחר תחנה מכתובות קבועות. [Worker:97–116](E:/AIBOMBA/6_YamPlata_v2/weather-app/workers/push/src/index.js:97). |
| Push | KV שומר endpoint, ‏auth/p256dh, שם וקואורדינטות חוף, מצב וזמנים; הכתיבה ללא TTL. [Worker:215–218](E:/AIBOMBA/6_YamPlata_v2/weather-app/workers/push/src/index.js:215). ביטול מבקש מחיקה בשרת ומבטל בדפדפן. [index.html:2861–2869](E:/AIBOMBA/6_YamPlata_v2/weather-app/docs/index.html:2861). |
| מפות | קישור מקוצר נשלח ל־Worker; הקואורדינטות נשלחות ל־Nominatim בזמן מילוי השדה, עוד לפני “הוסף”. [index.html:3006–3046](E:/AIBOMBA/6_YamPlata_v2/weather-app/docs/index.html:3006). |
| Google Forms | נשלחים דיווח המשתמש, שם החוף, הציון ופרטי תחזית הכוללים זמן. [index.html:2011–2029](E:/AIBOMBA/6_YamPlata_v2/weather-app/docs/index.html:2011). |
| תמונות | עיבוד ב־canvas, יצירת JPEG מקומית ושיתוף/שמירה ביוזמת המשתמש. [index.html:2503–2512](E:/AIBOMBA/6_YamPlata_v2/weather-app/docs/index.html:2503), [2614–2620](E:/AIBOMBA/6_YamPlata_v2/weather-app/docs/index.html:2614), [2706–2712](E:/AIBOMBA/6_YamPlata_v2/weather-app/docs/index.html:2706). זיהוי מקום לתמונה מפעיל geolocation. [2474–2494](E:/AIBOMBA/6_YamPlata_v2/weather-app/docs/index.html:2474). |
| אנליטיקה ומשאבים חיצוניים | GoatCounter פעיל, כולל אירועי שימוש וקבוצת ביקורים חוזרים. [index.html:2414–2437](E:/AIBOMBA/6_YamPlata_v2/weather-app/docs/index.html:2414). Fonts ו־QR נטענים מבחוץ. [58](E:/AIBOMBA/6_YamPlata_v2/weather-app/docs/index.html:58), [2371](E:/AIBOMBA/6_YamPlata_v2/weather-app/docs/index.html:2371). |

אין להעתיק מה־README הבטחה גורפת של “בלי מזהה אישי”: קוד האפליקציה אינו מגדיר מזהה משתמש לאנליטיקה, אבל לספק מגיעה בקשת רשת והוא מעבד IP ופרטי דפדפן. הגדרות איסוף נוספות קיימות אצל הספק ולא נבדקו בחשבון. [מדיניות GoatCounter](https://www.goatcounter.com/help/privacy).

**התוכן המלא המוצע ל־`docs/privacy/index.html`:**

שני placeholders מחייבים השלמה לפני פרסום: `OWNER_LEGAL_NAME` ו־`PRIVACY_CONTACT_EMAIL`. לא מצאתי בריפו פרטי קשר מאומתים שאפשר להציב במקומם.

```html
<!doctype html>
<html lang="he" dir="rtl">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="theme-color" content="#0a0e16">
  <meta name="description"
        content="מדיניות הפרטיות של YAM PLATA — מיקום, התראות, תמונות ונתוני שימוש.">
  <title>מדיניות פרטיות | YAM PLATA</title>
  <link rel="canonical" href="https://yamplata.com/privacy/">
  <link rel="icon" href="/favicon.ico">
  <style>
    :root {
      color-scheme: dark;
      background: #0a0e16;
      color: #e6edf6;
      font-family: system-ui, sans-serif;
      line-height: 1.75;
    }
    body {
      max-width: 760px;
      margin: auto;
      padding: 24px 20px 60px;
    }
    a { color: #5eead4; }
    a:focus-visible {
      outline: 3px solid #ffd479;
      outline-offset: 4px;
    }
    h1, h2, h3 { line-height: 1.35; }
    h2 { margin-top: 2rem; }
    section + section {
      margin-top: 3rem;
      padding-top: 2rem;
      border-top: 1px solid #526174;
    }
    .meta { color: #b6c2d2; }
    [dir="ltr"] { text-align: left; }
  </style>
</head>
<body>
  <nav aria-label="ניווט">
    <a href="/">חזרה לים פלטה</a>
    · <a href="#english" lang="en">English</a>
  </nav>

  <main>
    <section aria-labelledby="privacy-he">
      <h1 id="privacy-he">מדיניות פרטיות — YAM PLATA</h1>
      <p class="meta">עודכן: 23 בספטמבר 2026</p>
      <p>
        מפעיל השירות: OWNER_LEGAL_NAME.
        לפניות פרטיות ובקשות מחיקה:
        <a href="mailto:PRIVACY_CONTACT_EMAIL">
          <bdi>PRIVACY_CONTACT_EMAIL</bdi>
        </a>.
      </p>
      <p>
        מדיניות זו מתארת את האתר yamplata.com ואת השימוש בו
        כאפליקציית אינטרנט מותקנת או באמצעות מעטפת Android.
        השירות אינו דורש יצירת חשבון משתמש.
      </p>

      <h2>מידע שנשמר במכשיר</h2>
      <p>
        האפליקציה שומרת בדפדפן העדפות, חופים מותאמים וקואורדינטותיהם,
        פרטי מצב של הרשמה להתראות, נתוני שימוש מקומיים כגון מספר ביקורים,
        ונתוני תחזית במטמון. האחסון מאפשר לזכור בחירות ולהציג מידע
        שנשמר גם כאשר אין חיבור. אפשר להסיר מידע זה באמצעות מחיקת
        נתוני האתר בהגדרות הדפדפן. מחיקה מקומית אינה מוחקת כשלעצמה
        רשומות שכבר נשמרו בשרת.
      </p>

      <h2>מיקום, תחזיות וקישורי מפות</h2>
      <p>
        גישה למיקום המכשיר מתבקשת בעקבות שימוש ב״קרוב אליי״ או
        בעיבוד תמונה. אפשר לסרב ולהמשיך לבחור חוף ידנית.
        אין בקוד מעקב רציף אחר מיקום המכשיר ברקע.
      </p>
      <p>
        ״קרוב אליי״ בוחר חוף מוכר בטווח של עד 40 ק״מ.
        אם אין חוף כזה, נשמר מיקום המבוסס על הקואורדינטות שהתקבלו,
        מעוגלות לארבע ספרות אחרי הנקודה.
        קואורדינטות החוף הנבחר נשלחות ל־Open-Meteo לקבלת תחזיות
        ונתוני עבר, ולשירות המצופים שלנו ב־Cloudflare לצורך בחירת תחנה.
        לפיכך, בחירת ״המיקום שלי״ עשויה להעביר קואורדינטות המבוססות
        על מיקום המכשיר.
      </p>
      <p>
        בעת הזנת קישור מפות מקוצר, הקישור עשוי להישלח לשירות שלנו
        ב־Cloudflare ולספק המפות לצורך פתיחתו.
        קואורדינטות שפוענחו נשלחות ל־Nominatim של OpenStreetMap
        לקבלת שם מקום. פעולות אלה עשויות להתרחש במהלך מילוי השדה,
        לפני אישור הוספת החוף.
      </p>

      <h2>התראות</h2>
      <p>
        בהפעלת התראות ובהרשמה מוצלחת, נשמרים ב־Cloudflare Workers KV
        כתובת מנוי Push, מפתחות המנוי, מזהה ושם החוף, קואורדינטות,
        מצב ההתראות וזמני יצירה ועדכון.
        המידע משמש לשליחת התראות על החוף הרשום גם כשהאפליקציה סגורה,
        ולא למעקב אחר תנועת המכשיר.
        מסירת ההתראות נעשית באמצעות שירות ה־Push של הדפדפן או הפלטפורמה.
      </p>
      <p>
        לא מוגדרת כיום תפוגה אוטומטית לרשומות המנוי.
        כיבוי ההתראות באפליקציה מבטל את המנוי בדפדפן ומבקש
        את מחיקת הרשומה בשרת. השלמת המחיקה תלויה בהצלחת הבקשה.
        מנויים שהספק מסמן כלא קיימים או שפג תוקפם מוסרים בעת ניסיון מסירה.
        אפשר לפנות אלינו לבקשת מחיקה או בירור.
      </p>

      <h2>מצלמה, תמונות ושיתוף</h2>
      <p>
        צילום או בחירת תמונה נעשים ביוזמתכם.
        התמונה מעובדת במכשיר באמצעות canvas ואינה מועלת לשרת
        של האפליקציה במסלול העיבוד.
        לצורך הצמדת מדד לחוף הקרוב עשויה להתבקש הרשאת מיקום
        ולהיטען תחזית של חוף מוכר.
      </p>
      <p>
        התמונה שנוצרת עשויה לכלול שם חוף, שעה ונתוני תחזית.
        היא מועברת ליעד חיצוני רק כאשר אתם בוחרים לשתף אותה;
        שמירה ושיתוף כפופים גם לאפליקציה או לשירות שבחרתם.
        אירועי שימוש במצלמה ותקלות עיבוד עשויים להימדד באנליטיקה,
        ללא תוכן התמונה.
      </p>

      <h2>דיווחים על מצב הים</h2>
      <p>
        דיווח יזום נשלח ל־Google Forms וכולל את מצב הים שבחרתם,
        שם החוף, הציון החזוי ופרטי תחזית כגון גלים, רוח,
        טמפרטורת מים וזמן התחזית.
        שם חוף מותאם נכלל בדיווח, ולכן רצוי שלא לשלב בו פרטים אישיים.
        אין באפליקציה מנגנון מחיקה אוטומטית של דיווחים אלה.
        לבקשת מחיקה אפשר לפנות אלינו ולציין את החוף ומועד הדיווח.
      </p>

      <h2>אנליטיקה וספקים חיצוניים</h2>
      <p>
        אנו משתמשים ב־GoatCounter למדידת ביקורים ואירועי שימוש,
        כגון פתיחה, שיתוף, התקנה, שימוש במצלמה והתראות.
        אירועים עשויים לכלול מזהה טכני של חוף, מצב הרשאה,
        סוג פעולה או הודעת שגיאה קצרה.
        האפליקציה גם מסווגת ביקורים לקבוצות כלליות של שימוש חוזר
        לפי מונה מקומי.
      </p>
      <p>
        לפי תיעוד GoatCounter, מדידת המבקרים אינה משתמשת בעוגיות.
        עם זאת, בקשות רשת חושפות לספק כתובת IP ופרטי דפדפן לצורך עיבוד,
        וייתכנו נתוני מכשיר, שפה, מסך, מקור הפניה ומיקום משוער.
        היקף האיסוף והשמירה תלוי גם בהגדרות השירות.
        <a href="https://www.goatcounter.com/help/privacy">
          מדיניות GoatCounter
        </a>.
      </p>
      <p>
        האתר מאוחסן ב־GitHub Pages; שירותי השרת פועלים ב־Cloudflare.
        גופנים נטענים מ־Google Fonts וספריית יצירת QR נטענת מ־cdnjs.
        ספקים המקבלים בקשות רשת עשויים לעבד כתובת IP, כתובת בקשה
        ופרטים טכניים בהתאם למדיניותם.
        דיווחי מדוזות מוצגים ממקור ציבורי; פיד האפליקציה אינו כולל
        את שם המדווח.
      </p>

      <h2>שמירה, אבטחה ובחירות</h2>
      <p>
        התקשורת לשירותים המוגדרים באפליקציה נעשית ב־HTTPS.
        אין בכך הבטחה לאבטחה מוחלטת.
        המידע המקומי נשמר עד מחיקתו או פינויו בידי הדפדפן;
        תקופות השמירה של אנליטיקה, יומני תשתית וגיבויי ספקים
        כפופות להגדרות ולמדיניות הספקים.
      </p>
      <p>
        אפשר לבטל הרשאות מיקום והתראות בהגדרות המכשיר או הדפדפן,
        לכבות התראות באפליקציה ולמחוק את נתוני האתר.
        לפניות בנוגע למידע שנשמר בשירות פנו לכתובת שבראש העמוד.
        אם נוסיף איסוף מידע או יכולות native נוספות, נעדכן מדיניות זו.
      </p>
    </section>

    <section id="english" lang="en" dir="ltr"
             aria-labelledby="privacy-en">
      <h2 id="privacy-en">Privacy Policy — YAM PLATA</h2>
      <p class="meta">Updated: September 23, 2026</p>
      <p>
        Service operator: OWNER_LEGAL_NAME.
        Privacy inquiries and deletion requests:
        <a href="mailto:PRIVACY_CONTACT_EMAIL">PRIVACY_CONTACT_EMAIL</a>.
      </p>
      <p>
        This policy covers yamplata.com, its installed web app,
        and access through its Android wrapper.
        The service does not require a user account.
      </p>

      <h3>Information stored on your device</h3>
      <p>
        The app stores preferences, custom beaches and their coordinates,
        notification registration status, local usage information such as
        a visit counter, and cached forecasts in your browser.
        This remembers your choices and supports access to previously
        stored information offline. You can remove this information
        through your browser's site-data settings.
        Clearing local data does not itself delete server records.
      </p>

      <h3>Location, forecasts and map links</h3>
      <p>
        Device location is requested when you use the nearby-beach
        feature or process a photo. You may decline and select a beach
        manually. The app code does not continuously track device
        location in the background.
      </p>
      <p>
        The nearby-beach feature selects a known beach within 40 km.
        Otherwise, it stores a location based on the received coordinates,
        rounded to four decimal places.
        Selected beach coordinates are sent to Open-Meteo for forecasts
        and historical data, and to our Cloudflare buoy service to select
        a station. Selecting “my location” may therefore transmit
        coordinates derived from your device location.
      </p>
      <p>
        A shortened map link may be sent to our Cloudflare service and
        the map provider to resolve it. Extracted coordinates are sent
        to OpenStreetMap's Nominatim service to obtain a place name.
        This may occur while filling in the field, before you confirm
        adding the beach.
      </p>

      <h3>Notifications</h3>
      <p>
        After you enable notifications and registration succeeds,
        Cloudflare Workers KV stores your Push endpoint, subscription
        keys, beach identifier and name, coordinates, notification state,
        and creation and update times.
        This supports alerts for the registered beach while the app is
        closed; it does not track device movement.
        Delivery uses the browser or platform's Push service.
      </p>
      <p>
        Subscription records currently have no automatic expiry.
        Disabling alerts in the app unsubscribes the browser and requests
        deletion of the server record. Deletion depends on that request
        succeeding. Records marked missing or expired by the Push
        provider are removed during attempted delivery.
        Contact us to request deletion or clarification.
      </p>

      <h3>Camera, photos and sharing</h3>
      <p>
        You choose whether to take or select a photo.
        Photos are processed locally using canvas and are not uploaded
        to the app's server by the processing flow.
        Adding a nearby beach's index may request location permission
        and fetch a known beach's forecast.
      </p>
      <p>
        The resulting image may contain a beach name, time and forecast
        information. It is sent to an external destination only when
        you choose to share it. Saving and sharing are also governed
        by the app or service you select.
        Camera usage and processing errors may be measured through
        analytics, without the photo's contents.
      </p>

      <h3>Sea-condition reports</h3>
      <p>
        A report you submit is sent to Google Forms. It includes your
        selected sea condition, the beach name, predicted index,
        and forecast details such as waves, wind, water temperature
        and forecast time. Custom beach names are included, so avoid
        putting personal information in them.
        The app has no automatic deletion mechanism for these reports.
        To request deletion, contact us with the beach and report time.
      </p>

      <h3>Analytics and external providers</h3>
      <p>
        GoatCounter measures visits and usage events, including launches,
        sharing, installation, camera use and notifications.
        Events may include a technical beach identifier, permission
        status, action type or short error message.
        The app also derives broad repeat-visit groups from a local
        visit counter.
      </p>
      <p>
        According to GoatCounter's documentation, visitor measurement
        does not use cookies. Network requests nevertheless expose
        an IP address and browser information to the provider for
        processing. Device, language, screen, referrer and approximate
        location information may also be processed. Collection and
        retention also depend on service settings.
        See the
        <a href="https://www.goatcounter.com/help/privacy">
          GoatCounter privacy policy
        </a>.
      </p>
      <p>
        GitHub Pages hosts the website, and Cloudflare provides our
        server services. Fonts are loaded from Google Fonts and the
        QR-generation library from cdnjs.
        Providers receiving network requests may process IP addresses,
        request URLs and technical information under their policies.
        Jellyfish reports come from a public source; the app's feed
        omits reporter names.
      </p>

      <h3>Retention, security and choices</h3>
      <p>
        Connections to the services configured in the app use HTTPS.
        This does not guarantee absolute security.
        Local information remains until removed by you or cleared by
        the browser. Retention of analytics, infrastructure logs and
        provider backups depends on provider policies and settings.
      </p>
      <p>
        You can revoke location and notification permissions in device
        or browser settings, disable alerts in the app, and clear site
        data. For inquiries about information held by the service,
        contact the address above. We will update this policy if we add
        further data collection or native features.
      </p>
    </section>
  </main>
</body>
</html>
```

קישור קבוע, לפני כפתור ההתראות ב־[index.html:832](E:/AIBOMBA/6_YamPlata_v2/weather-app/docs/index.html:832):

```html
<p class="credit">
  בהפעלת התראות יישמרו בשרת פרטי המנוי והחוף הנבחר לצורך שליחתן.
  <a href="/privacy/">מדיניות פרטיות / Privacy Policy</a>
</p>
```

יש להזין בשתי החנויות: `https://yamplata.com/privacy/`. את הצהרות Data safety יש לבסס על המיקום, מנויי Push, אינטראקציות ודיווחים שלעיל; **אין לסמן באופן גורף “לא נאסף מידע”**.

**ד. בדיקת offline ואיכות TWA — הקוד הבסיסי כבר נכון**

ה־SW דורש התקנה מוצלחת של מעטפת הבית, manifest ו־`palata.js`; במצב offline מסלול הניווט חוזר למעטפת השמורה. [sw.js:21–34](E:/AIBOMBA/6_YamPlata_v2/weather-app/docs/sw.js:21), [106–123](E:/AIBOMBA/6_YamPlata_v2/weather-app/docs/sw.js:106). הרישום נעשה ב־[index.html:3134](E:/AIBOMBA/6_YamPlata_v2/weather-app/docs/index.html:3134).

בבדיקת ה־handler האמיתי עם מטמון קיים:

```text
/              → offline HTTP 200
/?b=telaviv    → offline HTTP 200
```

**אין צורך להמציא תיקון ל־start_url offline.** האימות כפוף להתקנת SW ולמטמון שלא פונה; הוא אינו מוכיח פתיחה ראשונה אי פעם ללא רשת. לפני הגשה צריך לבדוק זאת בחבילת Android בפועל, יחד עם חזרה מרקע, סירוב הרשאות ופתיחת התראה.

אין כיום ציון Lighthouse PWA שצריך להגיע בו ל־100: קטגוריית PWA הוסרה ב־Lighthouse 12. עדיין כדאי לבדוק ביצועים, נגישות ושגיאות, ואסור להציג למשתמש מסך דפדפן כושל כאסטרטגיית offline. [Lighthouse](https://github.com/GoogleChrome/lighthouse/releases/tag/v12.0.0), [איכות TWA](https://blog.chromium.org/2020/06/changes-to-quality-criteria-for-pwas.html).

**ה. לתקן את רגרסיות ההתראות לפני בדיקת הקבלה**

הפאץ׳ המדויק נמצא בחלק 1. זו דרישת אמינות למוצר שמציע התראות, ולא דרישה פורמלית לשדה manifest.

---

**רצוי**

**א. Manifest — כמעט הכול כבר תקין**

| שדות | מצב |
|---|---|
| `name`, ‏`short_name`, ‏`description` | קיימים ותקינים. |
| `id` | קיים, יציב ומתאים לדומיין. אין צורך לשנות זהות אפליקציה. |
| `start_url`, ‏`scope` | `"."` תקין כשה־manifest מוגש מהשורש. אפשר לכתוב `"/"` לשם בהירות. |
| `display`, ‏`orientation` | `standalone`, ‏`portrait` — ערכים תקינים. |
| צבעים | מוגדרים ותואמים. |
| `lang`, ‏`dir` | `he`, ‏`rtl` — תקין. |
| אייקונים | 192 ו־512 PNG, ושני קובצי maskable נפרדים, עם `purpose` מתאים. מידות ארבעת הקבצים אומתו בבייטים. |
| `categories` | כבר קיים. |
| `screenshots` | חסר; שיפור להתקנה עשירה, **אינו תנאי בסיס ל־TWA**. צילומי מסך בחנות הם דרישה נפרדת. |

מקור: [manifest.json:2–20](E:/AIBOMBA/6_YamPlata_v2/weather-app/docs/manifest.json:2). יצירת האייקונים הנפרדים: [build-app-icons.py:15–33](E:/AIBOMBA/6_YamPlata_v2/weather-app/scripts/build-app-icons.py:15). [תיעוד manifest](https://web.dev/articles/add-manifest).

**תוכן מלא מוצע, תקין עם הנכסים שכבר קיימים:**

```json
{
  "id": "https://yamplata.com/",
  "name": "YAM PLATA",
  "short_name": "YAM PLATA",
  "description": "ים פלטה — בודקים מתי הים שטוח, בשביל מי שמעדיפים לשחות, לחתור או לצוף.",
  "lang": "he",
  "dir": "rtl",
  "start_url": "/",
  "scope": "/",
  "display": "standalone",
  "orientation": "portrait",
  "background_color": "#0a0e16",
  "theme_color": "#0a0e16",
  "icons": [
    {
      "src": "/icon-192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "/icon-512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "/icon-192-maskable.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "maskable"
    },
    {
      "src": "/icon-512-maskable.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "maskable"
    }
  ],
  "categories": ["weather", "lifestyle", "sports"]
}
```

אחרי הכנת **צילומי מסך אמיתיים** במידות הנתונות ופרסומם, אפשר להוסיף:

```json
"screenshots": [
  {
    "src": "/screenshots/home-he.png",
    "sizes": "1080x1920",
    "type": "image/png",
    "form_factor": "narrow",
    "label": "מדד הפלטה ותחזית החוף"
  },
  {
    "src": "/screenshots/week-he.png",
    "sizes": "1080x1920",
    "type": "image/png",
    "form_factor": "narrow",
    "label": "תחזית השבוע וחלונות ים רגוע"
  }
]
```

הקבצים האלה אינם קיימים כעת; אין להוסיף הפניות אליהם לפני יצירתם.

**ב. התאימות ל־TWA לעומת WebView/WKWebView**

**TWA משתמש בדפדפן התומך בו. הוא אינו Android WebView.** לכן אין להעביר אליו באופן אוטומטי מגבלות של WebView.

| יכולת בקוד | TWA ב־Chrome | מעטפת WebView / WKWebView |
|---|---|---|
| Push — [index.html:2830–2854](E:/AIBOMBA/6_YamPlata_v2/weather-app/docs/index.html:2830), [sw.js:151–175](E:/AIBOMBA/6_YamPlata_v2/weather-app/docs/sw.js:151) | Web Push נתמך. יש לוודא `TrustedWebActivityService`, ‏notification delegation והרשאת התראות Android. אין צורך להחליף את ה־Worker ב־FCM native בשביל TWA. | אין להניח שמסלול Web Push הזה יעבוד. ב־iOS wrapper יש לתכנן APNs native; PWA במסך הבית היא מסלול אחר. |
| מצלמה — [index.html:894](E:/AIBOMBA/6_YamPlata_v2/weather-app/docs/index.html:894), [2472](E:/AIBOMBA/6_YamPlata_v2/weather-app/docs/index.html:2472) | `capture="environment"` הוא רמז לבחירת מצלמה, לא הבטחה. לבדוק צילום, בחירת תמונה וביטול. | Android דורש טיפול ב־`onShowFileChooser`; ב־iOS נדרשים הגדרות פרטיות ותמיכה בבורר הקבצים. |
| שיתוף — [index.html:2394–2399](E:/AIBOMBA/6_YamPlata_v2/weather-app/docs/index.html:2394), [2706–2712](E:/AIBOMBA/6_YamPlata_v2/weather-app/docs/index.html:2706) | קיימים feature detection וחלופות ללוח/שמירה. יש לבדוק שיתוף קובץ בחבילה. | ייתכן צורך ב־native share sheet ובטיפול ב־blob download; הלחיצה על קישור הורדה לבדה אינה הוכחה לתמיכה. |
| מיקום — [index.html:2474–2478](E:/AIBOMBA/6_YamPlata_v2/weather-app/docs/index.html:2474), [3069–3088](E:/AIBOMBA/6_YamPlata_v2/weather-app/docs/index.html:3069) | בקשות יזומות, timeout וחלופת סירוב כבר קיימים. לבדוק שילוב הרשאות האתר והאפליקציה. | נדרשים תיאור שימוש והרשאות native, וטיפול בהרשאת origin ב־Android WebView. אין צורך בהרשאת מיקום ברקע. |
| וידאו פתיחה — [index.html:884–890](E:/AIBOMBA/6_YamPlata_v2/weather-app/docs/index.html:884), [2443–2462](E:/AIBOMBA/6_YamPlata_v2/weather-app/docs/index.html:2443) | `muted`, ‏`playsinline`, דילוג וטיפול בסירוב autoplay כבר קיימים. | ב־WKWebView להגדיר `allowsInlineMediaPlayback`; אחרת ההתנהגות יכולה להיות שונה מה־HTML המבוקש. |
| קישורים חיצוניים — [index.html:2392](E:/AIBOMBA/6_YamPlata_v2/weather-app/docs/index.html:2392), [847](E:/AIBOMBA/6_YamPlata_v2/weather-app/docs/index.html:847) | מעבר ל־origin לא מאומת עשוי להציג UI של דפדפן; זו התנהגות צפויה. | צריך לטפל ב־`target="_blank"` ו־`window.open`, לפתוח יעדים חיצוניים באמצעות הדפדפן/מערכת, ולמנוע לחיצה שאינה עושה דבר. |
| התמדה — [index.html:1104–1120](E:/AIBOMBA/6_YamPlata_v2/weather-app/docs/index.html:1104), [2840](E:/AIBOMBA/6_YamPlata_v2/weather-app/docs/index.html:2840) | נשענת על אחסון ה־origin בדפדפן המספק את ה־TWA. אין להבטיח הישרדות אחרי ניקוי נתונים. | Android: להפעיל DOM storage. iOS: להשתמש ב־data store מתמשך; אין להניח שיתוף אחסון עם Safari או PWA קיימת. |

מקורות הפלטפורמה: [Chromium permission delegation](https://chromium.googlesource.com/chromium/src/+/HEAD/chrome/android/java/src/org/chromium/chrome/browser/browserservices/permissiondelegation/README.md), [Android WebChromeClient](https://developer.android.com/reference/android/webkit/WebChromeClient), [WebKit Web Push](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/), [WKWebsiteDataStore](https://developer.apple.com/documentation/webkit/wkwebsitedatastore), [inline playback](https://developer.apple.com/documentation/webkit/wkwebviewconfiguration/allowsinlinemediaplayback).

למעטפת WKWebView עתידית, אלה שורות התצורה המדויקות:

```swift
let configuration = WKWebViewConfiguration()
configuration.websiteDataStore = .default()
configuration.allowsInlineMediaPlayback = true
```

מפתחות `Info.plist` לצילום ולמיקום בעת שימוש:

```xml
<key>NSCameraUsageDescription</key>
<string>צילום הים כדי ליצור תמונה עם מדד הפלטה, בעיבוד מקומי במכשיר.</string>
<key>NSLocationWhenInUseUsageDescription</key>
<string>איתור חוף קרוב והצמדת מדד הפלטה לתמונה לפי בקשתך.</string>
```

ל־Android WebView חלופי, אם ייבחר בעתיד:

```kotlin
webView.settings.javaScriptEnabled = true
webView.settings.domStorageEnabled = true
```

השורות האלה אינן מחליפות מימוש בורר קבצים, ניווט והרשאות. אין בריפו פרויקט native שאפשר לתת כנגדו diff מלא של אותם handlers.

---

**נחמד להוסיף**

**א. קיצורי דרך לחופים**

הטיפול ב־`?b=` כבר קיים ב־[index.html:2402–2407](E:/AIBOMBA/6_YamPlata_v2/weather-app/docs/index.html:2402). אפשר להוסיף ל־manifest:

```json
"shortcuts": [
  {
    "name": "מצב הים בתל אביב",
    "short_name": "תל אביב",
    "url": "/?b=telaviv"
  },
  {
    "name": "מצב הים בחיפה",
    "short_name": "חיפה",
    "url": "/?b=haifa"
  }
]
```

**ב. Apple: ערך מוצר קיים, אבל אין עדיין ערך native מובחן**

כבר קיימות יכולות שימושיות מעבר לדף תוכן: תחזית אינטראקטיבית לשבוע, חלון רגיעה, התאמה לחופים ותמונה עם מדד. ראו [index.html:813–829](E:/AIBOMBA/6_YamPlata_v2/weather-app/docs/index.html:813), [2651–2693](E:/AIBOMBA/6_YamPlata_v2/weather-app/docs/index.html:2651). הן מספקות טיעון של שימושיות, **אך אינן מבטיחות עמידה ב־4.2 במעטפת אתר**. Apple דורשת ערך מעבר לאתר ארוז מחדש. [Guideline 4.2](https://developer.apple.com/app-store/review/guidelines/#minimum-functionality).

שתי הרחבות טכניות מתאימות:

- **APNs native:** לקבל device token באפליקציה, לרשום אותו בשרת במסלול נפרד עם הרשאת ניהול, להפעיל את אותה מדיניות התראות ולשלוח דרך ספק APNs. ה־Worker הנוכחי מצפה ל־Web Push subscription ומייצר payload של Web Push, ולכן token של APNs אינו תחליף ישיר לאובייקט הקיים. [Worker:56–61](E:/AIBOMBA/6_YamPlata_v2/weather-app/workers/push/src/index.js:56), [76–84](E:/AIBOMBA/6_YamPlata_v2/weather-app/workers/push/src/index.js:76). [תיעוד APNs](https://developer.apple.com/documentation/usernotifications/setting-up-a-remote-notification-server).
- **WidgetKit:** widget לחוף הנבחר עם מדד, חלון הרגיעה הבא וזמן עדכון, ולחיצה הפותחת את החוף. יש להשתמש ב־timeline ובמטמון משותף דרך App Group; אין להבטיח עדכון כל 15 דקות, משום שהמערכת מנהלת תקציב רענון. [WidgetKit](https://developer.apple.com/documentation/widgetkit/keeping-a-widget-up-to-date).

חוזה נתונים מוצע ל־widget, **קובץ/ממשק חדש שטרם ממומש**:

```json
{
  "schemaVersion": 1,
  "beachKey": "telaviv",
  "beachName": "תל אביב",
  "score": null,
  "forecastHour": null,
  "fetchedAt": null,
  "nextCalmWindow": null,
  "url": "https://yamplata.com/?b=telaviv"
}
```

`score` צריך להישאר בסולם 0–100 של הלוגיקה המשותפת, ולהיות מוצג כ־0–10. כדי למנוע סטייה בין האתר ל־widget, להשתמש באותו חישוב או בנתונים מחושבים מהשרת; מקור החישוב המשותף הוא [palata.js:38–45](E:/AIBOMBA/6_YamPlata_v2/weather-app/docs/palata.js:38).

APNs הוא בעיקר השלמת יכולת ההתראות במעטפת; widget שימושי ומעודכן מוסיף שימוש ישיר מחוץ לאפליקציה. גם שילוב שניהם אינו הבטחת אישור Apple.

---

**4. מה לא ניתן היה לאמת**

- **עדכניות הריפו המרוחק:** `git pull` נחסם בהרשאות; `git ls-remote` נכשל ברשת. HEAD המקומי נשאר `5cc84ee`.
- **הפריסה החיה:** כלי הרשת לא הצליח לקרוא את manifest ואת `assetlinks.json` ב־yamplata.com. כישלון הכלי **אינו הוכחת 404 באתר**. לא אומתו headers, TLS, redirects או התאמה ל־HEAD.
- **Worker חי:** לא הופעלו `/test`, רישום, מחיקה, rotation או cron. כל תרחישי ההתראות השתמשו ברשת וב־KV מדומים.
- **npm audit:** שתי הפקודות נכשלו מול registry; אין אישור נקי לתלויות.
- **Android/iOS בפועל:** לא נבנתה חבילה, ולא נבדקו מכשיר, notification delegation, צילום, הורדת blob, אחסון אחרי שדרוג או Lighthouse חי.
- **Play/App Store Console:** לא אומתו שם חבילה פנוי, חתימת Play, דרישות בדיקה לחשבון, Data safety, הרשאות חבילה או פרטי חנות.
- **פרטי הפרטיות התפעוליים:** שם מפעיל, כתובת קשר, הגדרות GoatCounter/Google Forms, שמירת יומנים וגיבויים והסכמים עם ספקים אינם ניתנים להסקה מלאה מהקוד. דף הפרטיות הוא טיוטה מלאה, אך דורש השלמת הפרטים האלה לפני הגשה.

Codex session ID: 01a0cafa-6892-7cc0-9e99-d086379299ba
Resume in Codex: codex resume 01a0cafa-6892-7cc0-9e99-d086379299ba
