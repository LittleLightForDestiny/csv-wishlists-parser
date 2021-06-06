import { DestinyInventoryItemDefinition, DestinyPlugSetDefinition } from 'bungie-api-ts/destiny2/interfaces';
import fs from 'fs-extra';
import { getItemDefinitions, getPlugSetDefinitions } from './data/manifest';
import { JsonWishlist } from './interfaces/wishlist.interface';

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

async function run(): Promise<void> {
    itemDefinitions = await getItemDefinitions();
    plugSetDefinitions = await getPlugSetDefinitions();
    let wishlist = await loadWishlist(filename);
    wishlist.data.forEach((b)=>{
        if(!b.originalWishlist) b.originalWishlist = filename;
    });
    await saveWishlist(`${filename}`, wishlist);
};

run();