import axios from 'axios';
import { DestinyCollectibleDefinition, DestinyInventoryItemDefinition } from 'bungie-api-ts/destiny2';
import fs from 'fs-extra';
import { getCollectibleDefinitions, getItemDefinitions } from './data/manifest';

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
let season = parseInt(process.argv[3]) || 14;

let itemDefinitions: { [hash: string]: DestinyInventoryItemDefinition };
let collectibleDefinitions: { [hash: string]: DestinyCollectibleDefinition };
let watermarkToSeason: { [source: string]: number };

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


function isFromSeason(hash: number, season: number): boolean {
    let def = itemDefinitions[hash];
    let watermark = (def as any).iconWatermark;
    console.log(watermark, watermarkToSeason[watermark], season, watermarkToSeason[watermark] == season);
    if (watermarkToSeason[watermark] == season) return true;
    return false;
}


async function run(): Promise<void> {
    itemDefinitions = await getItemDefinitions();
    collectibleDefinitions = await getCollectibleDefinitions();
    watermarkToSeason = (await axios('https://raw.githubusercontent.com/DestinyItemManager/d2ai-module/master/watermark-to-season.json')).data;
    let wishlist = await loadWishlist(filename);
    let resultWishlist: JsonWishlist = {
        ...wishlist,
        data: [],
    };

    for (let wishlistItem of wishlist.data) {
        if (isFromSeason(wishlistItem.hash, season)) {
            resultWishlist.data.push(wishlistItem);
        }
    }

    await saveWishlist(`${filename}-${season}`, resultWishlist);
};

run();