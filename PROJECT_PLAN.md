# Archidocky v1 - 建築行業協作平台規劃文件

## 項目概述

**願景**: 打造建築行業專業人士的一站式協作平台，提升項目管理效率，縮短學界與業界的距離。

**使命**: 讓建築項目的文檔管理、版本控制、專業協作變得簡單高效，並通過 AI 技術提升工作效率。

## 目標用戶群體

### 主要用戶

- **建築師 (Architects)**
- **結構工程師 (Structure Engineers)**
- **土木工程師 (Civil Engineers)**
- **規劃師 (Planners)**
- **房地產開發商 (Property Developers)**
- **景觀建築師 (Landscape Architects)**
- **桁架設計師 (Truss Designers)**
- **市政審批專員 (Council Processors)**

### 次要用戶

- **建築相關學生** - 幫助他們與業界銜接
- **項目協調員 (Coordinators)** - 減少文書處理工作

## 核心價值主張

1. **版本控制統一化** - 所有項目相關人員總是能找到最新版本的圖紙
2. **工作流程自動化** - 減少重複性文書工作，提升效率
3. **知識共享平台** - 建立行業知識庫，促進經驗交流
4. **AI 輔助決策** - 智能分析文檔、法規，提供專業建議
5. **無縫協作體驗** - 打破專業壁壘，提升項目溝通效率

## 核心功能模組

### 1. 企業圖庫管理系統 (Company Detail Library)

**目標**: 每個公司建立專屬的標準細節圖庫

**功能特性**:

- PDF 格式的標準細節圖塊儲存
- 分類標籤系統 (結構、建築、機電等)
- 版本控制和更新通知
- 搜尋和篩選功能
- 圖塊預覽和批量管理
- 公司間的圖庫分享權限設定

**技術考量**:

- 檔案儲存: 混合儲存策略 (見下方檔案儲存架構)
- 圖像處理: PDF.js 或 React-PDF
- 搜尋: 全文搜尋 + 標籤系統

### 檔案儲存架構 (Hybrid Storage Strategy)

#### 儲存分層策略:

**目標**: 平衡成本與效能，處理大型建築 PDF 檔案

**Tier 1 - 熱儲存 (Hot Storage)**: Convex File Storage

- **用途**: 最新版本 + 最近 30 天的檔案
- **特性**: 快速存取、即時同步、協作編輯
- **限制**: 單檔 50MB，總容量依方案限制
- **適用**:
  - 當前工作版本
  - 正在編輯的文檔
  - 頻繁存取的檔案

**Tier 2 - 溫儲存 (Warm Storage)**: AWS S3 Standard / Azure Blob Storage

- **用途**: 30-90 天的歷史版本
- **特性**: 平衡的成本與存取速度
- **還原時間**: < 5 秒
- **適用**:
  - 近期歷史版本
  - 備份檔案
  - 審計追蹤用途

**Tier 3 - 冷儲存 (Cold Storage)**: AWS S3 Glacier / Azure Archive Storage

- **用途**: 90 天以上的歷史版本
- **特性**: 低成本長期保存
- **還原時間**: 1-5 分鐘 (Expedited), 3-5 小時 (Standard)
- **適用**:
  - 長期歸檔
  - 法規遵循要求
  - 歷史記錄保存

#### 版本管理策略:

**自動分層規則**:

```javascript
// 檔案生命週期管理
const FILE_LIFECYCLE = {
  HOT: {
    retention: 30, // days
    storage: "convex",
    autoSync: true,
  },
  WARM: {
    retention: 90, // days
    storage: "s3-standard",
    autoSync: false,
  },
  COLD: {
    retention: "unlimited",
    storage: "s3-glacier",
    autoSync: false,
  },
};
```

**版本還原流程**:

1. 用戶請求還原舊版本
2. 系統檢查檔案位置 (Hot/Warm/Cold)
3. 從對應儲存層取回檔案
4. 創建新的當前版本（保留原歷史版本）
5. 新版本自動進入 Hot Storage
6. 舊的"當前版本"降級為歷史版本

