const fs = require('fs');
const path = require('path');

const source = path.resolve(__dirname, '../../firebase-configs/google-services.json');
const dest = path.resolve(__dirname, '../android/app/google-services.json');

if (fs.existsSync(source)) {
    fs.copyFileSync(source, dest);
    console.log(`Successfully copied google-services.json to ${dest}`);
} else {
    console.log(`No google-services.json found at ${source}. Skipping copy.`);
}
