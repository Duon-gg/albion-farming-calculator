# Albion Farming Calculator — Full Context Document

> Tài liệu mô tả chi tiết toàn bộ kiến trúc, logic, data model, UI, và conventions của dự án.
> Mục đích: cung cấp đủ context cho AI assistant tiếp tục phát triển mà không cần đọc lại code.

---

## 1. Tổng quan dự án

**Mục đích:** Calculator tính lợi nhuận trồng trọt (farming) trong game Albion Online, hỗ trợ quản lý nhiều đảo, theo dõi thu nhập hàng ngày, và tính hoàn vốn Premium.

**Tech stack:**
- Pure HTML/CSS/JS — **không framework**, 1 file HTML + 1 file CSS + 1 file JS
- **Chart.js 4.4.7** (CDN) — biểu đồ profit
- **SortableJS** (CDN) — drag & drop kéo thả đảo/entry rows
- **Google Fonts**: Inter (UI) + JetBrains Mono (số liệu)
- **Albion Online Data Project API** — fetch giá realtime

**Files:**
```
e:\Albion Farming Calculator\
├── index.html    (268 dòng, 14KB)  — HTML structure + tab layout
├── style.css     (250 dòng, 20KB)  — Design tokens + all styles
├── app.js        (405 dòng, 40KB)  — Toàn bộ logic
└── DEPLOY.md     (1.7KB)           — Hướng dẫn deploy
```

---

## 2. Data Model

### 2.1 CROPS (hardcoded constant)
```js
const CROPS = [
  { id:'carrot', name:'Carrot', tier:'T1', apiItem:'T1_CARROT', apiSeed:'T1_CARROT_SEED',
    yield:9, lp:179, waterBonus:2, emoji:'🥕' },
  { id:'bean',    tier:'T2', yield:9, lp:179, waterBonus:2, emoji:'🫘' },
  { id:'wheat',   tier:'T3', yield:9, lp:179, waterBonus:2, emoji:'🌾' },
  { id:'potato',  tier:'T4', yield:9, lp:179, waterBonus:2, emoji:'🥔' },
  { id:'cabbage', tier:'T5', yield:9, lp:179, waterBonus:2, emoji:'🥬' },
  { id:'corn',    tier:'T6', yield:9, lp:179, waterBonus:2, emoji:'🌽' },
  { id:'pumpkin', tier:'T7', yield:10, lp:142, waterBonus:0.1333, emoji:'🎃' }
];
```

### 2.2 CITIES
```js
const CITIES = ['Martlock','Lymhurst','Bridgewatch','Fort Sterling','Thetford','Caerleon'];
const API_CITIES = ['Martlock','Lymhurst','Bridgewatch','Fort_Sterling','Thetford','Caerleon'];
// API dùng underscore cho Fort_Sterling
```

### 2.3 prices (localStorage: `albion_prices`)
```js
prices = {
  carrot: {
    seed: 256,          // giá seed/hạt
    yield: 9,           // yield per plot (editable)
    lp: 179,            // LP per plot (editable)
    cities: {           // Sell Order prices
      Martlock: 470,
      Lymhurst: 436,
      ...
    },
    quickSell: {        // Quick Sell prices (buy_price_max)
      Martlock: 380,
      ...
    }
  },
  bean: { ... },
  // ... 7 crops total
}
```

### 2.4 islands (localStorage: `albion_islands`)
```js
islands = [
  {
    name: "Tôi",           // tên player/đảo
    city: "Martlock",      // thành phố đặt đảo
    crop: "carrot",        // crop ID
    farms: 16,             // số ruộng (mỗi ruộng = 9 ô)
    rent: 0                // % phí thuê (0 = free, 10 = 10%, 15 = 15%)
  },
  ...
]
```

### 2.5 history (localStorage: `albion_history`)
```js
history = [
  {
    date: "2026-05-14",    // ISO date string
    profit: 1234567,       // net profit sau seed + rent
    income: 2000000,       // tổng silver bán được
    seedPrice: 256,        // giá seed/hạt lúc ghi
    seedCost: 345600,      // totalPlots × seedPrice
    totalPlots: 1350,      // tổng ô đất
    totalRent: 42000,      // tổng phí thuê
    details: [             // chi tiết từng đảo
      {
        name: "Tôi",
        city: "Martlock",
        crop: "T1 Carrot",
        emoji: "🥕",
        farms: 16,
        income: 600000,    // silver bán được từ đảo này
        rent: 15,          // % thuê
        rentCost: 40200    // phí thuê tính được (income - seed_share) × rent%
      },
      ...
    ]
  },
  ...
]
```