**智能預測載入**:

- 分析用戶存取模式
- 預先將可能需要的檔案從 Cold 移至 Warm
- 減少實際還原等待時間

**成本優化**:

```
估算（每月）:
- Hot (Convex): $0.25/GB
- Warm (S3): $0.023/GB
- Cold (Glacier): $0.004/GB

範例：1000個用戶，平均每專案 50 個版本
- 當前版本 10GB → Convex: $2.5
- 近期版本 100GB → S3: $2.3
- 歷史版本 500GB → Glacier: $2.0
總計: ~$7/月 vs 全 Convex: ~$150/月
```

#### 技術實現:

```typescript
// lib/storage/file-manager.ts
interface FileVersion {
  id: string;
  version: number;
  storageLayer: "hot" | "warm" | "cold";
  location: string;
  size: number;
  createdAt: Date;
  isCurrent: boolean;
}

async function restoreVersion(versionId: string) {
  const version = await getVersion(versionId);

  // 根據儲存層處理
  switch (version.storageLayer) {
    case "hot":
      return await convex.storage.get(version.location);
    case "warm":
      return await s3.getObject(version.location);
    case "cold":
      // 請求快速取回
      await glacier.initiateRetrievalExpedited(version.location);
      // 通知用戶預計等待時間
      return { status: "restoring", eta: "1-5 minutes" };
  }
}
```

### 2. 智能 PDF 協作平台 (Smart PDF Collaboration)

**目標**: 提供完整的線上 PDF 編輯和協作體驗

#### 核心功能:

**PDF 瀏覽與管理**

- 高性能線上 PDF 瀏覽器
- 多頁面縮圖導航
- 縮放、旋轉、全螢幕檢視
- 頁面重新排序和管理

**標註與協作**

- 文字標註、高亮標記
- 幾何圖形標註 (線條、箭頭、矩形)
- 便簽評論系統
- 協作者即時標註同步
- 標註歷史和版本追蹤

**文檔編輯**

- 頁面名稱自訂
- 跨頁面超連結建立
- 頁面複製和新增
- 頁面刪除和重組
- 電子簽名功能

**細節圖塊整合**

- 從公司圖庫拖拽插入細節圖塊
- 自由調整圖塊位置和大小
- 圖塊層級管理
- 圖塊與原始 PDF 的融合

**技術實現**:

- PDF 引擎: PDF.js 或 PSPDFKit
- 即時協作: Convex Real-time
- 檔案處理: PDF-lib
- 畫布操作: Fabric.js 或 Konva.js

### 3. AI 智能助手系統 (AI-Powered Assistant)

**目標**: 提供建築專業的 AI 輔助服務

#### 文檔智能分析:

**圖紙解讀**

- OCR 文字識別和結構化
- 圖紙元素自動標記 (尺寸、符號、註解)
- 設計規範符合性檢查
- 圖紙間一致性驗證

**文件處理**

- 技術規範自動摘要
- 合約條款重點提取
- 會議記錄自動整理
- 項目進度報告生成

**法規合規性檢查**

- 建築法規自動比對
- 地方法規符合性分析
- 設計修改建議生成
- 法規更新通知

#### RFI 智能處理:

**問題彙整**

- RFI 郵件自動分析和分類
- 問題優先級評估
- 相似問題歷史查詢
- 回覆模板智能生成

**文檔自動化**

- 根據公司格式自動產生回覆文檔
- Council 表格自動填寫
- 項目信息智能匹配
- 工作流程自動化

**技術整合**:

- AI 模型: Google Gemini API
- 文檔處理: LangChain
- OCR: Google Document AI
- 自然語言處理: 自訂 AI 工作流

### 4. 法規知識庫系統 (Regulatory Knowledge Base)

