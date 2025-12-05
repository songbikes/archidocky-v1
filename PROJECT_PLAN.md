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
- 圖像處理: React-PDF (Phase 1-3) → Nutrient SDK (Phase 4+)
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

#### PDF 整合方案 - 階段性策略:

**Phase 1-3 (MVP): React-PDF**

**選擇原因**:

- ✅ **零成本** - 完全開源 (MIT License)
- ✅ **快速整合** - 1-2 天完成基本功能
- ✅ **足夠 MVP** - 涵蓋檢視、註解、文字選取需求
- ✅ **社群活躍** - 10.7k GitHub stars，持續維護
- ✅ **Next.js 友善** - 官方範例完整

**技術規格**:

```bash
npm install react-pdf pdfjs-dist
```

**核心功能支援**:

- ✅ 高性能 PDF 渲染 (WebAssembly)
- ✅ 文字層與註解層
- ✅ 縮放、旋轉、搜尋
- ✅ 多頁面導航
- ✅ 離線支援
- ⚠️ 基礎註解顯示（無編輯）
- ❌ 即時協作（需 Convex 自行實作）
- ❌ 文字編輯
- ❌ 電子簽名

**Phase 4+ (進階功能): 評估 Nutrient SDK**

**升級時機** (當以下任一條件成立):

1. 付費用戶達到 **50+ 公司**
2. 用戶強烈要求「即時協作編輯」
3. 需符合 Council 數位簽名規範
4. AI 功能需深度整合 PDF 工作流

**Nutrient SDK 優勢**:

- ✅ **完整 PDF 生命週期** - 檢視、編輯、簽名、比對
- ✅ **即時協作** - 內建 Instant Collaboration
- ✅ **17 種註解類型** - 專業標註工具
- ✅ **文字編輯** - 直接修改 PDF 內容
- ✅ **電子+數位簽名** - Council 合規
- ✅ **文件比對** - 版本差異分析
- ✅ **AI 整合** - 內建 AI Assistant
- ✅ **企業級認證** - SOC 2 Type 2
- ✅ **PDFium 引擎** - Chrome/Edge 同款
- 💰 **商業授權** - 需聯繫報價

**技術規格**:

```bash
npm install pspdfkit
# 或使用 Cloud API (免維護基礎設施)
```

**遷移策略**:

- React-PDF 與 Nutrient 都是 React 組件
- 遷移成本低，主要是 API 差異
- 可逐步遷移（先核心功能，再擴展）

**成本效益分析**:

```
React-PDF (Phase 1-3):
- 授權費用: $0
- 開發時間: 2-3 天
- 限制: 無進階編輯/協作

Nutrient (Phase 4+):
- 授權費用: 待洽談（估 $500-2000/月）
- 節省開發: 6-12 個月工程時間
- ROI: 官方數據顯示 63% 工程成本降低
```

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

**Phase 1-3 實作 (React-PDF)**:

```typescript
// components/PDFViewer.tsx
'use client';
import { Document, Page } from 'react-pdf';
import { pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

export function PDFViewer({ fileUrl }: { fileUrl: string }) {
  const [numPages, setNumPages] = useState<number>();
  const [pageNumber, setPageNumber] = useState(1);

  return (
    <Document
      file={fileUrl}
      onLoadSuccess={({ numPages }) => setNumPages(numPages)}
      options={{
        cMapUrl: '/cmaps/',
        standardFontDataUrl: '/standard_fonts/',
      }}
    >
      {Array.from(new Array(numPages), (el, index) => (
        <Page
          key={`page_${index + 1}`}
          pageNumber={index + 1}
          renderTextLayer={true}
          renderAnnotationLayer={true}
          scale={scale}
        />
      ))}
    </Document>
  );
}
```

**協作功能 (Convex 實作)**:

```typescript
// convex/annotations.ts
export const addAnnotation = mutation({
  args: {
    pdfId: v.id("pdfs"),
    pageNumber: v.number(),
    position: v.object({ x: v.number(), y: v.number() }),
    content: v.string(),
    type: v.string(), // 'comment', 'highlight', 'drawing'
  },
  handler: async (ctx, args) => {
    const annotationId = await ctx.db.insert("annotations", {
      ...args,
      createdAt: Date.now(),
      createdBy: ctx.auth.getUserIdentity()?.subject,
    });

    // 即時通知其他協作者
    await ctx.db.insert("notifications", {
      type: "new_annotation",
      targetUsers: await getProjectMembers(args.pdfId),
      data: { annotationId, pageNumber: args.pageNumber },
    });

    return annotationId;
  },
});

// 即時訂閱註解更新
export const subscribeAnnotations = query({
  args: { pdfId: v.id("pdfs") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("annotations")
      .filter((q) => q.eq(q.field("pdfId"), args.pdfId))
      .collect();
  },
});
```

**Phase 4+ 升級 (Nutrient)**:

```typescript
// components/PDFViewerPro.tsx
import PSPDFKit from "pspdfkit";

export async function PDFViewerPro({ fileUrl }: { fileUrl: string }) {
  useEffect(() => {
    PSPDFKit.load({
      container: "#pspdfkit",
      document: fileUrl,
      licenseKey: process.env.NEXT_PUBLIC_PSPDFKIT_KEY,

      // 即時協作
      instant: true,
      instantJSON: {
        documentId: documentId,
        serverUrl: "wss://your-instant-server.com",
      },

      // 自訂工具列
      toolbarItems: [
        ...PSPDFKit.defaultToolbarItems,
        { type: "custom", title: "AI Assistant", onPress: openAIPanel },
      ],

      // 電子簽名
      signatureOptions: {
        enabled: true,
        appearance: "council-compliant",
      },
    });
  }, []);
}
```

**檔案處理**: PDF-lib (兩階段通用)
**畫布操作**: Fabric.js 或 Konva.js (Phase 1-3)
**即時協作**: Convex Real-time (Phase 1-3) / Nutrient Instant (Phase 4+)

### 2.5. 智能地址分析與法規查詢系統 (Smart Address Analysis & Compliance Lookup)

**目標**: 根據項目地址自動獲取 Council 分區、BRANZ 氣候數據及相關建築法規

#### 核心功能：

**A. Council 分區自動查詢 (Automated Zoning Lookup)**

**支援的 Council（Phase 1-3 逐步擴展）**:

- Auckland Council - Unitary Plan
- Wellington City Council - District Plan
- Christchurch City Council - District Plan
- Queenstown Lakes District Council
- Hamilton City Council
- 其他主要城市 Council...

**查詢流程**:

```
用戶輸入項目地址
    ↓
地址標準化 & 驗證（NZ Post API / Google Maps）
    ↓
地址 → GPS 座標轉換
    ↓
反向工程 Council GIS 系統
    ├─ Auckland: Unitary Plan Viewer API
    ├─ Wellington: District Plan GIS
    ├─ Christchurch: Planning Maps API
    └─ 其他: 各 Council ArcGIS/MapServer
    ↓
獲取分區資訊
    ├─ Zone Code (如: MHU, CCZ, RS)
    ├─ Zone Name (如: Mixed Housing Urban)
    ├─ Overlay Zones (如: Heritage, Volcanic)
    ├─ Precincts (如: Special Character)
    └─ Height Limits
    ↓
自動顯示在項目儀表板
```

