
import { PrismaClient } from "@prisma/client";
import { v4 as uuidv4 } from "uuid";
async function testAPI() {
  const prisma = new PrismaClient();
  try {
    const user = await prisma.user.findFirst({ where: { role: "admin" } });
    if (!user) return console.log("No admin");
    const skill = await prisma.skill.findFirst();
    if (!skill) return console.log("No skill");

    const req = { user: { userId: user.id, role: user.role } };
    const skillId = skill.id;
    
    // simulating the route execution
    if (req.user.role !== "admin") {
      const assignment = await prisma.skillFaculty.findFirst({
        where: { facultyId: req.user.userId, skillId, isActive: true },
      });
      if (!assignment) throw new Error("ForbiddenError You are not assigned to this skill");
    }

    const fetchedSkill = await prisma.skill.findUnique({
      where: { id: skillId },
      include: {
        chapters: {
          orderBy: { orderIndex: "asc" },
          include: {
            lessons: { orderBy: { orderIndex: "asc" } },
            tasks: { orderBy: { dayNumber: "asc" } },
          },
        },
        _count: { select: { studentSkills: true } },
      },
    });

    console.log("Success fetching skill:", fetchedSkill?.id);
  } catch (err) {
    console.error("ERROR:");
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}
testAPI();