### 2.6 Các localStorage keys khác
| Key | Kiểu | Mô tả |
|-----|-------|-------|
| `albion_prices` | JSON | Bảng giá crop |
| `albion_islands` | JSON | Danh sách đảo |
| `albion_history` | JSON | Lịch sử profit |
| `albion_theme` | `"light"` / `"dark"` | Theme hiện tại |
| `albion_server` | `"east"` / `"west"` / `"europe"` | API server |
| `albion_sellMode` | `"sell"` / `"quick"` | Sell Order vs Quick Sell |
| `albion_lastFetch` | string | Timestamp fetch cuối |

### 2.7 sessionStorage (entry form tạm)
| Key | Mô tả |
|-----|-------|
| `albion_entry_0`, `albion_entry_1`, ... | Silver bán mỗi đảo (tạm) |
| `albion_entry_seed` | Giá seed/hạt nhập tạm |

---

## 3. Kiến trúc UI — Tab System

### 3.1 Layout tổng thể
```
┌─────────── HEADER (sticky) ──────────────────────────────┐
│ Logo 🌾 │ Profit/ngày │ Theme │ Export │ Server │ Mode │ Fetch │
├──────────────────────────────────────────────────────────┤
│                  SUMMARY GRID (5 cards)                   │
│ Tổng Ruộng │ ƯT DT/ngày │ Profit TT/ngày │ P/tháng │ Seed │
├──────────────────────────────────────────────────────────┤
│              PREMIUM ROI + Progress Bar                   │
├──────────────────────────────────────────────────────────┤
│ TABS: Bảng Giá│Đảo│Tưới cây│So sánh│Tối ưu│LP Spec│Lịch sử│Biểu đồ │
├──────────────────────────────────────────────────────────┤
│                   TAB CONTENT                             │
└──────────────────────────────────────────────────────────┘
```

### 3.2 Các Tab

| Tab ID | Tên | Mô tả |
|--------|-----|-------|
| `prices` | 💰 Bảng Giá | Table giá seed + sell/quick sell per city. User có thể sửa tay hoặc fetch API |
| `islands` | 🏝️ Đảo | Danh sách đảo dạng table, sortable, drag & drop |
| `watering` | 💧 Tưới cây | Tính LP cần tưới, seed tiết kiệm được |
| `compare` | ⚖️ So sánh cây | So sánh profit 7 loại cây ở 1 thành phố |
| `optimize` | 🧠 Tối ưu | Gợi ý cây tốt nhất cho từng đảo |
| `spec` | 📖 LP Spec | So sánh LP tiết kiệm theo spec level |
| `history` | 📜 Lịch sử | Form ghi thu nhập hàng ngày + bảng lịch sử + chart |
| `chart` | 📊 Biểu đồ | Bar chart profit theo thành phố |

---

## 4. Logic tính toán

### 4.1 Profit từng đảo (calcIsland)
```
totalPlots = farms × 9
totalCrops = totalPlots × yield
sellPrice  = getCityPrice(prices[crop], city)   // sell order hoặc quick sell
revenue    = totalCrops × sellPrice
seedCost   = totalPlots × prices[crop].seed
netBeforeRent = revenue - seedCost
rentCost   = round(netBeforeRent × rent / 100)  // chỉ tính khi net > 0
profit     = netBeforeRent - rentCost
```

### 4.2 Phí thuê đảo (Rent System)
- `rent = 0` → FREE (đảo được cho free)
- `rent = 10` → 10% thu nhập ròng (sau trừ seed)
- `rent = 15` → 15% thu nhập ròng
- **Công thức:** `rentCost = (income - seedCost_của_đảo_đó) × rent% / 100`
- **Chỉ tính khi income > seedCost** (nếu lỗ thì không mất thuê)
- Hiển thị: `-40.2K (15%)`

### 4.3 Daily Entry (ghi thu nhập)
- User nhập silver bán được cho **từng đảo** + giá seed/hạt
- Phí thuê tính realtime: `phí = (silver_bán - farms×9×giá_hạt) × rent%`
- Tổng: `income - seedCost - totalRent = netProfit`
- Lưu vào history khi bấm "Lưu"

### 4.4 Premium ROI
```
dailyProfit = avgDailyProfit từ history (hoặc ước tính nếu chưa có)
roiDays     = ceil(premiumPrice / dailyProfit)
status      = roiDays ≤ premiumDays ? "✓ Hoàn vốn" : "✕ Thiếu X ngày"
progressBar = totalAccumulated / premiumPrice × 100%
```

