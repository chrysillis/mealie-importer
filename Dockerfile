FROM node:20-alpine
WORKDIR /app
COPY server.js .
RUN mkdir -p public
COPY mealie-recipe-importer.html public/
EXPOSE 3000
CMD ["node", "server.js"]
