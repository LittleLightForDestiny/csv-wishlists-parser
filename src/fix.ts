import fs from 'fs-extra';
import { WishlistTag } from './interfaces/wishlist.interface';

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

var filename = process.argv[2] || "forsaken-pve";

async function saveWishlist(filename: string): Promise<void> {
    try {
        await fs.mkdir("./output");
    } catch (e) { }
    await fs.writeFile(`./output/${filename}.json`, JSON.stringify(wishlist));
}

async function loadWishlist(): Promise<JsonWishlist> {
    var buffer = await fs.readFile(`./output/${filename}.json`);
    var str = buffer.toString();
    var parsed = JSON.parse(str);
    return parsed || wishlist;
}



const tagReplacements: { [id: string]: WishlistTag } = {
    'pvp': WishlistTag.PvP,
    'pve': WishlistTag.PvE,
    'godpve': WishlistTag.GodPvE,
    'godpvp': WishlistTag.GodPvP,
    'mnk': WishlistTag.Mouse,
    'mouse': WishlistTag.Mouse,
    'controller': WishlistTag.Controller,
};

async function run(): Promise<void> {
    wishlist = await loadWishlist();
    wishlist.data.forEach(element => {
        element.tags = element.tags.map((t) => {
            return tagReplacements[t.toLowerCase()] || t;
        });
        var tagSet = new Set(element.tags);
        if (tagSet.has(WishlistTag.GodPvE)) tagSet.delete(WishlistTag.PvE);
        if (tagSet.has(WishlistTag.GodPvP)) tagSet.delete(WishlistTag.PvP);
        element.tags = Array.from(tagSet);
    });
    console.log(`had ${wishlist.data.length} builds`);
    wishlist.data = wishlist.data.filter((element) => {
        const nonEmptyPlugs = element.plugs.filter((p) => p.length > 0);
        const shouldKeepByPlugs = nonEmptyPlugs.length == 2 || nonEmptyPlugs.length == 4;
        const hasReduntantGoodRollTags = element.tags.includes(WishlistTag.PvE) && element.tags.includes(WishlistTag.PvP);
        const hasReduntantGodRollTags = element.tags.includes(WishlistTag.GodPvE) && element.tags.includes(WishlistTag.GodPvP);
        const shouldKeepByTags = !hasReduntantGodRollTags && !hasReduntantGoodRollTags;
        return shouldKeepByPlugs && shouldKeepByTags;
    });
    console.log(`Now it have ${wishlist.data.length} builds.`);
    saveWishlist(filename);
}

run();