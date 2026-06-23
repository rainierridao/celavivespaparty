const path = require('path');
const {
  loadEnvFile,
  migrateGoogleSheetsToFirebase
} = require('../lib/platform');

loadEnvFile(path.join(process.cwd(), '.env'));

migrateGoogleSheetsToFirebase()
  .then((migrated) => {
    if (!migrated.length) {
      console.log('No Google Sheet tabs with rows were found to migrate.');
      return;
    }

    console.log('Migrated Google Sheet tabs to Firebase:');
    for (const item of migrated) {
      console.log(`- ${item.sheetName}: ${item.rowCount} data row(s)`);
    }
  })
  .catch((error) => {
    console.error(error && error.message ? error.message : error);
    process.exitCode = 1;
  });