### 4.5 History Filters
- 7 ngày / 30 ngày / Tất cả
- Filter dựa trên `date >= cutoffDate`

### 4.6 API Fetch
```
Primary: API_SERVERS[selectedServer]/api/v2/stats/prices/{items}.json?locations={cities}&qualities=1
Fallback: Các server khác, chỉ fill ô = 0

Response fields used:
- sell_price_min → Sell Order price
- buy_price_max → Quick Sell price
```

---

## 5. Design System (CSS)

### 5.1 Design Tokens (Dark Theme)
```css
--bg: #0f0f1a           /* Background chính */
--bg-card: #1a1a2e      /* Card background */
--bg-card-hover: #222240
--bg-input: #12122a     /* Input background */
--border: #2a2a4a
--text: #e0e0f0
--text-dim: #8888aa
--accent: #f0c040       /* Vàng gold — primary accent */
--accent-dim: #c49a20
--green: #4ade80         /* Profit dương */
--red: #f87171           /* Profit âm, phí thuê */
--cyan: #22d3ee          /* Thông tin, water */
--purple: #a78bfa
--radius: 14px           /* Card radius */
--radius-sm: 8px         /* Button/input radius */
--font: 'Inter'          /* UI text */
--mono: 'JetBrains Mono' /* Số liệu, giá */
```

### 5.2 City Badge Colors
| City | Background | Text Color |
|------|-----------|------------|
| Martlock | `rgba(59,130,246,.12)` | `#60a5fa` (blue) |
| Lymhurst | `rgba(74,222,128,.12)` | `#4ade80` (green) |
| Bridgewatch | `rgba(251,191,36,.12)` | `#fbbf24` (amber) |
| Fort Sterling | `rgba(148,163,184,.12)` | `#94a3b8` (slate) |
| Thetford | `rgba(168,85,247,.12)` | `#a855f7` (purple) |
| Caerleon | `rgba(248,113,113,.12)` | `#f87171` (red) |

### 5.3 Key CSS Patterns
- **Cards**: `var(--bg-card)` + border + radius-14 + shadow
- **Tables**: Compact `.8rem`, header gold accent, sortable columns
- **Buttons**: `.btn-accent` (gold gradient), `.btn-ghost` (transparent), `.btn-sm`
- **Badges**: `.city-badge[data-city="X"]` — color-coded per city
- **Profit**: `.profit-positive` (green), `.profit-negative` (red)
- **Empty state**: `.empty-state` — centered icon + message
- **Modal**: `.island-edit-overlay` + `.island-edit-modal` — fixed overlay + animated modal

### 5.4 Animations
| Animation | Dùng cho | Mô tả |
|-----------|---------|-------|
| `pulse-glow` | Logo 🌾 | Scale + glow pulse |
| `shimmer` | Title gradient | Background-position slide |
| `value-flash` | Card values | Scale 1.15 + brightness |
| `badge-in` | Badges | Scale from 0.85 |
| `tab-in` | Tab switch | Fade + translateY |
| `modal-in` | Edit modal | Scale 0.9 + translateY |
| `dropBounce` | After drag-drop | Scale + green flash |
| `dragPulse` | Drop placeholder | Opacity pulse |
| `spin` | Fetch button | rotate(360deg) |

### 5.5 Drag & Drop (SortableJS)
```css
.sortable-ghost    → scale(1.03) rotate(1.5deg), gold shadow
.sortable-chosen   → subtle gold background
.sortable-fallback → scale(1.05) rotate(2deg), heavy shadow (mobile)
.drop-flash        → bounce + green flash animation
.drag-handle       → ☰ icon, opacity .35 → 1 on hover
```

### 5.6 Responsive Breakpoints
| Width | Changes |
|-------|---------|
| ≤ 1024px | Summary grid: 3 cols |
| ≤ 768px | Header wrap, summary 2 cols, watering 1 col |
| ≤ 480px | Summary 1 col, tabs vertical, full-width |

---

## 6. Hàm chính trong app.js

### 6.1 Init & Data
| Hàm | Mô tả |
|-----|-------|
| `init()` | Load data, render all, restore theme/server |
| `loadData()` | Parse localStorage → prices, islands |
| `savePrices()` | Persist prices to localStorage |
| `saveIslands()` | Persist islands to localStorage |

### 6.2 Formatting
| Hàm | Mô tả |
|-----|-------|
| `fmt(n)` | `1,234,567` — full number format |
| `fmtC(n)` | `1.2M`, `345.6K`, `890` — compact format |

