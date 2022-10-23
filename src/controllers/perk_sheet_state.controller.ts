import { sheets_v4 } from "googleapis";
import prompts from "prompts";
import { getItemDefinition } from "../data/manifest";
import { WishlistTag } from "../interfaces/wishlist.interface";
import { resolvePerkHashes } from "../resolvers/resolve_perk_hashes";
import { resolveWeaponHash } from "../resolvers/resolve_weapon_hash";
export class PerkSheetStateController {
    private headerIndex?: number;
    private nameColIndex?: number;
    private perkColIndexes?: number[];
    private weaponRowIndexes?: number[];

    constructor(private sheet: sheets_v4.Schema$Sheet,
        private onCreateBuild: (weaponHash: number, weaponPerks: number[][], tags: WishlistTag[]) => void
    ) { };

    public get rows() {
        return this.sheet.data![0].rowData!;
    }

    async findHeaderIndex() {
        let res = await prompts({
            message: "Select sheet header",
            name: "headerIndex",
            type: "select",
            choices: this.rows?.map((r, i) => ({
                title: r.values?.map((c) => c.formattedValue).join(' | ') || "",
                value: i
            }))
        });
        this.headerIndex = res.headerIndex;
    }

    async findHeaders() {
        if (this.headerIndex == null) throw "Header index not defined";
        let headerCols = this.rows[this.headerIndex].values;
        let res = await prompts([{
            message: "Select name header",
            name: "nameColumnIndex",
            type: "select",
            choices: headerCols?.map((c, i) => ({
                title: c.formattedValue || "",
                value: i
            }))
        }, {
            message: "Select perks headers",
            name: "perkColumnsIndexes",
            type: "multiselect",
            choices: headerCols?.map((c, i) => ({
                title: c.formattedValue || "",
                value: i
            }))
        }]);
        this.nameColIndex = res.nameColumnIndex;
        this.perkColIndexes = res.perkColumnsIndexes;
    }

    async findWeaponIndexes() {
        if (this.headerIndex == null) throw "Header index not defined";
        if (this.nameColIndex == null) throw "Name column index not defined";
        if (this.perkColIndexes == null || this.perkColIndexes.length == 0) throw "Perk columns not defined";
        this.weaponRowIndexes = [];
        for (let index = this.headerIndex + 1; index < this.rows.length; index++) {
            let columns = this.rows[index].values;
            if (columns == null) continue;
            let name = columns[this.nameColIndex].formattedValue || "";
            let perks = this.perkColIndexes.map((i) => columns?.[i]?.formattedValue || "");
            if (name.length == 0 || perks.some((p) => p.length == 0)) continue;
            this.weaponRowIndexes.push(index);
        }
    }

    async processWeapons() {
        if (this.headerIndex == null) throw "Header index not defined";
        if (this.nameColIndex == null) throw "Name column index not defined";
        if (this.perkColIndexes == null || this.perkColIndexes.length == 0) throw "Perk columns not defined";
        if (this.weaponRowIndexes == null || this.weaponRowIndexes.length == 0) throw "Weapon rows not defined";
        for (let index of this.weaponRowIndexes) {
            await this.processWeapon(index);
        }
    }

    async processWeapon(rowIndex: number) {
        let weaponDefCell = this.rows[rowIndex].values![this.nameColIndex!];
        let weaponHashes = await this.getWeaponHash(weaponDefCell);
        for (let weaponHash of weaponHashes) {
            for (let buildIndex = 0; buildIndex < 3; buildIndex++) {
                try {
                    console.log(`processing line ${rowIndex + buildIndex}`);
                    let activityTag = buildIndex == 0 ? WishlistTag.PvE : WishlistTag.PvP;
                    let inputTags = {
                        0: [WishlistTag.Controller, WishlistTag.Mouse],
                        1: [WishlistTag.Controller],
                        2: [WishlistTag.Mouse],
                    }[buildIndex];
                    await this.processWeaponBuilds(parseInt(`${weaponHash}`), this.rows[rowIndex + buildIndex].values!, inputTags!, activityTag);
                } catch (e) {
                    console.error(`error processing line ${buildIndex} for ${weaponHash}`);
                    console.log(this.rows[rowIndex + buildIndex]);
                }
            }
        }
    }

    async processWeaponBuilds(weaponHash: number, weaponRow: sheets_v4.Schema$CellData[], inputTag:WishlistTag[], activityTag:WishlistTag) {
        let rollSlots:number[][] = [];
        let godRollSlots:number[][] = [];
        for (let i of this.perkColIndexes!) {
            const perkNames = weaponRow[i].formattedValue;
            const perks = await resolvePerkHashes(weaponHash, perkNames!);
            const godPerkNames = this.getGodPerksString(weaponRow[i]);
            const godPerks = await resolvePerkHashes(weaponHash, godPerkNames!);
            console.log(perkNames, godPerkNames);
            rollSlots.push(perks);
            godRollSlots.push(godPerks);
        }
        this.onCreateBuild(weaponHash, rollSlots, [activityTag].concat(inputTag));
        const godActivityTag = activityTag == WishlistTag.PvE ? WishlistTag.GodPvE : WishlistTag.GodPvP;
        this.onCreateBuild(weaponHash, godRollSlots, [godActivityTag].concat(inputTag));
    }

    getGodPerksString(cell:sheets_v4.Schema$CellData){
        const perkNames = cell.formattedValue;
        const formatRuns = cell.textFormatRuns;
        if(!formatRuns){
            if(cell.userEnteredFormat?.textFormat?.bold){
                return perkNames;
            }
            return "";
        }    
        let end = 0;
        for(let run of formatRuns){
            if(run.format?.bold) continue;
            end = Math.max(end, run.startIndex || 0);
        }
        return perkNames?.substring(0, end) || "";
    }

    async getWeaponHash(cell: sheets_v4.Schema$CellData): Promise<number[]> {
        if (cell.hyperlink != null) {
            let splitUrl = cell.hyperlink.split('/').filter((s) => {
                const value = parseInt(s);
                return !isNaN(value) && value > 0;
            });
            for (let hash of splitUrl) {
                let def = await getItemDefinition(hash);
                if (def != null) return [parseInt(hash)];
            }
        }
        return resolveWeaponHash(cell.formattedValue!);
    }
}