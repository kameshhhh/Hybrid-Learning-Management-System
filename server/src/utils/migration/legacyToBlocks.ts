import crypto from 'crypto';

/**
 * Migration Utility: legacyToBlocks
 * Transforms existing unstructured curriculum data into the new block-based architecture.
 */
export function migrateChapterToBlocks(chapter: any) {
  const blocks: any[] = [];

  // 1. Theory Content
  if (chapter.theory) {
    blocks.push({
      id: crypto.randomUUID(),
      v: 1,
      type: 'heading',
      content: { text: 'Chapter Theory', level: 2 },
      orderIndex: blocks.length,
      meta: {}
    });
    blocks.push({
      id: crypto.randomUUID(),
      v: 1,
      type: 'text',
      content: { html: chapter.theory },
      orderIndex: blocks.length,
      meta: {}
    });
  }

  // 2. Technical Knowledge
  if (chapter.technicalKnowledge) {
    blocks.push({
      id: crypto.randomUUID(),
      v: 1,
      type: 'heading',
      content: { text: 'Technical Knowledge', level: 2 },
      orderIndex: blocks.length,
      meta: {}
    });
    blocks.push({
      id: crypto.randomUUID(),
      v: 1,
      type: 'text',
      content: { html: chapter.technicalKnowledge },
      orderIndex: blocks.length,
      meta: {}
    });
  }

  // 3. Lessons (Video & Text)
  if (chapter.lessons && chapter.lessons.length > 0) {
    chapter.lessons.forEach((lesson: any) => {
      blocks.push({
        id: crypto.randomUUID(),
        v: 1,
        type: 'heading',
        content: { text: lesson.title, level: 3 },
        orderIndex: blocks.length,
        meta: {}
      });

      if (lesson.videoUrl) {
        blocks.push({
          id: crypto.randomUUID(),
          v: 1,
          type: 'video',
          content: { url: lesson.videoUrl, provider: 'upload' },
          orderIndex: blocks.length,
          meta: { requiredWatch: 90, isLocked: true }
        });
      }

      if (lesson.description || lesson.textContent) {
        blocks.push({
          id: crypto.randomUUID(),
          v: 1,
          type: 'text',
          content: { html: lesson.description || lesson.textContent },
          orderIndex: blocks.length,
          meta: {}
        });
      }
    });
  }

  // 4. MCQ Data
  if (chapter.mcqData && Array.isArray(chapter.mcqData.questions)) {
    blocks.push({
      id: crypto.randomUUID(),
      v: 1,
      type: 'heading',
      content: { text: 'Knowledge Check', level: 2 },
      orderIndex: blocks.length,
      meta: {}
    });
    blocks.push({
      id: crypto.randomUUID(),
      v: 1,
      type: 'mcq',
      content: { questions: chapter.mcqData.questions },
      orderIndex: blocks.length,
      meta: {}
    });
  }

  return blocks;
}
