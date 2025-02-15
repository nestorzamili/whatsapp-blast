
```
whatsapp-blast
├─ package-lock.json
├─ package.json
├─ prisma
│  └─ schema.prisma
├─ src
│  ├─ app.ts
│  ├─ config
│  │  ├─ db.ts
│  │  ├─ jwt.ts
│  │  ├─ logger.ts
│  │  ├─ nodemailer.ts
│  │  └─ rateLimiter.ts
│  ├─ controllers
│  │  └─ auth.controller.ts
│  ├─ middleware
│  │  ├─ auth.middleware.ts
│  │  └─ morgan.middleware.ts
│  ├─ routes
│  │  └─ auth.routes.ts
│  ├─ server.ts
│  ├─ services
│  │  └─ email.service.ts
│  └─ templates
│     └─ emailVerification.ts
└─ tsconfig.json

```