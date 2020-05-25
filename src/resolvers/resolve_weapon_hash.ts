import { DestinyInventoryItemDefinition } from "bungie-api-ts/destiny2/interfaces";
import { askForWeaponHash } from "../prompts/ask_for_weapon_hash";
import { getItemDefinitions } from "../data/manifest";

export async function resolveWeaponHash(weaponName: string): Promise<number[]> {
    let items: DestinyInventoryItemDefinition[] = [];
    let defs = await getItemDefinitions();
    for (let i in defs) {
        let def = defs[i];
        if (def.displayProperties.name.toLowerCase() != weaponName.toLowerCase()) {
            continue;
        }
        items.push(defs[i]);
    }
    if (items.length == 1) {
        return [items[0].hash];
    }
    if (items.length > 1) {
        return askForWeaponHash(weaponName, items);
    }
    items = items.filter((def) => {
        if (!def.sockets) return false;
        for (let s in def.sockets.socketEntries) {
            let socket = def.sockets.socketEntries[s];
            if (socket.randomizedPlugSetHash) return true;
        }
        return false;
    });
    return askForWeaponHash(weaponName, items);
}
