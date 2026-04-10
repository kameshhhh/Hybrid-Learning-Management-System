import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();

async function testLogin() {
  try {
    const identifier = "admin@hlms.com";
    const password = "password";

    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { username: identifier.toLowerCase() },
          { email: identifier.toLowerCase() },
        ],
      },
    });

    if (!user) throw new Error("User not found");

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    
    // single device handling
    const existingSession = await prisma.session.findFirst({
      where: {
        userId: user.id,
        isActive: true,
      },
    });
    
    if (existingSession) {
      await prisma.session.update({
        where: { id: existingSession.id },
        data: {
          isActive: false,
          logoutTime: new Date(),
          forcedLogoutReason: "New login from another device",
        },
      });
      console.log("Updated existing session");
    }

    const sessionId = uuidv4();
    const deviceInfo = "Test config";
    const ipAddress = "127.0.0.1";

    await prisma.session.create({
      data: {
        id: sessionId,
        userId: user.id,
        sessionToken: uuidv4(),
        deviceInfo,
        ipAddress,
        isActive: true,
      },
    });
    console.log("Created session");

    await prisma.user.update({
      where: { id: user.id },
      data: {
        isLoggedIn: true,
        currentSessionId: sessionId,
        lastLoginAt: new Date(),
        lastLoginIp: ipAddress,
        lastLoginDevice: deviceInfo,
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
    });
    console.log("Updated user");

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "LOGIN",
        entityType: "user",
        entityId: user.id,
        newValues: { ip: ipAddress, device: deviceInfo },
        ipAddress,
      },
    });
    console.log("Created audit log");

    console.log("All success!");
  } catch (err) {
    console.error("FAILED:");
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

testLogin();
