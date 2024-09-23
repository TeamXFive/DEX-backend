const fs = require('fs');

function loadDataBase(filePath) {
    try {
      const data = fs.readFileSync(filePath, 'utf8');
      return data;
    } catch (err) {
      console.error(`Error reading file from disk: ${err}`);
      return null;
    }
}

module.exports = { loadDataBase };