**技術實現 - 反向工程方法**:

**1. Auckland Council 範例**:

```typescript
// lib/council/auckland-zone-lookup.ts

interface AucklandZoneResult {
  zoneCode: string; // "MHU"
  zoneName: string; // "Mixed Housing Urban Zone"
  overlays: string[]; // ["Historic Heritage", "Flood"]
  heightLimit: number; // 11 metres
  precinct?: string;
  coordinates: { lat: number; lng: number };
}

async function getAucklandZone(address: string): Promise<AucklandZoneResult> {
  // Step 1: 地址 → 座標（Auckland Council Geocoder）
  const geocodeResponse = await fetch(
    "https://maps.aucklandcouncil.govt.nz/arcgis/rest/services/Locators/ACAddress/GeocodeServer/findAddressCandidates",
    {
      method: "POST",
      body: new URLSearchParams({
        SingleLine: address,
        f: "json",
        outSR: "2193", // NZTM座標系統
        maxLocations: "1",
      }),
    }
  );

  const { candidates } = await geocodeResponse.json();
  const location = candidates[0].location; // { x, y } in NZTM

  // Step 2: 座標 → Zone 資訊（Unitary Plan Viewer API）
  const zoneResponse = await fetch(
    "https://unitaryplan.aucklandcouncil.govt.nz/arcgis/rest/services/PlanViewer/MapServer/identify?" +
      new URLSearchParams({
        geometry: `${location.x},${location.y}`,
        geometryType: "esriGeometryPoint",
        layers: "all:20,all:21,all:22", // Zones, Height, Overlays
        tolerance: "1",
        mapExtent: `${location.x - 100},${location.y - 100},${location.x + 100},${location.y + 100}`,
        imageDisplay: "1024,768,96",
        returnGeometry: "false",
        f: "json",
      })
  );

  const zoneData = await zoneResponse.json();

  // Step 3: 解析並返回結果
  return parseAucklandZoneData(zoneData.results);
}

// 座標系統轉換 (NZTM → WGS84)
function convertNZTMtoLatLng(x: number, y: number) {
  const proj4 = require("proj4");
  const nztm =
    "+proj=tmerc +lat_0=0 +lon_0=173 +k=0.9996 +x_0=1600000 +y_0=10000000 +ellps=GRS80";
  const wgs84 = "+proj=longlat +datum=WGS84";
  const [lng, lat] = proj4(nztm, wgs84, [x, y]);
  return { lat, lng };
}
```

**2. 多 Council 統一介面**:

```typescript
// lib/council/unified-zone-lookup.ts

interface UnifiedZoneResult {
  council: string;
  zoneCode: string;
  zoneName: string;
  restrictions: {
    heightLimit?: number;
    siteCoverage?: number;
    setbacks?: { front: number; side: number; rear: number };
    buildingTypes?: string[];
  };
  overlays: string[];
  sourceUrl: string;
  lastUpdated: Date;
}

async function getZoneByAddress(address: string): Promise<UnifiedZoneResult> {
  // 1. 識別 Council
  const council = await identifyCouncil(address);

  // 2. 路由到對應的查詢函數
  switch (council) {
    case "auckland":
      return await getAucklandZone(address);
    case "wellington":
      return await getWellingtonZone(address);
    case "christchurch":
      return await getChristchurchZone(address);
    default:
      return await getFallbackZone(address); // Manual lookup
  }
}
```

**B. BRANZ 氣候與環境數據自動查詢**

**BRANZ 數據源**:

- Erosion Zone (侵蝕區)
- Earthquake Zone (地震區)
- Wind Zone (風區)
- Wind Region (風域)
- Lee Zone (背風區)
- Climate Zone (氣候區)
- Snow Load Zone (雪載區)
- Rainfall Zone (降雨區)

**查詢流程**:

```typescript
// lib/branz/climate-data-lookup.ts

interface BRANZClimateData {
  address: string;
  coordinates: { lat: number; lng: number };
  zones: {
    erosion: "Very High" | "High" | "Medium" | "Low";
    earthquake: "Zone A" | "Zone B" | "Zone C";
    wind: "W1" | "W2" | "W3" | "W4";
    windRegion: "A" | "B" | "C";
    leeZone: boolean;
    climate: "Zone 1" | "Zone 2" | "Zone 3";
    snowLoad?: number; // kPa
    rainfall?: number; // mm/year
  };
  buildingCodeReferences: {
    NZS3604: string[]; // 相關條款
    E2AS1: string[]; // 外部防水標準
    B1VM1: string[]; // 結構標準
  };
}

async function getBRANZData(coordinates: {
  lat: number;
  lng: number;
}): Promise<BRANZClimateData> {
  // 方法 1: BRANZ 官方 API（如果存在）
  // 方法 2: 反向工程 BRANZ Maps
  // 方法 3: 預建資料庫 + 地理插值

  const branzResponse = await fetch(
    "https://branzdata.example.com/api/climate-zones",
    {
      params: {
        lat: coordinates.lat,
        lng: coordinates.lng,
      },
    }
  );

  return await branzResponse.json();
}
```

**反向工程 BRANZ Maps**:

```typescript
// lib/branz/reverse-engineer-maps.ts

async function scrapeBRANZMaps(coordinates: { lat: number; lng: number }) {
  // 1. 載入 BRANZ 互動地圖
  const mapUrl = `https://branz.co.nz/climate-zones/map?lat=${coordinates.lat}&lng=${coordinates.lng}`;

  // 2. 使用 Puppeteer 模擬瀏覽器
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto(mapUrl);

  // 3. 擷取地圖圖層數據
  const zoneData = await page.evaluate(() => {
    // 執行網頁內的 JavaScript 獲取圖層資訊
    return window.mapLayers.getZoneInfo();
  });

  await browser.close();

  return zoneData;
}
```

**C. Council 表格自動填寫（整合功能）**

當用戶創建項目時：

```typescript
// convex/projects.ts

export const createProject = mutation({
  args: {
    name: v.string(),
    siteAddress: v.string(),
    // ...
  },
  handler: async (ctx, args) => {
    // 1. 創建項目
    const projectId = await ctx.db.insert("projects", args);

    // 2. 自動查詢 Zone 和氣候數據
    const zoneData = await getZoneByAddress(args.siteAddress);
    const climateData = await getBRANZData(zoneData.coordinates);

    // 3. 儲存到項目
    await ctx.db.patch(projectId, {
      zoneInfo: zoneData,
      climateData: climateData,
    });

    // 4. 自動生成 Council 表格（已預填地址）
    const forms = [
      "AC2326 - Producer Statement Construction",
      "AC1011 - Lodgement Checklist Residential",
    ];

    for (const formName of forms) {
      const filledPDF = await autoFillCouncilForm(formName, {
        address: args.siteAddress,
        zone: zoneData.zoneName,
        // ... 其他資料
      });

      // 儲存 PDF 到項目
      const storageId = await ctx.storage.store(filledPDF);
      await ctx.db.insert("documents", {
        projectId,
        name: formName,
        storageId,
        autoGenerated: true,
      });
    }

    return projectId;
  },
});
```

**D. 項目儀表板顯示**

```tsx
// components/project-dashboard.tsx

