import fs from 'fs-extra';

interface ItemMemory {
    weaponHashes: { [name: string]: number[] };
    perkHashes: { [name: string]: number[] };
}

export enum MemoryType {
    Weapon,
    Perk
}

let memory: ItemMemory;

async function loadMemory(): Promise<ItemMemory> {
    try {
        var buffer = await fs.readFile(`./data/memory.json`);
        var data = JSON.parse(buffer.toString());
        return data;
    } catch (e) {
        console.log(e);
    }
    return {
        weaponHashes: {},
        perkHashes: {},
    };
}

export async function addToMemory(type: MemoryType, key: string, items: number[]) {
    if (!memory) {
        memory = await loadMemory();
    }
    var group: number[];
    let object = type == MemoryType.Weapon ? memory.weaponHashes : memory.perkHashes;
    if (object[key]) {
        group = object[key];
    } else {
        group = object[key] = [];
    }
    for (var i in items) {
        group.push(items[i]);
    }
    await saveMemory();
}

export async function getMemory(type: MemoryType, key: string) {
    if (!memory) {
        memory = await loadMemory();
    }
    if (type == MemoryType.Weapon) {
        return memory.weaponHashes[key];
    }
    return memory.perkHashes[key];
}

async function saveMemory(): Promise<void> {
    if (!memory) {
        memory = await loadMemory();
    }
    try {
        await fs.mkdir("./data");
    } catch (e) { }
    await fs.writeFile(`./data/memory.json`, JSON.stringify(memory));
}
