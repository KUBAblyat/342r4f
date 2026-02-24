# 🌍 GeoDueler — Free Edition

**Мультиплеєрний клон GeoGuessr — повністю безкоштовний!**

✅ Без Google Maps API  
✅ Без кредитної карти  
✅ Хостинг на GitHub Pages (безкоштовно)  
✅ БД через Supabase (безкоштовно)

---

## 🚀 Запуск за 5 хвилин

### 1. Supabase (база даних + мультиплеєр)

1. Іди на **[supabase.com](https://supabase.com/)** → New Project
2. **SQL Editor → New Query** → вклей вміст `supabase_schema.sql` → **Run**
3. **Database → Replication** → увімкни Realtime для: `rooms`, `players`, `guesses`
4. **Project Settings → API** → скопіюй:
   - Project URL: `https://xxxx.supabase.co`
   - anon public key: `eyJhbGci...`

### 2. Вклей ключі в `js/config.js`

```javascript
SUPABASE_URL:      "https://xxxx.supabase.co",
SUPABASE_ANON_KEY: "eyJhbGci...",
```

### 3. GitHub Pages

```bash
git init
git add .
git commit -m "GeoDueler"
git remote add origin https://github.com/ТВІЙ_НІКНЕЙМ/geodueler.git
git push -u origin main
```

**GitHub → Settings → Pages → main branch → Save**

Через ~1 хв: `https://ТВІЙ_НІКНЕЙМ.github.io/geodueler/`

---

## 🎮 Як грати

- **Соло** — дивись на фото, вгадай де це на карті
- **Мультиплеєр** — поділись 6-значним кодом, грайте разом
- **Очки** — чим ближче здогадка → тим більше очок (макс 5000)

## 📁 Файли

```
├── index.html          ← весь інтерфейс
├── style.css           ← стилі
├── js/config.js        ← ← ЗАПОВНИ КЛЮЧІ SUPABASE
├── js/locations.js     ← 70+ локацій з фото
├── js/db.js            ← Supabase операції
├── js/game.js          ← ігрова логіка
└── supabase_schema.sql ← SQL для БД
```
