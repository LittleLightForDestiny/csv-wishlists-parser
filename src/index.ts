import axios from 'axios';
import { getDestinyManifest } from 'bungie-api-ts/destiny2/api';
import { DestinyInventoryItemDefinition, DestinyItemSocketEntryPlugItemDefinition, DestinyPlugSetDefinition } from 'bungie-api-ts/destiny2/interfaces';
import csvParser from 'csv-parse/lib/sync';
import fs from 'fs-extra';
import _ from "lodash";
import prompts from 'prompts';

interface ItemMemory {
    weaponHashes: { [name: string]: number[] };
    perkHashes: { [name: string]: number[] };
}

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

var memory: ItemMemory = {
    weaponHashes: {},
    perkHashes: {},
};

var errors: string[] = [
];

var filename = process.argv[2] || "forsaken-pve";

var bungieRoot = "https://www.bungie.net";
var itemDefinitions: { [hash: string]: DestinyInventoryItemDefinition };
var plugSetDefinitions: { [hash: string]: DestinyPlugSetDefinition };

async function client(data: any) {
    var result = await axios(data);
    return result.data;
}
async function getManifest(part: string): Promise<any> {
    try {
        var buffer = await fs.readFile(`./manifest/${part}.json`);
        var data = JSON.parse(buffer.toString());
        return data;
    } catch (e) {
        console.log(e);
    }
    var manifest = await getDestinyManifest(client);
    var path = manifest.Response.jsonWorldContentPaths['en'];
    var url = `${bungieRoot}${path}`;
    var definitions = await axios.get(url);
    try {
        await fs.mkdir("./manifest");
    } catch (e) { }
    var defs = definitions.data;
    for (var i in defs) {
        await fs.writeFile(`./manifest/${i}.json`, JSON.stringify(defs[i]));
    }

    return definitions.data[part];
}

async function loadMemory(): Promise<ItemMemory> {
    try {
        var buffer = await fs.readFile(`./data/memory.json`);
        var data = JSON.parse(buffer.toString());
        return data;
    } catch (e) {
        console.log(e);
    }
    return memory;
}

async function loadErrors(): Promise<string[]> {
    try {
        var buffer = await fs.readFile(`./output/${filename}-errors.txt`);
        var data = buffer.toString().split('\n');
        return data;
    } catch (e) {
        console.log(e);
    }
    return errors;
}

async function logError(message: string) {
    errors.push(message);
    errors = _.uniq(errors);
    try {
        await fs.mkdir("./output");
    } catch (e) { }
    await fs.writeFile(`./output/${filename}-errors.txt`, errors.join('\n'));
}

async function saveMemory(): Promise<void> {
    try {
        await fs.mkdir("./data");
    } catch (e) { }
    await fs.writeFile(`./data/memory.json`, JSON.stringify(memory));
}

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

