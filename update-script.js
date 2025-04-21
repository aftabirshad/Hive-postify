/**
 * HTML File Update Script
 * 
 * This script updates all HTML files in the current directory to include sanitize.js
 * It adds sanitize.js after the DOMPurify script but before other security scripts
 */

const fs = require('fs');
const path = require('path');

console.log('Starting update of HTML files to include sanitize.js...');

// Get all HTML files in the current directory
const htmlFiles = fs.readdirSync('.').filter(file => file.endsWith('.html'));
console.log(`Found ${htmlFiles.length} HTML files to update`);

let updatedCount = 0;
let errorCount = 0;

// Process each HTML file
htmlFiles.forEach(fileName => {
    try {
        console.log(`Processing ${fileName}...`);
        
        // Read the file content
        let fileContent = fs.readFileSync(fileName, 'utf8');
        
        // Check if sanitize.js already exists to avoid duplicate inclusion
        if (fileContent.includes('src="sanitize.js"')) {
            console.log(`  - sanitize.js already included in ${fileName}, skipping`);
            return;
        }
        
        // Find insertion point after DOMPurify but before other security scripts
        const domPurifyPattern = /<script src="[^"]*dompurify[^"]*"><\/script>/i;
        
        if (!domPurifyPattern.test(fileContent)) {
            console.log(`  - Warning: DOMPurify script tag not found in ${fileName}, looking for other insertion points`);
            
            // Try to find </head> tag as fallback
            if (!fileContent.includes('</head>')) {
                console.log(`  - Error: Could not find suitable insertion point in ${fileName}, skipping`);
                errorCount++;
                return;
            }
            
            // Insert before </head>
            fileContent = fileContent.replace('</head>', '    <!-- Central Security Module -->\n    <script src="sanitize.js"></script>\n</head>');
        } else {
            // Insert after DOMPurify
            fileContent = fileContent.replace(
                domPurifyPattern, 
                match => `${match}\n    <!-- Central Security Module -->\n    <script src="sanitize.js"></script>`
            );
        }
        
        // Write the updated content back to the file
        fs.writeFileSync(fileName, fileContent, 'utf8');
        console.log(`  - Successfully updated ${fileName}`);
        updatedCount++;
        
    } catch (error) {
        console.error(`  - Error processing ${fileName}:`, error.message);
        errorCount++;
    }
});

console.log('=== Update Complete ===');
console.log(`Total files: ${htmlFiles.length}`);
console.log(`Updated: ${updatedCount}`);
console.log(`Errors: ${errorCount}`);
console.log(`Skipped: ${htmlFiles.length - updatedCount - errorCount}`);
console.log('\nNEXT STEPS:');
console.log('1. Test the website functionality to ensure everything works correctly');
console.log('2. You can optionally remove individual security script files after verifying sanitize.js works properly');
console.log('   (comment-security.js, post-security.js, etc.)');
console.log('3. Make sure to check browser console for any JavaScript errors'); 