### 6.3 Price Table
| Hàm | Mô tả |
|-----|-------|
| `renderPriceTable()` | Render crop price inputs |
| `updatePrice(id,f,v)` | Update seed/yield/lp |
| `updateCityPrice(id,ci,v,mode)` | Update sell/quick price |
| `getCityPrice(p,city)` | Get price based on sell mode |

### 6.4 Islands
| Hàm | Mô tả |
|-----|-------|
| `addIsland()` | Add island + open edit modal |
| `removeIsland(i)` | Delete island |
| `editIsland(i)` | Open edit modal |
| `saveEdit(i)` | Save edit from modal |
| `renderIslands()` | Render island table + init SortableJS |
| `sortIslands(f)` | Toggle sort by field |
| `calcIsland(isl)` | Calculate all metrics for 1 island |
| `calcCropProfit(cropId,city,farms)` | Quick profit calc |

### 6.5 History
| Hàm | Mô tả |
|-----|-------|
| `getHistory()` | Parse history from localStorage |
| `saveHistory(h)` | Persist history |
| `renderHistory()` | Render history table + chart |
| `renderDailyEntryForm()` | Render entry form with filter bar + table |
| `rerenderEntryRows()` | Rebuild entry table rows + seed row + SortableJS |
| `updateDailyTotal()` | Realtime calc total + rent per island |
| `saveDailyEntry()` | Save day entry to history |
| `editHistoryEntry(idx)` | Load history entry into form for editing |
| `cancelEditHistory()` | Cancel edit mode |
| `deleteHistoryEntry(idx)` | Delete single history entry |
| `clearHistory()` | Delete all history |
| `toggleDetail(idx)` | Toggle detail panel in history row |
| `setHistoryFilter(days)` | Set 7/30/all filter |
| `getFilteredHistory()` | Apply filter to history |

### 6.6 Entry Form Table Structure
```
☰ │ Tên │ TP │ Cây │ Ruộng │ Thuê │ Silver bán │ Phí thuê
───┼─────┼────┼─────┼───────┼──────┼────────────┼─────────
☰ │ Tôi │ ML │ 🥕T1│ 16    │ FREE │ [input]    │ —
☰ │ Sei │ FS │ 🥕T1│ 16    │ -15% │ [input]    │ -40.2K (15%)
───┼─────┴────┴─────┴───────┴──────┼────────────┼─────────
   │ 🌱 Giá hạt giống · X ruộng   │ [input]    │
```
- Phí thuê cột cuối cập nhật realtime qua `updateDailyTotal()`
- Seed row nằm cuối bảng, colspan
- SortableJS handle = `☰` (class `.drag-handle`)

### 6.7 Other Features
| Hàm | Mô tả |
|-----|-------|
| `recalcAll()` | Master recalc: summary, watering, premium ROI, chart |
| `fetchPrices()` | Fetch API + fallback servers |
| `exportResults()` | Clipboard / file download text report |
| `runCompare()` | Compare 7 crops profit |
| `runOptimize()` | Suggest best crop per island |
| `runSpec()` | LP spec comparison |
| `updateChart()` | Bar chart profit per city |
| `toggleTheme()` | Dark ↔ Light |
| `switchTab(id,btn)` | Tab navigation |
| `showToast(msg,type)` | Toast notification (success/error/info) |
| `animV(id,target)` | Animated number transition |

---

## 7. API Integration

### 7.1 Servers
```js
const API_SERVERS = {
  east:   'https://east.albion-online-data.com',
  west:   'https://west.albion-online-data.com',
  europe: 'https://europe.albion-online-data.com'
};
```

### 7.2 Fetch Flow
1. Fetch primary server: `GET /api/v2/stats/prices/{items}.json?locations={cities}&qualities=1`
2. Parse response: `sell_price_min` → Sell Order, `buy_price_max` → Quick Sell
3. Fallback: fetch other servers, only fill cells that are still 0
4. Seed price: use lowest `sell_price_min` across all cities

### 7.3 Response Format
```json
[
  {
    "item_id": "T1_CARROT",
    "city": "Martlock",
    "sell_price_min": 470,
    "buy_price_max": 380,
    ...
  }
]
```

---

## 8. UI Components Reference

### 8.1 Summary Cards
```html
<div class="card summary-card" data-accent="gold|green|cyan">
  <div class="card-icon">🏠</div>
  <div class="card-body">
    <div class="card-label">Label</div>
    <div class="card-value gold|green|cyan" id="...">0</div>
    <div class="card-sub">sub text</div>
  </div>
</div>
```

