import { DestinyInventoryItemDefinition, DestinyPlugSetDefinition } from 'bungie-api-ts/destiny2';
import fs from 'fs-extra';
import { getItemDefinitions, getPlugSetDefinitions } from './data/manifest';

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

let filename = process.argv[2] || "pandapaxxy";
let itemDefinitions: { [hash: string]: DestinyInventoryItemDefinition };
let plugSetDefinitions: { [hash: string]: DestinyPlugSetDefinition };

async function saveWishlist(filename: string, wishlist: JsonWishlist): Promise<void> {
    try {
        await fs.mkdir("./output");
    } catch (e) { }
    await fs.writeFile(`./output/${filename}.json`, JSON.stringify(wishlist));
}

async function loadWishlist(filename: string): Promise<JsonWishlist> {
    let buffer = await fs.readFile(`./output/${filename}.json`);
    let str = buffer.toString();
    let parsed = JSON.parse(str);
    return parsed;
}

function getBuildByTag(builds: JsonWishlistItem[], tag: string): JsonWishlistItem | undefined {
    return builds.find((b) => b.tags.map((s) => s.toLowerCase()).includes(tag.toLowerCase()));
}

async function fixWishlistItem(hash: number, builds: JsonWishlistItem[]) {
    let def = itemDefinitions[hash];
    let godPVE: JsonWishlistItem | undefined = getBuildByTag(builds, 'godpve');
    let godPVP: JsonWishlistItem | undefined = getBuildByTag(builds, 'godpvp');
    let pve: JsonWishlistItem | undefined = getBuildByTag(builds, 'pve');
    let pvp: JsonWishlistItem | undefined = getBuildByTag(builds, 'pvp');
    if (godPVE) {
        if (!pve) {
            pve = {
                ...godPVE,
                tags:['pve'],
                hash,
                plugs:[],
            };
            builds.push(pve);
        }
        fixPlugs(def, godPVE, pve);
    }
    if (godPVP) {
        if (!pvp) {
            pvp = {
                ...godPVP,
                tags:['pvp'],
                hash,
                plugs:[],
            };
            builds.push(pvp);
        }
        fixPlugs(def, godPVP, pvp);
    }
}

function getPerkPlugsForDefinition(def: DestinyInventoryItemDefinition) {
    let category = def.sockets.socketCategories.find((c) => c.socketCategoryHash == 4241085061);
    let plugs: number[][] = [];
    for (let i in category?.socketIndexes) {
        let index = category?.socketIndexes[parseInt(i)];
        let entry = def.sockets.socketEntries[index!];
        if (entry.singleInitialItemHash == 2285418970) continue;
        let randomPlugSet = plugSetDefinitions[entry.randomizedPlugSetHash!]?.reusablePlugItems;
        let reusablePlugSet = plugSetDefinitions[entry.reusablePlugSetHash!]?.reusablePlugItems;
        let randomPlugs = randomPlugSet?.map((p) => p.plugItemHash) ?? [];
        let reusablePlugs: number[] = reusablePlugSet?.map((p) => p.plugItemHash) ?? [];
        let availablePlugs: number[] = [entry?.singleInitialItemHash, ...reusablePlugs, ...randomPlugs];
        let uniquePlugs: Set<number> = new Set();
        availablePlugs.forEach((p) => uniquePlugs.add(p));
        plugs.push(Array.from(uniquePlugs));
    }
    return plugs;
}

function findIntersection(available: number[], build: number[][]): number[] {
    for (let slot of build) {
        for (let perkHash of slot) {
            if (available.includes(perkHash)) return slot;
        }
    }
    return [];
}

function fixPlugs(def: DestinyInventoryItemDefinition, godrollBuild: JsonWishlistItem, goodrollBuild: JsonWishlistItem) {
    let availablePerkSlots = getPerkPlugsForDefinition(def);
    let fixedGoodRollSlots: number[][] = [];
    for (let i = 0; i < availablePerkSlots.length; i++) {
        let availablePerks = availablePerkSlots[i];
        let goodrollPerks = findIntersection(availablePerks, goodrollBuild.plugs);
        let godrollPerks = findIntersection(availablePerks, godrollBuild.plugs);
        let allPerks = new Set([...godrollPerks, ...goodrollPerks]);
        fixedGoodRollSlots.push(Array.from(allPerks));
    }
    goodrollBuild.plugs = fixedGoodRollSlots;
}

async function run(): Promise<void> {
    itemDefinitions = await getItemDefinitions();
    plugSetDefinitions = await getPlugSetDefinitions();
    let resultWishlist: JsonWishlist = {
        $schema: "./jsonwishlist.schema.json",
        data: []
    };

    let wishlist = await loadWishlist(filename);
    let buildsPerHash: { [hash: number]: JsonWishlistItem[] } = {};
    wishlist.data.forEach(element => {
        element.plugs = element.plugs.map((p) => {
            return p.map((p2: any) => {
                return parseInt(p2);
            });
        });
        let builds: JsonWishlistItem[] = buildsPerHash[element.hash] || [];
        builds.push(element);
        buildsPerHash[element.hash] = builds;
    });
    for (let hash in buildsPerHash) {
        let builds = buildsPerHash[hash];
        fixWishlistItem(parseInt(hash), builds);
    }
    await saveWishlist(`${filename}-fix`, wishlist);
};

run();