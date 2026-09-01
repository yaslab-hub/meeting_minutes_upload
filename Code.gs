const FOLDER_ID = '10fTtsKWTr9_G_KnP1bL2fiUmdrTVmzDG';
const SHEET_ID = '1w1qHdym3IVmAnmZAzUIcZt07TXhC3Kcy9JwyOtlZM6A';
const SHEET_NAME = 'Meetings';

const HEADERS = [
  '會議 ID',
  '上傳人',
  '會議名稱／主題',
  '會議時間',
  '會議地點',
  '會議記錄名稱',
  '會議記錄連結',
  '附件資料',
  '上傳時間'
];

/**
 * 取得所有會議資料
 */
function doGet() {
  try {
    const sheet = getMeetingSheet();
    const lastRow = sheet.getLastRow();

    if (lastRow <= 1) {
      return createJsonResponse({
        status: 'success',
        meetings: []
      });
    }

    const rows = sheet
      .getRange(2, 1, lastRow - 1, HEADERS.length)
      .getValues();

    const meetings = rows
      .filter(row => row[0])
      .map(row => {
        let attachments = [];

        try {
          attachments = row[7] ? JSON.parse(row[7]) : [];
        } catch (error) {
          attachments = [];
        }

        return {
          id: String(row[0]),
          uploader: String(row[1] || ''),
          title: String(row[2] || ''),
          meetingTime: formatDateValue(row[3]),
          location: String(row[4] || ''),
          minutesName: String(row[5] || ''),
          minutesUrl: String(row[6] || ''),
          attachments: attachments,
          uploadedAt: formatDateValue(row[8])
        };
      })
      .reverse();

    return createJsonResponse({
      status: 'success',
      meetings: meetings
    });

  } catch (error) {
    return createJsonResponse({
      status: 'error',
      message: error.toString()
    });
  }
}

/**
 * 上傳會議記錄與相關附件
 */
function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      throw new Error('沒有收到上傳資料');
    }

    const data = JSON.parse(e.postData.contents);

    const uploader = String(data.uploader || '').trim();
    const meetingTitle = String(data.meetingTitle || '').trim();
    const meetingTime = String(data.meetingTime || '').trim();
    const meetingLocation = String(data.meetingLocation || '').trim();

    if (!uploader) {
      throw new Error('請填寫上傳人名稱');
    }

    if (!meetingTitle) {
      throw new Error('請填寫會議名稱或主題');
    }

    if (!meetingTime) {
      throw new Error('請填寫會議時間');
    }

    if (!meetingLocation) {
      throw new Error('請填寫會議地點');
    }

    if (!data.minutesFile || !data.minutesFile.base64) {
      throw new Error('請選擇會議記錄檔案');
    }

    const rootFolder = DriveApp.getFolderById(FOLDER_ID);
    const meetingId = Utilities.getUuid();
    const uploadedAt = new Date();

    // 每次會議建立一個專用資料夾
    const meetingFolderName = meetingTitle + '_' + meetingId;
    const meetingFolder = rootFolder.createFolder(meetingFolderName);

    // 上傳會議記錄
    const minutesFile = uploadFile(
      meetingFolder,
      data.minutesFile
    );

    // 上傳相關附件
    const attachments = [];
    const attachmentFiles = Array.isArray(data.attachments)
      ? data.attachments
      : [];

    attachmentFiles.forEach(fileData => {
      if (!fileData || !fileData.base64 || !fileData.name) {
        return;
      }

      const attachmentFile = uploadFile(meetingFolder, fileData);

      attachments.push({
        name: attachmentFile.getName(),
        type: attachmentFile.getMimeType(),
        url: getFileViewUrl(attachmentFile.getId())
      });
    });

    // 將會議資料寫入 Google Sheet
    const sheet = getMeetingSheet();

    sheet.appendRow([
      meetingId,
      uploader,
      meetingTitle,
      meetingTime,
      meetingLocation,
      minutesFile.getName(),
      getFileViewUrl(minutesFile.getId()),
      JSON.stringify(attachments),
      uploadedAt
    ]);

    return createJsonResponse({
      status: 'success',
      message: '會議資料上傳成功',
      meeting: {
        id: meetingId,
        uploader: uploader,
        title: meetingTitle,
        meetingTime: meetingTime,
        location: meetingLocation,
        minutesName: minutesFile.getName(),
        minutesUrl: getFileViewUrl(minutesFile.getId()),
        attachments: attachments,
        uploadedAt: uploadedAt.toISOString()
      }
    });

  } catch (error) {
    return createJsonResponse({
      status: 'error',
      message: error.toString()
    });
  }
}

/**
 * 將 Base64 檔案上傳到指定資料夾
 */
function uploadFile(folder, fileData) {
  const fileName = String(fileData.name || '未命名檔案');
  const mimeType = String(fileData.type || 'application/octet-stream');

  const decodedData = Utilities.base64Decode(fileData.base64);

  const fileBlob = Utilities.newBlob(
    decodedData,
    mimeType,
    fileName
  );

  const file = folder.createFile(fileBlob);
  file.setSharing(
    DriveApp.Access.ANYONE_WITH_LINK,
    DriveApp.Permission.VIEW
  );

  return file;
}

/**
 * 取得檔案檢視網址
 */
function getFileViewUrl(fileId) {
  return 'https://drive.google.com/file/d/' + fileId + '/view';
}

/**
 * 取得或建立 Meetings 工作表
 */
function getMeetingSheet() {
  if (!SHEET_ID || SHEET_ID === '請填入你的 Google Sheet ID') {
    throw new Error('請先設定 SHEET_ID');
  }

  const spreadsheet = SpreadsheetApp.openById(SHEET_ID);
  let sheet = spreadsheet.getSheetByName(SHEET_NAME);

  if (!sheet) {
    sheet = spreadsheet.insertSheet(SHEET_NAME);
  }

  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
    sheet.setFrozenRows(1);
  }

  return sheet;
}

/**
 * 將日期轉成前端可讀格式
 */
function formatDateValue(value) {
  if (!value) {
    return '';
  }

  if (Object.prototype.toString.call(value) === '[object Date]') {
    return value.toISOString();
  }

  return String(value);
}

/**
 * 統一回傳 JSON
 */
function createJsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function testDriveAccess() {
  const folder = DriveApp.getFolderById('10fTtsKWTr9_G_KnP1bL2fiUmdrTVmzDG');
  Logger.log(folder.getName());
}

function testSheetAccess() {
  const ss = SpreadsheetApp.openById('1w1qHdym3IVmAnmZAzUIcZt07TXhC3Kcy9JwyOtlZM6A');
  Logger.log(ss.getName());
}