**目標**: 建立完整的建築法規和合規性資料庫

#### 內容管理:

**官方法規庫**

- 國家建築法規
- 地方政府法規
- 行業標準規範
- 環保和安全規定

**供應商合規資料**

- 產品技術規格
- 安裝施工標準
- 認證和測試報告
- 維護保養指南

**用戶貢獻內容**

- 用戶上傳的常用法規
- 實務經驗分享
- 案例分析和解決方案
- 最佳實務指南

#### AI 學習系統:

- 法規內容自動索引
- 交叉引用關係建立
- 智能問答系統
- 個人化推薦

**技術架構**:

- 內容管理: Convex Database
- 搜尋引擎: Algolia 或內建搜尋
- AI 學習: RAG (檢索增強生成)
- 內容結構化: Markdown + 標籤系統

### 5. RFI 社群論壇 (RFI Community Forum)

**目標**: 建立 RFI 問題分享和解決社群

#### 論壇功能:

**問題分享**

- RFI 案例匿名發佈
- 問題分類和標籤
- 圖片和文檔附件
- 緊急程度標記

**社群互動**

- 專家回答和建議
- 投票和評分系統
- 最佳答案認證
- 經驗分享和討論

**知識累積**

- 常見問題資料庫
- 解決方案模板庫
- 專家貢獻排行
- 搜尋和推薦系統

**技術實現**:

- 論壇系統: 自訂開發
- 內容管理: Convex
- 搜尋功能: 全文搜尋
- 通知系統: 即時推播

## 技術架構設計

### 前端技術棧

- **框架**: Next.js 16 (App Router)
- **狀態管理**: Convex (自帶狀態管理)
- **樣式方案**:
  - Tailwind CSS (主要樣式)
  - SCSS (細緻 UI 調整)
  - ShadCN/UI (組件庫)
- **身份驗證**: Clerk
- **資料獲取**: Convex (內建即時查詢)

### 後端與資料庫

- **後端即服務**: Convex
  - 即時資料庫
  - 檔案儲存
  - 即時協作
  - 身份驗證整合
- **AI 服務**: Google Gemini API
- **檔案處理**: PDF.js, PDF-lib
- **搜尋服務**: Convex 內建搜尋

### 開發與維護工具

#### 關於 TanStack Query:

**建議**: 不需要使用 TanStack Query
**原因**:

- Convex 提供內建的即時查詢和快取
- 避免雙重抽象層
- Convex 的 useQuery hook 已經處理了快取、載入狀態、錯誤處理
- 減少包大小和複雜度

#### 關於 Sentry:

**強烈建議**: 必須整合 Sentry
**原因**:

- 一人開發團隊更需要完善的錯誤監控
- 提前發現和修復用戶遇到的問題
- 效能監控幫助優化用戶體驗
- 發布追蹤幫助問題定位

**Sentry 配置**:

```javascript
// sentry.client.config.ts
import { init } from "@sentry/nextjs";

init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 1.0,
  environment: process.env.NODE_ENV,
  integrations: [
    // PDF 處理錯誤監控
    // AI API 調用監控
    // 檔案上傳錯誤追蹤
  ],
});
```

### SEO 優化策略 (針對紐西蘭和澳洲市場)

#### 目標市場設定:

- **主要市場**: New Zealand, Australia
- **語言**: English (AU/NZ spelling - "colour", "centre", "organise")
- **時區**: NZST/AEDT
- **貨幣**: NZD/AUD

#### 技術 SEO:

- **Next.js 16 優勢**: Built-in SEO optimisation
- **Metadata管理**: Dynamic page titles and descriptions
- **Structured Data**: JSON-LD markup for construction industry
- **XML Sitemap**: Auto-generated sitemap.xml
- **Page Speed**: Turbopack optimisation for fast loading
- **Geo-targeting**: Set hreflang tags for AU/NZ regions
- **Local Schema**: LocalBusiness schema for NZ/AU presence

