# צעד-צעד: דומיין, סטטיסטיקה, חנות (2026-09-20)

## שלב 1 — דומיין (כ-15 דקות, ~45 ₪/שנה)

**איפה:** Cloudflare Registrar — https://dash.cloudflare.com → הרשמה בחינם → Domain Registration → Register Domains.
למה שם: מחיר עלות בלי התייקרות בחידוש, DNS מהיר בחינם, HTTPS/הגנות בחינם, אין "אפסיילים".
חלופה אם Cloudflare לא מקבל את הכרטיס: Namecheap (namecheap.com). לא GoDaddy (יקר בחידוש).

1. חפש `yamplata.com` → הוסף לעגלה → שלם (שנה אחת מספיק, auto-renew מומלץ).
2. אחרי הרכישה: Cloudflare → הדומיין → **DNS → Records** → הוסף:
   - `A` · Name `@` · IPv4 `185.199.108.153` · Proxy **OFF** (ענן אפור)
   - `A` · `@` · `185.199.109.153` · Proxy OFF
   - `A` · `@` · `185.199.110.153` · Proxy OFF
   - `A` · `@` · `185.199.111.153` · Proxy OFF
   - `AAAA` · `@` · `2606:50c0:8000::153` · Proxy OFF (וכן `8001::153`, `8002::153`, `8003::153`)
   - `CNAME` · Name `www` · Target `yuvartz.github.io` · Proxy OFF
   (Proxy OFF חשוב: GitHub מנפיק את תעודת ה-HTTPS בעצמו ולא יצליח דרך הפרוקסי.)
3. **תגיד לי "הדומיין נרשם"** — אני מריץ `python scripts/set-domain.py yamplata.com` (מחליף את כל 12 המקומות, כותב `docs/CNAME`, מייצר מחדש את תמונת השיתוף), מקמט ודוחף.
4. GitHub → הריפו `Yuvartz/yam-palta` → **Settings → Pages**: ב-Custom domain כתוב `yamplata.com` → Save. חכה עד שה-✓ DNS check successful מופיע (דקות עד שעה), ואז סמן **Enforce HTTPS**.
5. בדיקה: `https://yamplata.com` נפתח, `https://yamplata.com/` מפנה אליו אוטומטית, `https://www.yamplata.com` מפנה גם.
6. אחרי המעבר: להתקין מחדש את האפליקציה בטלפון (הכתובת החדשה = אפליקציה חדשה מבחינת הטלפון).

## שלב 2 — סטטיסטיקה: GoatCounter (5 דקות, חינם)

**איפה:** https://www.goatcounter.com/signup
1. Code: `yamplata` · Domain: `yamplata.com` (או `yuvartz.github.io` אם עדיין לפני הדומיין; אפשר לשנות אחר כך ב-Settings) · Timezone: `Asia/Jerusalem`.
2. אשר את המייל.
3. **תגיד לי את הקוד** — אני מציב `ANALYTICS.code = "yamplata"` ודוחף. מאותו רגע הלוח ב-`https://yamplata.goatcounter.com`.
4. מה תראה ואיך זה עונה על "כמה יוזרים / כמה התקינו / מה עושים": ראה `analytics-setup.md`.
5. אופציונלי: Settings → "Public dashboard" אם רוצים שהמספרים יהיו גלויים.

## שלב 3 — Google Play (אחרי הדומיין, ~שעה + 25$ חד-פעמי)

1. https://play.google.com/console → הרשמה כמפתח (25$, אימות זהות).
2. https://www.pwabuilder.com → הזן `https://yamplata.com` → Package for stores → Android → הורד את ה-ZIP (יש בו `.aab` להעלאה + `assetlinks.json`).
3. אני מעלה את `assetlinks.json` ל-`docs/.well-known/assetlinks.json` (זה מה שמצריך דומיין בשורש).
4. Play Console → Create app → העלאה של ה-.aab ל-Internal testing → מילוי דף החנות (טקסטים וצילומי מסך אכין) → Review.

## שלב 4 — App Store (רק אם יש משתמשים; 99$/שנה)
עטיפה ב-Capacitor + תוספת יכולת נייטיב אחת לפחות. לא עכשיו.

## סדר מומלץ
דומיין (היום) → GoatCounter (היום) → התראות Push (לפי סקירת אסטרא) → Play.
