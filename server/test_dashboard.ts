import prisma from './src/config/database';
import jwt from 'jsonwebtoken';

(async () => {
  try {
    const user = await prisma.user.findFirst({ where: { role: 'student' } });
    if (!user) throw new Error('no student');
    const sessionId = user.currentSessionId || "test-session";
    const token = jwt.sign({ userId: user.id, sessionId, role: user.role }, process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production');
    
    // update current session to match
    await prisma.user.update({ where: { id: user.id }, data: { currentSessionId: sessionId } });

    const res = await fetch('http://localhost:5000/api/v1/student/dashboard', {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    console.log('SUCCESS', res.status);
    console.log(JSON.stringify(data, null, 2));
  } catch (err: any) {
    console.error('ERROR', err.message);
  } finally {
    await prisma.$disconnect();
  }
})();