#### Content SEO Keywords (AU/NZ English):

**Primary Keywords:**

- "construction collaboration platform nz"
- "architectural drawing management australia"
- "RFI management software new zealand"
- "building consent document management"
- "construction project collaboration australia"

**Long-tail Keywords:**

- "architect drawing sharing software nz"
- "structural engineer collaboration tool australia"
- "construction detail library management"
- "building compliance software new zealand"
- "architectural RFI tracking australia"

**Industry-specific Terms:**

- "building consent process nz"
- "council submission documents australia"
- "architectural detail drawings library"
- "construction compliance documentation"

#### Content Marketing Strategy:

- Building Code compliance guides (NZ Building Code, BCA Australia)
- Council submission process tutorials
- NZ/AU construction regulation updates
- Local supplier compliance documentation
- Industry case studies from ANZ region
- Construction best practice articles

#### Technical Implementation:

```javascript
// app/layout.tsx - SEO Configuration for AU/NZ
export const metadata = {
  title: "Archidocky - Construction Collaboration Platform for NZ & Australia",
  description:
    "Professional construction project collaboration, drawing management and AI-powered RFI assistance for architects, engineers and construction professionals in New Zealand and Australia.",
  keywords: [
    "construction collaboration nz",
    "architectural drawing management australia",
    "RFI management software",
    "building consent documents",
    "construction project management",
  ],
  alternates: {
    canonical: "https://archidocky.com",
    languages: {
      "en-NZ": "https://archidocky.com/nz",
      "en-AU": "https://archidocky.com/au",
    },
  },
  openGraph: {
    title: "Archidocky - Construction Collaboration Platform",
    description:
      "Streamline construction projects with professional collaboration tools",
    images: ["/og-image.jpg"],
    locale: "en_NZ",
    alternateLocale: ["en_AU"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
};
```

#### Local SEO Optimisation:

- Register on Google Business Profile (NZ & AU locations)
- List on local construction directories
- Partner with NZ/AU construction associations
- Target local construction forums and communities
- Build backlinks from NZ/AU construction websites

## 使用者體驗設計

### 設計原則

1. **專業且友善**: 符合建築行業的專業需求，同時保持易用性
2. **效率優先**: 減少點擊次數，提供快捷操作
3. **資訊清晰**: 重要資訊突出顯示，層次分明
4. **回應式設計**: 支援桌機、平板、手機多種設備
5. **無障礙設計**: 符合 WCAG 標準

### 核心使用流程

#### 新用戶啟動流程:

1. **註冊/登入** (Clerk 處理)
2. **公司資訊設定** - 公司名稱、行業類型、團隊規模
3. **角色選擇** - 建築師、工程師、學生等
4. **引導教學** - 互動式功能介紹
5. **首個項目建立** - 範例項目快速上手

#### 日常工作流程:

1. **儀表板概覽** - 待辦事項、最新更新、重要通知
2. **項目選擇** - 快速切換不同項目
3. **文檔操作** - 上傳、檢視、標註、分享
4. **AI 輔助** - 問題諮詢、文檔分析
5. **協作互動** - 評論、討論、通知

### UI/UX 設計方向

#### 色彩系統 - 用戶自訂主題 (User-Customizable Theming)

**設計理念**: 讓用戶完全掌控視覺體驗，提供專業且個性化的工作環境

**功能特性**:

- 用戶可自由選擇文字顏色和背景顏色
- 提供完整的色彩選擇器 (Full Color Palette)
- 系統自動計算對比度確保可讀性
- 智能生成中性色階
- 即時預覽主題效果

**預設主題配置**:

**1. 經典黑白主題 (Default Light)**

