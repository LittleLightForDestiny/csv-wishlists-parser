import { DestinyInventoryItemDefinition, DestinyPlugSetDefinition } from 'bungie-api-ts/destiny2/interfaces';
import csvParser from 'csv-parse/lib/sync';
import fs from 'fs-extra';
import { getManifest } from './data/manifest';
import { getFilename, setOptions, getOptions } from './data/options';
import { askForMultiple } from './prompts/ask_for_multiple';
import { decidePerkHash as resolvePerkHash } from './resolvers/resolve_perk_hash';
import { resolveWeaponHash } from './resolvers/resolve_weapon_hash';
import { askForHeaderLine, askForNameColumn, askForPerkColumn as askForPerkColumns, askForTagsColumn } from './prompts/ask_for_column_indexes';

interface JsonWishlistItem {
    hash: number;
    plugs: number[][];
    name: string;
    description: string;
    tags: string[];
}

interface JsonWishlist {
    $schema: String;
    data: JsonWishlistItem[]
}
var wishlist: JsonWishlist = {
    $schema: "./jsonwishlist.schema.json",
    data: []
};

let persistentWeaponName: string = "";

setOptions({ filename: process.argv[2] || "forsaken-pve" });


async function saveWishlist(filename: string): Promise<void> {
    try {
        await fs.mkdir("./output");
    } catch (e) { }
    await fs.writeFile(`./output/${filename}.json`, JSON.stringify(wishlist));
}

async function getCSV(path: string): Promise<string[][]> {
    var buffer = await fs.readFile(path);
    var str = buffer.toString();
    var parsed = csvParser(str);
    return parsed;
}

function parseTags(tags: string): string[] {
    return tags.split(',').map((t) => {
        let tag = t.toLowerCase();
        switch (tag) {
            case "pve":
                return "PvE";
            case "pvp":
                return "PvP";
            case "godpve":
                return "GodPvE";
            case "godpvp":
                return "GodPvP";
        }
        return tag;
    });
}

async function parseLine(line: string[]): Promise<JsonWishlistItem[]> {
    let options = getOptions();
    var weaponName: string = line[options.nameColumn || 0].trim() || persistentWeaponName.trim();
    let perkColumns = options.perkColumns || [1, 2, 3, 4];
    var containsPerks: boolean = perkColumns.some((c) => {
        return line[c].trim().length > 0;
    });
    if (!containsPerks) return [];
    persistentWeaponName = weaponName;
    console.log(weaponName);
    var weaponHashes = await resolveWeaponHash(weaponName);
    var items: JsonWishlistItem[] = [];
    for (var w in weaponHashes) {
        var weaponHash: number = weaponHashes[w];
        var item: JsonWishlistItem = { name: weaponName, description: "", plugs: [], hash: weaponHash, tags: [] };

        for (let ci in perkColumns) {
            let c = perkColumns[ci];
            let perks = await getPerks(weaponHash, line[c]);
            if (perks.length > 0) {
                item.plugs.push(perks);
            }
        }
        item.tags = parseTags(line[options.tagsColumn || 5]);
        items.push(item);

        var generateGodRoll = false;
        for (var i in item.plugs) {
            if (item.plugs[i].length > 1) {
                generateGodRoll = true;
            }
        }
        if (generateGodRoll) {
            var godrollPlugs = item.plugs.map((p) => [p[0]]);
            var godrollTags = item.tags.map((v) => {
                if (v == "pve") return "godpve";
                if (v == "pvp") return "godpvp";
                return v;
            });
            let godrollItem: JsonWishlistItem = { name: weaponName, description: "", plugs: godrollPlugs, hash: weaponHash, tags: godrollTags };
            items.push(godrollItem);
        }
    }
    return items;
}


async function getPerks(weaponHash: number, perksString: string): Promise<number[]> {
    var perks: number[] = [];
    var perkNames = perksString.split(',').map((p) => p.trim()).filter(Boolean);
    for (var i in perkNames) {
        var perk = await resolvePerkHash(weaponHash, perkNames[i]);
        perks = perks.concat(perk);
    }
    return perks;
}


async function run(): Promise<void> {
    var csv = await getCSV(`csv/${getFilename()}.csv`);
    let headerLine = await askForHeaderLine(csv);
    let header = csv[headerLine];
    let nameColumn = await askForNameColumn(header);
    let perkColumns = await askForPerkColumns(header);
    let tagsColumn = await askForTagsColumn(header);
    setOptions({
        nameColumn: nameColumn,
        perkColumns: perkColumns,
        tagsColumn: tagsColumn
    });
    for (var i = headerLine + 1; i < csv.length; i++) {
        var items = await parseLine(csv[i]);
        items.forEach((item) => {
            if (item != null) {
                item.description += `File auto generated from csv ${getFilename()}`;
                wishlist.data.push(item);
            }
        })

    }
    saveWishlist(getFilename()!);
}

run();