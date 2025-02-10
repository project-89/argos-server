/**
 * Deep merges two objects, recursively merging nested objects and arrays
 */
export const deepMerge = (
  target: Record<string, any>,
  source: Record<string, any>,
): Record<string, any> => {
  const output = { ...target };

  if (isObject(target) && isObject(source)) {
    Object.keys(source).forEach((key) => {
      if (isObject(source[key])) {
        if (!(key in target)) {
          Object.assign(output, { [key]: source[key] });
        } else {
          output[key] = deepMerge(target[key], source[key]);
        }
      } else if (Array.isArray(source[key])) {
        // If both target and source have arrays, concatenate them
        if (Array.isArray(target[key])) {
          console.log("Merging arrays:", { target: target[key], source: source[key] });
          output[key] = [...target[key], ...source[key]];
          console.log("Merged array result:", output[key]);
        } else {
          // If target doesn't have an array, use source array
          console.log("Target is not an array, using source:", source[key]);
          output[key] = source[key];
        }
      } else {
        Object.assign(output, { [key]: source[key] });
      }
    });
  }

  return output;
};

/**
 * Checks if value is a plain object
 */
const isObject = (item: any): item is Record<string, any> => {
  return item && typeof item === "object" && !Array.isArray(item);
};
