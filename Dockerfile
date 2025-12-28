# Use Node.js LTS version
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy backend package files
COPY backend/package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy backend source code
COPY backend/ ./

# Build TypeScript
RUN npm install -D typescript @types/node ts-node && npm run build

# Copy static files to dist directory
RUN cp -r src/*.xml dist/ 2>/dev/null || true

# Expose port (Render will use $PORT environment variable)
EXPOSE 8002

# Set environment to production
ENV NODE_ENV=production

# Start the server
CMD ["node", "dist/server.js"]
