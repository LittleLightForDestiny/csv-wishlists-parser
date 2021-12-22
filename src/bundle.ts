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

var filename = process.argv[2] || "pandapaxxy";
var path = process.argv[3] || './output';
var prefix = process.argv[4] || '';

async function saveWishlist(filename: string, wishlist: JsonWishlist): Promise<void> {
    if (!filename.includes('.json')) filename += '.json';
    filename = filename.replace('.json', '-bundle.json');
    await fs.writeFile(`${path}/${filename}`, JSON.stringify(wishlist));
}

async function loadWishlist(filename: string): Promise<JsonWishlist> {
    if (!filename.includes('.json')) filename += '.json';
    var buffer = await fs.readFile(`${path}/${filename}`);
    var str = buffer.toString();
    var parsed = JSON.parse(str);
    return parsed;
}

async function loadBundle(filename: string): Promise<string[]> {
    var buffer = await fs.readFile(`./bundles/${filename}.json`);
    var str = buffer.toString();
    var parsed = JSON.parse(str);
    return parsed;
}



async function run(): Promise<void> {
    let resultWishlist: JsonWishlist = {
        $schema: "./jsonwishlist.schema.json",
        data: []
    };
    var bundle = await loadBundle(filename);
    for (var i in bundle) {
        let wishlist = await loadWishlist(bundle[i]);
        wishlist.data = wishlist.data.filter((b) => b.tags.length > 0);
        wishlist.data.forEach(element => {
            element.plugs = element.plugs.map((p) => {
                return p.map((p2: any) => {
                    return parseInt(p2);
                });
            });
            if (element.tags.length == 0) console.log(element.name + " has no tags");
            let originalWishlistName = prefix + bundle[i].toLowerCase();
            element.originalWishlist = element.originalWishlist || originalWishlistName;
            element.description = element.description.replace("File auto generated from csv", "");
        });
        resultWishlist.data = resultWishlist.data.concat(wishlist.data);
    }

    saveWishlist(filename, resultWishlist);
}

run();