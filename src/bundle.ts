import fs from 'fs-extra';

interface JsonWishlistItem {
    hash: number;
    plugs: number[][];
    name?: string;
    description: string;
    originalWishlist?:string;
    tags: string[];
}

interface JsonWishlist {
    $schema: String;
    data: JsonWishlistItem[]
}

var filename = process.argv[2] || "pandapaxxy";

async function saveWishlist(filename: string, wishlist:JsonWishlist): Promise<void> {
    try {
        await fs.mkdir("./output");
    } catch (e) { }
    await fs.writeFile(`./output/${filename}-bundle.json`, JSON.stringify(wishlist));
}

async function loadWishlist(filename:string): Promise<JsonWishlist> {
    var buffer = await fs.readFile(`./output/${filename}.json`);
    var str = buffer.toString();
    var parsed = JSON.parse(str);
    return parsed;
}

async function loadBundle(filename:string): Promise<string[]> {
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
    for(var i in bundle){
        let wishlist = await loadWishlist(bundle[i]);
        wishlist.data.forEach(element => {
            element.plugs = element.plugs.map((p)=>{
                return p.map((p2:any)=>{
                    return parseInt(p2);
                });
            });
            if(element.tags.length == 0) console.log(element.name + " has no tags");
            element.originalWishlist = element.originalWishlist || bundle[i];
            element.description = element.description.replace("File auto generated from csv", "");
        });
        resultWishlist.data = resultWishlist.data.concat(wishlist.data);
    }
    
    saveWishlist(filename, resultWishlist);
}

run();