<ProjectDashboard>
  <Section title="Site Information">
    <AddressCard address={project.siteAddress} />

    <ZoneCard>
      <Badge>{zoneInfo.council}</Badge>
      <h3>{zoneInfo.zoneName}</h3>
      <p>Code: {zoneInfo.zoneCode}</p>

      <Restrictions>
        <Item>Height Limit: {zoneInfo.restrictions.heightLimit}m</Item>
        <Item>Site Coverage: {zoneInfo.restrictions.siteCoverage}%</Item>
        <Item>
          Setbacks: F{setbacks.front}m / S{setbacks.side}m / R{setbacks.rear}m
        </Item>
      </Restrictions>

      {zoneInfo.overlays.length > 0 && (
        <Overlays>
          {zoneInfo.overlays.map((overlay) => (
            <Badge variant="warning">{overlay}</Badge>
          ))}
        </Overlays>
      )}
    </ZoneCard>

    <ClimateCard>
      <h3>BRANZ Climate Data</h3>
      <Grid>
        <DataItem label="Wind Zone" value={climateData.zones.wind} />
        <DataItem
          label="Earthquake Zone"
          value={climateData.zones.earthquake}
        />
        <DataItem label="Erosion Zone" value={climateData.zones.erosion} />
        <DataItem label="Climate Zone" value={climateData.zones.climate} />
      </Grid>

      <Alert>
        Relevant Building Code:{" "}
        {climateData.buildingCodeReferences.NZS3604.join(", ")}
      </Alert>
    </ClimateCard>
  </Section>

  <Section title="Auto-Generated Documents">
    <DocumentList>
      {autoGeneratedForms.map((form) => (
        <DocumentCard
          name={form.name}
          status="Pre-filled with site data"
          onView={() => openPDF(form.id)}
        />
      ))}
    </DocumentList>
  </Section>
</ProjectDashboard>
```

#### 技術架構：

**資料快取策略**:

```typescript
// lib/cache/zone-cache.ts

// 快取 Zone 查詢結果（避免重複請求 Council API）
const zoneCache = new Map<string, { data: ZoneResult; expiry: Date }>();

async function getCachedZone(address: string) {
  const cached = zoneCache.get(address);
  if (cached && cached.expiry > new Date()) {
    return cached.data;
  }

  const freshData = await getZoneByAddress(address);
  zoneCache.set(address, {
    data: freshData,
    expiry: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 天
  });

  return freshData;
}
```

**錯誤處理與降級方案**:

```typescript
async function getZoneWithFallback(address: string) {
  try {
    // 嘗試自動查詢
    return await getZoneByAddress(address);
  } catch (error) {
    // 降級：提供手動輸入介面
    return {
      status: "manual_input_required",
      message: "Unable to auto-detect zone. Please select manually.",
      manualOptions: await getCouncilZoneList(),
    };
  }
}
```

**監測與維護**:

- 定期驗證 API 端點是否變更
- 自動化測試已知地址的 Zone 準確性
- Council 規則變更通知系統

#### 法律與免責聲明：

**重要聲明**（顯示在每個查詢結果）:

> ⚠️ **Disclaimer**: This information is automatically retrieved from council databases and BRANZ data sources for reference purposes only. Always verify with the relevant council and consult with licensed professionals. Archidocky is not responsible for any inaccuracies or outdated information.

#### 優勢與差異化：

✅ **節省時間**: 自動查詢取代手動查找  
✅ **減少錯誤**: 直接從官方來源獲取資料  
✅ **即時更新**: 每次查詢都是最新資料  
✅ **整合體驗**: Zone + 氣候數據 + 表格填寫一次完成  
✅ **競爭優勢**: 市場上少有平台提供此整合功能

---

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

#### RFI 智能處理與回覆系統:

**A. 多格式 RFI 解析引擎**

**支援的輸入格式**:

- Email 內文（Gmail/Outlook API）
- Word 文檔（.docx）
- PDF 文件（文字型 + 掃描型 OCR）
- 截圖/圖片（Vision AI + OCR）

**智能內容清理**:

```typescript
// 核心原則
{
  "preserveOriginal": true,  // 保留原文（含拼音/文法錯誤）
  "formatCleaning": true,    // 清理格式
  "duplicateDetection": true, // 偵測重複問題
  "categoryTagging": true,   // 問題分類
  "extractMedia": true       // 提取圖片和連結
}
```

**AI 處理流程**:

1. 接收多種格式的 RFI 文件
2. 提取問題並保留原始措辭
3. 格式化排版、編號
4. 偵測並標記重複問題
5. 自動分類（設計、合規、文件等）
6. 提取內嵌圖片和網址
7. 生成結構化線上文檔

**技術棧**:

- Word 解析: mammoth.js
- PDF 解析: pdf-parse + React-PDF (Phase 1-3) / Nutrient Document API (Phase 4+)
- OCR: Google Document AI / Tesseract.js
- Vision AI: Google Gemini 2.0 Flash
- 文件處理: LangChain

**B. Cover Letter 生成系統（主要產出）**

**A4 直式專業文檔特性**:

- 公司抬頭（Logo + 聯絡資訊）
- 收件人資訊（Processor + Council）
- 項目參考資訊（地址、Consent Number）
- 逐題回答格式
  - 保留原始問題（含錯誤）
  - 格式化回答
  - 內嵌圖片附件
- 專業結尾與簽名
- 即時 PDF 預覽
- 一鍵下載

**生成技術**:

```typescript
// 使用 React-PDF (@react-pdf/renderer) 或 PDFKit
interface CoverLetterData {
  company: CompanyHeader;
  processor: ProcessorInfo;
  project: ProjectDetails;
  responses: QuestionResponse[];
  signature: SignatureBlock;
}

// Phase 1-3: @react-pdf/renderer (生成 PDF)
// Phase 4+: 可選用 Nutrient Document Generation API
generateCoverLetter(data) → PDF Buffer
```

**用途**:

- 下載後上傳到 Council Portal
- 列印存檔
- 郵寄給 Council（如需要）

**C. 線上回覆編輯器**

**功能特性**:

- 雙面板佈局（編輯器 + PDF 預覽）
- 每個問題獨立回答區
- Rich Text Editor（格式化文字）
- 圖片上傳與管理
- AI 輔助回答建議
- 草稿自動保存
- 即時 PDF 預覽更新

**用戶體驗**:

```tsx
<RFICoverLetterEditor>
  <LeftPanel>
    <CompanyHeaderEditor />
    {questions.map((q) => (
      <QuestionBlock>
        <OriginalQuestion readOnly>{q.text}</OriginalQuestion>
        <ResponseEditor placeholder="Enter response..." />
        <ImageUploader />
      </QuestionBlock>
    ))}
    <SignatureBlock />
  </LeftPanel>

  <RightPanel>
    <LivePDFPreview />
  </RightPanel>

  <Actions>
    <DownloadPDF />
    <SaveDraft />
    <SendNotifications />
  </Actions>
