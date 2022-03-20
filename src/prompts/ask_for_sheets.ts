import { sheets_v4 } from "googleapis/build/src/apis/sheets/v4";
import prompts from "prompts";

export async function askForSheets(sheet:sheets_v4.Schema$Spreadsheet):Promise<number[]>{
    let response = await prompts({
        message:"Select the sheets to convert",
        name: "sheets",
        type:"multiselect",
        choices:(sheet.sheets || [])?.map((s)=>({
          title: s.properties?.title || "",
          value:s.properties?.sheetId,  
        }))
    });
    return response.sheets;
}