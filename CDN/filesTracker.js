/* 
    File Tracker -- Made By Deudly
    1 - Get the list with the detected files
    2 - Search files. If they're in the list or not:
    3A - Check MD5, if changed, writeData(version + 1) new MD5 and version.
    3B - It's a new file. writeData() the md5 and the version.
    4 - Note that files without MD5 have to be updated manually by changing the version number

*/
var jsonfile = require('jsonfile');
const md5File = require('md5-file')
var find = require('find');
const path = require('path');
const filesList = './public/files.json';
var i = 0;
console.log("FilesTracker started")

function searchFiles(filesPathToExclude, allData) {
    find.file('./files/', function (files) {
        console.log("Looking for all the files...")
        for (file in files) {
            var file2 = path.join(files[file]);
            var file3 = file2.replace(/\\/g, "\\")
            var file4 = file3.replace('files\\', '')
            console.log(file4)
            if (filesPathToExclude.indexOf(file4) > -1) {
                // It's in the list
                /* Async usage */
                var hash = md5File.sync(file3);
                if (allData[file4].md5 != hash) {
                    writeData(file4, hash, allData[file4].version + 1, allData)
                }
                /*md5File(file3, (err, hash) => {
                    if (err) throw err
                    console.log(`Updated MD5: ${hash}`)
                    if (allData[file4].md5 != hash) {
                        writeData(file3, hash, allData[file4].version++, allData)
                    }
                })*/
            } else {
                console.log("generating new")
                var file3 = file2.replace('files\\', '')
                var hash = md5File.sync(file2);
                writeData(file3, hash, 1, allData)
                /*md5File(file2, (err, hash) => {
                    if (err) throw err
                    console.log(`The MD5 of new file: ${hash}`)
                    var file3 = file2.replace('files\\', '')
                    writeData(file3, hash, 1, allData)
                })*/
            }
        }

    })
}
function getAllDetectedFiles() {
    jsonfile.readFile(filesList, function (err, obj) {
        var filesPaths = Object.keys(obj);
        searchFiles(filesPaths, obj);
    })
}

getAllDetectedFiles();

function writeData(file, hash, version, obj) {
    obj[i] = new Object();
    obj[i].path = file;
    obj[i].md5 = hash;
    obj[i].version = version;
    jsonfile.writeFileSync(filesList, obj)
    i++;
    /*jsonfile.writeFile(filesList, obj, function (err) {
        console.error(err)
    })*/
}