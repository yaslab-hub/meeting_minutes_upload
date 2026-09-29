# 實驗室會議紀錄上傳平台

一個簡單的實驗室會議紀錄管理平台，提供網頁介面讓使用者上傳會議記錄與相關附件，並將檔案儲存在 Google Drive、會議資訊儲存在 Google Sheets。

> **Lab Meeting Minutes Upload**
>
> Frontend: HTML / CSS / JavaScript  
> Backend: Google Apps Script  
> Storage: Google Drive + Google Sheets

---

## 功能

- 上傳會議記錄
- 上傳多個相關附件
- 填寫上傳人、會議名稱／主題、會議時間與地點
- 每場會議自動建立獨立的 Google Drive 資料夾
- 自動將會議資訊寫入 Google Sheets
- 顯示已上傳的歷史會議
- 支援分頁，每頁顯示 10 筆資料
- 可直接開啟會議記錄與附件
- 支援手機與桌面瀏覽器
- 前端與 Google Apps Script API 以 JSON 傳遞資料

---

## 系統架構

```text
使用者
  │
  ▼
index.html
  │
  │ GET / POST
  ▼
Google Apps Script
(Code.gs)
  │
  ├──────────────► Google Drive
  │                 └─ 每場會議一個資料夾
  │                    ├─ 會議記錄
  │                    └─ 相關附件
  │
  └──────────────► Google Sheets
                    └─ Meetings
```

### 資料流程

**上傳資料時：**

1. 使用者在網頁填寫會議資訊。
2. 使用者選擇會議記錄及相關附件。
3. 前端將檔案轉成 Base64 後，以 JSON 傳送至 Google Apps Script。
4. Apps Script 建立該場會議的專用資料夾。
5. 檔案上傳至 Google Drive。
6. 會議資料寫入 Google Sheets `Meetings` 工作表。
7. API 回傳上傳結果給前端。

**讀取資料時：**

1. 前端向 Google Apps Script 發送 GET request。
2. `doGet()` 讀取 Google Sheets。
3. 整理會議資料及附件資訊。
4. 以 JSON 回傳給前端。
5. 前端依時間倒序顯示會議列表。

---

## 專案結構

```text
meeting_minutes_upload/
├── Code.gs       # Google Apps Script 後端
├── index.html    # 前端網頁
└── README.md     # 專案說明
```

---

## Google Drive 設定

在 `Code.gs` 中設定 Google Drive 根資料夾 ID：

```javascript
const FOLDER_ID = 'YOUR_GOOGLE_DRIVE_FOLDER_ID';
```

所有上傳的會議資料都會儲存在這個資料夾底下。

每次上傳新的會議時，系統會自動建立：

```text
根資料夾/
└── 會議名稱_UUID/
    ├── 會議記錄.pdf
    ├── 附件1.pdf
    └── 附件2.pptx
```

---

## Google Sheets 設定

在 `Code.gs` 中設定 Google Spreadsheet ID：

```javascript
const SHEET_ID = 'YOUR_GOOGLE_SHEET_ID';
const SHEET_NAME = 'Meetings';
```

如果 `Meetings` 工作表不存在，程式會自動建立。

表格欄位如下：

| 欄位 | 說明 |
|---|---|
| 會議 ID | 系統自動產生的 UUID |
| 上傳人 | 上傳者名稱 |
| 會議名稱／主題 | 會議標題 |
| 會議時間 | 會議日期與時間 |
| 會議地點 | 會議地點 |
| 會議記錄名稱 | 上傳的主要會議記錄檔名 |
| 會議記錄連結 | Google Drive 檔案連結 |
| 附件資料 | JSON 格式的附件資訊 |
| 上傳時間 | 系統上傳時間 |

---

## Google Apps Script 部署

### 1. 建立 Apps Script 專案

將 `Code.gs` 的內容貼到 Google Apps Script 專案中。

### 2. 設定 Google Drive 與 Google Sheets

修改：

```javascript
const FOLDER_ID = 'YOUR_GOOGLE_DRIVE_FOLDER_ID';
const SHEET_ID = 'YOUR_GOOGLE_SHEET_ID';
```

### 3. 測試權限

可以在 Apps Script 執行：

```javascript
testDriveAccess();
testSheetAccess();
```

確認 Apps Script 可以存取 Google Drive 與 Google Sheets。

### 4. 部署為 Web App

在 Google Apps Script：

```text
Deploy
→ New deployment
→ Select type: Web app
```

建議設定：

```text
Execute as: Me
Who has access: Anyone
```

部署完成後取得 Web App URL。

### 5. 設定前端 API URL

在 `index.html` 中找到：