</RFICoverLetterEditor>
```

**D. 通知系統（輔助功能）**

**簡化的團隊通知**:

- 僅限平台內的專案成員
- 站內通知 ���
- Email 提醒（可選）
- 簡單訊息："RFI 回覆已提交"

**通知流程**:

```typescript
// 1. 選擇要通知的團隊成員
selectRecipients(projectMembers);

// 2. 發送站內通知
createNotification({
  type: "rfi_response",
  message: "RFI response submitted to council",
  link: "/projects/{id}/rfis/{rfiId}",
});

// 3. 可選：Email 提醒
sendEmail({
  subject: "RFI Response Submitted",
  body: simpleTemplate(message, projectLink),
});
```

**通知介面**:

- 頂部導航欄通知鈴鐺
- 未讀數量徽章
- 下拉式通知列表
- 點擊跳轉到相關 RFI

**E. 未來擴展：Council Portal 整合**

**願景**:

- 成為業界統一的 RFI 回覆平台
- 直接整合 Council Portal API
- 一鍵提交到 Council 系統
- 自動追蹤回覆狀態

**技術準備**:

```typescript
// 模組化設計，為未來整合做準備
async function submitToCouncilPortal(
  coverLetterPDF: Buffer,
  council: CouncilType
) {
  switch (council) {
    case "auckland":
      // 未來：直接 API 上傳
      return await aucklandPortalAPI.submit(coverLetterPDF);
    default:
      // 當前：提供下載 + 手動上傳指引
      return {
        downloadUrl: generateURL(coverLetterPDF),
        portalUrl: getCouncilPortalURL(council),
        instructions: getUploadInstructions(council),
      };
  }
}
```

**資料庫結構**:

```typescript
// convex/schema.ts
rfis: defineTable({
  projectId: v.id("projects"),

  // 原始輸入
  originalFormat: v.string(), // 'email' | 'word' | 'pdf' | 'image'
  rawContent: v.string(),
  uploadedFiles: v.array(v.id("_storage")),

  // Processor 資訊
  processorName: v.string(),
  processorEmail: v.optional(v.string()),
  council: v.string(),
  receivedDate: v.number(),

  // AI 解析後的問題
  questions: v.array(
    v.object({
      id: v.string(),
      number: v.number(),
      originalText: v.string(), // 保留原文（含錯誤）
      category: v.optional(v.string()), // AI 分類
      isDuplicate: v.optional(v.boolean()),
      duplicateOf: v.optional(v.number()),
      attachedImages: v.optional(v.array(v.string())),
      attachedLinks: v.optional(v.array(v.string())),
    })
  ),

  // 用戶回答
  responses: v.optional(
    v.array(
      v.object({
        questionId: v.string(),
        responseText: v.string(),
        responseImages: v.optional(v.array(v.id("_storage"))),
        respondedAt: v.number(),
        respondedBy: v.id("users"),
      })
    )
  ),

  // Cover Letter
  coverLetter: v.optional(
    v.object({
      pdfStorageId: v.id("_storage"),
      generatedAt: v.number(),
      downloadCount: v.number(),
    })
  ),

  // 狀態追蹤
  status: v.string(), // 'pending' | 'in-progress' | 'completed' | 'submitted'
  submittedToCouncil: v.optional(v.boolean()),
  submittedAt: v.optional(v.number()),

  // 通知記錄
  notificationsSent: v.optional(
    v.array(
      v.object({
        sentAt: v.number(),
        recipients: v.array(v.id("users")),
      })
    )
  ),
});
```

**工作流程總覽**:

```
1. 用戶上傳 RFI（多種格式）
      ↓
2. AI 解析並清理格式（保留原文）
      ↓
3. 顯示結構化線上文檔
      ↓
4. 用戶填寫回答 + 上傳圖片
      ↓
5. 即時生成 Cover Letter PDF 預覽
      ↓
6. 下載 PDF（用於 Council Portal 上傳）
      ↓
7. 發送通知給團隊成員（可選）
      ↓
8. 記錄到專案歷史
      ↓
9. 未來：直接提交到 Council Portal
```

**技術整合**:

- AI 模型: Google Gemini 2.0 Flash
- 文檔處理: mammoth.js, pdf-parse, LangChain
- OCR: Google Document AI
- PDF 生成: @react-pdf/renderer (Phase 1-3) / Nutrient Generation API (Phase 4+)
- PDF 檢視: React-PDF (Phase 1-3) / Nutrient SDK (Phase 4+)
- Rich Text Editor: Tiptap / Lexical
- Email: Resend / SendGrid
- 通知: Convex Real-time + Email

### 4. 法規知識庫系統 (Regulatory Knowledge Base)

**目標**: 建立完整的建築法規和合規性資料庫，使用 Google AI 技術實現高效智能問答

#### Google AI 整合方案 - RAG (Retrieval-Augmented Generation) 架構:

**核心技術棧**:

1. **Gemini Embeddings API** (`gemini-embedding-001`)
   - 將 PDF 法規文件轉換為向量嵌入 (Vector Embeddings)
   - 支援維度: 768, 1536, 3072 (建議使用 768 節省儲存空間)
   - 任務類型: `RETRIEVAL_DOCUMENT` (索引文件) + `QUESTION_ANSWERING` (查詢)
   
2. **Gemini Document Processing API**
   - 原生理解 PDF 內容（文字、圖表、表格）
   - 支援最多 1000 頁 PDF 或 50MB
   - 每頁 = 258 tokens

3. **Context Caching**
   - **Implicit Caching** (自動啟用): Gemini 2.5 Flash 最低 1024 tokens 自動快取
   - **Explicit Caching** (手動控制): 大型法規文件快取後重複使用，大幅降低成本
   - TTL 可設定 (預設 1 小時，可延長)

4. **Vector Database** (儲存嵌入向量)
   - 選項 1: **Convex Database** (內建向量搜尋，Phase 1-2)
   - 選項 2: **Google Cloud BigQuery** (企業級，Phase 3+)
   - 選項 3: **Pinecone / Qdrant / Weaviate** (第三方向量資料庫)

#### 資料處理流程:

**A. 建立知識庫 (一次性處理)**

```typescript
// lib/knowledge-base/build-index.ts
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

interface RegulationDocument {
  id: string;
  title: string;
  source: 'NZ Building Code' | 'BRANZ' | 'Council' | 'Supplier';
  category: 'Structural' | 'Fire Safety' | 'Insulation' | 'Plumbing' | 'Other';
  pdfUrl: string;
  uploadDate: Date;
}

// Step 1: 處理 PDF 並提取內容
async function processRegulationPDF(doc: RegulationDocument) {
  // 1.1 上傳 PDF 到 Gemini Files API (可重複使用 48 小時)
  const uploadedFile = await genAI.uploadFile(doc.pdfUrl, {
    mimeType: 'application/pdf',
  });

  // 1.2 使用 Gemini 提取結構化內容
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
  
  const extractionPrompt = `
    Extract structured information from this building regulation document:
    1. Document title and reference number
    2. Key sections and their page numbers
    3. Technical requirements (dimensions, materials, standards)
    4. Compliance criteria
    5. Related standards or references
    
    Output as JSON.
  `;

  const result = await model.generateContent([uploadedFile, extractionPrompt]);
  const structuredData = JSON.parse(result.response.text());

  return { uploadedFile, structuredData };
}

