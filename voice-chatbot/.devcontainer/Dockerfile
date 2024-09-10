# Base image: Node.js version 18
FROM mcr.microsoft.com/vscode/devcontainers/javascript-node:18

# Set the working directory in the container
WORKDIR /workspaces

# Copy package.json and install dependencies
COPY package.json package-lock.json ./
RUN npm install

# Copy the rest of the project files
COPY . .

# Expose the port that React runs on
EXPOSE 3000
