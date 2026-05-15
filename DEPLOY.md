# 🚀 Deploy Albion Farming Calculator (Free)

## Option 1: Netlify (Recommended — Easiest)

### Cách 1: Drag & Drop
1. Truy cập [app.netlify.com](https://app.netlify.com)
2. Đăng ký/đăng nhập (GitHub, Gmail, etc.)
3. Click **"Add new site"** → **"Deploy manually"**
4. Kéo thả **toàn bộ folder** `Albion Farming Calculator` vào
5. Done! Netlify cho bạn URL dạng `https://random-name.netlify.app`

### Cách 2: CLI
```bash
npm install -g netlify-cli
cd "Albion Farming Calculator"
netlify deploy --prod --dir .
```

---

## Option 2: Vercel

### Bước 1: Push lên GitHub
```bash
cd "Albion Farming Calculator"
git init
git add .
git commit -m "feat: initial deploy"
git remote add origin https://github.com/<username>/albion-farming-calculator.git
git push -u origin main
```

### Bước 2: Deploy
1. Truy cập [vercel.com](https://vercel.com) → Import Git Repository
2. Chọn repo vừa push
3. Framework: **Other** (static site)
4. Click **Deploy**
5. URL: `https://albion-farming-calculator.vercel.app`

---

## Option 3: GitHub Pages (100% Free)

```bash
cd "Albion Farming Calculator"
git init
git add .
git commit -m "feat: initial deploy"
git remote add origin https://github.com/<username>/albion-farming-calculator.git
git push -u origin main
```

1. GitHub repo → **Settings** → **Pages**
2. Source: **Deploy from branch** → `main` → `/ (root)`
3. Save → URL: `https://<username>.github.io/albion-farming-calculator/`

---

## Lưu ý
- App là **static HTML/CSS/JS** → deploy ở đâu cũng được, không cần server
- **LocalStorage** chỉ lưu trên trình duyệt người dùng, không cần database
- API Albion Online Data là **public**, không cần key
