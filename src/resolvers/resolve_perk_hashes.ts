import { DestinyItemSocketEntryDefinition, DestinyItemSocketEntryPlugItemDefinition, DestinyInventoryItemDefinition } from "bungie-api-ts/destiny2/interfaces";
import _ from "lodash";
import { getItemDefinition, getItemDefinitions, getPlugSetDefinitions } from "../data/manifest";
import { askForPlugHash } from "../prompts/ask_for_perk_hash";


async function resolvePerksOptions(weaponHash: number, perkNames: string): Promise<DestinyInventoryItemDefinition[]> {
    let weaponDef = await getItemDefinition(`${weaponHash}`);
    let socketCounts = [];
    let perkCategory = weaponDef.sockets.socketCategories.find((c) => c.socketCategoryHash == 4241085061);
    for (let s of perkCategory!.socketIndexes!) {
        let available = await getAvailablePerks(weaponDef.sockets!.socketEntries[s]);
        let count = getSocketCount(available, perkNames);
        socketCounts.push({ index: s, count: count });
    }
    socketCounts.sort((a, b) => b.count - a.count);
    let availablePerks = await getAvailablePerks(weaponDef.sockets!.socketEntries[socketCounts[0].index]);
    return availablePerks;
}

function getSocketCount(available: DestinyInventoryItemDefinition[], perkNames: string): number {
    return available.filter((def) => {
        let name = def.displayProperties.name.toLowerCase().trim();
        return perkNames.toLowerCase().indexOf(name) > -1;
    }).length;
}


async function getAvailablePerks(entry: DestinyItemSocketEntryDefinition): Promise<DestinyInventoryItemDefinition[]> {
    /// IGNORE cosmetics
    let reusable: DestinyItemSocketEntryPlugItemDefinition[] = _.get(entry, `reusablePlugItems`, []);
    let itemDefs = await getItemDefinitions();
    let plugSetDefs = await getPlugSetDefinitions();
    let availablePlugHashes: number[] = [];
    availablePlugHashes = availablePlugHashes.concat(reusable.map((e) => e.plugItemHash));

    if (entry.singleInitialItemHash) {
        availablePlugHashes.push(entry.singleInitialItemHash);
    }
    if (entry.randomizedPlugSetHash) {
        let plugSetDef = plugSetDefs[`${entry.randomizedPlugSetHash}`];
        availablePlugHashes = availablePlugHashes.concat(plugSetDef.reusablePlugItems.map((p) => p.plugItemHash));
    }
    if (entry.reusablePlugSetHash) {
        let plugSetDef = plugSetDefs[`${entry.reusablePlugSetHash}`];
        availablePlugHashes = availablePlugHashes.concat(plugSetDef.reusablePlugItems.map((p) => p.plugItemHash));
    }
    availablePlugHashes = _.uniq(availablePlugHashes);
    let availablePlugs = availablePlugHashes.map((h) => itemDefs[h]);
    return availablePlugs;
}

async function resolveSinglePerk(weaponHash: number, perkName: string, options: DestinyInventoryItemDefinition[]): Promise<number[]> {
    let validPlugHashes = [];
    for (let option of options) {
        if (option.displayProperties.name.toLowerCase().trim() == perkName.toLowerCase().trim()) {
            return [option.hash];
        }
        if (option.displayProperties.name.toLowerCase().indexOf(perkName.toLowerCase().trim()) > -1) {
            validPlugHashes.push(option.hash);
        }
    }
    if (validPlugHashes.length == 1) {
        return validPlugHashes;
    } else if (validPlugHashes.length > 0) {
        let weaponDef = await getItemDefinition(`${weaponHash}`);
        return askForPlugHash(weaponDef.displayProperties.name, perkName, validPlugHashes);
    }

    let exactPlugHashes = [];
    const itemDefs = await getItemDefinitions();
    for (let i in itemDefs) {
        let def = itemDefs[i];
        let name = def.displayProperties.name;
        if (name.toLowerCase().trim() == perkName.toLowerCase().trim()) exactPlugHashes.push(def.hash);
        if (name.toLowerCase().trim().indexOf(perkName.toLowerCase().trim()) > -1) validPlugHashes.push(def.hash);
    }
    if (exactPlugHashes.length == 1) {
        return exactPlugHashes;
    }
    if (validPlugHashes.length == 1) {
        return validPlugHashes;
    }

    const weaponDef = await getItemDefinition(`${weaponHash}`);

    let response = await askForPlugHash(weaponDef.displayProperties.name, perkName, options.map((o) => o.hash));

    if (response.length > 0) {
        return response;
    }


    return askForPlugHash(weaponDef.displayProperties.name, perkName, validPlugHashes);
}

export async function resolvePerkHashes(weaponHash: number, perksString: string): Promise<number[]> {
    perksString = perksString.replace(/’/g, '\'');
    const options = await resolvePerksOptions(weaponHash, perksString);
    const perksNames = perksString.split(',').filter((p) => p.trim().length > 0);
    let hashes: number[] = [];
    for (let name of perksNames) {
        let perkHashes = await resolveSinglePerk(weaponHash, name, options);
        hashes = hashes.concat(perkHashes);
    }
    hashes = _.uniq(hashes);
    return hashes;
}