// Step 2: 生成 Embeddings（分段處理）
async function generateEmbeddings(document: any) {
  const embeddingModel = genAI.getGenerativeModel({ 
    model: "gemini-embedding-001" 
  });

  // 將文件分成小段（每段 < 2048 tokens）
  const chunks = splitIntoChunks(document.structuredData, 1500);

  const embeddings = [];
  
  for (const chunk of chunks) {
    const result = await embeddingModel.embedContent({
      content: chunk.text,
      taskType: "RETRIEVAL_DOCUMENT",
      outputDimensionality: 768, // 節省儲存空間
    });

    embeddings.push({
      chunkId: chunk.id,
      documentId: document.id,
      text: chunk.text,
      embedding: result.embedding.values,
      metadata: {
        source: document.source,
        category: document.category,
        pageNumber: chunk.pageNumber,
      }
    });
  }

  return embeddings;
}

// Step 3: 儲存到向量資料庫
async function storeEmbeddings(embeddings: any[]) {
  // 選項 1: Convex (Phase 1-2)
  await Promise.all(
    embeddings.map(emb => 
      convex.mutation.knowledgeBase.insertEmbedding({
        ...emb,
        embedding: Array.from(emb.embedding), // 轉為陣列
      })
    )
  );

  // 選項 2: Pinecone (Phase 3+)
  // await pineconeIndex.upsert(embeddings);
}

// 完整流程
async function buildKnowledgeBase(documents: RegulationDocument[]) {
  for (const doc of documents) {
    console.log(`Processing: ${doc.title}`);
    
    // 1. 提取內容
    const processed = await processRegulationPDF(doc);
    
    // 2. 生成嵌入
    const embeddings = await generateEmbeddings({
      id: doc.id,
      ...processed,
      source: doc.source,
      category: doc.category,
    });
    
    // 3. 儲存
    await storeEmbeddings(embeddings);
    
    console.log(`✓ Indexed ${embeddings.length} chunks from ${doc.title}`);
  }
}
```

**B. 用戶查詢流程 (實時問答)**

```typescript
// lib/knowledge-base/query.ts

interface QueryResult {
  answer: string;
  sources: {
    documentTitle: string;
    pageNumber: number;
    relevanceScore: number;
    excerpt: string;
  }[];
  cachedTokens?: number;
}

async function answerRegulationQuery(
  userQuestion: string
): Promise<QueryResult> {
  
  // Step 1: 將問題轉換為嵌入向量
  const embeddingModel = genAI.getGenerativeModel({ 
    model: "gemini-embedding-001" 
  });
  
  const questionEmbedding = await embeddingModel.embedContent({
    content: userQuestion,
    taskType: "QUESTION_ANSWERING", // 優化查詢用途
    outputDimensionality: 768,
  });

  // Step 2: 向量相似度搜尋 (找最相關的 5 段內容)
  const relevantChunks = await convex.query.knowledgeBase.searchSimilar({
    embedding: Array.from(questionEmbedding.embedding.values),
    limit: 5,
    threshold: 0.7, // 相似度閾值
  });

  // Step 3: 使用 Context Caching 優化成本
  const cachedContext = relevantChunks
    .map(chunk => `[${chunk.metadata.source} - Page ${chunk.metadata.pageNumber}]\n${chunk.text}`)
    .join('\n\n---\n\n');

  // 建立或獲取快取
  let cache = await genAI.caches.get({ name: "regulation-context-cache" });
  
  if (!cache) {
    cache = await genAI.caches.create({
      model: "gemini-2.5-flash",
      contents: [{
        role: "user",
        parts: [{
          text: `You are a building regulation expert. Use the following regulation excerpts to answer questions:\n\n${cachedContext}`
        }]
      }],
      ttl: 3600, // 快取 1 小時
    });
  }

  // Step 4: 生成答案 (使用快取的法規內容)
  const model = genAI.getGenerativeModel({ 
    model: "gemini-2.5-flash",
    cachedContent: cache.name,
  });

  const response = await model.generateContent(userQuestion);

  // Step 5: 返回答案和來源
  return {
    answer: response.response.text(),
    sources: relevantChunks.map(chunk => ({
      documentTitle: chunk.documentTitle,
      pageNumber: chunk.metadata.pageNumber,
      relevanceScore: chunk.similarity,
      excerpt: chunk.text.substring(0, 200) + '...',
    })),
    cachedTokens: response.usageMetadata?.cachedContentTokenCount,
  };
}
```

**C. Convex Schema 定義**

```typescript
// convex/schema.ts

import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // 法規文件
  regulationDocuments: defineTable({
    title: v.string(),
    source: v.string(), // 'NZ Building Code', 'BRANZ', etc.
    category: v.string(),
    pdfStorageId: v.id("_storage"),
    geminiFileId: v.optional(v.string()), // Files API ID
    uploadedAt: v.number(),
    processedAt: v.optional(v.number()),
    totalPages: v.number(),
    totalChunks: v.number(),
  }).index("by_source", ["source"])
    .index("by_category", ["category"]),

  // 向量嵌入（分段）
  regulationEmbeddings: defineTable({
    documentId: v.id("regulationDocuments"),
    chunkIndex: v.number(),
    text: v.string(),
    embedding: v.array(v.float64()), // 768 維向量
    metadata: v.object({
      source: v.string(),
      category: v.string(),
      pageNumber: v.number(),
      sectionTitle: v.optional(v.string()),
    }),
  }).index("by_document", ["documentId"])
    .vectorIndex("by_embedding", {
      vectorField: "embedding",
      dimensions: 768,
      filterFields: ["metadata.source", "metadata.category"],
    }),

  // 用戶查詢歷史
  regulationQueries: defineTable({
    userId: v.id("users"),
    question: v.string(),
    answer: v.string(),
    sources: v.array(v.object({
      documentId: v.id("regulationDocuments"),
      pageNumber: v.number(),
      relevanceScore: v.float64(),
    })),
    cachedTokensUsed: v.optional(v.number()),
    queriedAt: v.number(),
  }).index("by_user", ["userId"]),
});
```

#### 內容來源管理:

**官方法規庫**
- NZ Building Code (MBIE)
- Building Consent Authority (BCA) - Australia
- BRANZ Technical Recommendations
- Council District Plans (Auckland, Wellington, Christchurch)
- Environmental & Safety Standards (EPA, WorkSafe)

**供應商合規資料**
- 產品技術規格 (Appraisals, CodeMark)
- 安裝施工標準 (Installation Guides)
- 認證和測試報告 (ISO, AS/NZS)
- 維護保養指南 (Warranty Documents)

**用戶貢獻內容**
- 用戶上傳的常用法規 (需審核)
- 實務經驗分享 (Case Studies)
- 問題解決方案 (Best Practices)

#### 成本優化策略:

**1. Batch Embeddings (批次處理)**
```typescript
// 使用 Batch API 生成嵌入，成本降低 50%
const batchResults = await genAI.batchEmbedContent({
  requests: documents.map(doc => ({
    model: "gemini-embedding-001",
    content: doc.text,
    taskType: "RETRIEVAL_DOCUMENT",
  }))
});
```

**2. Context Caching (減少重複成本)**
- 常用法規文件快取 1 小時或更長
- 快取命中可節省 75% 成本
- Implicit Caching 自動啟用 (Gemini 2.5 Flash)

**3. Embedding 維度優化**
- 使用 768 維而非 3072 維
- 節省 75% 儲存空間
- MTEB 分數僅降低 0.17 (67.99 vs 68.16)

**成本估算** (每月):
```
假設: 500 份法規文件，平均 50 頁/份
- 總頁數: 25,000 頁
- Embeddings 生成 (一次性): 25,000 × 258 tokens × $0.0001 = $0.65
- 向量儲存: 25,000 chunks × 768 dims × 4 bytes = 77MB → Convex 免費
- 用戶查詢 (1000 次/月):
  * 問題嵌入: 1000 × 50 tokens × $0.0001 = $0.005
  * Gemini 生成 (使用 Context Caching):
    - Cached input: 1000 × 5000 tokens × $0.000025 = $0.125
    - Output: 1000 × 500 tokens × $0.0003 = $0.15
  
