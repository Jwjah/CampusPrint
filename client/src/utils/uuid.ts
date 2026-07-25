import { v4 as uuidv4 } from 'uuid';

/**
 * Generates a stable, immutable UUID for any entity in the document model.
 */
export const generateId = (): string => {
  return uuidv4();
};
