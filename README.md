# Blog API

An Express + TypeScript REST API for blog content, posts, comments, likes, and image uploads. The project uses Prisma with PostgreSQL, JWT-based authentication, and role-based authorization for protected actions.

## Swagger / OpenAPI

The API is documented with an OpenAPI 3.0 specification in [openapi.yaml](openapi.yaml). When the application is running, the Swagger UI is available at `/api-docs`.

Use Swagger UI to explore endpoints, inspect request and response schemas, and test authenticated requests with a Bearer token.

## Tech Stack

- **Runtime & Language:** Node.js, TypeScript
- **Framework:** Express
- **Database & ORM:** PostgreSQL, Prisma ORM (`@prisma/adapter-pg`)
- **Authentication & Security:** JWT (JSON Web Tokens), bcrypt, cookie-parser, CORS
- **Validation:** Zod
- **Storage & Media:** Cloudflare R2 / AWS S3 SDK (`@aws-sdk/client-s3`), Multer, Sharp
- **Testing:** Vitest, Supertest
- **API Documentation:** OpenAPI 3.0, Swagger UI (`swagger-ui-express`, `yamljs`)
- **Code Quality:** ESLint, Prettier

## Getting Started

1. Install dependencies:

```bash
npm install
```

2. Create a `.env` file in the project root with the required environment variables (see [Environment Variables Configuration](#environment-variables-configuration)).

3. Run Prisma migrations and generate the client:

```bash
npx prisma migrate dev
```

4. (Optional) Run test suite:

```bash
npm test
```

5. Start the development server:

```bash
npm run dev
```

6. Build and run the production version:

```bash
npm run build
npm start
```

## Environment Variables Configuration

Create a `.env` file at the project root with these values:

| Variable               | Required | Description                                                                                                                              |
| ---------------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`         | Yes      | PostgreSQL connection string used by Prisma in development / production.                                                                 |
| `DATABASE_URL_TEST`    | Yes*     | PostgreSQL connection string used by Prisma when running tests (`*` required for running tests).                                         |
| `SECRET_KEY`           | Yes      | Secret used to sign and verify JWT access and refresh tokens.                                                                            |
| `R2_ACCESS_KEY_ID`     | Yes      | Cloudflare R2 access key ID for object storage.                                                                                         |
| `R2_SECRET_ACCESS_KEY` | Yes      | Cloudflare R2 secret access key.                                                                                                         |
| `R2_ACCOUNT_ID`        | Yes      | Cloudflare R2 account ID used for the S3 API endpoint.                                                                                   |
| `R2_PUBLIC_URL`        | Yes      | Public base URL for serving uploaded images and thumbnails from Cloudflare R2.                                                           |
| `PORT`                 | No       | Port for the HTTP server. Defaults to `3000`.                                                                                            |
| `NODE_ENV`             | No       | Node environment (`development`, `test`, or `production`). Used for database selection and secure cookies. Defaults to `development`. |

Example:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/blog_api"
DATABASE_URL_TEST="postgresql://user:password@localhost:5432/blog_api_test"
SECRET_KEY="your-super-secret-key"
R2_ACCESS_KEY_ID="your-r2-access-key-id"
R2_SECRET_ACCESS_KEY="your-r2-secret-access-key"
R2_ACCOUNT_ID="your-r2-account-id"
R2_PUBLIC_URL="https://pub-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.r2.dev"
PORT=3000
NODE_ENV=development
```

## Available Scripts

| Script     | Command                                    | Description                                                |
| ---------- | ------------------------------------------ | ---------------------------------------------------------- |
| `dev`      | `nodemon --exec tsx src/server.ts`         | Start the API in development mode with automatic restarts. |
| `build`    | `tsc`                                      | Compile TypeScript into `dist/`.                           |
| `start`    | `node dist/server.js`                      | Run the compiled production build.                         |
| `lint`     | `eslint src/**/*.ts`                       | Check source files with ESLint.                            |
| `lint:fix` | `eslint src/**/*.ts --fix`                 | Automatically fix lint issues where possible.              |
| `format`   | `prettier --write "src/**/*.ts"`           | Format source files with Prettier.                         |
| `test`     | `vitest --watch run --no-file-parallelism` | Run the test suite sequentially with Vitest.               |

## Folder Structure

The folders below are organized by responsibility:

```text
.
├── docs/
│   ├── architecture.md
│   └── database.md
├── prisma/
│   ├── migrations/
│   └── schema.prisma
├── src/
│   ├── app.ts
│   ├── controllers/
│   │   ├── auth.controller.ts
│   │   ├── commentLikes.controller.ts
│   │   ├── comments.controller.ts
│   │   ├── postLikes.controller.ts
│   │   └── posts.controller.ts
│   ├── errors/
│   │   └── HttpError.ts
│   ├── generated/
│   │   └── prisma/
│   ├── lib/
│   │   ├── prisma.ts
│   │   └── s3.ts
│   ├── middleware/
│   │   ├── authenticate.ts
│   │   ├── checkRoles.ts
│   │   └── error.ts
│   ├── routes/
│   │   ├── auth.route.ts
│   │   ├── commentLikes.route.ts
│   │   ├── comments.route.ts
│   │   ├── nestedComments.route.ts
│   │   ├── postLikes.route.ts
│   │   └── posts.route.ts
│   ├── server.ts
│   ├── services/
│   │   ├── auth.service.ts
│   │   ├── comments.service.ts
│   │   ├── likes.service.ts
│   │   ├── media.service.ts
│   │   └── posts.service.ts
│   ├── tests/
│   │   ├── auth.test.ts
│   │   ├── commentLikes.test.ts
│   │   ├── comments.test.ts
│   │   ├── postLikes.test.ts
│   │   ├── posts.test.ts
│   │   └── testUtils.ts
│   ├── types/
│   │   ├── auth.types.ts
│   │   ├── express.types.ts
│   │   └── index.ts
│   ├── utils/
│   │   ├── cookies.ts
│   │   └── seedFactories.ts
│   └── validation/
│       ├── authSchemas.ts
│       ├── commentsSchemas.ts
│       ├── postsSchemas.ts
│       ├── utils.ts
│       └── validator.ts
├── api.rest
├── eslint.config.mjs
├── openapi.yaml
├── package.json
├── prisma.config.ts
├── README.md
├── tsconfig.json
└── vitest.config.ts
```

## Project Docs

- [OpenAPI Specification](openapi.yaml)
- [Swagger UI](http://localhost:3000/api-docs)
- [Architecture Overview](docs/architecture.md)
- [Database](docs/database.md)
