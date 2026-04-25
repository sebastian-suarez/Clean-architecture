// Test file to check if the module resolution works correctly with the "imports" field in package.json
import greet from "#src/modules/greet.js";

console.log(greet("World"));
