# Create image from nodejs base image
FROM node:6

# Change workind directory to the cloned repo
WORKDIR /authorization-server

# Copy the current directory contents into the container at /app
COPY . /authorization-server

# Install all the dependencies
RUN npm install

# Expose port
EXPOSE 8080

# Run the application
CMD ["npm", "start"]