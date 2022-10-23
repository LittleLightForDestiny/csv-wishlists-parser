import fs from "fs-extra";
import { sheets_v4 } from "googleapis";
import { PerkSheetStateController } from "./controllers/perk_sheet_state.controller";
import { getSeasonByItemHash } from "./controllers/season_filter";
import { getSheetsClient } from "./google_docs";
import { JsonWishlist, JsonWishlistItem, WishlistTag } from "./interfaces/wishlist.interface";
import { askForSheets } from "./prompts/ask_for_sheets";
let sheetsClient: sheets_v4.Sheets;
const id = "1D2rZQEvwtq3hWV6ZIu8ytJQloUlg5IIXd_tps01o0pI";
// const id = "1OvBQAh2CsVHskudEpxu65G5_tFkk9IB13OXH1jp6qZk";

let wishlistItems: JsonWishlistItem[] = [];

async function processSheet(sheet: sheets_v4.Schema$Sheet) {
    let controller = new PerkSheetStateController(sheet, (hash, perks, tags) => {
        wishlistItems.push({
            hash,
            plugs: perks,
            tags,
        });
    });
    await controller.findHeaderIndex();
    await controller.findHeaders();
    await controller.findWeaponIndexes();
    await controller.processWeapons();
}

async function saveItems() {
    let files: {
        [path: string]: {
            season: number,
            input: WishlistTag,
            items: JsonWishlistItem[]
        }
    } = {};
    for (let build of wishlistItems) {
        let season = await getSeasonByItemHash(build.hash) || 0;
        if (build.tags.indexOf(WishlistTag.Mouse) > -1) {
            let path = `mnk/season-${season?.toString().padStart(2, "0")}.json`;
            if (!files[path]) files[path] = {
                season,
                items: [],
                input: WishlistTag.Mouse
            };
            files[path].items.push(build);
        }

        if (build.tags.indexOf(WishlistTag.Controller) > -1) {
            let path = `controller/season-${season?.toString().padStart(2, "0")}.json`;
            if (!files[path]) files[path] = {
                season,
                items: [],
                input: WishlistTag.Controller
            };
            files[path].items.push(build);
        }
    }
    for (let path in files) {
        let dir = path.substring(0, path.lastIndexOf('/'));
        let info = files[path];
        let inputName = info.input == WishlistTag.Controller ? "Controller" : "Mouse and Keyboard";
        let jsonData: JsonWishlist = {
            name: `Pandapaxxy's ${inputName} rolls - Season ${info.season}`,
            description: `Recommendations based on Pandapaxxy's breakdowns on r/sharditorkeepit for ${inputName} on Season ${info.season} weapons.`,
            data: files[path].items
        };
        await fs.ensureDir(`./output/pandapaxxy/${dir}`);
        await fs.writeJSON(`./output/pandapaxxy/${path}`, jsonData);
    }
}

async function run() {
    sheetsClient = await getSheetsClient();
    let sheet = await sheetsClient.spreadsheets.get({ spreadsheetId: id, includeGridData: true });
    let sheetIDs = await askForSheets(sheet.data);
    for (let sheetID of sheetIDs) {
        let currentSheet = sheet.data.sheets?.find((s) => s.properties?.sheetId == sheetID);
        if (currentSheet != null) {
            await processSheet(currentSheet);
        }
    }
    await saveItems();
}

run();