# Create image from nodejs base image
FROM node:6

# Clone the repo from github
RUN git clone git@bitbucket.org:brinqproduct/authorization-server.git

# Change workind directory to the cloned repo
WORKDIR /authorization-server

# Install all the dependencies
RUN npm install

# Expose port
EXPOSE 80

# Run the application
CMD ["npm", "start"]