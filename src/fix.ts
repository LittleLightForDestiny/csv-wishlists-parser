import fs from 'fs-extra';

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
    await fs.writeFile(`./output/${filename}-fixed.json`, JSON.stringify(wishlist));
}

async function loadWishlist(): Promise<JsonWishlist> {
    var buffer = await fs.readFile(`./output/${filename}.json`);
    var str = buffer.toString();
    var parsed = JSON.parse(str);
    return parsed || wishlist;
}



async function run(): Promise<void> {
    wishlist = await loadWishlist();
    wishlist.data.forEach(element => {
        element.plugs = element.plugs.map((p)=>{
            return p.map((p2:any)=>{
                return parseInt(p2);
            });
        });
    });
    saveWishlist(filename);
}

run();