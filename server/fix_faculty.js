const fs = require("fs");
let content = fs.readFileSync("src/routes/faculty.routes.ts", "utf8");
const prefix = content.split("    const skills = await prisma.skillFaculty.findMany({")[0];
const suffix = content.substring(content.indexOf("      order = lastChapter ? lastChapter.orderIndex + 1 : 1;"));
const correctChunk = `    const skills = await prisma.skillFaculty.findMany({
      where: { facultyId, isActive: true },
      include: {
        skill: {
          include: {
            chapters: {
              orderBy: { orderIndex: "asc" },
              include: {
                _count: { select: { lessons: true } },
              },
            },
            _count: {
              select: { studentSkills: true },
            },
          },
        },
      },
      orderBy: { assignedAt: "desc" },
    });

    res.json(
      successResponse(
        skills.filter(s => s.skill).map((s) => ({
          ...s.skill,
          assignedAt: s.assignedAt,
        })),
      ),
    );
  }),
);

/**
 * GET /api/v1/faculty/skills/:skillId
 */
router.get(
  "/skills/:skillId",
  asyncHandler(async (req: Request, res: Response) => {
    const skillId = req.params.skillId as string;
    await verifyFacultyOwnsSkill(req.user!, skillId);

    const skill = await prisma.skill.findUnique({
      where: { id: skillId },
      include: {
        chapters: {
          orderBy: { orderIndex: "asc" },
          include: {
            lessons: {
              orderBy: { orderIndex: "asc" },
            },
          },
        },
        tasks: {
          orderBy: { dayNumber: "asc" },
        },
        _count: {
          select: { studentSkills: true },
        },
      },
    });

    if (!skill) {
      throw NotFoundError("Skill not found");
    }

    res.json(successResponse(skill));
  }),
);

// ===================
// CHAPTER MANAGEMENT
// ===================

/**
 * POST /api/v1/faculty/skills/:skillId/chapters
 */
router.post(
  "/skills/:skillId/chapters",
  asyncHandler(async (req: Request, res: Response) => {
    const skillId = req.params.skillId as string;
    const { title, description, orderIndex } = req.body;

    await verifyFacultyOwnsSkill(req.user!, skillId);

    if (!title) {
      throw BadRequestError("Chapter title is required");
    }

    // Get next order index if not provided
    let order = orderIndex;
    if (order === undefined) {
      const lastChapter = await prisma.skillChapter.findFirst({
        where: { skillId },
        orderBy: { orderIndex: "desc" },
      });
`;
fs.writeFileSync("src/routes/faculty.routes.ts", prefix + correctChunk + suffix);
console.log("Fixed!");

