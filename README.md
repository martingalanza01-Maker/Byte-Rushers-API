# Byte-Rushers-API

**Byte-Rushers-API** is the backend for the Byte-Rushers web app. It handles business logic, API routes, and persistence using MongoDB.

## Tech Stack
- Node.js / TypeScript
- [LoopBack 4](https://loopback.io/) Framework
- MongoDB database

## Getting Started

### 1. Clone and Install

```bash
git clone https://github.com/martingalanza01-Maker/Byte-Rushers-API.git
cd Byte-Rushers-API
npm install
```

### 2. Setup Environment

- Copy the example environment file and edit required values:
  ```bash
  cp .env.example .env
  ```
- Set your MongoDB URL and other secrets in `.env`.

### 3. Run Database Migration

```bash
npm run migrate
```

### 4. Start the Server

```bash
npm run dev
```
- By default, the API will run at [http://localhost:3001](http://localhost:3001)

## Useful Commands

- `npm run migrate` – Apply DB schema changes
- `npm test` – Run backend tests
- `npm run build` – Compile to `/dist` for production
- `npm start` – Start from `/dist`

## Project Structure

- `src/controllers/` - API route handlers
- `src/models/` - Data models
- `src/datasources/` - MongoDB connection config
- `src/repositories/` - Database operations

## Database

- Uses **MongoDB**
- Connection configured in `.env` and `src/datasources/mongodb.datasource.ts`

---

Built with LoopBack 4 and MongoDB.
