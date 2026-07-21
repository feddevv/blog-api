# Blog API

An Express + TypeScript REST API for blog content, posts, and comments. The project uses Prisma with PostgreSQL, JWT-based authentication, and role-based authorization for protected actions.

## Swagger / OpenAPI

The API is documented with an OpenAPI 3.0 specification in [openapi.yaml](openapi.yaml). When the application is running, the Swagger UI is available at `/api-docs`.

Use Swagger UI to explore endpoints, inspect request and response schemas, and test authenticated requests with a Bearer token.

## Tech Stack

- TypeScript
- Node.js
- Express
- Prisma
- PostgreSQL
- Zod
- JWT
- bcrypt

## Getting Started

1. Install dependencies.

```bash
npm install
```

2. Create a `.env` file in the project root with the required environment variables.

3. Run Prisma migrations and generate the client.

```bash
npx prisma migrate dev
```

4. Start the development server.

```bash
npm run dev
```

5. Build and run the production version.

```bash
npm run build
npm start
```

## Environment Variables Configuration

Create a `.env` file at the project root with these values:

| Variable       | Required | Description                                   |
| -------------- | -------- | --------------------------------------------- |
| `DATABASE_URL` | Yes      | PostgreSQL connection string used by Prisma.  |
| `SECRET_KEY`   | Yes      | Secret used to sign and verify JWT tokens.    |
| `PORT`         | No       | Port for the HTTP server. Defaults to `3000`. |

Example:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/blog_api"
SECRET_KEY="your-super-secret-key"
PORT=3000
```

## Available Scripts

| Script     | Command                          | Description                                                |
| ---------- | -------------------------------- | ---------------------------------------------------------- |
| `dev`      | `nodemon --exec tsx src/app.ts`  | Start the API in development mode with automatic restarts. |
| `build`    | `tsc`                            | Compile TypeScript into `dist/`.                           |
| `start`    | `node dist/app.js`               | Run the compiled production build.                         |
| `lint`     | `eslint src/**/*.ts`             | Check source files with ESLint.                            |
| `lint:fix` | `eslint src/**/*.ts --fix`       | Automatically fix lint issues where possible.              |
| `format`   | `prettier --write "src/**/*.ts"` | Format source files with Prettier.                         |

## Folder Structure

The folders below are organized by responsibility:

```text
.
├── prisma/
│   ├── migrations/
│   ├── schema.prisma
│   └── seed.ts
├── src/
│   ├── app.ts
│   ├── controllers/
│   ├── db/
│   ├── errors/
│   ├── generated/
│   ├── middleware/
│   ├── routes/
│   ├── types/
│   └── validation/
├── docs/
│   ├── api-endpoints.md
│   ├── architecture.md
│   └── database-models.md
├── package.json
└── README.md
```

## Project Docs

- [OpenAPI Specification](openapi.yaml)
- [Swagger UI](http://localhost:3000/api-docs)
- [Architecture Overview](docs/architecture.md)
- [Database Models](docs/database-models.md)
