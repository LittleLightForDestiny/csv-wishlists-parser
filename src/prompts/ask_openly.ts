import { logError } from "../data/error_log";
import prompts from "prompts";

export async function askOpenly(message: string): Promise<number[]> {
    await logError(message);
    let result = await prompts({
        type: "text",
        name: "hashes",
        message: message,
    });
    if (result.hashes == null) {
        process.exit(0);
    }
    if (result.hashes.length == 0) {
        return [];
    }
    var hashes = result.hashes.split(",").map((h: any) => parseInt(h));
    return hashes;
}