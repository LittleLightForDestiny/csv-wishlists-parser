import fs from 'fs-extra';
import { getDestinyManifest } from 'bungie-api-ts/destiny2/api';
import Axios from 'axios';
import { DestinyInventoryItemDefinition, DestinyPlugSetDefinition } from 'bungie-api-ts/destiny2/interfaces';

const bungieRoot = "https://www.bungie.net";

async function client(data: any) {
    var result = await Axios(data);
    return result.data;
}

let _manifest:{[part:string]:any} = {};

export async function getManifest(part: string): Promise<any> {
    if(_manifest[part]) return _manifest[part];
    try {
        var buffer = await fs.readFile(`./manifest/${part}.json`);
        var data = JSON.parse(buffer.toString());
        _manifest[part] = data;
        return data;
    } catch (e) {
        console.log(e);
    }
    var manifest = await getDestinyManifest(client);
    var path = manifest.Response.jsonWorldContentPaths['en'];
    var url = `${bungieRoot}${path}`;
    var definitions = await Axios.get(url);
    try {
        await fs.mkdir("./manifest");
    } catch (e) { }
    var defs = definitions.data;
    for (var i in defs) {
        await fs.writeFile(`./manifest/${i}.json`, JSON.stringify(defs[i]));
    }
    _manifest[part] = definitions.data[part];
    return definitions.data[part];
}

export async function getItemDefinitions():Promise<{[hash:string]:DestinyInventoryItemDefinition}>{
    return await getManifest("DestinyInventoryItemDefinition");
}

export async function getPlugSetDefinitions():Promise<{[hash:string]:DestinyPlugSetDefinition}>{
    return await getManifest("DestinyPlugSetDefinition");
}