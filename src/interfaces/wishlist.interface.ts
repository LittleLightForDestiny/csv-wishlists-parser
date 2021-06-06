export enum WishlistTag{
    GodPvE="GodPvE",
    GodPvP="GodPvP",
    PvE="PvE",
    PvP="PvP",
    Trash="Trash",
    Curated="Curated",
    Mouse="Mouse",
    Controller="Controller",
    None="None"
}

export interface JsonWishlistItem {
    hash: number;
    plugs: number[][];
    name?: string;
    description: string;
    originalWishlist?: string;
    tags: string[];
}

export interface JsonWishlist {
    $schema: String;
    data: JsonWishlistItem[]
}