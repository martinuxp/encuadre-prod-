// Utility to remove any 'undefined' properties from an object before sending it to Firestore
import { Timestamp } from 'firebase/firestore';

export const cleanUndefined = (obj: any): any => {
  if (obj === null || obj === undefined) return obj;
  const newObj = { ...obj };
  Object.keys(newObj).forEach((key) => {
    if (newObj[key] === undefined) {
      delete newObj[key];
    } else if (
      newObj[key] !== null &&
      typeof newObj[key] === 'object' &&
      !(newObj[key] instanceof Date) &&
      !(newObj[key] instanceof Timestamp)
    ) {
      newObj[key] = cleanUndefined(newObj[key]);
    }
  });
  return newObj;
};
