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
