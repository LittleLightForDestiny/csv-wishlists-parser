## PandaPaxxy's wishlist parser
This is a node js parser for pandapaxxy's wishlists

## How to use
1. Clone the git repo
2. run `npm ci`
3. Get Google Drive API credentials (https://developers.google.com/drive/api/quickstart/nodejs) and save them on `google.credentials.json` on the application root dir
4. run `npm start`
5. Select the sheets that should be included in the wishlists (usually all weapon types, except exotic)
6. Select which row should be considered as the "header" of the sheet (usually something that goes as `Name | Element | etc...`)
7. Select which column should be considered the weapon name (usually `Name`)
8. Select all columns that should be considered as perks (`Sights/Barrels`, `Magazine`, `Perk 1`, `Perk 2`, may vary depending on the weapon type)
9. Sometimes the application will need manual intervention to correct typos or ambiguous perks, it's possible to assign more than one perk to a perk name in those cases
10. Repeat steps 6 through 9 to every sheet you selected in step 5
11. Once the scripts finishes running, the resulting files will be available on `output/pandapaxxy/{input type}/season-{season number}.json`