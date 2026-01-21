import { SensorData } from '../types';

// The Google Sheet ID
const SHEET_ID = '1CspjxgMKFJYDSUiIhV6lDsHHcslhhWaqdiKz5nQK05E';

// ---------------------------------------------------------------------------
// Google Apps Script Web App URL
// ---------------------------------------------------------------------------
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxWS4G-K5YLP2RHC6MST3GgexjaS5XT1hOWRcwPzrZiJTbg6V_kFoQMgIbwA-hDpM4J/exec'; 

// We use the Google Visualization API endpoint ('gviz') which is generally more reliable 
// for "Anyone with the link" shared sheets compared to 'pub'.
// We also use a CORS proxy to ensure the browser doesn't block the request.
const GOOGLE_SHEET_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv`;
const PROXY_BASE = `https://corsproxy.io/?`;

export const fetchSheetData = async (): Promise<SensorData[]> => {
  try {
    // Construct the URL with a cache buster
    const sheetUrl = `${GOOGLE_SHEET_URL}&t=${Date.now()}`;
    // Use corsproxy.io to bypass CORS headers issue.
    const finalUrl = `${PROXY_BASE}${encodeURIComponent(sheetUrl)}`;

    const response = await fetch(finalUrl);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch sheet data: ${response.status} ${response.statusText}`);
    }
    
    const csvText = await response.text();
    
    // Check if we got a login page instead of CSV (common issue with Sheets permissions)
    if (csvText.trim().startsWith("<!DOCTYPE html>") || csvText.includes("<html")) {
       throw new Error("Sheet is not public. Please set sharing to 'Anyone with the link' in Google Sheets.");
    }

    return parseCSV(csvText);
  } catch (error) {
    console.error("Error fetching sheet data:", error);
    throw error;
  }
};

export const toggleFanControl = async (newState: boolean): Promise<boolean> => {
  const stateVal = newState ? 1 : 0;
  console.log(`[COMMAND SENT] Writing '${stateVal}' to Cell M1 via Script`);

  // Add timestamp to prevent caching
  const targetUrl = `${GOOGLE_SCRIPT_URL}?action=setFan&state=${stateVal}&t=${Date.now()}`;

  try {
    // We use 'no-cors' mode. This allows us to send the request to Google Scripts 
    // without getting blocked by CORS. The downside is we get an "opaque" response 
    // (we can't read the text), but for a "set" command, we just need it to execute.
    await fetch(targetUrl, { 
      method: 'GET', // Apps Script doGet handles GET
      mode: 'no-cors' 
    });
    
    // With no-cors, we can't check response.ok. We assume success if it didn't throw network error.
    return true;
  } catch (error) {
    console.error("Failed to toggle fan:", error);
    return false;
  }
};

const parseCSV = (csvText: string): SensorData[] => {
  const lines = csvText.split('\n');
  const data: SensorData[] = [];

  if (lines.length === 0) return data;

  // STEP 1: READ FAN STATUS FROM M1 (Row 0, Column 12)
  const firstLine = lines[0].trim();
  const firstRowValues = splitCSVLine(firstLine);
  
  let globalFanStatus = false;
  
  // M1 is at index 12 (13th column).
  if (firstRowValues.length > 12) {
    const rawM1 = firstRowValues[12].trim(); 
    // Check for '1' or 'TRUE' (handling potential quotes stripped by splitCSVLine)
    globalFanStatus = rawM1 === '1' || rawM1.toUpperCase() === 'TRUE';
  }

  // STEP 2: PARSE DATA ROWS
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const values = splitCSVLine(line);
    
    // Expecting: Timestamp (A), Temperature (B), Humidity (C), Lux (D)
    if (values.length >= 4) {
      const timestamp = values[0]; 
      const temperature = parseFloat(values[1]);
      const humidity = parseFloat(values[2]);
      const luxRaw = values[3];
      const lux = parseFloat(luxRaw);

      if (!isNaN(temperature) && !isNaN(humidity)) {
        data.push({
          timestamp,
          temperature,
          humidity,
          lux: isNaN(lux) ? 0 : lux,
          fanStatus: globalFanStatus
        });
      }
    }
  }

  return data;
};

// Robust CSV Line Splitter handling quotes
const splitCSVLine = (line: string): string[] => {
  const values: string[] = [];
  let current = '';
  let inQuote = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuote = !inQuote;
    } else if (char === ',' && !inQuote) {
      values.push(current.trim().replace(/^"|"$/g, '')); // Strip quotes
      current = '';
    } else {
      current += char;
    }
  }
  values.push(current.trim().replace(/^"|"$/g, ''));
  return values;
};