```javascript
const scriptURL = 'YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL';
```

填入 Apps Script Web App URL，例如：

```javascript
const scriptURL = 'https://script.google.com/macros/s/XXXXXXXX/exec';
```

---

## 本機／GitHub Pages 使用

`index.html` 是純前端頁面，因此可以部署到 GitHub Pages 或其他靜態網站服務。

例如 GitHub Pages：

```text
Repository Settings
→ Pages
→ Deploy from branch
→ main / root
```

部署後，使用者開啟 GitHub Pages 網址即可使用上傳平台。

> 注意：GitHub Pages 只負責提供前端網頁，實際檔案儲存與資料處理仍由 Google Apps Script、Google Drive 與 Google Sheets 負責。

---

## API

### `GET`

取得所有會議資料。

```text
GET <Google Apps Script Web App URL>
```

成功回應：

```json
{
  "status": "success",
  "meetings": [
    {
      "id": "meeting-uuid",
      "uploader": "YAS",
      "title": "Lab Meeting",
      "meetingTime": "2026-09-29T05:00:00.000Z",
      "location": "Lab",
      "minutesName": "meeting.pdf",
      "minutesUrl": "https://drive.google.com/file/d/.../view",
      "attachments": [],
      "uploadedAt": "2026-09-29T05:30:00.000Z"
    }
  ]
}
```

### `POST`

上傳新的會議記錄。

Request body：

```json
{
  "uploader": "YAS",
  "meetingTitle": "Lab Meeting",
  "meetingTime": "2026-09-29T13:00",
  "meetingLocation": "Lab",
  "minutesFile": {
    "name": "meeting.pdf",
    "type": "application/pdf",
    "base64": "..."
  },
  "attachments": [
    {
      "name": "presentation.pptx",
      "type": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "base64": "..."
    }
  ]
}
```

成功回應：

```json
{
  "status": "success",
  "message": "會議資料上傳成功",
  "meeting": {}
}
```

失敗時：

```json
{
  "status": "error",
  "message": "錯誤訊息"
}
```

---

## 檔案權限

目前 `Code.gs` 上傳檔案後會設定：

```javascript
file.setSharing(
  DriveApp.Access.ANYONE_WITH_LINK,
  DriveApp.Permission.VIEW
);
```

也就是取得連結的人可以檢視檔案。

因此這個設定適合用於**不包含敏感資料的會議文件**。

如果會議記錄可能包含研究資料、個人資料、未公開研究成果或其他敏感資訊，建議在正式使用前重新設計檔案權限與登入／授權機制。

---

## 注意事項

### 1. Base64 上傳方式

目前前端會先將檔案轉成 Base64，再透過 HTTP POST 傳送給 Apps Script。

因此大型檔案可能受到：

- 瀏覽器記憶體
- Google Apps Script 執行限制
- Web App request 大小限制
- Google Drive API / Apps Script 執行時間

等因素影響。

如果未來需要支援大型 PDF、PPT、影片或錄音檔，建議改成更適合大型檔案的上傳架構。

### 2. 檔案名稱

每場會議會使用：

```text
會議名稱_UUID
```

作為資料夾名稱，因此即使會議名稱相同，也不會直接互相覆蓋。

### 3. 會議列表

目前前端一次取得所有會議資料，再由瀏覽器進行每頁 10 筆的分頁。

如果未來累積大量會議資料，建議改成後端分頁或搜尋 API，避免一次讀取全部資料。

---

## 未來可以擴充的功能

- [ ] 會議搜尋
- [ ] 依日期篩選
- [ ] 依上傳人篩選
- [ ] 編輯會議資料
- [ ] 刪除會議
- [ ] 會議資料夾管理
- [ ] 使用 Google Account 登入
- [ ] 使用者權限管理
- [ ] 管理員介面
- [ ] 附件類型與大小限制
- [ ] 上傳進度顯示
- [ ] 拖曳檔案上傳
- [ ] 更完整的手機版 UI
- [ ] 後端分頁與搜尋
- [ ] 操作紀錄（Audit Log）

---

## 技術棧

| 技術 | 用途 |
|---|---|
| HTML5 | 網頁結構 |
| CSS3 | UI 與 Responsive Design |
| JavaScript | 前端互動與 API 呼叫 |
| Google Apps Script | 後端 API |
| Google Drive | 檔案儲存 |
| Google Sheets | 會議資料儲存 |
| GitHub | 原始碼與版本管理 |

---

## License

目前尚未指定正式 License。

如果此專案預計公開提供他人使用，建議後續選擇適合的開源授權條款，例如 MIT License，或依實驗室／研究單位需求設定授權方式。
