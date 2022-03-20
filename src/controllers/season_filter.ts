import axios from "axios";
import { DestinyCollectibleDefinition, DestinyInventoryItemDefinition } from "bungie-api-ts/destiny2";
import { getCollectibleDefinition, getItemDefinition } from "../data/manifest";

let sourceToSeason: { [id: string]: string };
let seasonsBackup: { [id: string]: string };
let watermarkToSeason: { [id: string]: string };

async function loadD2AI() {
    if (sourceToSeason) return;
    sourceToSeason = (await axios.get("https://raw.githubusercontent.com/DestinyItemManager/d2ai-module/master/seasons.json")).data;
    seasonsBackup = (await axios.get("https://raw.githubusercontent.com/DestinyItemManager/d2ai-module/master/seasons_backup.json")).data;
    watermarkToSeason = (await axios.get("https://raw.githubusercontent.com/DestinyItemManager/d2ai-module/master/watermark-to-season.json")).data;
}

export async function getSeasonByItemHash(itemHash: number) {
    await loadD2AI();
    const item = await getItemDefinition(`${itemHash}`);
    const collectible = await getCollectibleDefinition(`${item?.collectibleHash}`);
    return getSeason(collectible, item);

}

function getSeason(collectible: DestinyCollectibleDefinition, item?: DestinyInventoryItemDefinition): number | undefined {
    if (item?.iconWatermark && watermarkToSeason[item?.iconWatermark]) {
        return parseInt(watermarkToSeason[item?.iconWatermark]);
    }
    if (item?.iconWatermarkShelved && watermarkToSeason[item?.iconWatermarkShelved]) {
        return parseInt(watermarkToSeason[item?.iconWatermarkShelved]);
    }
    if (sourceToSeason[collectible.sourceHash!]) {
        return parseInt(sourceToSeason[collectible.sourceHash!]);
    }
    if (sourceToSeason[collectible.itemHash]) {
        return parseInt(sourceToSeason[collectible.itemHash]);
    }
    if (seasonsBackup[collectible.sourceHash!]) {
        return parseInt(seasonsBackup[collectible.sourceHash!]);
    }
    if (seasonsBackup[collectible.itemHash]) {
        return parseInt(seasonsBackup[collectible.itemHash]);
    }
    return 1;
}
