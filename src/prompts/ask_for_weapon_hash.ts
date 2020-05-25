import { DestinyInventoryItemDefinition } from "bungie-api-ts/destiny2/interfaces";
import { getMemory, MemoryType, addToMemory } from "../data/memory";
import { askForMultiple, OTHER } from "./ask_for_multiple";
import { askOpenly } from "./ask_openly";
import _ from "lodash";

export async function askForWeaponHash(weaponName: string, items: DestinyInventoryItemDefinition[]) {
    weaponName = weaponName.trim();
    let memory = await getMemory(MemoryType.Weapon, weaponName);
    if (memory && memory.length > 0) {
        let _counts = _(memory)
            .countBy((o) => o)
            .map((v, k) => {
                return ({ value: parseInt(k), label: `${k} (${v})` });
            }).value();
        _counts.push({value:OTHER, label:"Other"});
        let result = await askForMultiple(_counts, `Use previously saved values for ${weaponName} ?`);
        if (result.indexOf(OTHER) < 0) {
            await addToMemory(MemoryType.Weapon, weaponName, result);
            return result;
        }
    }
    if (items.length > 0) {
        let options = items.map((i) => {
            let hasRandomRolls = i.sockets && _(i.sockets.socketEntries).some((s) => !!s.randomizedPlugSetHash);
            let label = `${i.itemTypeDisplayName} (${i.hash}) ${hasRandomRolls ? " - has random rolls" : ""}`;
            return {
                value: i.hash,
                label: label
            }
        });
        options.push({value:OTHER, label:"Other"});
        let result = await askForMultiple(options, `What's the weapon hash for ${weaponName} ?`);
        if (result.indexOf(OTHER) < 0) {
            await addToMemory(MemoryType.Weapon, weaponName, result);
            return result;
        }
    }
    let result = await askOpenly(`What's the weapon hash for ${weaponName} ?`);
    if (result.length > 0) {
        await addToMemory(MemoryType.Weapon, weaponName, result);
    }
    return result;
}