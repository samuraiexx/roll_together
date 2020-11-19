const updateJsonFile = require('update-json-file')
const util = require('util');
const exec = util.promisify(require('child_process').exec);
const _ = require('lodash');

(async () => {
  return;
  try {
    const isMajor = process.argv.includes('major');
    const isMinor = process.argv.includes('minor');

    if (isMajor && isMinor) {
      throw "Can't be both a major and a minor increment";
    }

    const { stdout, stderr, error } = await exec('git pull && git status');

    if (error) {
      throw stderr;
    }

    if (!stdout.includes("Your branch is up to date with 'origin/master'.")) {
      throw "Your branch is up not to date with 'origin/master'.";
    }

    await updateJsonFile(manifest, data => {
      let [major, minor, patch] = data.version.split('.').map(el => parseInt(el ? el : 0));
      if (isMajor) major++;
      else if (isMinor) minor++;
      else patch++;

      data.version = `${major}.${minor}.${patch}`;
      return data
    })

    await exec('git add * && git commit -m "Increment version" && git push');

    console.log("The Manifest Version was succesfully Updated!");
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();