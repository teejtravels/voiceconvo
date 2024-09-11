# Base image: Node.js version 18
FROM mcr.microsoft.com/vscode/devcontainers/javascript-node:18

# Install Yarn globally
RUN npm install -g yarn

# Set the working directory in the container
WORKDIR /workspaces/voiceconvo/voice-chatbot

# Copy package.json and yarn.lock to install dependencies with Yarn
COPY package.json yarn.lock ./

# Install dependencies using Yarn
RUN yarn install

# Copy the rest of the project files
COPY . .

# Expose the port that React runs on (3000 for Create React App)
EXPOSE 3000
