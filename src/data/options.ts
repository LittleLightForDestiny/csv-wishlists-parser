export interface WishlistParserOptions{
    filename?:string;
    nameColumn?:number;
    perkColumns?:number[];
    tagsColumn?:number;
}

let _options:WishlistParserOptions = {};

export function setOptions(options:WishlistParserOptions){
    _options = {..._options, ...options};
}

export function getOptions():WishlistParserOptions{
    return _options;
}

export function getFilename(){
    return _options.filename;
}