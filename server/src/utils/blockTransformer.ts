import { Block, BlockSchema } from '../validators/blockValidator';
import { logger } from './logger';

const LATEST_BLOCK_VERSION = 1;
const LATEST_CHAPTER_VERSION = 1;

/**
 * Transforms blocks to the latest version before sending to client or saving.
 * Currently on V1, so this is primarily a pass-through with validation.
 */
export const transformBlocks = (blocks: any[]): Block[] => {
  if (!blocks || !Array.isArray(blocks)) return [];

  return blocks.map((block, index) => {
    try {
      let transformed = { ...block };

      // Ensure v exists
      if (!transformed.v) transformed.v = 1;

      // Logic for future versions:
      // if (transformed.v < 2) {
      //   transformed = transformV1ToV2(transformed);
      // }

      // Validate the transformed block
      const result = BlockSchema.safeParse(transformed);
      if (!result.success) {
        logger.error({
          message: 'Block validation failed during transformation',
          blockId: block.id,
          errors: result.error.format(),
        });
        return transformed as Block;
      }

      return result.data;
    } catch (error) {
      logger.error('Error during block transformation:', error);
      return block as Block;
    }
  });
};

export const LATEST_VERSIONS = {
  BLOCK: LATEST_BLOCK_VERSION,
  CHAPTER: LATEST_CHAPTER_VERSION,
};
