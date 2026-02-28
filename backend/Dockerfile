# Use a lightweight Node image
FROM node:18-slim

# Create app directory
WORKDIR /usr/src/app

# Install dependencies (only express for now)
RUN npm install express

# Copy source code
COPY server.js .

# Expose the port the plane's router would use
EXPOSE 8080

CMD [ "node", "server.js" ]