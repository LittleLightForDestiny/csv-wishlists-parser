import prompts from "prompts";
import _ from "lodash";
export const OTHER = -999999;

export async function askForMultiple(options: { value: number, label: string }[], message: string): Promise<number[]> {
    let _options = _.map(options, (v) => ({
        title: v.label,
        value: v.value,
    }));
    let result = await prompts({
        type: "multiselect",
        name: "hashes",
        choices: _options,
        message: message,
    });
    if (!result.hashes) {
        process.exit(0);
    }
    return result.hashes;
}