### 8.2 Section Header
```html
<div class="section-header">
  <h2 class="section-title">📜 Title</h2>
  <button class="btn btn-accent btn-sm">Action</button>
</div>
```

### 8.3 Table
```html
<div class="table-wrap">
  <table>
    <thead><tr><th>Col</th><th class="sortable" onclick="sort()">Col⇅</th></tr></thead>
    <tbody id="bodyId"></tbody>
  </table>
</div>
```

### 8.4 Empty State
```html
<div id="noX" class="empty-state"><span>🏝️</span><p>Chưa có gì.</p></div>
```

### 8.5 Edit Modal
```html
<div class="island-edit-overlay">
  <div class="island-edit-modal">
    <h3>Title</h3>
    <div class="input-group"><label>Label</label><input></div>
    <div class="modal-actions">
      <button class="btn btn-ghost">Hủy</button>
      <button class="btn btn-accent">Lưu</button>
    </div>
  </div>
</div>
```

### 8.6 Toast
```js
showToast('Message', 'success|error|info');
```

---

## 9. Conventions & Patterns

### 9.1 Coding Style
- **Minified-ish**: Functions ngắn, ít whitespace, chaining `.forEach()`
- **No modules/bundler**: Tất cả global scope
- **DOM manipulation**: `document.createElement()` + `.innerHTML`
- **Event handling**: Inline `onclick="..."` 
- **State**: Global variables `prices`, `islands`, `sortField`, etc.

### 9.2 Naming
- CSS class: kebab-case (`summary-card`, `btn-ghost`)
- JS functions: camelCase (`renderIslands`, `calcIsland`)
- DOM IDs: camelCase hoặc snake (`totalFarms`, `entry_0`)
- localStorage keys: `albion_` prefix

### 9.3 Render Pattern
```
User action → modify data → save to localStorage → re-render → recalcAll()
```

### 9.4 Number Formatting
- Display: `fmtC()` cho compact (1.2M, 345.6K)
- Tables: `fmt()` cho full (1,234,567)
- Currency: Không có đơn vị prefix, chỉ suffix "silver"

### 9.5 Color Semantics
- **Gold/Accent**: Revenue, DT, active tab, accent elements
- **Green**: Profit dương, FREE, success
- **Red**: Profit âm, phí thuê, error, danger
- **Cyan**: Thông tin, water, date badge
- **Dim**: Labels, secondary text

---

## 10. Tính năng đã implement

- [x] Bảng giá crop editable + auto-fetch API
- [x] Multi-server support (Asia East, Americas West, Europe)
- [x] Sell Order vs Quick Sell mode
- [x] Quản lý đảo (CRUD + edit modal)
- [x] Drag & drop reorder đảo (SortableJS)
- [x] Sortable columns trong island table
- [x] Hệ thống thuê đảo (0% = FREE, X% = tính trên net income)
- [x] Form ghi thu nhập hàng ngày (table layout)
- [x] Bộ lọc entry form (search, city, status)
- [x] Phí thuê realtime (cột "Phí thuê" cập nhật khi nhập silver)
- [x] Lịch sử profit (table + line chart)
- [x] Filter lịch sử (7 ngày / 30 ngày / tất cả)
- [x] Edit/delete history entries
- [x] Premium ROI calculator + progress bar
- [x] Tưới cây — tính LP + seed saving
- [x] So sánh 7 loại cây
- [x] Tối ưu — gợi ý cây tốt nhất
- [x] LP Spec comparison
- [x] Bar chart profit theo thành phố
- [x] Export report (clipboard/file)
- [x] Dark/Light theme
- [x] Responsive (mobile/tablet/desktop)
- [x] Animated number transitions
- [x] Toast notifications

---

## 11. Known Issues / Limitations

- Không có authentication — tất cả local storage
- Không có JSON import/export (chỉ text report)
- History chart phải destroy + recreate khi đổi theme
- Entry form dùng sessionStorage (mất khi đóng tab)
- SortableJS filter conflict khi drag hidden rows
- Pumpkin T7 waterBonus thấp (0.1333) so với T1-T6 (2.0)

---

## 12. Hướng phát triển tiềm năng

- [ ] JSON Import/Export cho backup data
- [ ] Multi-character support (mỗi account riêng)
- [ ] Auto-fetch schedule
- [ ] PWA offline support
- [ ] Database/cloud sync
- [ ] Detailed rent report per month
- [ ] Island groups / categories
