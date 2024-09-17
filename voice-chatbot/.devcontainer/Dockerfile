# Base image: Node.js version 18 (LTS)
FROM mcr.microsoft.com/vscode/devcontainers/javascript-node:18

# Install Yarn globally
RUN npm install -g yarn

# Set the working directory in the container
WORKDIR /workspaces/voiceconvo/voice-chatbot

# Copy package.json files
COPY package.json ./
COPY voice-chatbot/package.json ./voice-chatbot/
COPY server/package.json ./server/

# Install dependencies
RUN yarn install:all

# Copy the rest of the project files
COPY . .

# Expose ports for React and Express
EXPOSE 3000 3001

# Start both frontend and backend
CMD ["yarn", "start"]