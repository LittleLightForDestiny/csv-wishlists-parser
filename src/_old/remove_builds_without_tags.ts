import { DestinyCollectibleDefinition, DestinyInventoryItemDefinition } from 'bungie-api-ts/destiny2';
import fs from 'fs-extra';

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

async function saveWishlist(path: string, wishlist: JsonWishlist): Promise<void> {
    let pathDirs = path.split('/');
    let filename = pathDirs.pop();
    let directory = pathDirs.join('/');
    let filenameParts = filename?.split('.');
    let extension = filenameParts?.pop();
    filename = filenameParts?.join(".") + "." + extension;
    await fs.writeFile(`${[directory, filename].join('/')}`, JSON.stringify(wishlist));
}

async function loadWishlist(filename: string): Promise<JsonWishlist> {
    let buffer = await fs.readFile(filename);
    let str = buffer.toString();
    let parsed = JSON.parse(str);
    return parsed;
}

async function run(): Promise<void> {
    let wishlist = await loadWishlist(path);
    wishlist.data = wishlist.data.filter((b) => b.tags.length > 0);
    saveWishlist(path, wishlist);
};
run();