```javascript
const classicLight = {
  background: "#FFFFFF",
  text: "#000000",
  primary: "#2563EB", // 用戶可修改
  secondary: "#F59E0B", // 用戶可修改
  // 自動計算的中性色
  neutral: {
    50: "#F9FAFB",
    100: "#F3F4F6",
    200: "#E5E7EB",
    300: "#D1D5DB",
    400: "#9CA3AF",
    500: "#6B7280",
    600: "#4B5563",
    700: "#374151",
    800: "#1F2937",
    900: "#111827",
  },
};
```

**2. 深色主題 (Dark Theme)**

```javascript
const classicDark = {
  background: "#0F172A",
  text: "#F8FAFC",
  primary: "#3B82F6",
  secondary: "#F59E0B",
  // 自動反轉計算中性色
};
```

**智能色彩系統算法**:

**1. 對比度檢查 (WCAG AAA)**

```typescript
// lib/theme/contrast-checker.ts
function calculateContrast(bg: string, text: string): number {
  // WCAG 對比度計算
  const ratio = getContrastRatio(bg, text);
  return ratio;
}

function ensureReadability(bg: string, text: string): string {
  const ratio = calculateContrast(bg, text);

  // WCAG AAA 要求: 7:1
  if (ratio < 7) {
    // 自動調整文字顏色直到達標
    return adjustTextColor(bg, text, 7);
  }
  return text;
}
```

**2. 中性色自動生成**

```typescript
// lib/theme/neutral-generator.ts
function generateNeutralScale(background: string, text: string) {
  // 基於背景色和文字色，生成 10 級灰階
  const bgHSL = hexToHSL(background);
  const textHSL = hexToHSL(text);

  const neutrals = {};
  for (let i = 50; i <= 900; i += 50) {
    // 插值計算每個色階
    const lightness = interpolate(bgHSL.l, textHSL.l, i / 1000);
    neutrals[i] = hslToHex({
      h: bgHSL.h,
      s: Math.min(bgHSL.s, 10), // 低飽和度
      l: lightness,
    });
  }

  return neutrals;
}
```

**3. 主色調與輔助色應用**

```typescript
// lib/theme/color-roles.ts
interface ThemeColors {
  // 用戶選擇
  background: string;
  text: string;
  primary: string; // 主要操作、連結
  secondary: string; // 次要操作

  // 自動生成
  neutral: NeutralScale;

  // 功能性顏色（基於主色調）
  success: string; // 從 primary 派生
  warning: string; // 從 secondary 派生
  error: string; // 從 secondary 派生
  info: string; // 從 primary 派生
}
```

**主題編輯器 UI**:

```tsx
// components/theme-editor.tsx
<ThemeEditor>
  <ColorPicker
    label="Background Colour"
    value={theme.background}
    onChange={handleBackgroundChange}
    fullPalette={true}
  />

  <ColorPicker
    label="Text Colour"
    value={theme.text}
    onChange={handleTextChange}
    fullPalette={true}
  />

  <ContrastIndicator ratio={contrastRatio} />

  <ColorPicker
    label="Primary Colour"
    value={theme.primary}
    onChange={handlePrimaryChange}
  />

  <ColorPicker
    label="Secondary Colour"
    value={theme.secondary}
    onChange={handleSecondaryChange}
  />

  <ThemePreview theme={currentTheme} />

  <NeutralScalePreview neutrals={generatedNeutrals} />
</ThemeEditor>
```

**儲存與應用**:

```typescript
// 保存到用戶設定
await convex.mutation.users.updateTheme({
  userId: user.id,
  theme: customTheme,
});

// CSS Variables 動態應用
document.documentElement.style.setProperty("--color-bg", theme.background);
document.documentElement.style.setProperty("--color-text", theme.text);
document.documentElement.style.setProperty("--color-primary", theme.primary);
// ... 其他變數
```

**Tailwind 整合**:

```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        // 使用 CSS 變數以支援動態主題
        background: "var(--color-bg)",
        text: "var(--color-text)",
        primary: {
          DEFAULT: "var(--color-primary)",
          50: "var(--color-primary-50)",
          // ... 自動生成的色階
        },
        neutral: {
          50: "var(--color-neutral-50)",
          // ... 自動生成的 10 級灰階
        },
      },
    },
  },
};
```

