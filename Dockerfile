# Use Node.js 20 as the base image
FROM node:20-slim

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy project files
COPY . .

# Build the application
RUN npm run build

# Expose the port
EXPOSE 5000

# Start the server
CMD ["npm", "start"]
