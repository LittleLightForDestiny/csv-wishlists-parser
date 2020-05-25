import fs from 'fs-extra';
import _ from 'lodash';
import { getFilename } from './options';

let errors: string[];



async function loadErrors(): Promise<string[]> {
    try {
        var buffer = await fs.readFile(`./output/${getFilename()}-errors.txt`);
        var data = buffer.toString().split('\n');
        return data;
    } catch (e) {
        console.log(e);
    }
    return [];
}

export async function logError(message: string) {
    if(!errors){
        errors = await loadErrors();
    }
    errors.push(message);
    errors = _.uniq(errors);
    try {
        await fs.mkdir("./output");
    } catch (e) { }
    await fs.writeFile(`./output/${getFilename()}-errors.txt`, errors.join('\n'));
}