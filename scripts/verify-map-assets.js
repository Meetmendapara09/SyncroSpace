#!/usr/bin/env node
/**
 * Script to verify map assets
 * 
 * This script checks that all required image assets for the virtual space
 * map are correctly available in the public directory.
 */

const fs = require('fs');
const path = require('path');

console.log('Verifying map assets...');

// Define the expected tileset images
const EXPECTED_IMAGES = [
  'grass.png',
  'floor.png',
  'sofa.png',
  'sofa1.png',
  'singlesofa.png',
  'mac.png',
  'computer.png',
  'table.png',
  'book.png',
  'book1.png',
  'book2.png',
  'bottle.png',
  'bottle1.png',
  'cup.png',
  'glass.png',
  'tea.png',
  'wall.png',
  'office chair.png',
  'garden chair.png',
  'garden table.png',
  'paper.png',
  'tyer.png',
];

// Path to public directory
const PUBLIC_DIR = path.join(__dirname, '..', 'public');
// Path to source public directory
const SRC_PUBLIC_DIR = path.join(__dirname, '..', 'src', 'public');

// Check if directory exists
const checkDirectory = (dir) => {
  if (!fs.existsSync(dir)) {
    console.error(`ERROR: Directory ${dir} does not exist!`);
    return false;
  }
  return true;
};

// Check if image exists
const checkImage = (imagePath, imageName) => {
  if (!fs.existsSync(imagePath)) {
    console.error(`ERROR: Image ${imageName} not found at ${imagePath}`);
    return false;
  }
  return true;
};

// Main verification function
const verifyAssets = () => {
  const publicDirExists = checkDirectory(PUBLIC_DIR);
  const srcPublicDirExists = checkDirectory(SRC_PUBLIC_DIR);
  
  if (!publicDirExists && !srcPublicDirExists) {
    console.error('No public directories found!');
    return false;
  }
  
  let missingCount = 0;
  let availableCount = 0;
  
  console.log('Checking map assets...');
  
  EXPECTED_IMAGES.forEach(image => {
    const publicPath = path.join(PUBLIC_DIR, image);
    const srcPublicPath = path.join(SRC_PUBLIC_DIR, image);
    
    const inPublic = publicDirExists && checkImage(publicPath, image);
    const inSrcPublic = srcPublicDirExists && checkImage(srcPublicPath, image);
    
    if (inPublic || inSrcPublic) {
      availableCount++;
      console.log(`✓ ${image} - Available`);
    } else {
      missingCount++;
      console.error(`✗ ${image} - MISSING`);
    }
  });
  
  console.log('');
  console.log(`Asset verification complete: ${availableCount} available, ${missingCount} missing`);
  
  if (missingCount > 0) {
    console.error('\nSome assets are missing! The map may not display correctly.');
    
    if (publicDirExists && srcPublicDirExists) {
      console.log('\nTo fix:');
      console.log('1. Ensure all map images are available in either:');
      console.log(`   - ${PUBLIC_DIR}`);
      console.log(`   - ${SRC_PUBLIC_DIR}`);
      console.log('2. If using spaces in filenames, make sure they are URL encoded in the MapView.tsx component');
    }
    
    return false;
  } else {
    console.log('\nAll assets are available!');
    return true;
  }
};

// Run verification
verifyAssets();