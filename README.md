# 🌊 ים פלטה (Yam Palata)

**מתי הים באמת רגוע?** אפליקציית ווב (PWA) בעברית שעונה על השאלה האחת שחשובה לשחיינים,
סאפיסטים ואנשי ים: האם עכשיו (או מחר) יש "ים פלטה" — ים שטוח ורגוע.

**כתובת:** https://yuvartz.github.io/yam-palta/

## מה יש בפנים

- **מדד הפלטה (0–10)** — ציון משוקלל מארבעה גורמים: גובה גל (35%), גלים קצרים מהרוח (25%),
  רוח נוכחית (25%) והיסטוריית רוח 10 שעות (15%), עם תקרה קשיחה לפי גובה גל.
  ההגדרה היחידה: [docs/palata.js](docs/palata.js), משותפת לאפליקציה ולשולח ההתראות.
- **אנסמבל מודלים** — התחזית היא חציון של מודלים ימיים (MFWAM, ECMWF-WAM) ואטמוספריים
  (ECMWF-IFS, ICON); הפער בין המודלים הופך למשפט אמון ("המודלים מסכימים").
- **עוגן מציאות** — מדידה אמיתית ממצוף חדרה (ISRAMAR) מוצגת מול התחזית.
- **מדוזות** — דיווחי גולשים מ-meduzot.co.il עם התראת קרבה (25 ק"מ / 48 שעות).
- **התראות** — בדפדפן ובמסך נעול (Web Push, ללא backend: Google Form → Sheet → GitHub Action).
- **19 חופים** — ישראל, סיני ויוון, פלוס "📍 קרוב אליי" ומיקום מותאם.
- מסך שיא חום מים היסטורי, זריחת/שקיעת ירח, UV, תצוגת גלים חיה מונפשת לפי מצב הים.

## ארכיטקטורה

אין build, אין framework, אין תלויות — קובץ HTML אחד.

```
docs/                  ← מוגש ע"י GitHub Pages
  index.html           ← כל האפליקציה (markup + CSS + JS)
  palata.js            ← מתמטיקת המדד + נוסחי ההתראות (משותף לדף ול-send-push)
  sw.js                ← Service Worker: offline, קאש, Web Push
  manifest.json        ← PWA (RTL, עברית, מסך מלא)
  splash/, icon-*.png  ← נוצרים ע"י scripts/build-app-icons.py
  img/waves/           ← ספרייטים של גלים (נוצרים ע"י scripts/build-wave-sprites.py)
  data/                ← נכתב ע"י GitHub Actions (מצוף + מדוזות)
scripts/
  fetch-buoy.mjs       ← מצוף חדרה (ISRAMAR) → docs/data/hadera-waves.json (כל שעה)
  fetch-jellyfish.mjs  ← דיווחי מדוזות → docs/data/jellyfish.json (כל שעה)
  send-push.mjs        ← שולח Web Push לפי המדד (כל שעה; ראה SETUP-PUSH.md)
  build-app-icons.py   ← אייקונים, splash, badge (Pillow)
  build-wave-sprites.py← חיתוך ספרייטי הגלים מהארטוורק
```

## פיתוח מקומי

```bash
cd docs && python -m http.server 8000
```

ולפתוח http://localhost:8000. אין תהליך build — עורכים את index.html ומרעננים.
אחרי שינוי בקבצי ה-shell יש להקפיץ את `VERSION` ב-sw.js כדי שמשתמשים קיימים יקבלו אותו.

## התקנה כאפליקציה

- **אייפון:** ספארי → שיתוף → "הוסף למסך הבית". התראות (iOS 16.4+) עובדות רק אחרי ההתקנה.
- **אנדרואיד/דסקטופ:** כפתור ההתקנה בדפדפן או 📲 בסרגל העליון.

## מקורות מידע וקרדיטים

| מקור | שימוש | רישיון/תנאים |
|---|---|---|
| [Open-Meteo](https://open-meteo.com/) | תחזיות ימיות ואטמוספריות, ארכיון SST | CC-BY 4.0, עם קרדיט |
| [ISRAMAR / חקר ימים ואגמים](https://isramar.ocean.org.il/) | מדידות מצוף חדרה | © ISRAMAR/IOLR, מוצג עם קרדיט וקישור |
| [מדוזות בים](https://www.meduzot.co.il/) | דיווחי מדוזות (מדע אזרחי) | מוצג עם קרדיט וקישור |
| Google Fonts (Heebo, JetBrains Mono) | טיפוגרפיה | OFL |

כל האיורים (צב, מדוזה, שחיינים, גלים, אייקונים) הם SVG שנכתב עבור הפרויקט או נגזרות
של ארטוורק בבעלות הפרויקט — אין נכסים של צד שלישי.

הערה: פיצ'ר מצלמת חוף חיה הוסר עד לקבלת אישור מ-beachcam.co.il (ראה EMAIL-beachcam.md).
