# genesis-virtue-invoice

Invoice / Quotation / Proforma generator for Genesis Virtue LLP.

- `frontend/` - Next.js 15 + TypeScript + Tailwind (data in localStorage for now)
- `backend/` - Spring Boot (planned)

## Run the frontend

```
cd frontend
npm install
npm run dev
```

End-to-end tests (needs a running server, default http://localhost:3100):

```
npm run build && npm start -- -p 3100
npm run test:e2e
```
