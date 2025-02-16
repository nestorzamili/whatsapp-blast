
```
whatsapp-bulk
├─ package-lock.json
├─ package.json
├─ prisma
│  └─ schema.prisma
├─ README.md
├─ src
│  ├─ app.ts
│  ├─ config
│  │  ├─ db.ts
│  │  ├─ jwt.ts
│  │  ├─ logger.ts
│  │  ├─ nodemailer.ts
│  │  ├─ puppeteer.config.ts
│  │  └─ rateLimiter.ts
│  ├─ controllers
│  │  ├─ auth.controller.ts
│  │  └─ whatsapp.controller.ts
│  ├─ interfaces
│  │  └─ message.interface.ts
│  ├─ middleware
│  │  ├─ auth.middleware.ts
│  │  └─ morgan.middleware.ts
│  ├─ repositories
│  │  └─ message.repository.ts
│  ├─ routes
│  │  ├─ auth.routes.ts
│  │  └─ whatsapp.routes.ts
│  ├─ server.ts
│  ├─ services
│  │  ├─ auth.service.ts
│  │  ├─ batch-processor.service.ts
│  │  ├─ email.service.ts
│  │  └─ whatsapp.service.ts
│  ├─ templates
│  │  └─ emailVerification.ts
│  └─ utils
│     └─ phone.util.ts
└─ tsconfig.json

```