**預設主題庫**:

- Classic Light
- Classic Dark
- Ocean Blue
- Forest Green
- Sunset Orange
- Professional Grey
- High Contrast (Accessibility)

#### 組件設計:

- **卡片式佈局**: 資訊模組化呈現
- **表格設計**: 清晰的資料呈現和操作
- **表單設計**: 分步驟表單，減少認知負擔
- **導航設計**: 側邊欄 + 麵包屑導航

## 開發階段規劃

### Phase 1: 基礎建設 (4-6 週)

- [ ] 專案架構搭建
- [ ] Clerk 身份驗證整合
- [ ] Convex 資料庫設計
- [ ] 基礎 UI 組件建立
- [ ] Sentry 錯誤監控整合

### Phase 2: 核心功能 (8-10 週)

- [ ] 公司圖庫管理系統
- [ ] 基礎 PDF 檢視功能
- [ ] 檔案上傳下載系統
- [ ] 用戶角色權限管理
- [ ] 基礎搜尋功能

### Phase 3: 協作功能 (6-8 週)

- [ ] PDF 標註系統
- [ ] 即時協作功能
- [ ] 版本控制系統
- [ ] 通知系統
- [ ] 評論討論功能

### Phase 4: AI 整合 (8-10 週)

- [ ] Gemini API 整合
- [ ] 文檔分析功能
- [ ] RFI 智能處理
- [ ] 法規知識庫建立
- [ ] AI 問答系統

### Phase 5: 社群功能 (4-6 週)

- [ ] RFI 論壇系統
- [ ] 用戶互動功能
- [ ] 內容審核系統
- [ ] 社群管理工具

### Phase 6: 優化與上線 (4-6 週)

- [ ] 效能優化
- [ ] SEO 實施
- [ ] 安全性加固
- [ ] 使用者測試
- [ ] 正式上線部署

## 商業模式考量

### 收費策略:

1. **免費版**: 基礎功能，檔案數量限制 限制 AI 使用額度
2. **專業版**: 完整功能，無限檔案，無限制 AI 使用額度
3. **教育版**: 完整功能，每個用戶3份檔案，無限用戶，學校一次付一學年的費用，學生不用付費，學校管理學生的帳號和密碼，限制AI 使用額度
4. **廣告收入**: 建立廣告專用的頁面，類似Pinterest網站，用subscription收費

### 目標指標:

- **用戶註冊**: 第一年 1000+ 專業用戶
- **活躍度**: 月活躍率 60%+
- **付費轉換**: 15%+ 付費轉換率
- **客戶滿意度**: NPS 評分 50+

## 風險評估與對策

### 技術風險:

- **AI API 成本**: 實施使用量監控和優化
- **檔案儲存成本**: CDN 優化和檔案壓縮
- **擴展性問題**: Convex 自動擴展，按需付費

### 商業風險:

- **市場接受度**: 早期用戶反饋和快速迭代
- **競爭對手**: 差異化功能和用戶體驗優勢
- **法規遵循**: 資料安全和隱私保護

## 成功衡量標準

### 產品指標:

- [ ] 用戶留存率 > 70% (30 天)
- [ ] 功能使用率 > 60% (核心功能)
- [ ] 錯誤率 < 1% (Sentry 監控)
- [ ] 頁面載入速度 < 3 秒

### 商業指標:

- [ ] 月營收成長率 > 20%
- [ ] 客戶生命週期價值 > 獲客成本 3 倍
- [ ] 品牌知名度在目標群體中 > 30%

---

**總結**: Archidocky v1 將成為建築行業數位轉型的重要工具，透過創新的技術整合和用戶體驗設計，解決行業痛點，創造商業價值。

**下一步**: 等待 UI/UX 設計稿，開始 Phase 1 開發工作。