總成本: ~$0.93/月 (vs 無快取 ~$3.5/月，節省 73%)
```

#### 用戶介面範例:

```tsx
// components/RegulationSearch.tsx
<RegulationSearchInterface>
  <SearchBar 
    placeholder="Ask about NZ Building Code, BRANZ standards, or Council requirements..."
    onSubmit={handleQuery}
  />
  
  {loading && <Skeleton />}
  
  {result && (
    <>
      <AnswerCard>
        <AIResponse>{result.answer}</AIResponse>
        {result.cachedTokens && (
          <CostSaving>
            💚 Saved {result.cachedTokens} tokens using cached context
          </CostSaving>
        )}
      </AnswerCard>
      
      <SourcesList>
        <h3>Sources:</h3>
        {result.sources.map(source => (
          <SourceCard 
            key={source.documentTitle}
            title={source.documentTitle}
            page={source.pageNumber}
            relevance={source.relevanceScore}
            excerpt={source.excerpt}
            onViewPDF={() => openPDF(source.documentId)}
          />
        ))}
      </SourcesList>
    </>
  )}
</RegulationSearchInterface>
```

#### PDF 儲存策略:

**選項 1: Convex File Storage (推薦 Phase 1-2)**

```typescript
// 管理員上傳法規 PDF
// app/admin/regulations/upload/page.tsx

async function uploadRegulationPDF(file: File) {
  // 1. 上傳到 Convex Storage
  const storageId = await convex.mutation.regulations.uploadPDF({
    file: file,
    metadata: {
      title: "NZ Building Code - Clause B1 Structure",
      source: "MBIE",
      category: "Structural",
      version: "2024",
    }
  });

  // 2. 觸發背景處理（Convex Action）
  await convex.action.regulations.processDocument({
    storageId: storageId,
  });

  return storageId;
}

// convex/regulations.ts
export const uploadPDF = mutation({
  args: {
    file: v.any(),
    metadata: v.object({
      title: v.string(),
      source: v.string(),
      category: v.string(),
      version: v.string(),
    }),
  },
  handler: async (ctx, args) => {
    // 儲存到 Convex Storage
    const storageId = await ctx.storage.store(args.file);
    
    // 記錄到資料庫
    const docId = await ctx.db.insert("regulationDocuments", {
      ...args.metadata,
      pdfStorageId: storageId,
      uploadedAt: Date.now(),
      status: "pending_processing",
    });

    return storageId;
  },
});
```

**選項 2: AWS S3 + Gemini Files API (Phase 3+)**

```typescript
// 大量法規文件存在 S3，成本更低
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

async function uploadToS3AndProcess(file: File) {
  const s3 = new S3Client({ region: "ap-southeast-2" });
  
  // 1. 上傳到 S3
  await s3.send(new PutObjectCommand({
    Bucket: "archidocky-regulations",
    Key: `regulations/${file.name}`,
    Body: file,
    ContentType: "application/pdf",
  }));

  const s3Url = `https://archidocky-regulations.s3.ap-southeast-2.amazonaws.com/regulations/${file.name}`;

  // 2. 記錄到 Convex（只存 URL，不存檔案）
  await convex.mutation.regulations.create({
    title: file.name,
    s3Url: s3Url,
    status: "pending_processing",
  });

  return s3Url;
}
```

**儲存成本比較**:
```
假設 500 份法規 PDF，平均 5MB/份 = 2.5GB

Convex Storage:
- 5GB 免費額度 → 前 2.5GB 免費
- 超出部分: $0.25/GB → $0

AWS S3 Standard:
- 儲存: 2.5GB × $0.023/GB = $0.058/月
- 請求費用: 500 次上傳 × $0.005/1000 = $0.0025

結論: Phase 1-2 用 Convex (免費)，Phase 3+ 如超過 5GB 才考慮 S3
```

#### 餵給 AI 的完整流程:

**方法 1: Gemini Files API (推薦，48小時免費快取)**

```typescript
// convex/actions.ts (Server-side Action)
import { v } from "convex/values";
import { action } from "./_generated/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export const processDocument = action({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, args) => {
    // 1. 從 Convex Storage 取得 PDF URL
    const pdfUrl = await ctx.storage.getUrl(args.storageId);
    
    if (!pdfUrl) throw new Error("PDF not found");

    // 2. 下載 PDF 為 Buffer
    const response = await fetch(pdfUrl);
    const pdfBuffer = await response.arrayBuffer();

    // 3. 上傳到 Gemini Files API (48 小時免費儲存)
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    
    const uploadedFile = await genAI.files.upload({
      file: {
        data: Buffer.from(pdfBuffer),
        mimeType: "application/pdf",
      },
      displayName: "Building Regulation Document",
    });

    console.log(`✓ Uploaded to Gemini: ${uploadedFile.uri}`);

    // 4. 讓 Gemini 提取結構化內容
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    
    const extractionPrompt = `
      Analyze this building regulation PDF and extract:
      
      1. Document Metadata:
         - Official title and reference number
         - Publication date and version
         - Issuing authority (MBIE, Council, BRANZ, etc.)
      
      2. Table of Contents:
         - All section titles and page numbers
         - Hierarchical structure (chapters, sections, subsections)
      
      3. Technical Requirements:
         - Specific dimensions, measurements, tolerances
         - Material specifications
         - Referenced standards (NZS, AS/NZS, ISO)
         - Compliance criteria and acceptance methods
      
      4. Key Concepts:
         - Important definitions and terms
         - Performance requirements
         - Limitations and exclusions
      
      Output as structured JSON with this schema:
      {
        "metadata": {...},
        "tableOfContents": [...],
        "sections": [
          {
            "title": "string",
            "pageNumber": number,
            "content": "string",
            "requirements": [...],
            "references": [...]
          }
        ],
        "glossary": {...}
      }
    `;

    const result = await model.generateContent([
      {
        fileData: {
          mimeType: uploadedFile.mimeType,
          fileUri: uploadedFile.uri,
        },
      },
      { text: extractionPrompt },
    ]);

    const extractedData = JSON.parse(result.response.text());

    // 5. 儲存提取的結構化數據
    await ctx.runMutation(api.regulations.saveExtractedData, {
      storageId: args.storageId,
      geminiFileUri: uploadedFile.uri,
      extractedData: extractedData,
    });

    // 6. 生成 Embeddings（分段處理）
    await ctx.runAction(api.regulations.generateEmbeddings, {
      storageId: args.storageId,
      sections: extractedData.sections,
    });

    return { success: true, geminiFileUri: uploadedFile.uri };
  },
});

