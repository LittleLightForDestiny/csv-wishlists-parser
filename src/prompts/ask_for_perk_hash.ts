import { getItemDefinitions } from "../data/manifest";
import { addToMemory, getMemory, MemoryType } from "../data/memory";
import { askForMultiple, OTHER } from "./ask_for_multiple";
import { askOpenly } from "./ask_openly";
import _ from "lodash";


export async function askForPlugHash(weaponName: string, perkName: string, plugHashes: number[]): Promise<number[]> {
    let defs = await getItemDefinitions();
    perkName = perkName.trim();
    let memory = await getMemory(MemoryType.Perk, perkName);
    if (memory && memory.length > 0) {
        let _counts = _(memory)
            .countBy((o) => o)
            .map((v, k) => {
                return ({ count: v, hash: parseInt(k), name:'' });
            }).value();
        for(let count of _counts){
            count.name = defs[`${count.hash}`].displayProperties.name;
        }
        let values = _counts.map((c)=>({value:c.hash, label: `${c.name} - ${c.hash} (${c.count})`}));
        values.push({value:OTHER, label:"Other",});
        let result = await askForMultiple(values, `Use previously saved values for ${perkName} on ${weaponName} ?`)
        if (result.indexOf(OTHER) < 0) {
            addToMemory(MemoryType.Perk, perkName, result);
            return result;
        }
    }
    if (plugHashes.length > 0) {
        let options = plugHashes.map((p) => {
            let def = defs[p];
            let label = `${def.displayProperties.name} - ${def.itemTypeDisplayName} (${def.hash})`;
            return { label: label, value: p };
        });
        options.push({ label: "Other", value: OTHER });
        let result = await askForMultiple(options, `What's the plug hash for ${perkName} on ${weaponName} ?`);
        if (result.indexOf(OTHER) < 0) {
            addToMemory(MemoryType.Perk, perkName, result);
            return result;
        }
    }
    let result = await askOpenly(`What's the plug hash for ${perkName} on ${weaponName} ?`);
    if (result.length > 0) {
        addToMemory(MemoryType.Perk, perkName, result);
    }
    return result;
}