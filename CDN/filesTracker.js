/* 
    File Tracker -- Made By Deudly (edit by Litarvan)
    1 - Get the list with the detected files
    2 - Search files. If they're in the list or not:
    3A - Check MD5, if changed, writeData(version + 1) new MD5 and version.
    3B - It's a new file. writeData() the md5 and the version.
    4 - Note that files without MD5 have to be updated manually by changing the version number
*/

const FILES_FOLDER = 'files/';
const FILES_LIST = './public/files.json';

const fs = require('fs');
const md5File = require('md5-file');
const find = require('find');
const path = require('path');

console.log('Listing files...');

const json = require(FILES_LIST);
const paths = [];

json.forEach(f => paths.push(f.path));

for (let file of find.fileSync(FILES_FOLDER)) {
    file = path.join(file).replace(/\\/g, '/').replace(FILES_FOLDER, '');

    const hash = md5File.sync(FILES_FOLDER + file);
    let original = null;

    for (let i = 0; i < json.length; i++) {
        if (json[i].path === file) {
            original = i;
        }
    }

    if (original == null) {
        original = json.length;
        json.push({
            path: file,
            md5: '',
            version: 0,
            size: fs.statSync(FILES_FOLDER + file).size
        });

        console.log(file + ' --> NEW');
    }

    if (hash !== json[original].md5) {
        json[original].md5 = hash;
        json[original].version = json[original].version + 1;

        console.log(file + ' --> UPDATED');
    } else if (!json[original].size) {
        json[original].size = fs.statSync(FILES_FOLDER + file).size;
        console.log(file + ' --> ADDED SIZE')
    }  else {
        console.log(file + ' --> OK');
    }
}

fs.writeFileSync(FILES_LIST, JSON.stringify(json, '', 4));