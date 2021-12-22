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
let hashToSeason: { [hash: string]: number };
let sourceToSeason: { [hash: string]: number };

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


function getSeason(hash: number): number {
    let def = itemDefinitions[hash];
    let season = hashToSeason[hash];
    if(season){
        console.log(`found hash for ${hash} - ${def.displayProperties.name}`);
        return season;
    }
    if(def.collectibleHash){
        let collectible = collectibleDefinitions[def.collectibleHash];
        let source = collectible.sourceHash;
        if(source){
            season = sourceToSeason[`${source}`];
        }
    }
    if(season){
        return season;
    }
    
    let watermark = (def as any).iconWatermark;
    season = watermarkToSeason[watermark];
    return season;
}


async function run(): Promise<void> {
    itemDefinitions = await getItemDefinitions();
    collectibleDefinitions = await getCollectibleDefinitions();
    hashToSeason = (await axios('https://raw.githubusercontent.com/DestinyItemManager/d2ai-module/master/seasons.json')).data;
    sourceToSeason = (await axios('https://raw.githubusercontent.com/DestinyItemManager/d2ai-module/master/season-to-source.json')).data.sources;
    watermarkToSeason = (await axios('https://raw.githubusercontent.com/DestinyItemManager/d2ai-module/master/watermark-to-season.json')).data;
    let wishlist = await loadWishlist(filename);
    let seasons:{[id:string]:JsonWishlistItem[]} = {};

    for (let wishlistItem of wishlist.data) {
        let season = getSeason(wishlistItem.hash) ?? "uncategorized";
        if(!seasons[season]){
            seasons[`${season}`] = [];
        }
        seasons[`${season}`].push(wishlistItem);
    }

    try {
        await fs.mkdir(`./output/${filename}`);
    } catch (e) { }

    for(let season in seasons){
        await saveWishlist(`${filename}/season-${season}`, {
            ...wishlist,
            data:seasons[season]
        });
    }
};

run();