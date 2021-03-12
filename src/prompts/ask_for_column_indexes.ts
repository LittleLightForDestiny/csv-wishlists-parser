import { askForSingle } from "./ask_for_single";
import { askForMultiple } from "./ask_for_multiple";

export async function askForHeaderLine(csv: string[][]){
    let headerLine = -1;
    let initialIndex = 0;
    while (headerLine < 0) {
        initialIndex = Math.max(0, Math.min(initialIndex, csv.length -10));
        let options = csv.slice(initialIndex, initialIndex + 10).map((value, index) => ({ value: index, label: value.join(" ") }));
        if(initialIndex > 0){
            options.unshift({
                value: -1,
                label: "previous 10"
            });
        }
        if(initialIndex +10 < csv.length){
            options.push({
                value: -2,
                label: "next 10"
            });
        }

        headerLine = await askForSingle(options, `What's the header line`);
        
        if (headerLine === -1) {
            initialIndex -= 10;
        } else if (headerLine === -2) {
            initialIndex += 10;
        }
    }
    return headerLine;
}

export async function askForNameColumn(headerLine:string[]):Promise<number>{
    let headerOptions = headerLine.map((value, index) => ({ value: index, label: value }));
    return await askForSingle(headerOptions, "What's the weapon name header ? ");
}

export async function askForTagsColumn(headerLine:string[]):Promise<number>{
    let headerOptions = headerLine.map((value, index) => ({ value: index, label: value }));
    return await askForSingle(headerOptions, "What's the tags header ? ");
}

export async function askForPerkColumn(headerLine:string[]):Promise<number[]>{
    let headerOptions = headerLine.map((value, index) => ({ value: index, label: value }));
    return await askForMultiple(headerOptions, "What's the weapon perks headers ? ");
}