
import { SensorData } from '../types';

// The Google Sheet ID
const SHEET_ID = '1CspjxgMKFJYDSUiIhV6lDsHHcslhhWaqdiKz5nQK05E';

// ---------------------------------------------------------------------------
// Google Apps Script Web App URL (For Control)
// ---------------------------------------------------------------------------
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxWS4G-K5YLP2RHC6MST3GgexjaS5XT1hOWRcwPzrZiJTbg6V_kFoQMgIbwA-hDpM4J/exec'; 

// We switch to the 'export' endpoint which is often more reliable for CORS proxies 
// in production environments compared to the 'gviz' endpoint.
const GOOGLE_SHEET_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=0`;
const PROXY_BASE = `https://corsproxy.io/?`;

export const fetchSheetData = async (): Promise<SensorData[]> => {
  try {
    // Construct the URL with a cache buster parameter to bypass CDN caching
    const sheetUrl = `${GOOGLE_SHEET_URL}&cachebust=${Date.now()}`;
    
    // Use corsproxy.io to bypass CORS headers issue in the browser.
    const finalUrl = `${PROXY_BASE}${encodeURIComponent(sheetUrl)}`;

    const response = await fetch(finalUrl, {
      method: 'GET',
      headers: {
        'Accept': 'text/csv'
      },
      cache: 'no-cache'
    });
    
    if (!response.ok) {
      throw new Error(`Sheet access failed: ${response.status}. Check if the sheet is public.`);
    }
    
    const csvText = await response.text();
    
    // CRITICAL: Check if we got a Google login page instead of CSV data.
    // This happens if the sheet is not set to "Anyone with the link can view".
    if (csvText.trim().toLowerCase().startsWith("<!doctype html") || csvText.includes("<script") || csvText.includes("google-signin")) {
       console.error("SHEET PERMISSION ERROR: The response is HTML. The sheet must be shared as 'Anyone with the link can view'.");
       throw new Error("Sheet is private. Please set sharing to 'Anyone with the link' in Google Sheets.");
    }

    if (!csvText || csvText.length < 10) {
      throw new Error("Received empty data from Google Sheets.");
    }

    return parseCSV(csvText);
  } catch (error) {
    console.error("Error in fetchSheetData:", error);
    throw error;
  }
};

export const toggleFanControl = async (newState: boolean): Promise<boolean> => {
  const stateVal = newState ? 1 : 0;
  console.log(`[COMMAND SENT] Writing '${stateVal}' to Cell M1 via Script`);

  const targetUrl = `${GOOGLE_SCRIPT_URL}?action=setFan&state=${stateVal}&t=${Date.now()}`;

  try {
    // Apps Script requires no-cors mode to bypass redirect issues
    await fetch(targetUrl, { 
      method: 'GET',
      mode: 'no-cors',
      cache: 'no-cache'
    });
    return true;
  } catch (error) {
    console.error("Failed to toggle fan:", error);
    return false;
  }
};

const parseCSV = (csvText: string): SensorData[] => {
  // Normalize line endings for cross-platform stability
  const lines = csvText.replace(/\r/g, '').split('\n');
  const data: SensorData[] = [];

  if (lines.length === 0) return data;

  // READ FAN STATUS FROM M1 (Column 12 in the first row)
  const firstLine = lines[0].trim();
  const firstRowValues = splitCSVLine(firstLine);
  
  let globalFanStatus = false;
  if (firstRowValues.length > 12) {
    const rawM1 = firstRowValues[12].trim().toUpperCase(); 
    globalFanStatus = rawM1 === '1' || rawM1 === 'TRUE';
  }

  // PARSE DATA ROWS (Skip header if it exists)
  // Usually, Row 1 is header, Row 2 onwards is data
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const values = splitCSVLine(line);
    
    // A: Timestamp, B: Temp, C: Hum, D: Lux, E: Rain, F: Soil, G: Water
    if (values.length >= 7) {
      const timestamp = values[0]; 
      const temperature = parseFloat(values[1]);
      const humidity = parseFloat(values[2]);
      const lux = parseFloat(values[3]);
      const rain = parseFloat(values[4]); 
      const soilRaw = parseFloat(values[5]);
      const waterRaw = parseFloat(values[6]);

      // Map Soil (0-4095 to 0-100%)
      const soilMoisture = isNaN(soilRaw) ? 0 : Math.min(100, Math.max(0, (soilRaw / 4095) * 100));
      
      // Map Water (0-4095 to 0-100% if it looks like analog, otherwise keep raw)
      let waterLevel = isNaN(waterRaw) ? 0 : waterRaw;
      if (waterLevel > 100) {
          waterLevel = (waterLevel / 4095) * 100;
      }

      if (!isNaN(temperature) && !isNaN(humidity)) {
        data.push({
          timestamp,
          temperature,
          humidity,
          lux: isNaN(lux) ? 0 : lux,
          fanStatus: globalFanStatus,
          rain: isNaN(rain) ? 0 : rain,
          soilMoisture: Math.round(soilMoisture),
          waterLevel: Math.round(waterLevel)
        });
      }
    }
  }

  return data;
};

const splitCSVLine = (line: string): string[] => {
  const values: string[] = [];
  let current = '';
  let inQuote = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuote = !inQuote;
    } else if (char === ',' && !inQuote) {
      values.push(current.trim().replace(/^"|"$/g, ''));
      current = '';
    } else {
      current += char;
    }
  }
  values.push(current.trim().replace(/^"|"$/g, ''));
  return values;
};