// 生成 Embeddings
export const generateEmbeddings = action({
  args: {
    storageId: v.id("_storage"),
    sections: v.any(),
  },
  handler: async (ctx, args) => {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    const embeddingModel = genAI.getGenerativeModel({ 
      model: "gemini-embedding-001" 
    });

    // 將每個 section 分成小塊（避免超過 2048 token 限制）
    const chunks = [];
    for (const section of args.sections) {
      const sectionChunks = splitTextIntoChunks(section.content, 1500);
      
      sectionChunks.forEach((chunk, index) => {
        chunks.push({
          text: chunk,
          metadata: {
            sectionTitle: section.title,
            pageNumber: section.pageNumber,
            chunkIndex: index,
          },
        });
      });
    }

    // 批次生成 embeddings (Batch API 節省 50% 成本)
    const batchSize = 100;
    for (let i = 0; i < chunks.length; i += batchSize) {
      const batch = chunks.slice(i, i + batchSize);
      
      const embeddings = await Promise.all(
        batch.map(async (chunk) => {
          const result = await embeddingModel.embedContent({
            content: chunk.text,
            taskType: "RETRIEVAL_DOCUMENT",
            outputDimensionality: 768,
          });

          return {
            text: chunk.text,
            embedding: Array.from(result.embedding.values),
            metadata: chunk.metadata,
          };
        })
      );

      // 儲存到 Convex
      await ctx.runMutation(api.regulations.insertEmbeddings, {
        storageId: args.storageId,
        embeddings: embeddings,
      });

      console.log(`✓ Processed ${i + batch.length}/${chunks.length} chunks`);
    }

    return { totalChunks: chunks.length };
  },
});

// 輔助函數：分段
function splitTextIntoChunks(text: string, maxTokens: number): string[] {
  // 簡單分段邏輯（實際應使用 tokenizer）
  const words = text.split(/\s+/);
  const chunks: string[] = [];
  let currentChunk: string[] = [];
  let currentTokens = 0;

  for (const word of words) {
    const wordTokens = Math.ceil(word.length / 4); // 粗略估計
    
    if (currentTokens + wordTokens > maxTokens) {
      chunks.push(currentChunk.join(" "));
      currentChunk = [word];
      currentTokens = wordTokens;
    } else {
      currentChunk.push(word);
      currentTokens += wordTokens;
    }
  }

  if (currentChunk.length > 0) {
    chunks.push(currentChunk.join(" "));
  }

  return chunks;
}
```

**方法 2: 直接處理（小型 PDF < 10MB）**

```typescript
// 如果 PDF 較小，可以直接在請求中傳送
export const processSmallPDF = action({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, args) => {
    const pdfUrl = await ctx.storage.getUrl(args.storageId);
    const response = await fetch(pdfUrl);
    const pdfBuffer = await response.arrayBuffer();

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    // 直接傳送 base64 編碼的 PDF
    const base64Pdf = Buffer.from(pdfBuffer).toString('base64');
    
    const result = await model.generateContent([
      {
        inlineData: {
          mimeType: "application/pdf",
          data: base64Pdf,
        },
      },
      { text: "Summarize this document" },
    ]);

    return result.response.text();
  },
});
```

#### 驗證 AI 是否真正理解內容:

**測試策略 1: 問答驗證 (Q&A Testing)**

```typescript
// tests/knowledge-base-validation.test.ts

interface ValidationQuestion {
  question: string;
  expectedAnswer: string;
  documentTitle: string;
  pageNumber: number;
  category: 'factual' | 'comprehension' | 'application';
}

const validationQuestions: ValidationQuestion[] = [
  // 事實型問題（直接從文件提取）
  {
    question: "What is the minimum concrete strength for foundations in NZ Building Code B1?",
    expectedAnswer: "17.5 MPa",
    documentTitle: "NZ Building Code - Clause B1",
    pageNumber: 23,
    category: "factual",
  },
  
  // 理解型問題（需要綜合理解）
  {
    question: "When is a building consent required for deck construction in Auckland?",
    expectedAnswer: "When the deck is higher than 1.5m above ground or attached to a dwelling",
    documentTitle: "Auckland Building Consent Requirements",
    pageNumber: 12,
    category: "comprehension",
  },
  
  // 應用型問題（需要推理）
  {
    question: "Can I use H1.2 treated timber for external cladding in Wellington's coastal area?",
    expectedAnswer: "No, coastal areas require H3.2 treatment minimum due to high corrosion risk",
    documentTitle: "BRANZ Timber Treatment Standards",
    pageNumber: 45,
    category: "application",
  },
];

async function runValidationTests() {
  const results = [];
  
  for (const test of validationQuestions) {
    console.log(`\nTesting: ${test.question}`);
    
    // 查詢 AI
    const aiResponse = await answerRegulationQuery(test.question);
    
    // 驗證答案相似度
    const similarity = calculateSemanticSimilarity(
      aiResponse.answer,
      test.expectedAnswer
    );
    
    // 驗證來源正確性
    const correctSource = aiResponse.sources.some(
      s => s.documentTitle === test.documentTitle &&
           Math.abs(s.pageNumber - test.pageNumber) <= 2 // 允許 ±2 頁誤差
    );
    
    const passed = similarity > 0.8 && correctSource;
    
    results.push({
      question: test.question,
      category: test.category,
      aiAnswer: aiResponse.answer,
      expectedAnswer: test.expectedAnswer,
      similarity: similarity,
      correctSource: correctSource,
      passed: passed,
    });
    
    console.log(`  ✓ Similarity: ${(similarity * 100).toFixed(1)}%`);
    console.log(`  ✓ Source: ${correctSource ? 'Correct' : 'Wrong'}`);
    console.log(`  ${passed ? '✅ PASSED' : '❌ FAILED'}`);
  }
  
  // 生成報告
  const passRate = results.filter(r => r.passed).length / results.length;
  console.log(`\n📊 Overall Pass Rate: ${(passRate * 100).toFixed(1)}%`);
  
  return results;
}

// 語義相似度計算
async function calculateSemanticSimilarity(text1: string, text2: string): Promise<number> {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  const embeddingModel = genAI.getGenerativeModel({ model: "gemini-embedding-001" });
  
  const [emb1, emb2] = await Promise.all([
    embeddingModel.embedContent({ content: text1, taskType: "SEMANTIC_SIMILARITY" }),
    embeddingModel.embedContent({ content: text2, taskType: "SEMANTIC_SIMILARITY" }),
  ]);
  
  // 餘弦相似度
  return cosineSimilarity(emb1.embedding.values, emb2.embedding.values);
}

