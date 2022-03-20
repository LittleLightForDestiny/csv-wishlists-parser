import fs from 'fs-extra';
import { google, sheets_v4 } from 'googleapis';
import prompts from 'prompts';

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets.readonly'];
const TOKEN_PATH = 'token.json';

let sheetsClient:sheets_v4.Sheets;

async function getCredentials(): Promise<any> {
    try {
        let token = await fs.readFile("google.credentials.json", 'utf-8');
        return JSON.parse(token);
    } catch (e) {
        throw "Couldn't read credentials";
    };
}

async function readStoredToken(): Promise<any> {
    try {
        let token = await fs.readFile("token.json", 'utf-8');
        return JSON.parse(token);
    } catch (e) {
        return null;
    };
}

export async function getSheetsClient(): Promise<sheets_v4.Sheets> {
    if (sheetsClient != null) return sheetsClient;
    const credentials = await getCredentials();
    const { client_secret, client_id, redirect_uris } = credentials.installed;
    const auth = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);
    let token = await readStoredToken();
    if (token != null) {
        auth.setCredentials(token.tokens);
        sheetsClient = google.sheets({version:'v4', auth});
        return sheetsClient;
    }
    const authUrl = auth.generateAuthUrl({
        access_type: 'offline',
        scope: SCOPES,
    });
    console.log('Authorize this app by visiting this url:', authUrl);
    const result = await prompts({
        type: "text",
        name: "code",
        message: 'Enter the code from that page here: ',
    });
    const code = result["code"];
    try {
        let token = await auth.getToken(code);
        auth.setCredentials(token.tokens);
        await fs.writeFile(TOKEN_PATH, JSON.stringify(token));
        sheetsClient = google.sheets({version:'v4', auth});
        return sheetsClient;
    } catch (e) {
        throw "Error retrieving access token";
    };
}