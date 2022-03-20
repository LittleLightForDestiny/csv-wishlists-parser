import { DestinyItemSocketEntryPlugItemDefinition } from "bungie-api-ts/destiny2/interfaces";
import _ from "lodash";
import { getItemDefinitions, getPlugSetDefinitions } from "../data/manifest";
import { askForPlugHash } from "../prompts/ask_for_perk_hash";

export async function decidePerkHash(weaponHash: number, perkName: string): Promise<number[]> {
    perkName = perkName.replace('’', '\'');
    let itemDefs = await getItemDefinitions();
    let plugSetDefs = await getPlugSetDefinitions();
    let weaponDef = itemDefs[weaponHash];
    let availablePerkHashes: number[] = [];
    for (let s in weaponDef.sockets!.socketEntries) {
        let entry = weaponDef.sockets!.socketEntries[s];
        let reusable: DestinyItemSocketEntryPlugItemDefinition[] = _.get(entry, `reusablePlugItems`, []);
        availablePerkHashes = availablePerkHashes.concat(reusable.map((e) => e.plugItemHash));
        if (entry.singleInitialItemHash) {
            availablePerkHashes.push(entry.singleInitialItemHash);
        }
        if (entry.randomizedPlugSetHash) {
            let plugSetDef = plugSetDefs[`${entry.randomizedPlugSetHash}`];
            availablePerkHashes = availablePerkHashes.concat(plugSetDef.reusablePlugItems.map((p) => p.plugItemHash));
        }
    }
    availablePerkHashes = _.uniq(availablePerkHashes);
    let validPlugHashes = availablePerkHashes.filter((h) => {
        let name = itemDefs[h].displayProperties.name;
        return name.toLowerCase().trim() == perkName.toLowerCase().trim();
    });
    if (validPlugHashes.length == 1) return [validPlugHashes[0]];
    if (validPlugHashes.length > 1) {
        return askForPlugHash(weaponDef.displayProperties.name, perkName, validPlugHashes);
    }
    validPlugHashes = [];
    for (let i in itemDefs) {
        let def = itemDefs[i];
        let name = def.displayProperties.name;
        if (name.toLowerCase().trim() == perkName.toLowerCase().trim()) validPlugHashes.push(def.hash);
    }
    if (validPlugHashes.length == 1) {
        if (validPlugHashes.length == 1) return [validPlugHashes[0]];
    }
    return askForPlugHash(weaponDef.displayProperties.name, perkName, validPlugHashes);
}