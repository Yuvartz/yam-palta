# הפעלת התראות Push — מה שנשאר לעשות ידנית (~5 דקות)

כל הקוד כבר מוכן ופועל: הדף יודע להירשם, ה-Service Worker יודע להציג, וה-workflow
(`.github/workflows/push-notify.yml`) רץ כל שעה ושולח. חסרים רק החלקים שדורשים את החשבון שלך.

המפתחות שנוצרו נמצאים ב-`VAPID-KEYS.local.txt` (קובץ מקומי, לא בגיט).

## שלב א — טופס Google (איסוף הרשמות, בלי שרת)

1. היכנס ל-[Google Forms](https://docs.google.com/forms) וצור טופס חדש בשם "Yam Palata Push".
2. הוסף **4 שאלות מסוג "תשובה קצרה"** בסדר הזה: `beach`, `lat`, `lon`, `subscription`.
3. בלשונית "תשובות" לחץ על סמל Sheets כדי ליצור גיליון מקושר.
4. פתח ⋮ → "קבל קישור מולא מראש" (Get pre-filled link), מלא ערך כלשהו בכל שדה, העתק את הקישור,
   וחלץ ממנו את ארבעת מזהי ה-`entry.NNNNNNN`.
5. את כתובת השליחה בנה כך: קח את כתובת הטופס והחלף את הסיומת `/viewform` ב-`/formResponse`.

## שלב ב — פרסום הגיליון כ-CSV

1. פתח את הגיליון המקושר → קובץ → שיתוף → **פרסום באינטרנט**.
2. בחר את הגיליון הרלוונטי, פורמט **CSV**, ופרסם. העתק את הכתובת (מסתיימת ב-`output=csv`).

## שלב ג — Secrets ברפו GitHub

ברפו: Settings → Secrets and variables → Actions → New repository secret, שלוש פעמים:

| שם | ערך |
|---|---|
| `VAPID_PUBLIC_KEY` | מ-`VAPID-KEYS.local.txt` |
| `VAPID_PRIVATE_KEY` | מ-`VAPID-KEYS.local.txt` |
| `SUBSCRIBERS_CSV_URL` | כתובת ה-CSV משלב ב |

## שלב ד — חיבור הדף

ב-`docs/index.html`, באובייקט `PUSH` (חפש `const PUSH`), מלא:

```js
formUrl: "https://docs.google.com/forms/d/e/XXXX/formResponse",
entry: { beach: "entry.111", lat: "entry.222", lon: "entry.333", sub: "entry.444" },
```

(המפתח הציבורי כבר מולא.) קומיט + פוש — וזהו.

## בדיקה

1. פתח את האתר, לחץ "🔔 הפעל התראות" ואשר.
2. בדוק שנוספה שורה בגיליון (עמודת subscription עם JSON ארוך).
3. הרץ ידנית את ה-workflow: Actions → "Send push notifications" → Run workflow.
   ההתראה תישלח רק כשיש מעבר לים רגוע (או תצוגת ערב ב-19:00) — אפשר לבדוק זמנית
   על ידי הורדת `CALM_MIN` ב-`scripts/send-push.mjs`.

## באייפון

Push עובד רק אחרי **התקנה למסך הבית** (iOS 16.4 ומעלה): ספארי → שיתוף → הוסף למסך הבית,
לפתוח מהאייקון, ואז להפעיל התראות מתוך האפליקציה. הכפתור באפליקציה כבר מסביר את זה למשתמשים.
