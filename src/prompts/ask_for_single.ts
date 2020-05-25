import prompts from "prompts";
import _ from "lodash";

export async function askForSingle(options: { value: number, label: string }[], message: string): Promise<number> {
    let _options = _.map(options, (v) => ({
        title: v.label,
        value: v.value,
    }));
    let result = await prompts({
        type: "select",
        name: "result",
        choices: _options,
        message: message,
    });
    
    if (result.result === undefined) {
        process.exit(0);
    }
    return result.result;
}