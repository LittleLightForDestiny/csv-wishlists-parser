import axios from 'axios';
import { DestinyCollectibleDefinition, DestinyInventoryItemDefinition } from 'bungie-api-ts/destiny2';
import fs from 'fs-extra';
import { getCollectibleDefinitions, getItemDefinitions } from './data/manifest';

type WeaponPairList = {
    [id: string]: AdeptWeaponPair;
};

interface JsonWishlistItem {
    hash: number;
    plugs: number[][];
    name?: string;
    description: string;
    originalWishlist?: string;
    tags: string[];
}

interface JsonWishlist {
    $schema: String;
    data: JsonWishlistItem[]
}

interface AdeptWeaponPair {
    adeptHash: number;
    nonAdeptHash: number;
    adept: DestinyCollectibleDefinition;
    nonAdept: DestinyCollectibleDefinition;
}

let path = process.argv[2] || "pandapaxxy";
let season = parseInt(process.argv[3]) || 14;

let itemDefinitions: { [hash: string]: DestinyInventoryItemDefinition };
let collectibleDefinitions: { [hash: string]: DestinyCollectibleDefinition };
let watermarkToSeason: { [source: string]: number };

async function saveWishlist(path: string, wishlist: JsonWishlist): Promise<void> {
    let pathDirs = path.split('/');
    let filename = pathDirs.pop();
    let directory = pathDirs.join('/');
    let filenameParts = filename?.split('.');
    let extension = filenameParts?.pop();
    filename = filenameParts?.join(".") + "_with_adepts." + extension;
    await fs.writeFile(`${[directory, filename].join('/')}`, JSON.stringify(wishlist));
}

async function loadWishlist(filename: string): Promise<JsonWishlist> {
    let buffer = await fs.readFile(filename);
    let str = buffer.toString();
    let parsed = JSON.parse(str);
    return parsed;
}

function findAdeptWeaponsNames(): string[] {
    let adeptWeaponsNames: string[] = [];
    for (let i in collectibleDefinitions) {
        let c = collectibleDefinitions[i];
        let isAdept = c.displayProperties.name.toLowerCase().includes("(adept)");
        let isTimelost = c.displayProperties.name.toLowerCase().includes("(timelost)");
        if (isAdept || isTimelost) {
            let nonAdeptName = c.displayProperties.name.toLowerCase().replace("(adept)", "").replace("(timelost)", "").trim();
            adeptWeaponsNames.push(nonAdeptName);
        }
    }
    return adeptWeaponsNames;
}

function getAdeptWeaponsPairs(adeptWeaponsNames: string[]): WeaponPairList {
    let adeptWeapons: WeaponPairList = {};
    for (let i in collectibleDefinitions) {
        let c = collectibleDefinitions[i];
        let baseName = adeptWeaponsNames.find((n) => c.displayProperties.name.toLowerCase().includes(n));
        let hasVariant = !!baseName;
        if (hasVariant && baseName) {
            let pair = adeptWeapons[baseName] ?? {};
            let isAdept = c.displayProperties.name.toLowerCase().includes("(adept)");
            let isTimelost = c.displayProperties.name.toLowerCase().includes("(timelost)");
            let isVariant = isAdept || isTimelost;
            if (isVariant) {
                pair.adept = c;
                pair.adeptHash = c.itemHash;
            } else {
                pair.nonAdept = c;
                pair.nonAdeptHash = c.itemHash;
            }
            adeptWeapons[baseName] = pair;
        }
    }
    return adeptWeapons;
}

function findAdeptCounterpartHash(hash: number, pairs: WeaponPairList): number | null {
    for (let i in pairs) {
        let pair = pairs[i];
        if (pair.adeptHash == hash) return pair.nonAdeptHash;
        if (pair.nonAdeptHash == hash) return pair.adeptHash;
    }
    return null;
}


async function run(): Promise<void> {
    collectibleDefinitions = await getCollectibleDefinitions();
    let adeptWeaponsNames = findAdeptWeaponsNames();
    let adeptWeaponsPairs = getAdeptWeaponsPairs(adeptWeaponsNames);
    let wishlist = await loadWishlist(path);
    let originalCount = wishlist.data.length;
    let duplicatedBuilds: JsonWishlistItem[] = [];

    for (let build of wishlist.data) {
        let counterpartHash = findAdeptCounterpartHash(build.hash, adeptWeaponsPairs);
        if (counterpartHash) {
            duplicatedBuilds.push({
                ...build,
                hash: counterpartHash
            });
        }
    }

    wishlist.data = [
        ...wishlist.data,
        ...duplicatedBuilds
    ];
    let newCount = wishlist.data.length;
    console.log(`Original count: ${originalCount}`);
    console.log(`New count: ${newCount}`);
    if (newCount > originalCount) {
        await saveWishlist(path, wishlist);
    }
};
run();