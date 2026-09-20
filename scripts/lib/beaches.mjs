// The canonical beach catalogue.
//   pages !== false → gets a static SEO page (docs/<slug>/) and exists as a preset in the app (same coords there).
//   pages: false    → video/story only for now (add to the app's PRESETS before enabling pages).
// Coordinates are the beach itself; the marine model snaps to its nearest sea cell (~9 km grid), so
// neighbours a few km apart often share a cell and show the same numbers. Order = north → south.
export const BEACHES = [
  // ---- Israel, Mediterranean ----
  { slug: "nahariya", key: "nahariya", name: "נהריה", en: "Nahariya", lat: 33.006, lon: 35.089, area: "צפון", region: "israel", pages: false },
  { slug: "akko", key: "akko", name: "עכו", en: "Akko (Acre)", lat: 32.9270, lon: 35.0690, area: "צפון", region: "israel" },
  { slug: "haifa", key: "haifa", name: "חיפה", en: "Haifa", lat: 32.8275, lon: 34.9897, area: "צפון", region: "israel" },
  { slug: "atlit", key: "atlit", name: "עתלית", en: "Atlit", lat: 32.700, lon: 34.930, area: "חוף הכרמל", region: "israel", pages: false },
  { slug: "dor", key: "dor", name: "דור (טנטורה)", en: "Dor Beach", lat: 32.615, lon: 34.915, area: "חוף הכרמל", region: "israel", pages: false },
  { slug: "caesarea", key: "caesarea", name: "קיסריה", en: "Caesarea", lat: 32.4860, lon: 34.8820, area: "חוף הכרמל", region: "israel" },
  { slug: "hadera", key: "hadera", name: "חדרה (גבעת אולגה)", en: "Hadera", lat: 32.430, lon: 34.870, area: "שרון", region: "israel", pages: false },
  { slug: "mikhmoret", key: "mikhmoret", name: "מכמורת", en: "Mikhmoret", lat: 32.400, lon: 34.865, area: "שרון", region: "israel", pages: false },
  { slug: "netanya", key: "netanya", name: "נתניה", en: "Netanya", lat: 32.3215, lon: 34.8532, area: "שרון", region: "israel" },
  { slug: "herzliya", key: "herzliya", name: "הרצליה", en: "Herzliya", lat: 32.1624, lon: 34.7990, area: "שרון", region: "israel" },
  { slug: "tel-aviv", key: "telaviv", name: "תל אביב", en: "Tel Aviv", lat: 32.0809, lon: 34.7610, area: "מרכז", region: "israel" },
  { slug: "bat-yam", key: "batyam", name: "בת ים", en: "Bat Yam", lat: 32.0170, lon: 34.7370, area: "מרכז", region: "israel" },
  { slug: "rishon", key: "rishon", name: "ראשון לציון", en: "Rishon LeZion", lat: 31.980, lon: 34.730, area: "מרכז", region: "israel", pages: false },
  { slug: "palmachim", key: "palmachim", name: "פלמחים", en: "Palmachim", lat: 31.930, lon: 34.700, area: "מרכז", region: "israel", pages: false },
  { slug: "ashdod", key: "ashdod", name: "אשדוד", en: "Ashdod", lat: 31.8044, lon: 34.6473, area: "דרום", region: "israel" },
  { slug: "nitzanim", key: "nitzanim", name: "ניצנים", en: "Nitzanim", lat: 31.730, lon: 34.600, area: "דרום", region: "israel", pages: false },
  { slug: "ashkelon", key: "ashkelon", name: "אשקלון", en: "Ashkelon", lat: 31.6699, lon: 34.5738, area: "דרום", region: "israel" },
  { slug: "zikim", key: "zikim", name: "זיקים", en: "Zikim", lat: 31.610, lon: 34.500, area: "דרום", region: "israel", pages: false },
  // ---- Red Sea: Eilat → Sinai, the classic road south (north → south) ----
  { slug: "eilat", key: "eilat", name: "אילת", en: "Eilat", lat: 29.48, lon: 34.93, area: "ים סוף", region: "redsea" },   // open water off the coral reserve; the city point has no marine data
  { slug: "coral-beach", key: "coralbeach", name: "חוף האלמוגים", en: "Coral Beach (Eilat)", lat: 29.505, lon: 34.920, area: "אילת", region: "sinai", pages: false },
  { slug: "taba", key: "taba", name: "טאבה", en: "Taba", lat: 29.492, lon: 34.898, area: "סיני", region: "sinai", pages: false },
  { slug: "bir-sweir", key: "birsweir", name: "ביר סוויר", en: "Bir Sweir", lat: 29.29, lon: 34.78, area: "סיני", region: "sinai", pages: false },
  { slug: "ras-shitan", key: "rasshitan", name: "ראס שיטאן", en: "Ras Shitan", lat: 29.13, lon: 34.70, area: "סיני", region: "sinai", pages: false },
  { slug: "nuweiba", key: "nuweiba", name: "נואיבה", en: "Nuweiba", lat: 29.0267, lon: 34.6650, area: "סיני", region: "sinai", pages: false },
  { slug: "ras-abu-galum", key: "rasabugalum", name: "ראס אבו גלום", en: "Ras Abu Galum", lat: 28.63, lon: 34.56, area: "סיני", region: "sinai", pages: false },
  { slug: "blue-hole", key: "bluehole", name: "הבלו הול", en: "Blue Hole (Dahab)", lat: 28.572, lon: 34.537, area: "סיני", region: "sinai", pages: false },
  { slug: "dahab", key: "dahab", name: "דהב", en: "Dahab", lat: 28.494, lon: 34.513, area: "סיני", region: "sinai", pages: false },
  { slug: "nabq", key: "nabq", name: "נבק", en: "Nabq", lat: 28.10, lon: 34.43, area: "סיני", region: "sinai", pages: false },
  { slug: "naama-bay", key: "naamabay", name: "מפרץ נעמה", en: "Naama Bay", lat: 27.915, lon: 34.330, area: "סיני", region: "sinai", pages: false },
  { slug: "sharm", key: "sharm", name: "שארם א-שייח׳", en: "Sharm El Sheikh", lat: 27.86, lon: 34.30, area: "סיני", region: "sinai", pages: false },
  // ---- World: beaches people know by name, each scored in its own local morning (timezone=auto).
  //      group = sub-edition (--region europe|caribbean|americas|asia|oceania|africa); icon = in the default world edition.
  // Europe & Mediterranean
  { slug: "barceloneta", key: "barceloneta", name: "ברצלונטה, ברצלונה", en: "Barceloneta, Barcelona", lat: 41.378, lon: 2.192, region: "world", group: "europe", icon: true, pages: false },
  { slug: "nice", key: "nice", name: "ניס, הריביירה", en: "Nice, Côte d'Azur", lat: 43.694, lon: 7.265, region: "world", group: "europe", icon: true, pages: false },
  { slug: "positano", key: "positano", name: "פוזיטאנו, אמלפי", en: "Positano, Amalfi", lat: 40.627, lon: 14.485, region: "world", group: "europe", icon: true, pages: false },
  { slug: "la-pelosa", key: "lapelosa", name: "לה פלוזה, סרדיניה", en: "La Pelosa, Sardinia", lat: 40.960, lon: 8.210, region: "world", group: "europe", pages: false },
  { slug: "santorini", key: "santorini", name: "סנטוריני (פריסה)", en: "Perissa, Santorini", lat: 36.353, lon: 25.474, region: "world", group: "europe", icon: true, pages: false },
  { slug: "mykonos", key: "mykonos", name: "מיקונוס", en: "Mykonos", lat: 37.414, lon: 25.344, region: "world", group: "europe", pages: false },
  { slug: "navagio", key: "navagio", name: "נבאג׳יו, זקינתוס", en: "Navagio, Zakynthos", lat: 37.859, lon: 20.625, region: "world", group: "europe", icon: true, pages: false },
  { slug: "elafonissi", key: "elafonissi", name: "אלפוניסי, כרתים", en: "Elafonissi, Crete", lat: 35.271, lon: 23.540, region: "world", group: "europe", pages: false },
  { slug: "balos", key: "balos", name: "באלוס, כרתים", en: "Balos, Crete", lat: 35.582, lon: 23.590, region: "world", group: "europe", pages: false },
  { slug: "lindos", key: "lindos", name: "לינדוס, רודוס", en: "Lindos, Rhodes", lat: 36.090, lon: 28.090, region: "world", group: "europe", pages: false },
  { slug: "nissi", key: "nissi", name: "ניסי ביץ׳, איה נאפה", en: "Nissi Beach, Ayia Napa", lat: 34.988, lon: 33.948, region: "world", group: "europe", icon: true, pages: false },
  { slug: "larnaca", key: "larnaca", name: "לרנקה (פיניקודס)", en: "Finikoudes, Larnaca", lat: 34.913, lon: 33.640, region: "world", group: "europe", pages: false },
  { slug: "coral-bay", key: "coralbay", name: "קורל ביי, פאפוס", en: "Coral Bay, Paphos", lat: 34.855, lon: 32.372, region: "world", group: "europe", pages: false },
  { slug: "oludeniz", key: "oludeniz", name: "אולודניז, טורקיה", en: "Ölüdeniz", lat: 36.549, lon: 29.115, region: "world", group: "europe", icon: true, pages: false },
  { slug: "konyaalti", key: "konyaalti", name: "קוניאלטי, אנטליה", en: "Konyaaltı, Antalya", lat: 36.868, lon: 30.650, region: "world", group: "europe", pages: false },
  { slug: "ibiza", key: "ibiza", name: "איביזה", en: "Ibiza", lat: 38.907, lon: 1.420, region: "world", group: "europe", icon: true, pages: false },
  { slug: "ses-illetes", key: "sesilletes", name: "סס אייטס, פורמנטרה", en: "Ses Illetes, Formentera", lat: 38.745, lon: 1.435, region: "world", group: "europe", pages: false },
  { slug: "es-trenc", key: "estrenc", name: "אס טרנק, מיורקה", en: "Es Trenc, Mallorca", lat: 39.350, lon: 2.985, region: "world", group: "europe", pages: false },
  { slug: "marinha", key: "marinha", name: "פראיה דה מריניה, אלגרבה", en: "Praia da Marinha, Algarve", lat: 37.089, lon: -8.412, region: "world", group: "europe", icon: true, pages: false },
  { slug: "cascais", key: "cascais", name: "קשקאיש, ליסבון", en: "Cascais, Lisbon", lat: 38.695, lon: -9.420, region: "world", group: "europe", pages: false },
  { slug: "teresitas", key: "teresitas", name: "לאס טרסיטס, טנריף", en: "Las Teresitas, Tenerife", lat: 28.508, lon: -16.185, region: "world", group: "europe", pages: false },
  { slug: "banje", key: "banje", name: "באניה, דוברובניק", en: "Banje, Dubrovnik", lat: 42.640, lon: 18.117, region: "world", group: "europe", pages: false },
  { slug: "hvar", key: "hvar", name: "הוואר, קרואטיה", en: "Hvar", lat: 43.170, lon: 16.440, region: "world", group: "europe", pages: false },
  // Caribbean & Mexico
  { slug: "negril", key: "negril", name: "סבן מייל ביץ׳, ג׳מייקה", en: "Seven Mile Beach, Negril", lat: 18.283, lon: -78.348, region: "world", group: "caribbean", icon: true, pages: false },
  { slug: "doctors-cave", key: "doctorscave", name: "דוקטורס קייב, מונטגו ביי", en: "Doctor's Cave, Montego Bay", lat: 18.490, lon: -77.930, region: "world", group: "caribbean", pages: false },
  { slug: "grace-bay", key: "gracebay", name: "גרייס ביי, טרקס וקייקוס", en: "Grace Bay, Turks & Caicos", lat: 21.800, lon: -72.180, region: "world", group: "caribbean", icon: true, pages: false },
  { slug: "eagle-beach", key: "eaglebeach", name: "איגל ביץ׳, ארובה", en: "Eagle Beach, Aruba", lat: 12.555, lon: -70.055, region: "world", group: "caribbean", pages: false },
  { slug: "varadero", key: "varadero", name: "ורדרו, קובה", en: "Varadero, Cuba", lat: 23.155, lon: -81.245, region: "world", group: "caribbean", icon: true, pages: false },
  { slug: "punta-cana", key: "puntacana", name: "פונטה קאנה", en: "Punta Cana", lat: 18.560, lon: -68.370, region: "world", group: "caribbean", pages: false },
  { slug: "pink-sands", key: "pinksands", name: "פינק סנדס, בהאמה", en: "Pink Sands, Bahamas", lat: 25.500, lon: -76.630, region: "world", group: "caribbean", pages: false },
  { slug: "tulum", key: "tulum", name: "טולום", en: "Tulum", lat: 20.212, lon: -87.428, region: "world", group: "caribbean", icon: true, pages: false },
  { slug: "cancun", key: "cancun", name: "קנקון", en: "Cancún", lat: 21.135, lon: -86.745, region: "world", group: "caribbean", pages: false },
  { slug: "playa-del-carmen", key: "playadelcarmen", name: "פלאיה דל כרמן", en: "Playa del Carmen", lat: 20.628, lon: -87.070, region: "world", group: "caribbean", pages: false },
  // Americas
  { slug: "copacabana", key: "copacabana", name: "קופקבנה, ריו", en: "Copacabana, Rio", lat: -22.971, lon: -43.182, region: "world", group: "americas", icon: true, pages: false },
  { slug: "ipanema", key: "ipanema", name: "איפנמה, ריו", en: "Ipanema, Rio", lat: -22.987, lon: -43.205, region: "world", group: "americas", pages: false },
  { slug: "south-beach", key: "southbeach", name: "סאות׳ ביץ׳, מיאמי", en: "South Beach, Miami", lat: 25.782, lon: -80.130, region: "world", group: "americas", icon: true, pages: false },
  { slug: "malibu", key: "malibu", name: "מאליבו", en: "Malibu", lat: 34.035, lon: -118.690, region: "world", group: "americas", pages: false },
  { slug: "venice-beach", key: "venicebeach", name: "וניס ביץ׳, לוס אנג׳לס", en: "Venice Beach, LA", lat: 33.985, lon: -118.472, region: "world", group: "americas", icon: true, pages: false },
  { slug: "la-jolla", key: "lajolla", name: "לה הויה, סן דייגו", en: "La Jolla, San Diego", lat: 32.850, lon: -117.273, region: "world", group: "americas", pages: false },
  { slug: "cabo", key: "cabo", name: "קאבו סן לוקאס", en: "Médano, Cabo San Lucas", lat: 22.888, lon: -109.905, region: "world", group: "americas", pages: false },
  { slug: "waikiki", key: "waikiki", name: "וואיקיקי, הוואי", en: "Waikiki, Honolulu", lat: 21.276, lon: -157.827, region: "world", group: "americas", icon: true, pages: false },
  { slug: "lanikai", key: "lanikai", name: "לניקאי, אואהו", en: "Lanikai, Oahu", lat: 21.393, lon: -157.715, region: "world", group: "americas", pages: false },
  { slug: "kaanapali", key: "kaanapali", name: "קאנאפאלי, מאווי", en: "Kaanapali, Maui", lat: 20.925, lon: -156.695, region: "world", group: "americas", pages: false },
  // Asia & the Gulf
  { slug: "male", key: "male", name: "המלדיביים", en: "Maldives (Malé)", lat: 4.175, lon: 73.510, region: "world", group: "asia", icon: true, pages: false },
  { slug: "patong", key: "patong", name: "פאטונג, פוקט", en: "Patong, Phuket", lat: 7.896, lon: 98.290, region: "world", group: "asia", pages: false },
  { slug: "railay", key: "railay", name: "ריילי, קראבי", en: "Railay, Krabi", lat: 8.011, lon: 98.837, region: "world", group: "asia", pages: false },
  { slug: "maya-bay", key: "mayabay", name: "מאיה ביי (The Beach)", en: "Maya Bay, Ko Phi Phi", lat: 7.677, lon: 98.766, region: "world", group: "asia", icon: true, pages: false },
  { slug: "chaweng", key: "chaweng", name: "צ׳אוונג, קוסמוי", en: "Chaweng, Koh Samui", lat: 9.535, lon: 100.062, region: "world", group: "asia", pages: false },
  { slug: "kuta", key: "kuta", name: "קוטה, באלי", en: "Kuta, Bali", lat: -8.718, lon: 115.166, region: "world", group: "asia", pages: false },
  { slug: "nusa-dua", key: "nusadua", name: "נוסה דואה, באלי", en: "Nusa Dua, Bali", lat: -8.800, lon: 115.235, region: "world", group: "asia", pages: false },
  { slug: "boracay", key: "boracay", name: "בורקאי, הפיליפינים", en: "White Beach, Boracay", lat: 11.963, lon: 121.924, region: "world", group: "asia", icon: true, pages: false },
  { slug: "el-nido", key: "elnido", name: "אל נידו, פלאוואן", en: "El Nido, Palawan", lat: 11.180, lon: 119.390, region: "world", group: "asia", pages: false },
  { slug: "jumeirah", key: "jumeirah", name: "ג׳ומיירה, דובאי", en: "Jumeirah, Dubai", lat: 25.200, lon: 55.235, region: "world", group: "asia", icon: true, pages: false },
  // Oceania
  { slug: "bondi", key: "bondi", name: "בונדי, סידני", en: "Bondi Beach, Sydney", lat: -33.891, lon: 151.278, region: "world", group: "oceania", icon: true, pages: false },
  { slug: "manly", key: "manly", name: "מנלי, סידני", en: "Manly, Sydney", lat: -33.797, lon: 151.288, region: "world", group: "oceania", pages: false },
  { slug: "whitehaven", key: "whitehaven", name: "וייטהייבן, אוסטרליה", en: "Whitehaven, Whitsundays", lat: -20.282, lon: 149.039, region: "world", group: "oceania", icon: true, pages: false },
  { slug: "byron-bay", key: "byronbay", name: "ביירון ביי", en: "Byron Bay", lat: -28.642, lon: 153.612, region: "world", group: "oceania", pages: false },
  { slug: "bora-bora", key: "borabora", name: "בורה בורה (מטירה)", en: "Matira, Bora Bora", lat: -16.545, lon: -151.740, region: "world", group: "oceania", icon: true, pages: false },
  // Africa & Indian Ocean islands
  { slug: "zanzibar", key: "zanzibar", name: "זנזיבר (נונגווי)", en: "Nungwi, Zanzibar", lat: -5.727, lon: 39.297, region: "world", group: "africa", icon: true, pages: false },
  { slug: "diani", key: "diani", name: "דיאני, קניה", en: "Diani Beach, Kenya", lat: -4.280, lon: 39.600, region: "world", group: "africa", pages: false },
  { slug: "clifton", key: "clifton", name: "קליפטון, קייפטאון", en: "Clifton, Cape Town", lat: -33.940, lon: 18.372, region: "world", group: "africa", pages: false },
  { slug: "camps-bay", key: "campsbay", name: "קמפס ביי, קייפטאון", en: "Camps Bay, Cape Town", lat: -33.951, lon: 18.377, region: "world", group: "africa", pages: false },
  { slug: "anse-source", key: "ansesource", name: "אנס סורס ד׳ארז׳אן, סיישל", en: "Anse Source d'Argent, Seychelles", lat: -4.373, lon: 55.828, region: "world", group: "africa", icon: true, pages: false },
  { slug: "flic-en-flac", key: "flicenflac", name: "פליק אן פלאק, מאוריציוס", en: "Flic en Flac, Mauritius", lat: -20.280, lon: 57.360, region: "world", group: "africa", pages: false },
  // ---- More flat-water classics for the planet scan (lagoons, sheltered bays, reef-protected coasts) ----
  // Mediterranean & Atlantic Europe
  { slug: "blue-lagoon-comino", key: "bluelagooncomino", name: "הלגונה הכחולה, מלטה", en: "Blue Lagoon, Comino", lat: 36.015, lon: 14.325, region: "world", group: "europe", pages: false },
  { slug: "san-vito", key: "sanvito", name: "סן ויטו לו קאפו, סיציליה", en: "San Vito lo Capo, Sicily", lat: 38.183, lon: 12.735, region: "world", group: "europe", pages: false },
  { slug: "palombaggia", key: "palombaggia", name: "פלומבאג׳ה, קורסיקה", en: "Palombaggia, Corsica", lat: 41.560, lon: 9.325, region: "world", group: "europe", pages: false },
  { slug: "zlatni-rat", key: "zlatnirat", name: "זלאטני ראט, בראץ׳", en: "Zlatni Rat, Brač", lat: 43.257, lon: 16.634, region: "world", group: "europe", pages: false },
  { slug: "ksamil", key: "ksamil", name: "קסמיל, אלבניה", en: "Ksamil, Albania", lat: 39.768, lon: 20.000, region: "world", group: "europe", pages: false },
  { slug: "budva", key: "budva", name: "בודווה, מונטנגרו", en: "Budva, Montenegro", lat: 42.283, lon: 18.840, region: "world", group: "europe", pages: false },
  { slug: "myrtos", key: "myrtos", name: "מירטוס, קפלוניה", en: "Myrtos, Kefalonia", lat: 38.342, lon: 20.535, region: "world", group: "europe", pages: false },
  { slug: "vai", key: "vai", name: "ואי, כרתים", en: "Vai, Crete", lat: 35.254, lon: 26.265, region: "world", group: "europe", pages: false },
  { slug: "sani", key: "sani", name: "סאני, חלקידיקי", en: "Sani, Halkidiki", lat: 40.095, lon: 23.310, region: "world", group: "europe", pages: false },
  { slug: "fig-tree-bay", key: "figtreebay", name: "פיג טרי ביי, פרוטראס", en: "Fig Tree Bay, Protaras", lat: 35.012, lon: 34.058, region: "world", group: "europe", pages: false },
  { slug: "cesme", key: "cesme", name: "צ׳שמה, איזמיר", en: "Çeşme, İzmir", lat: 38.300, lon: 26.300, region: "world", group: "europe", pages: false },
  { slug: "bodrum", key: "bodrum", name: "בודרום", en: "Bodrum", lat: 37.030, lon: 27.430, region: "world", group: "europe", pages: false },
  { slug: "alanya", key: "alanya", name: "אלניה (קליאופטרה)", en: "Cleopatra Beach, Alanya", lat: 36.545, lon: 31.985, region: "world", group: "europe", pages: false },
  { slug: "costa-brava", key: "costabrava", name: "קוסטה בראבה (טוסה)", en: "Tossa de Mar, Costa Brava", lat: 41.718, lon: 2.935, region: "world", group: "europe", pages: false },
  { slug: "madeira", key: "madeira", name: "מדיירה (קלהטה)", en: "Calheta, Madeira", lat: 32.717, lon: -17.175, region: "world", group: "europe", pages: false },
  { slug: "batumi", key: "batumi", name: "באטומי, גיאורגיה", en: "Batumi, Georgia", lat: 41.650, lon: 41.630, region: "world", group: "europe", pages: false },
  // Middle East & Red Sea
  { slug: "marsa-matruh", key: "marsamatruh", name: "מרסה מטרוח (עג׳יבה)", en: "Agiba, Marsa Matruh", lat: 31.400, lon: 27.150, region: "world", group: "mideast", pages: false },
  { slug: "hurghada", key: "hurghada", name: "הורגדה", en: "Hurghada", lat: 27.230, lon: 33.850, region: "world", group: "mideast", pages: false },
  { slug: "marsa-alam", key: "marsaalam", name: "מרסה עלם", en: "Marsa Alam", lat: 25.070, lon: 34.900, region: "world", group: "mideast", pages: false },
  { slug: "aqaba", key: "aqaba", name: "עקבה", en: "Aqaba", lat: 29.450, lon: 34.990, region: "world", group: "mideast", pages: false },
  { slug: "saadiyat", key: "saadiyat", name: "סעדיאת, אבו דאבי", en: "Saadiyat, Abu Dhabi", lat: 24.550, lon: 54.430, region: "world", group: "mideast", pages: false },
  { slug: "salalah", key: "salalah", name: "סלאלה, עומאן", en: "Salalah, Oman", lat: 17.000, lon: 54.100, region: "world", group: "mideast", pages: false },
  { slug: "hammamet", key: "hammamet", name: "חמאמת, תוניסיה", en: "Hammamet, Tunisia", lat: 36.400, lon: 10.620, region: "world", group: "mideast", pages: false },
  { slug: "djerba", key: "djerba", name: "ג׳רבה", en: "Djerba", lat: 33.830, lon: 11.030, region: "world", group: "mideast", pages: false },
  { slug: "agadir", key: "agadir", name: "אגאדיר, מרוקו", en: "Agadir, Morocco", lat: 30.415, lon: -9.620, region: "world", group: "mideast", pages: false },
  // Caribbean & Atlantic
  { slug: "shoal-bay", key: "shoalbay", name: "שואל ביי, אנגווילה", en: "Shoal Bay, Anguilla", lat: 18.260, lon: -63.030, region: "world", group: "caribbean", pages: false },
  { slug: "horseshoe-bay", key: "horseshoebay", name: "הורסשו ביי, ברמודה", en: "Horseshoe Bay, Bermuda", lat: 32.248, lon: -64.830, region: "world", group: "caribbean", pages: false },
  { slug: "caye-caulker", key: "cayecaulker", name: "קיי קולקר, בליז", en: "Caye Caulker, Belize", lat: 17.740, lon: -88.025, region: "world", group: "caribbean", pages: false },
  { slug: "roatan", key: "roatan", name: "רואטן, הונדורס", en: "West Bay, Roatán", lat: 16.270, lon: -86.600, region: "world", group: "caribbean", pages: false },
  { slug: "bocas", key: "bocas", name: "בוקאס דל טורו", en: "Bocas del Toro", lat: 9.350, lon: -82.250, region: "world", group: "caribbean", pages: false },
  { slug: "los-roques", key: "losroques", name: "לוס רוקס, ונצואלה", en: "Los Roques", lat: 11.850, lon: -66.750, region: "world", group: "caribbean", pages: false },
  { slug: "playa-blanca", key: "playablanca", name: "פלאיה בלנקה, קרטחנה", en: "Playa Blanca, Cartagena", lat: 10.230, lon: -75.600, region: "world", group: "caribbean", pages: false },
  { slug: "bonaire", key: "bonaire", name: "בונייר", en: "Bonaire", lat: 12.150, lon: -68.290, region: "world", group: "caribbean", pages: false },
  { slug: "carlisle-bay", key: "carlislebay", name: "קרלייל ביי, ברבדוס", en: "Carlisle Bay, Barbados", lat: 13.085, lon: -59.615, region: "world", group: "caribbean", pages: false },
  { slug: "cozumel", key: "cozumel", name: "קוסומל", en: "Cozumel", lat: 20.480, lon: -86.980, region: "world", group: "caribbean", pages: false },
  { slug: "key-west", key: "keywest", name: "קי ווסט", en: "Key West", lat: 24.545, lon: -81.790, region: "world", group: "americas", pages: false },
  { slug: "clearwater", key: "clearwater", name: "קלירווטר, פלורידה", en: "Clearwater Beach", lat: 27.977, lon: -82.830, region: "world", group: "americas", pages: false },
  { slug: "destin", key: "destin", name: "דסטין, פלורידה", en: "Destin, Florida", lat: 30.385, lon: -86.480, region: "world", group: "americas", pages: false },
  { slug: "cabo-pulmo", key: "cabopulmo", name: "קאבו פולמו", en: "Cabo Pulmo", lat: 23.440, lon: -109.420, region: "world", group: "americas", pages: false },
  { slug: "wailea", key: "wailea", name: "ואיליאה, מאווי", en: "Wailea, Maui", lat: 20.685, lon: -156.445, region: "world", group: "americas", pages: false },
  { slug: "kona", key: "kona", name: "קונה, האי הגדול", en: "Kailua-Kona", lat: 19.640, lon: -156.000, region: "world", group: "americas", pages: false },
  { slug: "buzios", key: "buzios", name: "בוזיוס, ברזיל", en: "Búzios", lat: -22.745, lon: -41.880, region: "world", group: "americas", pages: false },
  { slug: "jericoacoara", key: "jericoacoara", name: "ז׳ריקואקוארה", en: "Jericoacoara", lat: -2.795, lon: -40.510, region: "world", group: "americas", pages: false },
  // Asia & Indian Ocean
  { slug: "halong", key: "halong", name: "מפרץ הא לונג", en: "Ha Long Bay", lat: 20.910, lon: 107.180, region: "world", group: "asia", pages: false },
  { slug: "phu-quoc", key: "phuquoc", name: "פו קווק, וייטנאם", en: "Phú Quốc", lat: 10.180, lon: 103.965, region: "world", group: "asia", pages: false },
  { slug: "da-nang", key: "danang", name: "דה נאנג (מי קה)", en: "My Khe, Da Nang", lat: 16.060, lon: 108.245, region: "world", group: "asia", pages: false },
  { slug: "koh-lipe", key: "kohlipe", name: "קו ליפה", en: "Koh Lipe", lat: 6.490, lon: 99.305, region: "world", group: "asia", pages: false },
  { slug: "phang-nga", key: "phangnga", name: "מפרץ פאנג נגה", en: "Phang Nga Bay", lat: 8.250, lon: 98.500, region: "world", group: "asia", pages: false },
  { slug: "hua-hin", key: "huahin", name: "הואה הין", en: "Hua Hin", lat: 12.565, lon: 99.965, region: "world", group: "asia", pages: false },
  { slug: "koh-larn", key: "kohlarn", name: "קו לארן, פטאיה", en: "Koh Larn, Pattaya", lat: 12.920, lon: 100.780, region: "world", group: "asia", pages: false },
  { slug: "langkawi", key: "langkawi", name: "לנגקאווי", en: "Langkawi", lat: 6.430, lon: 99.680, region: "world", group: "asia", pages: false },
  { slug: "gili", key: "gili", name: "איי גילי, לומבוק", en: "Gili Trawangan", lat: -8.350, lon: 116.040, region: "world", group: "asia", pages: false },
  { slug: "coron", key: "coron", name: "קורון, פלאוואן", en: "Coron, Palawan", lat: 11.995, lon: 120.205, region: "world", group: "asia", pages: false },
  { slug: "okinawa", key: "okinawa", name: "אוקינאווה (אונה)", en: "Onna, Okinawa", lat: 26.500, lon: 127.850, region: "world", group: "asia", pages: false },
  { slug: "unawatuna", key: "unawatuna", name: "אונאווטונה, סרי לנקה", en: "Unawatuna, Sri Lanka", lat: 6.010, lon: 80.250, region: "world", group: "asia", pages: false },
  { slug: "palolem", key: "palolem", name: "פאלולם, גואה", en: "Palolem, Goa", lat: 15.010, lon: 74.020, region: "world", group: "asia", pages: false },
  { slug: "radhanagar", key: "radhanagar", name: "רדהנגר, איי אנדמן", en: "Radhanagar, Andaman", lat: 11.985, lon: 92.950, region: "world", group: "asia", pages: false },
  { slug: "baa-atoll", key: "baaatoll", name: "אטול באא, המלדיביים", en: "Baa Atoll, Maldives", lat: 5.150, lon: 73.000, region: "world", group: "asia", pages: false },
  // Oceania & Pacific
  { slug: "moorea", key: "moorea", name: "מוארה", en: "Moorea", lat: -17.490, lon: -149.850, region: "world", group: "oceania", pages: false },
  { slug: "rangiroa", key: "rangiroa", name: "רנגירואה", en: "Rangiroa", lat: -14.960, lon: -147.640, region: "world", group: "oceania", pages: false },
  { slug: "denarau", key: "denarau", name: "דנאראו, פיג׳י", en: "Denarau, Fiji", lat: -17.770, lon: 177.380, region: "world", group: "oceania", pages: false },
  { slug: "port-douglas", key: "portdouglas", name: "פורט דאגלס, אוסטרליה", en: "Four Mile Beach, Port Douglas", lat: -16.490, lon: 145.470, region: "world", group: "oceania", pages: false },
  { slug: "coral-bay-au", key: "coralbayau", name: "קורל ביי, נינגלו", en: "Coral Bay, Ningaloo", lat: -23.140, lon: 113.770, region: "world", group: "oceania", pages: false },
  { slug: "rottnest", key: "rottnest", name: "רוטנסט, פרת׳", en: "Rottnest Island", lat: -32.000, lon: 115.520, region: "world", group: "oceania", pages: false },
  { slug: "rarotonga", key: "rarotonga", name: "ררוטונגה, איי קוק", en: "Muri, Rarotonga", lat: -21.255, lon: -159.735, region: "world", group: "oceania", pages: false },
  // Africa & islands
  { slug: "nosy-be", key: "nosybe", name: "נוסי בה, מדגסקר", en: "Nosy Be", lat: -13.320, lon: 48.190, region: "world", group: "africa", pages: false },
  { slug: "tofo", key: "tofo", name: "טופו, מוזמביק", en: "Tofo, Mozambique", lat: -23.850, lon: 35.545, region: "world", group: "africa", pages: false },
  { slug: "sal", key: "sal", name: "סאל, כף ורדה", en: "Santa Maria, Sal", lat: 16.595, lon: -22.905, region: "world", group: "africa", pages: false },
  { slug: "mombasa", key: "mombasa", name: "מומבסה (ניאלי)", en: "Nyali, Mombasa", lat: -4.030, lon: 39.720, region: "world", group: "africa", pages: false },
  { slug: "praslin", key: "praslin", name: "אנס לזיו, פרלין", en: "Anse Lazio, Praslin", lat: -4.290, lon: 55.700, region: "world", group: "africa", pages: false },
];
export const REGIONS = {
  israel: { name: "חופי ישראל", nameEn: "Israel", timezone: "Asia/Jerusalem", order: "north", pick: b => b.region === "israel" },
  redsea: { name: "אילת", nameEn: "Eilat", timezone: "Asia/Jerusalem", order: "north", pick: b => b.region === "redsea" },
  sinai: { name: "מאילת עד שארם", nameEn: "Eilat to Sharm", timezone: "Asia/Jerusalem", order: "north", pick: b => b.region === "sinai" || b.slug === "eilat" },
  world: { name: "חופים אייקוניים בעולם", nameEn: "Iconic beaches", timezone: "auto", order: "score", pick: b => b.region === "world" && b.icon },
  europe: { name: "אירופה והים התיכון", nameEn: "Europe & Mediterranean", timezone: "auto", order: "score", pick: b => b.group === "europe" },
  caribbean: { name: "הקריביים ומקסיקו", nameEn: "Caribbean & Mexico", timezone: "auto", order: "score", pick: b => b.group === "caribbean" },
  americas: { name: "אמריקה והוואי", nameEn: "Americas & Hawaii", timezone: "auto", order: "score", pick: b => b.group === "americas" },
  asia: { name: "אסיה והמפרץ", nameEn: "Asia & the Gulf", timezone: "auto", order: "score", pick: b => b.group === "asia" },
  oceania: { name: "אוסטרליה והפסיפיק", nameEn: "Australia & Pacific", timezone: "auto", order: "score", pick: b => b.group === "oceania" },
  africa: { name: "אפריקה והאוקיינוס ההודי", nameEn: "Africa & Indian Ocean", timezone: "auto", order: "score", pick: b => b.group === "africa" },
  mideast: { name: "המזרח התיכון וצפון אפריקה", nameEn: "Middle East & North Africa", timezone: "auto", order: "score", pick: b => b.group === "mideast" },
  planet: { name: "כדור הארץ", nameEn: "Planet", timezone: "auto", order: "score", pick: b => b.region === "world" },
};
// English tier names (labels only; thresholds/colours come from palata.js).
export const TIER_EN = { deluxe: "Palata Deluxe", palata: "Flat Sea", almost: "Almost Flat", gentle: "Light Waves", waves: "Some Waves", big: "Big Waves", stormy: "Stormy" };
export const HE_DAYS = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];
export const EN_DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
export const pad = n => String(n).padStart(2, "0");
export const dayName = ds => HE_DAYS[new Date(ds + "T12:00:00Z").getUTCDay()];
export const dayNameEn = ds => EN_DAYS[new Date(ds + "T12:00:00Z").getUTCDay()];
export const addDays = (ds, n) => { const d = new Date(ds + "T12:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
// Israel wall clock (the forecast is requested in Asia/Jerusalem, so date/hour strings compare directly).
export function israelNow() {
  const s = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Jerusalem", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date());
  const [dateStr, hm] = s.split(" "); const [h, m] = hm.split(":").map(Number);
  return { dateStr, hour: h === 24 ? 0 : h, minute: m, text: `${dateStr.slice(8, 10)}.${dateStr.slice(5, 7)}.${dateStr.slice(0, 4)} ${pad(h === 24 ? 0 : h)}:${pad(m)}` };
}
// Local wall clock at a beach from Open-Meteo's utc_offset_seconds (for timezone=auto requests).
export function localNowFromOffset(offsetSeconds) {
  const d = new Date(Date.now() + (offsetSeconds || 0) * 1000);
  return { dateStr: d.toISOString().slice(0, 10), hour: d.getUTCHours(), minute: d.getUTCMinutes() };
}
