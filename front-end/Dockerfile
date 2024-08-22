# Use an official Node runtime as a parent image
FROM node:16-alpine

# Set the working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install any needed packages specified in package.json
RUN npm install

# Bundle app source
COPY . .

# Build the app
RUN npm run build

# Install serve to serve the app on a web server
RUN npm install -g serve

# Make port 5000 available to the world outside this container
EXPOSE 5000

# Run serve when the container launches
CMD ["serve", "-s", "build", "-l", "5000"]
