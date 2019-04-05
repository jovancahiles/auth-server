# Authorization Server

## Getting started
Clone the repo and run `npm install`
See package.json for npm scripts

## Deploying changes to docker
Build the docker container. Make sure to use the correct tag like `:v6` `docker build -t deloreyjmi/brinq-auth-server:v6 .`
Push the docker container to docker hub `docker push deloreyjmi/brinq-auth-server:v6`
- Make sure the tag matches the tag from the build step

## Kubernetes setup
There are three files in the `k8s/` folder:
- auth-server-deployment.yaml includes the deployment definition for the express app defined in `app.js`. By default it has 3 replicas, but should be able to continue to scale horizontally. It connects to the redis master and slave using a password stored in a Kubernetes secret.
- auth-server-service.yaml includes the definition for the service that exposes the above deployment to the outside world. It load balances incoming requests.
- volume-claim.yaml defines a persistent volume claim. It's a place to put our redis backups that won't disappear if a node fails. 

We use a Helm chart to deploy a production-grade redis setup with a master/slave architecture. The chart can be found here: https://github.com/helm/charts/tree/master/stable/redis


## Development
Install docker-for-mac desktop and enable kubernetes from the preferences > kubernetes panel. This gives you a single-node cluster setup on your local machine. It makes development MUCH easier. https://docs.docker.com/docker-for-mac/install/

Set the kubernetes context to local by running `kubectl config set-context docker-for-mac` 

Deploy the helm chart by running `helm install stable/redis`
Update the name of the redis secret in `auth-server-deployment.yaml`
Deploy the auth service by running `kubectl apply -f auth-server-deployment.yaml, auth-server-service.yaml`