function cosineSimilarity(a: number[], b: number[]): number {
  const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
  const magA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
  const magB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
  return dotProduct / (magA * magB);
}
```

**測試策略 2: 來源追蹤驗證 (Source Tracing)**

```typescript
// 驗證 AI 回答的來源是否真實存在
async function verifySourceAccuracy(question: string) {
  const response = await answerRegulationQuery(question);
  
  for (const source of response.sources) {
    // 1. 取得原始 PDF
    const pdfUrl = await convex.query.regulations.getPDFUrl({
      documentId: source.documentId,
    });
    
    // 2. 提取特定頁面內容
    const pageContent = await extractPDFPage(pdfUrl, source.pageNumber);
    
    // 3. 檢查引用的內容是否真實存在
    const excerptExists = pageContent.includes(source.excerpt.substring(0, 50));
    
    console.log(`Source: ${source.documentTitle} - Page ${source.pageNumber}`);
    console.log(`Excerpt exists: ${excerptExists ? '✅' : '❌'}`);
    
    if (!excerptExists) {
      console.warn(`⚠️ Hallucination detected! Source may be incorrect.`);
    }
  }
}
```

**測試策略 3: 對比測試 (A/B Testing)**

```typescript
// 同一問題問兩次，檢查答案一致性
async function testConsistency(question: string, runs: number = 5) {
  const answers = [];
  
  for (let i = 0; i < runs; i++) {
    const response = await answerRegulationQuery(question);
    answers.push(response.answer);
  }
  
  // 計算答案之間的相似度
  const similarities = [];
  for (let i = 0; i < answers.length - 1; i++) {
    const sim = await calculateSemanticSimilarity(answers[i], answers[i + 1]);
    similarities.push(sim);
  }
  
  const avgSimilarity = similarities.reduce((a, b) => a + b, 0) / similarities.length;
  
  console.log(`Consistency Score: ${(avgSimilarity * 100).toFixed(1)}%`);
  
  if (avgSimilarity < 0.85) {
    console.warn('⚠️ Low consistency - AI may be hallucinating');
  }
  
  return { avgSimilarity, answers };
}
```

**測試策略 4: 人工審核界面 (Human Review UI)**

```tsx
// components/admin/KnowledgeBaseReview.tsx
<ReviewInterface>
  {testResults.map(result => (
    <ReviewCard key={result.question}>
      <Question>{result.question}</Question>
      
      <ComparisonView>
        <Column>
          <Label>Expected Answer</Label>
          <Text>{result.expectedAnswer}</Text>
        </Column>
        
        <Column>
          <Label>AI Answer</Label>
          <Text>{result.aiAnswer}</Text>
        </Column>
      </ComparisonView>
      
      <Metrics>
        <Metric>
          <Label>Semantic Similarity</Label>
          <Progress value={result.similarity * 100} />
          <Value>{(result.similarity * 100).toFixed(1)}%</Value>
        </Metric>
        
        <Metric>
          <Label>Source Accuracy</Label>
          <Badge variant={result.correctSource ? 'success' : 'error'}>
            {result.correctSource ? 'Correct' : 'Wrong'}
          </Badge>
        </Metric>
      </Metrics>
      
      <Sources>
        {result.sources.map(source => (
          <SourceTag 
            key={source.documentTitle}
            onClick={() => openPDF(source.documentId, source.pageNumber)}
          >
            📄 {source.documentTitle} - p.{source.pageNumber}
          </SourceTag>
        ))}
      </Sources>
      
      <Actions>
        <Button 
          variant={result.passed ? 'success' : 'destructive'}
          onClick={() => markReview(result.id, !result.passed)}
        >
          {result.passed ? '✅ Approve' : '❌ Needs Review'}
        </Button>
      </Actions>
    </ReviewCard>
  ))}
</ReviewInterface>
```

**自動化驗證管道 (CI/CD Integration)**

```yaml
# .github/workflows/validate-knowledge-base.yml
name: Validate Knowledge Base

on:
  schedule:
    - cron: '0 0 * * 0'  # 每週日執行
  workflow_dispatch:  # 手動觸發

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Run validation tests
        run: npm run test:knowledge-base
        env:
          GEMINI_API_KEY: ${{ secrets.GEMINI_API_KEY }}
          CONVEX_DEPLOYMENT: ${{ secrets.CONVEX_DEPLOYMENT }}
      
      - name: Generate report
        run: npm run test:report
      
      - name: Upload results
        uses: actions/upload-artifact@v3
        with:
          name: validation-report
          path: ./test-results/
      
      - name: Notify on failure
        if: failure()
        uses: slackapi/slack-github-action@v1
        with:
          payload: |
            {
              "text": "⚠️ Knowledge Base validation failed!"
            }
```

#### 持續監控與改進:

```typescript
// convex/analytics.ts

// 記錄每次查詢的質量指標
export const logQueryQuality = mutation({
  args: {
    question: v.string(),
    answer: v.string(),
    sources: v.array(v.any()),
    userFeedback: v.optional(v.object({
      helpful: v.boolean(),
      accurate: v.boolean(),
      comment: v.optional(v.string()),
    })),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("queryLogs", {
      ...args,
      timestamp: Date.now(),
    });
  },
});

// 分析低質量答案
export const analyzeLowQualityAnswers = query({
  handler: async (ctx) => {
    const lowQualityQueries = await ctx.db
      .query("queryLogs")
      .filter(q => 
        q.eq(q.field("userFeedback.helpful"), false) ||
        q.eq(q.field("userFeedback.accurate"), false)
      )
      .collect();

    // 找出需要改進的文件
    const problematicDocs = {};
    lowQualityQueries.forEach(query => {
      query.sources.forEach(source => {
        if (!problematicDocs[source.documentId]) {
          problematicDocs[source.documentId] = 0;
        }
        problematicDocs[source.documentId]++;
      });
    });

    return { 
      totalLowQuality: lowQualityQueries.length,
      problematicDocs: problematicDocs,
    };
  },
});
```

#### 技術優勢:

✅ **準確性高** - Gemini 原生理解 PDF（含圖表、表格）  
✅ **成本低** - Context Caching + Batch API 節省 50-75% 費用  
✅ **可擴展** - 支援 1000 頁文件，向量資料庫可無限擴展  
✅ **即時更新** - 新法規上傳後自動索引  
✅ **可追溯** - 每個答案都附來源和頁碼  
✅ **多語言** - 支援中英文查詢（Gemini 多語言能力）  
✅ **可驗證** - 完整測試框架確保答案品質  
✅ **自我改進** - 用戶反饋循環持續優化

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
- [ ] React-PDF 整合與基礎 PDF 檢視功能
- [ ] 檔案上傳下載系統
- [ ] 用戶角色權限管理
- [ ] 基礎搜尋功能

### Phase 3: 協作功能 (6-8 週)

- [ ] PDF 標註系統 (基於 Convex + Canvas)
- [ ] 即時協作功能 (Convex Real-time)
- [ ] 版本控制系統
- [ ] 通知系統
- [ ] 評論討論功能

### Phase 4: AI 整合 (8-10 週)

- [ ] Gemini API 整合
- [ ] 文檔分析功能
- [ ] RFI 智能處理
- [ ] 法規知識庫建立
- [ ] AI 問答系統
- [ ] **評估 Nutrient SDK 升級** (基於用戶反饋和需求)

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
