# 🚀 QUICK START - HLMS System

## ⚡ **INSTANT ACCESS**

### **System URLs:**

- Frontend: http://localhost:3000
- Backend: http://localhost:5000
- API: http://localhost:5000/api/v1

### **Login Credentials:**

```
Admin:   admin@hlms.com / Admin@123
Faculty: faculty1@hlms.com / Faculty@123
Student: student1@hlms.com / Student@123
```

---

## 🔥 **START SERVERS**

```bash
# Backend (Terminal 1)
cd server && npm run dev

# Frontend (Terminal 2)
cd client && npm run dev
```

---

## 📝 **USEFUL COMMANDS**

```bash
# View Database
cd server && npm run db:studio

# Reset & Reseed Database
cd server && npm run db:push -- --force-reset && npm run db:seed

# Generate Prisma Client
cd server && npm run db:generate

# Build for Production
cd server && npm run build
cd client && npm run build
```

---

## 🧪 **TEST THE API**

### Login

```bash
curl -X POST http://localhost:5000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@hlms.com","password":"Admin@123"}'
```

### Health Check

```bash
curl http://localhost:5000/health
```

### Get User Info (with token)

```bash
curl http://localhost:5000/api/v1/auth/me \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## 📊 **SYSTEM STATUS**

✅ Database: **PostgreSQL** (hlms_db on localhost:5432)  
✅ Backend: **Running** on port 5000  
✅ Frontend: **Running** on port 3000  
✅ Data: **Seeded** with test users

---

## 🆘 **TROUBLESHOOTING**

### Backend won't start

```bash
# Kill port 5000
Get-NetTCPConnection -LocalPort 5000 | Select OwningProcess | Get-Process | Stop-Process -Force
```

### Frontend won't start

```bash
# Kill port 3000
Get-NetTCPConnection -LocalPort 3000 | Select OwningProcess | Get-Process | Stop-Process -Force
```

### Database connection error

- Ensure PostgreSQL is running
- Check credentials in `server/.env`
- Verify database `hlms_db` exists

---

## 📁 **KEY FILES**

```
server/
├── .env                    # Environment config
├── prisma/schema.prisma   # Database schema
└── src/index.ts           # Server entry

client/
├── src/App.tsx            # React app entry
└── src/pages/             # Application pages
```

---

## 🎯 **NEXT STEPS**

1. ✅ Complete backend API routes
2. ✅ Build frontend pages
3. ✅ Connect frontend to backend
4. ✅ Test user flows
5. ✅ Deploy to production

---

**System is LIVE!** Start building amazing features! 🚀
