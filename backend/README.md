# odoo-pos-cafe — Backend

Role-based Restaurant POS System (QR-based ordering)

## Quick Start

```bash
cd backend
cp .env.example .env        # fill in your values
npm install
npm run dev                 # starts with nodemon
```

## Project Structure

```
backend/
├── config/
│   └── db.js               # Mongoose connection
├── controllers/            # Route handler logic
├── middleware/
│   └── errorMiddleware.js  # Global 404 + error handler
├── models/                 # Mongoose schemas
├── routes/                 # Express routers
├── utils/
│   └── asyncHandler.js     # Async error wrapper
├── app.js                  # Express app setup
├── server.js               # Entry point
├── .env.example            # Environment template
└── package.json
```

## Health Check

```
GET http://localhost:5000/api/health
```

Expected response:
```json
{ "status": "OK", "message": "Server is running" }
```
