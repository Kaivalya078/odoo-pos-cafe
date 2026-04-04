@echo off
REM Open backend in a new terminal and start the server
start cmd /k "cd backend && npm run dev"

REM Open frontend in a new terminal and start Vite with --host
start cmd /k "cd frontend && npm run dev -- --host"