async function parseLine(line: string[]): Promise<JsonWishlistItem[]> {
    var weaponName: string = line[0].trim();
    if (weaponName.length == 0) return [];
    var weaponHashes = await decideWeaponHash(weaponName);
    var items: JsonWishlistItem[] = [];
    for (var w in weaponHashes) {
        var weaponHash: number = weaponHashes[w];
        var item: JsonWishlistItem = { name: weaponName, description: "", plugs: [], hash: weaponHash, tags: [] };
        for (let i = 1; i <= 4; i++) {
            let perks = await getPerks(weaponHash, line[i]);
            if (perks.length > 0) {
                item.plugs.push(perks);
            }
        }
        item.tags = line[5].split(",");
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

async function decideWeaponHash(weaponName: string): Promise<number[]> {
    var items: DestinyInventoryItemDefinition[] = [];
    for (var i in itemDefinitions) {
        var def = itemDefinitions[i];
        if (def.displayProperties.name.toLowerCase() != weaponName.toLowerCase()) {
            continue;
        }
        items.push(itemDefinitions[i]);
    }
    if (items.length == 1) {
        return [items[0].hash];
    }
    if (items.length > 1) {
        return askForWeaponHash(weaponName, items);
    }
    items = items.filter((def) => {
        if (!def.sockets) return false;
        for (var s in def.sockets.socketEntries) {
            var socket = def.sockets.socketEntries[s];
            if (socket.randomizedPlugSetHash) return true;
        }
        return false;
    });
    return askForWeaponHash(weaponName, items);
}
async function askForMultiple(options: { hash: number, label: string }[], message: string): Promise<number[] | null> {
    let _options = _.map(options, (v) => ({
        title: `${v.hash} (${v.label})`,
        value: v.hash,
    }));
    _options.push({
        title: "Other",
        value: 0,
    })
    let result = await prompts({
        type: "multiselect",
        name: "hashes",
        choices: _options,
        message: message,
    });
    if (!result.hashes) {
        process.exit(0);
    }
    if (result.hashes.indexOf(0) > -1) {
        return null
    }
    return result.hashes;
}

async function askOpenly(message: string): Promise<number[]> {
    await logError(message);
    let result = await prompts({
        type: "text",
        name: "hashes",
        message: message,
    });
    if (result.hashes == null) {
        process.exit(0);
    }
    if (result.hashes.length == 0) {
        return [];
    }
    var hashes = result.hashes.split(",").map((h: any) => parseInt(h));
    return hashes;
}

async function addToMemory(object: { [id: string]: number[] }, key: string, items: number[]) {
    var group: number[];
    if (object[key]) {
        group = object[key];
    } else {
        group = object[key] = [];
    }
    for (var i in items) {
        group.push(items[i]);
    }
    await saveMemory();
}

async function askForWeaponHash(weaponName: string, items: DestinyInventoryItemDefinition[]) {
    weaponName = weaponName.trim();
    if (memory.weaponHashes[weaponName]) {
        let _counts = _(memory.weaponHashes[weaponName])
            .countBy((o) => o)
            .map((v, k) => {
                return ({ hash: parseInt(k), label: `${v}` });
            }).value();
        let result = await askForMultiple(_counts, `Use previously saved values for ${weaponName} ?`);
        if (result) {
            await addToMemory(memory.weaponHashes, weaponName, result);
            return result;
        }
    }
    if (items.length > 0) {
        let result = await askForMultiple(items.map((i) => {
            let hasRandomRolls = i.sockets && _(i.sockets.socketEntries).some((s)=>!!s.randomizedPlugSetHash);
            let label = `${i.itemTypeDisplayName}${hasRandomRolls ? " - has random rolls" : ""}`;
            return { 
                hash: i.hash, 
                label: label
            }
        }), `What's the weapon hash for ${weaponName} ?`);
        if (result) {
            await addToMemory(memory.weaponHashes, weaponName, result);
            return result;
        }
    }
    let result = await askOpenly(`What's the weapon hash for ${weaponName} ?`);
    if (result.length > 0) {
        await addToMemory(memory.weaponHashes, weaponName, result);
    }
    return result;
}

async function getPerks(weaponHash: number, perksString: string): Promise<number[]> {
    var perks: number[] = [];
    var perkNames = perksString.split(',');
    for (var i in perkNames) {
        var perk = await decidePerkHash(weaponHash, perkNames[i]);
        perks = perks.concat(perk);
    }
    return perks;
}

async function decidePerkHash(weaponHash: number, perkName: string): Promise<number[]> {
    var weaponDef = itemDefinitions[weaponHash];
    var availablePerkHashes: number[] = [];
    for (var s in weaponDef.sockets.socketEntries) {
        var entry = weaponDef.sockets.socketEntries[s];
        var reusable: DestinyItemSocketEntryPlugItemDefinition[] = _.get(entry, `reusablePlugItems`, []);
        availablePerkHashes = availablePerkHashes.concat(reusable.map((e) => e.plugItemHash));
        if (entry.singleInitialItemHash) {
            availablePerkHashes.push(entry.singleInitialItemHash);
        }
        if (entry.randomizedPlugSetHash) {
            var plugSetDef = plugSetDefinitions[`${entry.randomizedPlugSetHash}`];
            availablePerkHashes = availablePerkHashes.concat(plugSetDef.reusablePlugItems.map((p) => p.plugItemHash));
        }
    }
    availablePerkHashes = _.uniq(availablePerkHashes);
    var validPlugHashes = availablePerkHashes.filter((h) => {
        var name = itemDefinitions[h].displayProperties.name;
        return name.toLowerCase().trim() == perkName.toLowerCase().trim();
    });
    if (validPlugHashes.length == 1) return [validPlugHashes[0]];
    if (validPlugHashes.length > 1) {
        return askForPlugHash(weaponDef.displayProperties.name, perkName, validPlugHashes);
    }
    validPlugHashes = [];
    for (var i in itemDefinitions) {
        var def = itemDefinitions[i];
        var name = def.displayProperties.name;
        if (name.toLowerCase().trim() == perkName.toLowerCase().trim()) validPlugHashes.push(def.hash);
    }
    if (validPlugHashes.length == 1) {
        if (validPlugHashes.length == 1) return [validPlugHashes[0]];
    }
    return askForPlugHash(weaponDef.displayProperties.name, perkName, validPlugHashes);
}

async function askForPlugHash(weaponName: string, perkName: string, plugHashes: number[]): Promise<number[]> {
    perkName = perkName.trim();
    if (memory.perkHashes[perkName]) {
        var onMemory = memory.perkHashes[perkName];
        let _counts = _(onMemory)
            .countBy((o) => o)
            .map((v, k) => {
                return ({ hash: parseInt(k), label: `${v}` });
            }).value();
        let result = await askForMultiple(_counts, `Use previously saved values for ${perkName} on ${weaponName} ?`)
        if (result) {
            addToMemory(memory.perkHashes, perkName, result);
            return result;
        }
    }
    if (plugHashes.length > 0) {
        let result = await askForMultiple(plugHashes.map((p)=>{
            let def = itemDefinitions[p];
            let label = `${def.itemTypeDisplayName}`;
            return {label:label, hash:p};
        }), `What's the plug hash for ${perkName} on ${weaponName} ?`);
        if (result) {
            addToMemory(memory.perkHashes, perkName, result);
            return result;
        }
    }
    let result = await askOpenly(`What's the plug hash for ${perkName} on ${weaponName} ?`);
    if (result.length > 0) {
        addToMemory(memory.perkHashes, perkName, result);
    }
    return result;
}

async function run(): Promise<void> {
    itemDefinitions = await getManifest("DestinyInventoryItemDefinition");
    plugSetDefinitions = await getManifest("DestinyPlugSetDefinition");
    memory = await loadMemory();
    errors = await loadErrors();
    var csv = await getCSV(`csv/${filename}.csv`);
    for (var i in csv) {
        var items = await parseLine(csv[i]);
        items.forEach((item) => {
            if (item != null) {
                item.description += `File auto generated from csv ${filename}`;
                wishlist.data.push(item);
            }
        })

    }
    saveWishlist(filename);
}

run();